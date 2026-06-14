import { Router } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, leadsTable, opportunitiesTable, clientsTable, usersTable } from "@workspace/db";

const router = Router();

router.get("/v1/leads", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: leadsTable.id, title: leadsTable.title, clientId: leadsTable.clientId,
      companyName: sql<string>`COALESCE(${leadsTable.companyName}, ${clientsTable.companyName})`,
      contactName: leadsTable.contactName, email: leadsTable.email, phone: leadsTable.phone,
      source: leadsTable.source, status: leadsTable.status,
      estimatedValue: leadsTable.estimatedValue, ownerId: leadsTable.ownerId,
      ownerName: usersTable.name, notes: leadsTable.notes,
      createdAt: leadsTable.createdAt, updatedAt: leadsTable.updatedAt,
    })
    .from(leadsTable)
    .leftJoin(clientsTable, eq(leadsTable.clientId, clientsTable.id))
    .leftJoin(usersTable, eq(leadsTable.ownerId, usersTable.id))
    .where(eq(leadsTable.companyId, req.companyId))
    .orderBy(leadsTable.createdAt);
  res.json(rows.map((r) => ({
    ...r, estimatedValue: r.estimatedValue ? Number(r.estimatedValue) : null,
    createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
  })));
});

router.post("/v1/leads", async (req, res): Promise<void> => {
  const { title, clientId, companyName, contactName, email, phone, source, status, estimatedValue, ownerId, notes } = req.body ?? {};
  if (!title) { res.status(400).json({ error: "title is required" }); return; }
  const [lead] = await db.insert(leadsTable).values({
    companyId: req.companyId, title, clientId, companyName, contactName, email, phone, source,
    status: status ?? "new", estimatedValue, ownerId, notes,
  }).returning();
  res.status(201).json({ ...lead, estimatedValue: lead.estimatedValue ? Number(lead.estimatedValue) : null,
    createdAt: lead.createdAt.toISOString(), updatedAt: lead.updatedAt.toISOString() });
});

router.patch("/v1/leads/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const fields = ["title", "clientId", "companyName", "contactName", "email", "phone", "source", "status", "estimatedValue", "ownerId", "notes"] as const;
  const updates: Record<string, unknown> = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  const [lead] = await db.update(leadsTable).set(updates).where(and(eq(leadsTable.id, id), eq(leadsTable.companyId, req.companyId))).returning();
  if (!lead) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...lead, estimatedValue: lead.estimatedValue ? Number(lead.estimatedValue) : null,
    createdAt: lead.createdAt.toISOString(), updatedAt: lead.updatedAt.toISOString() });
});

router.delete("/v1/leads/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(leadsTable).where(and(eq(leadsTable.id, id), eq(leadsTable.companyId, req.companyId)));
  res.sendStatus(204);
});

router.post("/v1/leads/:id/convert", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [lead] = await db.select().from(leadsTable).where(and(eq(leadsTable.id, id), eq(leadsTable.companyId, req.companyId)));
  if (!lead) { res.status(404).json({ error: "Not found" }); return; }
  const [opp] = await db.insert(opportunitiesTable).values({
    companyId: req.companyId, title: lead.title, clientId: lead.clientId, leadId: lead.id,
    stage: "qualified", value: lead.estimatedValue, ownerId: lead.ownerId,
  }).returning();
  await db.update(leadsTable).set({ status: "converted" }).where(eq(leadsTable.id, id));
  res.status(201).json(opp);
});

router.get("/v1/opportunities", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: opportunitiesTable.id, title: opportunitiesTable.title,
      clientId: opportunitiesTable.clientId, clientName: clientsTable.companyName,
      leadId: opportunitiesTable.leadId, stage: opportunitiesTable.stage,
      value: opportunitiesTable.value, probability: opportunitiesTable.probability,
      expectedCloseDate: opportunitiesTable.expectedCloseDate,
      ownerId: opportunitiesTable.ownerId, ownerName: usersTable.name,
      notes: opportunitiesTable.notes,
      createdAt: opportunitiesTable.createdAt, updatedAt: opportunitiesTable.updatedAt,
    })
    .from(opportunitiesTable)
    .leftJoin(clientsTable, eq(opportunitiesTable.clientId, clientsTable.id))
    .leftJoin(usersTable, eq(opportunitiesTable.ownerId, usersTable.id))
    .where(eq(opportunitiesTable.companyId, req.companyId))
    .orderBy(opportunitiesTable.createdAt);
  res.json(rows.map((r) => ({
    ...r, value: r.value ? Number(r.value) : null,
    expectedCloseDate: r.expectedCloseDate?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
  })));
});

router.post("/v1/opportunities", async (req, res): Promise<void> => {
  const { title, clientId, leadId, stage, value, probability, expectedCloseDate, ownerId, notes } = req.body ?? {};
  if (!title) { res.status(400).json({ error: "title is required" }); return; }
  const [opp] = await db.insert(opportunitiesTable).values({
    companyId: req.companyId, title, clientId, leadId, stage: stage ?? "prospect",
    value, probability: probability ?? 50,
    expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
    ownerId, notes,
  }).returning();
  res.status(201).json(opp);
});

router.patch("/v1/opportunities/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const fields = ["title", "clientId", "stage", "value", "probability", "ownerId", "notes"] as const;
  const updates: Record<string, unknown> = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.expectedCloseDate !== undefined) {
    updates.expectedCloseDate = req.body.expectedCloseDate ? new Date(req.body.expectedCloseDate) : null;
  }
  const [opp] = await db.update(opportunitiesTable).set(updates).where(and(eq(opportunitiesTable.id, id), eq(opportunitiesTable.companyId, req.companyId))).returning();
  if (!opp) { res.status(404).json({ error: "Not found" }); return; }
  res.json(opp);
});

router.delete("/v1/opportunities/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(opportunitiesTable).where(and(eq(opportunitiesTable.id, id), eq(opportunitiesTable.companyId, req.companyId)));
  res.sendStatus(204);
});

export default router;
