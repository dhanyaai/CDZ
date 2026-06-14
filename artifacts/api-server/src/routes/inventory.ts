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

  const [product] = await db.select().from(productsTable)
    .where(and(eq(productsTable.id, productId), eq(productsTable.companyId, req.companyId)));
  if (!product) {
    res.status(404).json({ error: "Product not found or does not belong to this company" });
    return;
  }

  if (fromLocationId != null) {
    const [fromLoc] = await db.select().from(warehouseLocationsTable)
      .where(and(eq(warehouseLocationsTable.id, fromLocationId), eq(warehouseLocationsTable.companyId, req.companyId)));
    if (!fromLoc) {
      res.status(404).json({ error: "Source location not found or does not belong to this company" });
      return;
    }
  }

  if (toLocationId != null) {
    const [toLoc] = await db.select().from(warehouseLocationsTable)
      .where(and(eq(warehouseLocationsTable.id, toLocationId), eq(warehouseLocationsTable.companyId, req.companyId)));
    if (!toLoc) {
      res.status(404).json({ error: "Destination location not found or does not belong to this company" });
      return;
    }
  }

  const sourceMovements = await db.select().from(inventoryMovementsTable)
    .where(and(
      eq(inventoryMovementsTable.productId, productId),
      eq(inventoryMovementsTable.companyId, req.companyId),
      fromLocationId != null
        ? eq(inventoryMovementsTable.locationId, fromLocationId)
        : eq(inventoryMovementsTable.locationId, inventoryMovementsTable.locationId),
    ));

  const sourceStock = sourceMovements
    .filter((m) => (m.locationId ?? null) === (fromLocationId ?? null))
    .reduce((sum, m) => {
      if (m.type === "inward" || m.type === "transfer_in") return sum + m.quantity;
      return sum - m.quantity;
    }, 0);

  if (sourceStock < quantity) {
    res.status(400).json({ error: `Insufficient stock at source location. Available: ${sourceStock}` });
    return;
  }

  const transferBatch = `XFER-${Date.now()}`;
  const [outMovement, inMovement] = await db.transaction(async (tx) => {
    const [out] = await tx.insert(inventoryMovementsTable).values({
      companyId: req.companyId, productId, locationId: fromLocationId ?? null,
      type: "transfer_out", quantity, reference: reference ?? null, batch: transferBatch,
    }).returning();
    const [inn] = await tx.insert(inventoryMovementsTable).values({
      companyId: req.companyId, productId, locationId: toLocationId ?? null,
      type: "transfer_in", quantity, reference: reference ?? null, batch: transferBatch,
    }).returning();
    return [out, inn];
  });

  res.status(201).json({ outMovement, inMovement, batch: transferBatch });
});

router.get("/v1/inventory/transfers", async (req, res): Promise<void> => {
  const outRows = await db
    .select({ m: inventoryMovementsTable, product: productsTable, loc: warehouseLocationsTable })
    .from(inventoryMovementsTable)
    .leftJoin(productsTable, eq(inventoryMovementsTable.productId, productsTable.id))
    .leftJoin(warehouseLocationsTable, eq(inventoryMovementsTable.locationId, warehouseLocationsTable.id))
    .where(and(eq(inventoryMovementsTable.companyId, req.companyId), eq(inventoryMovementsTable.type, "transfer_out")))
    .orderBy(inventoryMovementsTable.id);

  const inRows = await db
    .select({ m: inventoryMovementsTable, loc: warehouseLocationsTable })
    .from(inventoryMovementsTable)
    .leftJoin(warehouseLocationsTable, eq(inventoryMovementsTable.locationId, warehouseLocationsTable.id))
    .where(and(eq(inventoryMovementsTable.companyId, req.companyId), eq(inventoryMovementsTable.type, "transfer_in")))
    .orderBy(inventoryMovementsTable.id);

  const inByBatch = new Map<string, typeof inRows[0]>();
  const inOrphans: typeof inRows = [];
  for (const row of inRows) {
    if (row.m.batch) inByBatch.set(row.m.batch, row);
    else inOrphans.push(row);
  }

  const transfers = outRows.map((out) => {
    const inn = out.m.batch ? inByBatch.get(out.m.batch) : undefined;
    return {
      batch: out.m.batch ?? null,
      productId: out.m.productId,
      productName: out.product?.name ?? "Unknown",
      quantity: out.m.quantity,
      fromLocationId: out.m.locationId ?? null,
      fromLocationName: out.loc?.name ?? "Unassigned",
      toLocationId: inn?.m.locationId ?? null,
      toLocationName: inn?.loc?.name ?? "Unassigned",
      reference: out.m.reference ?? inn?.m.reference ?? null,
      createdAt: out.m.createdAt.toISOString(),
    };
  });

  transfers.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(transfers);
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

  const [product] = await db.select().from(productsTable)
    .where(and(eq(productsTable.id, productId), eq(productsTable.companyId, req.companyId)));
  if (!product) {
    res.status(404).json({ error: "Product not found or does not belong to this company" });
    return;
  }

  if (locationId != null) {
    const [loc] = await db.select().from(warehouseLocationsTable)
      .where(and(eq(warehouseLocationsTable.id, locationId), eq(warehouseLocationsTable.companyId, req.companyId)));
    if (!loc) {
      res.status(404).json({ error: "Location not found or does not belong to this company" });
      return;
    }
  }

  const [movement] = await db
    .insert(inventoryMovementsTable)
    .values({ companyId: req.companyId, productId, type, quantity, batch, reference, locationId: locationId ?? null })
    .returning();

  const newStock = type === "inward"
    ? product.stockLevel + quantity
    : Math.max(0, product.stockLevel - quantity);
  await db.update(productsTable).set({ stockLevel: newStock }).where(eq(productsTable.id, productId));

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
