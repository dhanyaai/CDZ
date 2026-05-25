import { Router } from "express";
import { eq, ilike, and, lte, SQL } from "drizzle-orm";
import { db, productsTable, vendorsTable } from "@workspace/db";

const router = Router();

function serializeProduct(p: typeof productsTable.$inferSelect, vendorName?: string | null) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    costPrice: Number(p.costPrice),
    sellingPrice: Number(p.sellingPrice),
    stockLevel: p.stockLevel,
    lowStockThreshold: p.lowStockThreshold,
    vendorId: p.vendorId ?? null,
    vendorName: vendorName ?? null,
    imageUrl: p.imageUrl ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/v1/products", async (req, res): Promise<void> => {
  const { search, category, lowStock } = req.query as { search?: string; category?: string; lowStock?: string };
  const conditions: SQL[] = [];
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
  if (category) conditions.push(eq(productsTable.category, category));
  if (lowStock === "true") conditions.push(lte(productsTable.stockLevel, productsTable.lowStockThreshold));

  const rows = await db
    .select({
      product: productsTable,
      vendorName: vendorsTable.name,
    })
    .from(productsTable)
    .leftJoin(vendorsTable, eq(productsTable.vendorId, vendorsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(productsTable.name);

  res.json(rows.map((r) => serializeProduct(r.product, r.vendorName)));
});

router.post("/v1/products", async (req, res): Promise<void> => {
  const { name, category, costPrice, sellingPrice, stockLevel, lowStockThreshold, vendorId, imageUrl } = req.body ?? {};
  if (!name || !category || costPrice == null || sellingPrice == null) {
    res.status(400).json({ error: "name, category, costPrice, and sellingPrice are required" });
    return;
  }

  const [product] = await db
    .insert(productsTable)
    .values({
      name,
      category,
      costPrice: String(costPrice),
      sellingPrice: String(sellingPrice),
      stockLevel: stockLevel ?? 0,
      lowStockThreshold: lowStockThreshold ?? 10,
      vendorId: vendorId ?? null,
      imageUrl: imageUrl ?? null,
    })
    .returning();

  const vendorName = vendorId
    ? (await db.select().from(vendorsTable).where(eq(vendorsTable.id, vendorId)))[0]?.name
    : null;

  res.status(201).json(serializeProduct(product, vendorName));
});

router.get("/v1/products/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [row] = await db
    .select({ product: productsTable, vendorName: vendorsTable.name })
    .from(productsTable)
    .leftJoin(vendorsTable, eq(productsTable.vendorId, vendorsTable.id))
    .where(eq(productsTable.id, id));

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(serializeProduct(row.product, row.vendorName));
});

router.patch("/v1/products/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const updates: Record<string, unknown> = {};
  if (req.body.name != null) updates.name = req.body.name;
  if (req.body.category != null) updates.category = req.body.category;
  if (req.body.costPrice != null) updates.costPrice = String(req.body.costPrice);
  if (req.body.sellingPrice != null) updates.sellingPrice = String(req.body.sellingPrice);
  if (req.body.stockLevel != null) updates.stockLevel = req.body.stockLevel;
  if (req.body.lowStockThreshold != null) updates.lowStockThreshold = req.body.lowStockThreshold;
  if (req.body.vendorId != null) updates.vendorId = req.body.vendorId;
  if (req.body.imageUrl != null) updates.imageUrl = req.body.imageUrl;

  const [product] = await db.update(productsTable).set(updates).where(eq(productsTable.id, id)).returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const vendorName = product.vendorId
    ? (await db.select().from(vendorsTable).where(eq(vendorsTable.id, product.vendorId)))[0]?.name
    : null;

  res.json(serializeProduct(product, vendorName));
});

router.delete("/v1/products/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [product] = await db.delete(productsTable).where(eq(productsTable.id, id)).returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
