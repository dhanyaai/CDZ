import { Router } from "express";
import { eq, and, gte, lte, SQL, desc } from "drizzle-orm";
import { db, auditLogsTable, usersTable } from "@workspace/db";

const router = Router();

router.get("/v1/audit-logs", async (req, res): Promise<void> => {
  const { entity, userId, from, to, limit } = req.query as Record<string, string | undefined>;
  const conditions: SQL[] = [eq(auditLogsTable.companyId, req.companyId)];
  if (entity) conditions.push(eq(auditLogsTable.entity, entity));
  if (userId) conditions.push(eq(auditLogsTable.userId, parseInt(userId, 10)));
  if (from) conditions.push(gte(auditLogsTable.createdAt, new Date(from)));
  if (to) conditions.push(lte(auditLogsTable.createdAt, new Date(to + "T23:59:59.999Z")));

  const rows = await db
    .select({ log: auditLogsTable, userName: usersTable.name })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
    .where(and(...conditions))
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(parseInt(limit ?? "200", 10));

  res.json(rows.map((r) => ({
    id: r.log.id,
    entity: r.log.entity,
    entityId: r.log.entityId,
    action: r.log.action,
    userId: r.log.userId ?? null,
    userName: r.userName ?? null,
    oldValues: r.log.oldValues ?? null,
    newValues: r.log.newValues ?? null,
    ip: r.log.ip ?? null,
    createdAt: r.log.createdAt.toISOString(),
  })));
});

router.post("/v1/audit-logs", async (req, res): Promise<void> => {
  const { entity, entityId, action, oldValues, newValues } = req.body ?? {};
  if (!entity || entityId == null || !action) {
    res.status(400).json({ error: "entity, entityId, and action are required" }); return;
  }
  const [log] = await db.insert(auditLogsTable).values({
    companyId: req.companyId,
    userId: (req as any).userId ?? null,
    entity, entityId, action,
    oldValues: oldValues ?? null,
    newValues: newValues ?? null,
    ip: req.ip ?? null,
  }).returning();
  res.status(201).json(log);
});

export default router;
