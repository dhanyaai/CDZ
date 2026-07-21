import { Router } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, catalogueSharesTable, companiesTable, productsTable, opportunitiesTable } from "@workspace/db";
import crypto from "crypto";

const router = Router();

router.post("/v1/catalogue-shares", async (req, res): Promise<void> => {
  const { opportunityTitle, clientName, catalogueType, productIds, opportunityId, clientId } = req.body ?? {};
  if (!opportunityTitle || !catalogueType || !Array.isArray(productIds) || productIds.length === 0) {
    res.status(400).json({ error: "opportunityTitle, catalogueType and productIds are required" });
    return;
  }
  const [company] = await db.select({ name: companiesTable.name }).from(companiesTable).where(eq(companiesTable.id, req.companyId));
  if (!company) { res.status(400).json({ error: "Company not found" }); return; }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(catalogueSharesTable).values({
    token,
    companyId: req.companyId,
    companyName: company.name,
    opportunityId: opportunityId ? Number(opportunityId) : null,
    clientId: clientId ? Number(clientId) : null,
    opportunityTitle,
    clientName: clientName ?? null,
    catalogueType,
    productIds: JSON.stringify(productIds),
    expiresAt,
  });

  res.json({ token });
});

router.get("/v1/public/catalogue/:token", async (req, res): Promise<void> => {
  const { token } = req.params as { token: string };
  const [share] = await db.select().from(catalogueSharesTable).where(eq(catalogueSharesTable.token, token));
  if (!share) { res.status(404).json({ error: "Catalogue not found" }); return; }
  if (share.expiresAt && share.expiresAt < new Date()) { res.status(410).json({ error: "This catalogue link has expired" }); return; }

  const ids: number[] = JSON.parse(share.productIds);
  const products = ids.length > 0
    ? await db.select({
        id: productsTable.id,
        name: productsTable.name,
        category: productsTable.category,
        sellingPrice: productsTable.sellingPrice,
        imageUrl: productsTable.imageUrl,
      }).from(productsTable).where(
        and(inArray(productsTable.id, ids), eq(productsTable.companyId, share.companyId))
      )
    : [];

  res.json({
    token: share.token,
    companyName: share.companyName,
    opportunityId: share.opportunityId ?? null,
    clientId: share.clientId ?? null,
    opportunityTitle: share.opportunityTitle,
    clientName: share.clientName,
    catalogueType: share.catalogueType,
    expiresAt: share.expiresAt?.toISOString() ?? null,
    createdAt: share.createdAt.toISOString(),
    products: products.map(p => ({ ...p, sellingPrice: Number(p.sellingPrice) })),
  });
});

// POST /v1/public/catalogue/:token/request-samples
// Public endpoint — no auth required.
// Customer selects products; we save them as shortlisted on the opportunity and advance stage to "shortlisted".
router.post("/v1/public/catalogue/:token/request-samples", async (req, res): Promise<void> => {
  const { token } = req.params as { token: string };
  const { productIds } = req.body ?? {};

  if (!Array.isArray(productIds) || productIds.length === 0) {
    res.status(400).json({ error: "productIds[] is required" });
    return;
  }

  const [share] = await db.select().from(catalogueSharesTable).where(eq(catalogueSharesTable.token, token));
  if (!share) { res.status(404).json({ error: "Catalogue not found" }); return; }
  if (share.expiresAt && share.expiresAt < new Date()) { res.status(410).json({ error: "This catalogue link has expired" }); return; }

  // Validate all product IDs belong to this company's catalogue share
  const validIds: number[] = JSON.parse(share.productIds);
  const selectedIds: number[] = (productIds as number[]).filter(id => validIds.includes(id));
  if (selectedIds.length === 0) {
    res.status(400).json({ error: "No valid products selected" });
    return;
  }

  // Save shortlisted product IDs to the opportunity and advance stage to "shortlisted"
  if (share.opportunityId) {
    await db.update(opportunitiesTable)
      .set({
        shortlistedProductIds: JSON.stringify(selectedIds),
        stage: "shortlisted",
        updatedAt: new Date(),
      })
      .where(and(
        eq(opportunitiesTable.id, share.opportunityId),
        eq(opportunitiesTable.companyId, share.companyId),
      ));
  }

  res.json({ success: true, shortlistedCount: selectedIds.length });
});

export default router;
