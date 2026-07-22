import { Router } from "express";
import { eq, and, inArray, desc } from "drizzle-orm";
import { db, catalogueSharesTable, companiesTable, productsTable, sampleOrdersTable, sampleOrderItemsTable, opportunitiesTable } from "@workspace/db";
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
    alreadySubmitted: !!share.selectedProductIds,
    products: products.map(p => ({ ...p, sellingPrice: Number(p.sellingPrice) })),
  });
});

// POST /v1/public/catalogue/:token/request-samples
// Public endpoint — customer submits shortlisted products.
// Saves selection on the catalogue share and advances the opportunity to "shortlisted".
// Does NOT create a sample order — sales team does that separately.
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

  // Save the customer's selection on the catalogue share
  await db.update(catalogueSharesTable)
    .set({ selectedProductIds: JSON.stringify(selectedIds) })
    .where(eq(catalogueSharesTable.token, token));

  // Advance opportunity to "shortlisted" stage if linked
  if (share.opportunityId) {
    await db.update(opportunitiesTable)
      .set({ stage: "shortlisted", updatedAt: new Date() })
      .where(and(
        eq(opportunitiesTable.id, share.opportunityId),
        eq(opportunitiesTable.companyId, share.companyId),
      ));
  }

  res.json({ success: true, shortlistedCount: selectedIds.length });
});

// GET /v1/opportunities/:id/shortlisted-products
// Returns the customer-selected products from the most recent catalogue share for this opportunity.
router.get("/v1/opportunities/:id/shortlisted-products", async (req, res): Promise<void> => {
  const oppId = Number(req.params.id);

  const shares = await db.select()
    .from(catalogueSharesTable)
    .where(and(
      eq(catalogueSharesTable.opportunityId, oppId),
      eq(catalogueSharesTable.companyId, req.companyId),
    ))
    .orderBy(desc(catalogueSharesTable.createdAt));

  // Find the most recent share that has a customer selection
  const share = shares.find(s => s.selectedProductIds) ?? null;

  if (!share || !share.selectedProductIds) {
    res.json({ products: [], shareToken: null, catalogueType: null });
    return;
  }

  const selectedIds: number[] = JSON.parse(share.selectedProductIds);
  const products = selectedIds.length > 0
    ? await db.select({
        id: productsTable.id,
        name: productsTable.name,
        category: productsTable.category,
        sellingPrice: productsTable.sellingPrice,
        imageUrl: productsTable.imageUrl,
      }).from(productsTable).where(
        and(inArray(productsTable.id, selectedIds), eq(productsTable.companyId, req.companyId))
      )
    : [];

  res.json({
    products: products.map(p => ({ ...p, sellingPrice: Number(p.sellingPrice) })),
    shareToken: share.token,
    catalogueType: share.catalogueType,
  });
});

// POST /v1/opportunities/:id/create-sample-from-shortlist
// Creates a sample order from the customer-shortlisted products and advances the opportunity to "samples".
router.post("/v1/opportunities/:id/create-sample-from-shortlist", async (req, res): Promise<void> => {
  const oppId = Number(req.params.id);

  const shares = await db.select()
    .from(catalogueSharesTable)
    .where(and(
      eq(catalogueSharesTable.opportunityId, oppId),
      eq(catalogueSharesTable.companyId, req.companyId),
    ))
    .orderBy(desc(catalogueSharesTable.createdAt));

  const share = shares.find(s => s.selectedProductIds) ?? null;
  if (!share || !share.selectedProductIds) {
    res.status(400).json({ error: "No shortlisted products found for this opportunity" });
    return;
  }

  const selectedIds: number[] = JSON.parse(share.selectedProductIds);
  if (selectedIds.length === 0) {
    res.status(400).json({ error: "No products in shortlist" });
    return;
  }

  const [opp] = await db.select().from(opportunitiesTable)
    .where(and(eq(opportunitiesTable.id, oppId), eq(opportunitiesTable.companyId, req.companyId)));
  if (!opp) { res.status(404).json({ error: "Opportunity not found" }); return; }

  const [order] = await db.insert(sampleOrdersTable).values({
    companyId: req.companyId,
    sampleNumber: "",
    clientId: share.clientId ?? null,
    opportunityId: oppId,
    customerName: share.clientName ?? opp.title,
    status: "Requested",
    notes: `Created from customer shortlist — ${share.catalogueType}`,
  }).returning({ id: sampleOrdersTable.id });

  const sampleNumber = `SMPL-${String(order.id).padStart(5, "0")}`;
  await db.update(sampleOrdersTable)
    .set({ sampleNumber })
    .where(eq(sampleOrdersTable.id, order.id));

  await db.insert(sampleOrderItemsTable).values(
    selectedIds.map(pid => ({ sampleOrderId: order.id, productId: pid, quantity: 1 }))
  );

  // Advance opportunity to "samples"
  await db.update(opportunitiesTable)
    .set({ stage: "samples", updatedAt: new Date() })
    .where(and(eq(opportunitiesTable.id, oppId), eq(opportunitiesTable.companyId, req.companyId)));

  res.json({ success: true, sampleOrderId: order.id, sampleNumber });
});

export default router;
