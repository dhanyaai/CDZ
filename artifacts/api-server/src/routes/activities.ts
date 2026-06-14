import { Router } from "express";
import { eq, and, isNull, isNotNull, desc } from "drizzle-orm";
import { db, activitiesTable, clientsTable, usersTable, leadsTable } from "@workspace/db";

const router = Router();

router.get("/v1/activities", async (req, res): Promise<void> => {
  const { clientId, leadId, pending } = req.query as { clientId?: string; leadId?: string; pending?: string };

  const conditions = [eq(activitiesTable.companyId, req.companyId)];
  if (clientId) conditions.push(eq(activitiesTable.clientId, parseInt(clientId, 10)));
  if (leadId) conditions.push(eq(activitiesTable.leadId, parseInt(leadId, 10)));
  if (pending === "true") conditions.push(isNull(activitiesTable.completedAt));

  const rows = await db
    .select({
      id: activitiesTable.id,
      clientId: activitiesTable.clientId,
      clientName: clientsTable.companyName,
      leadId: activitiesTable.leadId,
      leadTitle: leadsTable.title,
      type: activitiesTable.type,
      subject: activitiesTable.subject,
      description: activitiesTable.description,
      dueDate: activitiesTable.dueDate,
      completedAt: activitiesTable.completedAt,
      ownerId: activitiesTable.ownerId,
      ownerName: usersTable.name,
      createdAt: activitiesTable.createdAt,
    })
    .from(activitiesTable)
    .leftJoin(clientsTable, eq(activitiesTable.clientId, clientsTable.id))
    .leftJoin(leadsTable, eq(activitiesTable.leadId, leadsTable.id))
    .leftJoin(usersTable, eq(activitiesTable.ownerId, usersTable.id))
    .where(and(...conditions))
    .orderBy(desc(activitiesTable.createdAt));

  res.json(rows.map((r) => ({
    ...r,
    dueDate: r.dueDate?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/v1/activities", async (req, res): Promise<void> => {
  const { clientId, leadId, type, subject, description, dueDate, ownerId } = req.body ?? {};
  if (!type || !subject) { res.status(400).json({ error: "type and subject required" }); return; }

  if (clientId) {
    const [cl] = await db.select({ id: clientsTable.id }).from(clientsTable)
      .where(and(eq(clientsTable.id, clientId), eq(clientsTable.companyId, req.companyId)));
    if (!cl) { res.status(404).json({ error: "Client not found" }); return; }
  }
  if (leadId) {
    const [lead] = await db.select({ id: leadsTable.id }).from(leadsTable)
      .where(and(eq(leadsTable.id, leadId), eq(leadsTable.companyId, req.companyId)));
    if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }
  }
  if (ownerId) {
    const [owner] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(and(eq(usersTable.id, ownerId), eq(usersTable.companyId, req.companyId)));
    if (!owner) { res.status(404).json({ error: "Owner not found" }); return; }
  }

  const [a] = await db.insert(activitiesTable).values({
    companyId: req.companyId, clientId, leadId, type, subject, description,
    dueDate: dueDate ? new Date(dueDate) : null, ownerId,
  }).returning();
  res.status(201).json({ ...a, dueDate: a.dueDate?.toISOString() ?? null, completedAt: a.completedAt?.toISOString() ?? null, createdAt: a.createdAt.toISOString() });
});

router.patch("/v1/activities/:id/complete", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [a] = await db.update(activitiesTable).set({ completedAt: new Date() })
    .where(and(eq(activitiesTable.id, id), eq(activitiesTable.companyId, req.companyId))).returning();
  if (!a) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...a, dueDate: a.dueDate?.toISOString() ?? null, completedAt: a.completedAt?.toISOString() ?? null, createdAt: a.createdAt.toISOString() });
});

router.patch("/v1/activities/:id/reopen", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [a] = await db.update(activitiesTable).set({ completedAt: null })
    .where(and(eq(activitiesTable.id, id), eq(activitiesTable.companyId, req.companyId))).returning();
  if (!a) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...a, dueDate: a.dueDate?.toISOString() ?? null, completedAt: null, createdAt: a.createdAt.toISOString() });
});

router.delete("/v1/activities/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(activitiesTable).where(and(eq(activitiesTable.id, id), eq(activitiesTable.companyId, req.companyId)));
  res.sendStatus(204);
});

export default router;
