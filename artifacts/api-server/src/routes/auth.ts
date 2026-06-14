import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { createSession, destroySession, getSession } from "../lib/sessions";
import { verifyPassword } from "../lib/password";

const router = Router();

router.post("/v1/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = createSession(user.id, user.companyId);

  res.json({
    token,
    companyId: user.companyId,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.post("/v1/auth/logout", async (req, res): Promise<void> => {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) destroySession(auth.slice(7));
  res.json({ success: true });
});

router.get("/v1/auth/me", async (req, res): Promise<void> => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  const session = getSession(auth.slice(7));
  if (session == null) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: session.companyId,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
