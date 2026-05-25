import { Router } from "express";
import { eq } from "drizzle-orm";
import {
  db, categoriesTable, productVariantsTable, pricingTiersTable, customizationOptionsTable,
} from "@workspace/db";

const router = Router();

// Categories
router.get("/v1/categories", async (_req, res): Promise<void> => {
  const rows = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/v1/categories", async (req, res): Promise<void> => {
  const { name, slug, parentId, description } = req.body ?? {};
  if (!name || !slug) { res.status(400).json({ error: "name and slug required" }); return; }
  const [c] = await db.insert(categoriesTable).values({ name, slug, parentId, description }).returning();
  res.status(201).json(c);
});

router.patch("/v1/categories/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const updates: Record<string, unknown> = {};
  for (const f of ["name", "slug", "parentId", "description"] as const) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  const [c] = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id)).returning();
  if (!c) { res.status(404).json({ error: "Not found" }); return; }
  res.json(c);
});

router.delete("/v1/categories/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.sendStatus(204);
});

// Variants
router.get("/v1/products/:productId/variants", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.productId as string, 10);
  const rows = await db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, productId));
  res.json(rows.map((r) => ({ ...r, priceAdjustment: Number(r.priceAdjustment), createdAt: r.createdAt.toISOString() })));
});

router.post("/v1/products/:productId/variants", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.productId as string, 10);
  const { sku, variantName, size, color, material, priceAdjustment, stockLevel } = req.body ?? {};
  if (!sku || !variantName) { res.status(400).json({ error: "sku and variantName required" }); return; }
  const [v] = await db.insert(productVariantsTable).values({
    productId, sku, variantName, size, color, material,
    priceAdjustment: (priceAdjustment ?? 0).toString(), stockLevel: stockLevel ?? 0,
  }).returning();
  res.status(201).json(v);
});

router.delete("/v1/variants/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(productVariantsTable).where(eq(productVariantsTable.id, id));
  res.sendStatus(204);
});

// Pricing tiers
router.get("/v1/products/:productId/pricing-tiers", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.productId as string, 10);
  const rows = await db.select().from(pricingTiersTable).where(eq(pricingTiersTable.productId, productId)).orderBy(pricingTiersTable.minQuantity);
  res.json(rows.map((r) => ({ ...r, unitPrice: Number(r.unitPrice), createdAt: r.createdAt.toISOString() })));
});

router.post("/v1/products/:productId/pricing-tiers", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.productId as string, 10);
  const { tierName, minQuantity, unitPrice } = req.body ?? {};
  if (!tierName || minQuantity == null || unitPrice == null) {
    res.status(400).json({ error: "tierName, minQuantity, unitPrice required" }); return;
  }
  const [t] = await db.insert(pricingTiersTable).values({
    productId, tierName, minQuantity, unitPrice: unitPrice.toString(),
  }).returning();
  res.status(201).json(t);
});

router.delete("/v1/pricing-tiers/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(pricingTiersTable).where(eq(pricingTiersTable.id, id));
  res.sendStatus(204);
});

// Customization options
router.get("/v1/products/:productId/customizations", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.productId as string, 10);
  const rows = await db.select().from(customizationOptionsTable).where(eq(customizationOptionsTable.productId, productId));
  res.json(rows.map((r) => ({ ...r, priceUplift: Number(r.priceUplift), createdAt: r.createdAt.toISOString() })));
});

router.post("/v1/products/:productId/customizations", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.productId as string, 10);
  const { optionType, optionName, description, priceUplift, leadTimeDays } = req.body ?? {};
  if (!optionType || !optionName) { res.status(400).json({ error: "optionType and optionName required" }); return; }
  const [o] = await db.insert(customizationOptionsTable).values({
    productId, optionType, optionName, description,
    priceUplift: (priceUplift ?? 0).toString(), leadTimeDays: leadTimeDays ?? 0,
  }).returning();
  res.status(201).json(o);
});

router.delete("/v1/customizations/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(customizationOptionsTable).where(eq(customizationOptionsTable.id, id));
  res.sendStatus(204);
});

export default router;
