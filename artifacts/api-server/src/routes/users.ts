import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const router = Router();

function serializeUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  };
}

router.get("/v1/users", async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
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
    .values({ name, email, passwordHash: password, role })
    .returning();

  res.status(201).json(serializeUser(user));
});

router.get("/v1/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(serializeUser(user));
});

router.patch("/v1/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { name, email, role, isActive } = req.body ?? {};

  const updates: Record<string, unknown> = {};
  if (name != null) updates.name = name;
  if (email != null) updates.email = email;
  if (role != null) updates.role = role;
  if (isActive != null) updates.isActive = isActive;

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(serializeUser(user));
});

router.delete("/v1/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [user] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
