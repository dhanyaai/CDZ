import { randomBytes } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { db, sessionsTable } from "@workspace/db";

// Sessions are stored in the database so they survive server restarts and
// work across multiple instances behind a load balancer (the production
// deployment runs more than one replica).

const TTL_MS = 1000 * 60 * 60 * 24 * 7;

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(
  userId: number,
  companyId: number,
  role: string,
): Promise<string> {
  const token = generateToken();
  await db.insert(sessionsTable).values({
    token,
    userId,
    companyId,
    role,
    expiresAt: new Date(Date.now() + TTL_MS),
  });
  return token;
}

export async function getSession(
  token: string,
): Promise<{ userId: number; companyId: number; role: string } | null> {
  const [s] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token));
  if (!s) return null;
  if (s.expiresAt.getTime() < Date.now()) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    return null;
  }
  return { userId: s.userId, companyId: s.companyId, role: s.role };
}

export async function getSessionUserId(token: string): Promise<number | null> {
  return (await getSession(token))?.userId ?? null;
}

export async function destroySession(token: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
}

setInterval(
  () => {
    db.delete(sessionsTable)
      .where(lt(sessionsTable.expiresAt, new Date()))
      .catch(() => {
        /* best-effort cleanup; retried next interval */
      });
  },
  1000 * 60 * 60,
).unref();
