import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, activitiesTable, clientsTable, usersTable } from "@workspace/db";

const router = Router();

router.get("/v1/activities", async (req, res): Promise<void> => {
  const { clientId } = req.query as { clientId?: string };
  const query = db
    .select({
      id: activitiesTable.id, clientId: activitiesTable.clientId,
      clientName: clientsTable.companyName, type: activitiesTable.type,
      subject: activitiesTable.subject, description: activitiesTable.description,
      dueDate: activitiesTable.dueDate, completedAt: activitiesTable.completedAt,
      ownerId: activitiesTable.ownerId, ownerName: usersTable.name,
      createdAt: activitiesTable.createdAt,
    })
    .from(activitiesTable)
    .leftJoin(clientsTable, eq(activitiesTable.clientId, clientsTable.id))
    .leftJoin(usersTable, eq(activitiesTable.ownerId, usersTable.id));

  const rows = clientId
    ? await query.where(and(eq(activitiesTable.companyId, req.companyId), eq(activitiesTable.clientId, parseInt(clientId, 10)))).orderBy(desc(activitiesTable.createdAt))
    : await query.where(eq(activitiesTable.companyId, req.companyId)).orderBy(desc(activitiesTable.createdAt));

  res.json(rows.map((r) => ({
    ...r,
    dueDate: r.dueDate?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/v1/activities", async (req, res): Promise<void> => {
  const { clientId, type, subject, description, dueDate, ownerId } = req.body ?? {};
  if (!type || !subject) { res.status(400).json({ error: "type and subject required" }); return; }
  const [a] = await db.insert(activitiesTable).values({
    companyId: req.companyId, clientId, type, subject, description,
    dueDate: dueDate ? new Date(dueDate) : null, ownerId,
  }).returning();
  res.status(201).json(a);
});

router.patch("/v1/activities/:id/complete", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [a] = await db.update(activitiesTable).set({ completedAt: new Date() }).where(and(eq(activitiesTable.id, id), eq(activitiesTable.companyId, req.companyId))).returning();
  if (!a) { res.status(404).json({ error: "Not found" }); return; }
  res.json(a);
});

router.delete("/v1/activities/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(activitiesTable).where(and(eq(activitiesTable.id, id), eq(activitiesTable.companyId, req.companyId)));
  res.sendStatus(204);
});

export default router;
