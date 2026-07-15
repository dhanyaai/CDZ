import { Router } from "express";
import { eq, ilike, and, isNull } from "drizzle-orm";
import { db, servicesTable } from "@workspace/db";

const router = Router();

const SERVICE_TYPES = ["BRANDING", "KITTING_JOBWORK", "DESIGN", "EVENT", "OTHER"] as const;

function serialize(s: typeof servicesTable.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    type: s.type,
    sacCode: s.sacCode ?? null,
    gstRate: Number(s.gstRate),
    unit: s.unit,
    unitPrice: Number(s.unitPrice),
    costEstimate: Number(s.costEstimate),
    description: s.description ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/v1/services", async (req, res): Promise<void> => {
  const { search, type } = req.query as { search?: string; type?: string };
  const rows = await db
    .select()
    .from(servicesTable)
    .where(and(
      eq(servicesTable.companyId, req.companyId),
      isNull(servicesTable.deletedAt),
      ...(search ? [ilike(servicesTable.name, `%${search}%`)] : []),
      ...(type ? [eq(servicesTable.type, type)] : []),
    ))
    .orderBy(servicesTable.name);
  res.json(rows.map(serialize));
});

router.post("/v1/services", async (req, res): Promise<void> => {
  const { name, type, sacCode, gstRate, unit, unitPrice, costEstimate, description } = req.body ?? {};
  if (!name) {
    res.status(400).json({ success: false, error: { code: "VALIDATION", message: "name is required" } });
    return;
  }
  if (type && !SERVICE_TYPES.includes(type)) {
    res.status(400).json({ success: false, error: { code: "VALIDATION", message: `type must be one of: ${SERVICE_TYPES.join(", ")}` } });
    return;
  }
  const [row] = await db.insert(servicesTable).values({
    companyId: req.companyId,
    name,
    type: type ?? "OTHER",
    sacCode: sacCode ?? null,
    gstRate: String(gstRate ?? 18),
    unit: unit ?? "JOB",
    unitPrice: String(unitPrice ?? 0),
    costEstimate: String(costEstimate ?? 0),
    description: description ?? null,
  }).returning();
  res.status(201).json({ success: true, data: serialize(row) });
});

router.get("/v1/services/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [row] = await db.select().from(servicesTable).where(and(
    eq(servicesTable.id, id),
    eq(servicesTable.companyId, req.companyId),
    isNull(servicesTable.deletedAt),
  ));
  if (!row) { res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Service not found" } }); return; }
  res.json({ success: true, data: serialize(row) });
});

router.patch("/v1/services/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const updates: Record<string, unknown> = {};
  const fields = ["name", "type", "sacCode", "unit", "description"] as const;
  for (const f of fields) {
    if (req.body[f] != null) updates[f] = req.body[f];
  }
  if (req.body.gstRate != null) updates.gstRate = String(req.body.gstRate);
  if (req.body.unitPrice != null) updates.unitPrice = String(req.body.unitPrice);
  if (req.body.costEstimate != null) updates.costEstimate = String(req.body.costEstimate);

  const [row] = await db.update(servicesTable).set(updates)
    .where(and(eq(servicesTable.id, id), eq(servicesTable.companyId, req.companyId), isNull(servicesTable.deletedAt)))
    .returning();
  if (!row) { res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Service not found" } }); return; }
  res.json({ success: true, data: serialize(row) });
});

router.delete("/v1/services/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [row] = await db.update(servicesTable).set({ deletedAt: new Date() })
    .where(and(eq(servicesTable.id, id), eq(servicesTable.companyId, req.companyId), isNull(servicesTable.deletedAt)))
    .returning();
  if (!row) { res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Service not found" } }); return; }
  res.sendStatus(204);
});

export default router;
