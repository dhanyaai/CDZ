import { Router } from "express";
import { and, eq, SQL } from "drizzle-orm";
import { db, fixedAssetsTable, warehouseLocationsTable } from "@workspace/db";

const router = Router();

function padId(id: number) { return `FA-${String(id).padStart(5, "0")}`; }

function serialize(a: typeof fixedAssetsTable.$inferSelect, locName?: string | null) {
  return {
    id: a.id,
    assetCode: a.assetCode,
    name: a.name,
    category: a.category,
    description: a.description ?? null,
    serialNumber: a.serialNumber ?? null,
    purchaseDate: a.purchaseDate,
    purchaseCost: Number(a.purchaseCost),
    usefulLifeYears: a.usefulLifeYears,
    depreciationMethod: a.depreciationMethod,
    residualValue: Number(a.residualValue),
    currentBookValue: Number(a.currentBookValue),
    locationId: a.locationId ?? null,
    locationName: locName ?? null,
    status: a.status,
    notes: a.notes ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    totalDepreciation: Number(a.purchaseCost) - Number(a.currentBookValue),
  };
}

// GET /v1/fixed-assets
router.get("/v1/fixed-assets", async (req, res): Promise<void> => {
  const { status, category } = req.query as { status?: string; category?: string };
  const conditions: SQL[] = [eq(fixedAssetsTable.companyId, req.companyId)];
  if (status) conditions.push(eq(fixedAssetsTable.status, status));
  if (category) conditions.push(eq(fixedAssetsTable.category, category));

  const rows = await db
    .select({ asset: fixedAssetsTable, location: warehouseLocationsTable })
    .from(fixedAssetsTable)
    .leftJoin(warehouseLocationsTable, eq(fixedAssetsTable.locationId, warehouseLocationsTable.id))
    .where(and(...conditions))
    .orderBy(fixedAssetsTable.assetCode);

  res.json(rows.map((r) => serialize(r.asset, r.location?.name)));
});

// GET /v1/fixed-assets/summary
router.get("/v1/fixed-assets/summary", async (req, res): Promise<void> => {
  const rows = await db
    .select({ asset: fixedAssetsTable })
    .from(fixedAssetsTable)
    .where(eq(fixedAssetsTable.companyId, req.companyId));

  const byCategory: Record<string, { count: number; totalCost: number; totalBV: number }> = {};
  let totalCost = 0;
  let totalBV = 0;
  let activeCount = 0;

  for (const { asset } of rows) {
    const cat = asset.category;
    if (!byCategory[cat]) byCategory[cat] = { count: 0, totalCost: 0, totalBV: 0 };
    const cost = Number(asset.purchaseCost);
    const bv = Number(asset.currentBookValue);
    byCategory[cat].count++;
    byCategory[cat].totalCost += cost;
    byCategory[cat].totalBV += bv;
    totalCost += cost;
    totalBV += bv;
    if (asset.status === "Active") activeCount++;
  }

  res.json({
    totalAssets: rows.length,
    activeAssets: activeCount,
    totalCost,
    totalBookValue: totalBV,
    totalDepreciation: totalCost - totalBV,
    byCategory: Object.entries(byCategory).map(([category, data]) => ({ category, ...data })),
  });
});

