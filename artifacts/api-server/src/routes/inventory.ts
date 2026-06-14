import { Router } from "express";
import { eq, and, SQL } from "drizzle-orm";
import { db, productsTable, inventoryMovementsTable, warehouseLocationsTable } from "@workspace/db";

const router = Router();

router.get("/v1/inventory", async (req, res): Promise<void> => {
  const { productId, lowStock } = req.query as { productId?: string; lowStock?: string };

  const products = await db.select().from(productsTable).where(eq(productsTable.companyId, req.companyId)).orderBy(productsTable.name);

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

router.get("/v1/inventory/by-location", async (req, res): Promise<void> => {
  const locations = await db.select().from(warehouseLocationsTable).where(eq(warehouseLocationsTable.companyId, req.companyId)).orderBy(warehouseLocationsTable.name);

  const movements = await db.select({ movement: inventoryMovementsTable, product: productsTable })
    .from(inventoryMovementsTable)
    .leftJoin(productsTable, eq(inventoryMovementsTable.productId, productsTable.id))
    .where(eq(inventoryMovementsTable.companyId, req.companyId));

  const byLocation: Record<number, { locationId: number; locationName: string; locationCode: string; items: Record<number, { productId: number; productName: string; qty: number }> }> = {};

  for (const loc of locations) {
    byLocation[loc.id] = { locationId: loc.id, locationName: loc.name, locationCode: loc.code, items: {} };
  }
  byLocation[0] = { locationId: 0, locationName: "Unassigned", locationCode: "—", items: {} };

  for (const { movement, product } of movements) {
    const locId = movement.locationId ?? 0;
    if (!byLocation[locId]) continue;
    const pid = movement.productId;
    if (!byLocation[locId].items[pid]) {
      byLocation[locId].items[pid] = { productId: pid, productName: product?.name ?? "Unknown", qty: 0 };
    }
    if (movement.type === "inward" || movement.type === "transfer_in") {
      byLocation[locId].items[pid].qty += movement.quantity;
    } else {
      byLocation[locId].items[pid].qty -= movement.quantity;
    }
  }

  const result = Object.values(byLocation)
    .map((loc) => ({ ...loc, items: Object.values(loc.items).filter((i) => i.qty > 0) }))
    .filter((loc) => loc.locationId === 0 || loc.items.length > 0);

  res.json(result);
});

router.post("/v1/inventory/transfer", async (req, res): Promise<void> => {
  const { fromLocationId, toLocationId, productId, quantity, reference } = req.body ?? {};
  if (!productId || quantity == null || quantity <= 0) {
    res.status(400).json({ error: "productId and positive quantity are required" });
    return;
  }

  const [outMovement, inMovement] = await db.transaction(async (tx) => {
    const [out] = await tx.insert(inventoryMovementsTable).values({
      companyId: req.companyId, productId, locationId: fromLocationId ?? null,
      type: "transfer_out", quantity, reference: reference ?? "Transfer",
    }).returning();
    const [inn] = await tx.insert(inventoryMovementsTable).values({
      companyId: req.companyId, productId, locationId: toLocationId ?? null,
      type: "transfer_in", quantity, reference: reference ?? "Transfer",
    }).returning();
    return [out, inn];
  });

  res.status(201).json({ outMovement, inMovement });
});

router.get("/v1/inventory/movements", async (req, res): Promise<void> => {
  const { productId, type } = req.query as { productId?: string; type?: string };
  const conditions: SQL[] = [eq(inventoryMovementsTable.companyId, req.companyId)];
  if (productId) conditions.push(eq(inventoryMovementsTable.productId, parseInt(productId, 10)));
  if (type) conditions.push(eq(inventoryMovementsTable.type, type));

  const rows = await db
    .select({ movement: inventoryMovementsTable, product: productsTable })
    .from(inventoryMovementsTable)
    .leftJoin(productsTable, eq(inventoryMovementsTable.productId, productsTable.id))
    .where(and(...conditions))
    .orderBy(inventoryMovementsTable.createdAt);

  res.json(rows.map((r) => ({
    id: r.movement.id,
    productId: r.movement.productId,
    productName: r.product?.name ?? "Unknown",
    locationId: r.movement.locationId ?? null,
    type: r.movement.type,
    quantity: r.movement.quantity,
    batch: r.movement.batch ?? null,
    reference: r.movement.reference ?? null,
    createdAt: r.movement.createdAt.toISOString(),
  })));
});

router.post("/v1/inventory/movements", async (req, res): Promise<void> => {
  const { productId, type, quantity, batch, reference, locationId } = req.body ?? {};
  if (!productId || !type || quantity == null) {
    res.status(400).json({ error: "productId, type, and quantity are required" });
    return;
  }

  const [movement] = await db
    .insert(inventoryMovementsTable)
    .values({ companyId: req.companyId, productId, type, quantity, batch, reference, locationId: locationId ?? null })
    .returning();

  const [product] = await db.select().from(productsTable).where(and(eq(productsTable.id, productId), eq(productsTable.companyId, req.companyId)));
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
    locationId: row.movement.locationId ?? null,
    type: row.movement.type,
    quantity: row.movement.quantity,
    batch: row.movement.batch ?? null,
    reference: row.movement.reference ?? null,
    createdAt: row.movement.createdAt.toISOString(),
  });
});

export default router;
