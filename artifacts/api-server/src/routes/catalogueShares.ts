import { Router } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, catalogueSharesTable, companiesTable, productsTable } from "@workspace/db";
import crypto from "crypto";

const router = Router();

router.post("/v1/catalogue-shares", async (req, res): Promise<void> => {
  const { opportunityTitle, clientName, catalogueType, productIds } = req.body ?? {};
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
    opportunityTitle: share.opportunityTitle,
    clientName: share.clientName,
    catalogueType: share.catalogueType,
    expiresAt: share.expiresAt?.toISOString() ?? null,
    createdAt: share.createdAt.toISOString(),
    products: products.map(p => ({ ...p, sellingPrice: Number(p.sellingPrice) })),
  });
});

export default router;