// POST /v1/fixed-assets
router.post("/v1/fixed-assets", async (req, res): Promise<void> => {
  const { name, category, description, serialNumber, purchaseDate, purchaseCost, usefulLifeYears, depreciationMethod, residualValue, locationId, notes } = req.body ?? {};
  if (!name || !category || !purchaseDate || purchaseCost == null) {
    res.status(400).json({ error: "name, category, purchaseDate, purchaseCost are required" }); return;
  }
  if (locationId != null) {
    const [loc] = await db.select().from(warehouseLocationsTable)
      .where(and(eq(warehouseLocationsTable.id, locationId), eq(warehouseLocationsTable.companyId, req.companyId)));
    if (!loc) { res.status(404).json({ error: "Location not found" }); return; }
  }
  const [asset] = await db.insert(fixedAssetsTable).values({
    companyId: req.companyId,
    assetCode: "FA-TEMP",
    name, category,
    description: description ?? null,
    serialNumber: serialNumber ?? null,
    purchaseDate,
    purchaseCost: String(purchaseCost),
    usefulLifeYears: usefulLifeYears ?? 5,
    depreciationMethod: depreciationMethod ?? "straight_line",
    residualValue: String(residualValue ?? 0),
    currentBookValue: String(purchaseCost),
    locationId: locationId ?? null,
    notes: notes ?? null,
    status: "Active",
  }).returning();

  await db.update(fixedAssetsTable).set({ assetCode: padId(asset.id) }).where(eq(fixedAssetsTable.id, asset.id));
  const [row] = await db.select({ asset: fixedAssetsTable, location: warehouseLocationsTable })
    .from(fixedAssetsTable).leftJoin(warehouseLocationsTable, eq(fixedAssetsTable.locationId, warehouseLocationsTable.id))
    .where(eq(fixedAssetsTable.id, asset.id));
  res.status(201).json(serialize(row.asset, row.location?.name));
});

// GET /v1/fixed-assets/:id
router.get("/v1/fixed-assets/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [row] = await db.select({ asset: fixedAssetsTable, location: warehouseLocationsTable })
    .from(fixedAssetsTable).leftJoin(warehouseLocationsTable, eq(fixedAssetsTable.locationId, warehouseLocationsTable.id))
    .where(and(eq(fixedAssetsTable.id, id), eq(fixedAssetsTable.companyId, req.companyId)));
  if (!row) { res.status(404).json({ error: "Asset not found" }); return; }
  res.json(serialize(row.asset, row.location?.name));
});

// PATCH /v1/fixed-assets/:id
router.patch("/v1/fixed-assets/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const updates: Record<string, unknown> = {};
  const fields = ["name", "category", "description", "serialNumber", "status", "notes", "locationId", "usefulLifeYears", "depreciationMethod"] as const;
  for (const f of fields) { if (req.body[f] !== undefined) updates[f] = req.body[f] ?? null; }

  const [updated] = await db.update(fixedAssetsTable).set(updates)
    .where(and(eq(fixedAssetsTable.id, id), eq(fixedAssetsTable.companyId, req.companyId))).returning();
  if (!updated) { res.status(404).json({ error: "Asset not found" }); return; }

  const [row] = await db.select({ asset: fixedAssetsTable, location: warehouseLocationsTable })
    .from(fixedAssetsTable).leftJoin(warehouseLocationsTable, eq(fixedAssetsTable.locationId, warehouseLocationsTable.id))
    .where(eq(fixedAssetsTable.id, id));
  res.json(serialize(row.asset, row.location?.name));
});

// POST /v1/fixed-assets/:id/depreciate
router.post("/v1/fixed-assets/:id/depreciate", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { amount } = req.body ?? {};
  if (!amount || amount <= 0) { res.status(400).json({ error: "amount must be positive" }); return; }

  const [asset] = await db.select().from(fixedAssetsTable)
    .where(and(eq(fixedAssetsTable.id, id), eq(fixedAssetsTable.companyId, req.companyId)));
  if (!asset) { res.status(404).json({ error: "Asset not found" }); return; }

  const newBV = Math.max(Number(asset.residualValue), Number(asset.currentBookValue) - amount);
  await db.update(fixedAssetsTable).set({ currentBookValue: String(newBV) }).where(eq(fixedAssetsTable.id, id));

  const [row] = await db.select({ asset: fixedAssetsTable, location: warehouseLocationsTable })
    .from(fixedAssetsTable).leftJoin(warehouseLocationsTable, eq(fixedAssetsTable.locationId, warehouseLocationsTable.id))
    .where(eq(fixedAssetsTable.id, id));
  res.json(serialize(row.asset, row.location?.name));
});

// DELETE /v1/fixed-assets/:id
router.delete("/v1/fixed-assets/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(fixedAssetsTable).where(and(eq(fixedAssetsTable.id, id), eq(fixedAssetsTable.companyId, req.companyId)));
  res.sendStatus(204);
});

export default router;
