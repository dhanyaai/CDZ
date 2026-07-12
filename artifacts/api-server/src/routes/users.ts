import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, usersTable, userCompaniesTable, companiesTable } from "@workspace/db";
import { hashPassword } from "../lib/password";

const router = Router();

function serializeUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    companyId: u.companyId,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  };
}

router.get("/v1/users", async (req, res): Promise<void> => {
  const users = await db.select().from(usersTable).where(eq(usersTable.companyId, req.companyId)).orderBy(usersTable.createdAt);
  res.json(users.map(serializeUser));
});

router.post("/v1/users", async (req, res): Promise<void> => {
  const { name, email, password, role } = req.body ?? {};
  if (!name || !email || !password || !role) {
    res.status(400).json({ error: "name, email, password, and role are required" });
    return;
  }
  const [user] = await db
    .insert(usersTable)
    .values({ companyId: req.companyId, name, email, passwordHash: hashPassword(password), role })
    .returning();
  await db.insert(userCompaniesTable).values({ userId: user.id, companyId: req.companyId }).onConflictDoNothing();
  res.status(201).json(serializeUser(user));
});

router.get("/v1/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [user] = await db.select().from(usersTable).where(and(eq(usersTable.id, id), eq(usersTable.companyId, req.companyId)));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(serializeUser(user));
});

router.patch("/v1/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { name, email, role, isActive, password } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (name != null) updates.name = name;
  if (email != null) updates.email = email;
  if (role != null) updates.role = role;
  if (isActive != null) updates.isActive = isActive;
  if (password) updates.passwordHash = hashPassword(password);
  const [user] = await db.update(usersTable).set(updates)
    .where(and(eq(usersTable.id, id), eq(usersTable.companyId, req.companyId)))
    .returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(serializeUser(user));
});

router.delete("/v1/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [user] = await db.delete(usersTable).where(and(eq(usersTable.id, id), eq(usersTable.companyId, req.companyId))).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.sendStatus(204);
});

router.get("/v1/users/:id/companies", async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id as string, 10);
  const rows = await db
    .select({ companyId: userCompaniesTable.companyId, companyName: companiesTable.name })
    .from(userCompaniesTable)
    .leftJoin(companiesTable, eq(userCompaniesTable.companyId, companiesTable.id))
    .where(eq(userCompaniesTable.userId, userId));
  res.json(rows);
});

router.post("/v1/users/:id/companies/:companyId", async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id as string, 10);
  const companyId = parseInt(req.params.companyId as string, 10);
  await db.insert(userCompaniesTable).values({ userId, companyId }).onConflictDoNothing();
  res.sendStatus(201);
});

router.delete("/v1/users/:id/companies/:companyId", async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id as string, 10);
  const companyId = parseInt(req.params.companyId as string, 10);
  await db.delete(userCompaniesTable)
    .where(and(eq(userCompaniesTable.userId, userId), eq(userCompaniesTable.companyId, companyId)));
  res.sendStatus(204);
});

export default router;
