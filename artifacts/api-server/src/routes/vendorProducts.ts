import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, vendorProductsTable, vendorsTable, productsTable } from "@workspace/db";

const router = Router();

// GET /v1/products/:id/vendors — list all vendor mappings for a product
router.get("/v1/products/:id/vendors", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.id as string, 10);

  const [product] = await db.select({ id: productsTable.id })
    .from(productsTable)
    .where(and(eq(productsTable.id, productId), eq(productsTable.companyId, req.companyId)));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }

  const rows = await db
    .select({
      id: vendorProductsTable.id,
      vendorId: vendorProductsTable.vendorId,
      vendorName: vendorsTable.name,
      unitPrice: vendorProductsTable.unitPrice,
      leadTimeDays: vendorProductsTable.leadTimeDays,
      isPreferred: vendorProductsTable.isPreferred,
      createdAt: vendorProductsTable.createdAt,
    })
    .from(vendorProductsTable)
    .leftJoin(vendorsTable, eq(vendorProductsTable.vendorId, vendorsTable.id))
    .where(and(eq(vendorProductsTable.productId, productId), eq(vendorProductsTable.companyId, req.companyId)));

  res.json(rows.map(r => ({
    id: r.id,
    vendorId: r.vendorId,
    vendorName: r.vendorName ?? "Unknown",
    unitPrice: Number(r.unitPrice),
    leadTimeDays: r.leadTimeDays,
    isPreferred: r.isPreferred === 1,
  })));
});

// POST /v1/products/:id/vendors — add a vendor mapping
router.post("/v1/products/:id/vendors", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.id as string, 10);
  const { vendorId, unitPrice, leadTimeDays, isPreferred } = req.body ?? {};

  if (!vendorId || unitPrice == null) {
    res.status(400).json({ error: "vendorId and unitPrice are required" }); return;
  }

  const [product] = await db.select({ id: productsTable.id })
    .from(productsTable)
    .where(and(eq(productsTable.id, productId), eq(productsTable.companyId, req.companyId)));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }

  const [vendor] = await db.select({ id: vendorsTable.id })
    .from(vendorsTable)
    .where(and(eq(vendorsTable.id, vendorId), eq(vendorsTable.companyId, req.companyId)));
  if (!vendor) { res.status(404).json({ error: "Vendor not found" }); return; }

  // If marking as preferred, clear existing preferred flag
  if (isPreferred) {
    await db.update(vendorProductsTable)
      .set({ isPreferred: 0 })
      .where(and(eq(vendorProductsTable.productId, productId), eq(vendorProductsTable.companyId, req.companyId)));
  }

  const [row] = await db.insert(vendorProductsTable).values({
    companyId: req.companyId,
    productId,
    vendorId: Number(vendorId),
    unitPrice: Number(unitPrice).toFixed(2),
    leadTimeDays: leadTimeDays ? Number(leadTimeDays) : 7,
    isPreferred: isPreferred ? 1 : 0,
  }).returning();

  res.status(201).json({
    id: row.id,
    vendorId: row.vendorId,
    unitPrice: Number(row.unitPrice),
    leadTimeDays: row.leadTimeDays,
    isPreferred: row.isPreferred === 1,
  });
});

// PATCH /v1/products/:productId/vendors/:mappingId — set preferred flag
router.patch("/v1/products/:productId/vendors/:mappingId", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.productId as string, 10);
  const mappingId = parseInt(req.params.mappingId as string, 10);
  const { isPreferred } = req.body ?? {};

  if (isPreferred) {
    await db.update(vendorProductsTable)
      .set({ isPreferred: 0 })
      .where(and(eq(vendorProductsTable.productId, productId), eq(vendorProductsTable.companyId, req.companyId)));
  }

  const [row] = await db.update(vendorProductsTable)
    .set({ isPreferred: isPreferred ? 1 : 0 })
    .where(and(eq(vendorProductsTable.id, mappingId), eq(vendorProductsTable.companyId, req.companyId)))
    .returning();

  if (!row) { res.status(404).json({ error: "Mapping not found" }); return; }
  res.json({ id: row.id, isPreferred: row.isPreferred === 1 });
});

// DELETE /v1/products/:productId/vendors/:mappingId — remove vendor mapping
router.delete("/v1/products/:productId/vendors/:mappingId", async (req, res): Promise<void> => {
  const mappingId = parseInt(req.params.mappingId as string, 10);
  await db.delete(vendorProductsTable)
    .where(and(eq(vendorProductsTable.id, mappingId), eq(vendorProductsTable.companyId, req.companyId)));
  res.sendStatus(204);
});

export default router;
