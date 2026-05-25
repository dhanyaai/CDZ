import { Router } from "express";
import { eq, and, SQL } from "drizzle-orm";
import { db, productsTable, inventoryMovementsTable } from "@workspace/db";

const router = Router();

router.get("/v1/inventory", async (req, res): Promise<void> => {
  const { productId, lowStock } = req.query as { productId?: string; lowStock?: string };

  const products = await db.select().from(productsTable).orderBy(productsTable.name);

  let filtered = products;
  if (productId) filtered = filtered.filter((p) => p.id === parseInt(productId, 10));
  if (lowStock === "true") filtered = filtered.filter((p) => p.stockLevel <= p.lowStockThreshold);

  res.json(filtered.map((p) => ({
    productId: p.id,
    productName: p.name,
    category: p.category,
    stockLevel: p.stockLevel,
    lowStockThreshold: p.lowStockThreshold,
    isLowStock: p.stockLevel <= p.lowStockThreshold,
  })));
});

router.get("/v1/inventory/movements", async (req, res): Promise<void> => {
  const { productId, type } = req.query as { productId?: string; type?: string };
  const conditions: SQL[] = [];
  if (productId) conditions.push(eq(inventoryMovementsTable.productId, parseInt(productId, 10)));
  if (type) conditions.push(eq(inventoryMovementsTable.type, type));

  const rows = await db
    .select({ movement: inventoryMovementsTable, product: productsTable })
    .from(inventoryMovementsTable)
    .leftJoin(productsTable, eq(inventoryMovementsTable.productId, productsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(inventoryMovementsTable.createdAt);

  res.json(rows.map((r) => ({
    id: r.movement.id,
    productId: r.movement.productId,
    productName: r.product?.name ?? "Unknown",
    type: r.movement.type,
    quantity: r.movement.quantity,
    batch: r.movement.batch ?? null,
    reference: r.movement.reference ?? null,
    createdAt: r.movement.createdAt.toISOString(),
  })));
});

router.post("/v1/inventory/movements", async (req, res): Promise<void> => {
  const { productId, type, quantity, batch, reference } = req.body ?? {};
  if (!productId || !type || quantity == null) {
    res.status(400).json({ error: "productId, type, and quantity are required" });
    return;
  }

  const [movement] = await db
    .insert(inventoryMovementsTable)
    .values({ productId, type, quantity, batch, reference })
    .returning();

  // Update stock level
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
  if (product) {
    const newStock = type === "inward"
      ? product.stockLevel + quantity
      : Math.max(0, product.stockLevel - quantity);
    await db.update(productsTable).set({ stockLevel: newStock }).where(eq(productsTable.id, productId));
  }

  const [row] = await db
    .select({ movement: inventoryMovementsTable, product: productsTable })
    .from(inventoryMovementsTable)
    .leftJoin(productsTable, eq(inventoryMovementsTable.productId, productsTable.id))
    .where(eq(inventoryMovementsTable.id, movement.id));

  res.status(201).json({
    id: row.movement.id,
    productId: row.movement.productId,
    productName: row.product?.name ?? "Unknown",
    type: row.movement.type,
    quantity: row.movement.quantity,
    batch: row.movement.batch ?? null,
    reference: row.movement.reference ?? null,
    createdAt: row.movement.createdAt.toISOString(),
  });
});

export default router;
