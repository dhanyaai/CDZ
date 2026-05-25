import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, companySettingsTable, usersTable } from "@workspace/db";
import { hashPassword, verifyPassword } from "../lib/password";
import { getSessionUserId } from "../lib/sessions";
import { requireAdmin } from "../lib/requireAdmin";

const router = Router();

async function getOrCreateSettings() {
  const [existing] = await db.select().from(companySettingsTable).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(companySettingsTable).values({}).returning();
  return created;
}

// GET is readable by any authenticated user (used to brand invoices/quotes in UI).
router.get("/v1/settings/company", async (_req, res): Promise<void> => {
  const s = await getOrCreateSettings();
  res.json(s);
});

router.patch("/v1/settings/company", requireAdmin, async (req, res): Promise<void> => {
  const current = await getOrCreateSettings();
  const allowed = [
    "companyName", "legalName", "gstNumber", "pan", "email", "phone",
    "address", "city", "state", "pincode", "website", "logoUrl",
    "invoicePrefix", "quotePrefix", "defaultGstPct", "currency",
  ] as const;
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (req.body?.[k] !== undefined) updates[k] = req.body[k];
  const [updated] = await db
    .update(companySettingsTable)
    .set(updates)
    .where(eq(companySettingsTable.id, current.id))
    .returning();
  res.json(updated);
});

router.post("/v1/auth/change-password", async (req, res): Promise<void> => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = getSessionUserId(auth.slice(7));
  if (userId == null) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword required" });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "newPassword must be at least 6 characters" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  await db
    .update(usersTable)
    .set({ passwordHash: hashPassword(newPassword) })
    .where(eq(usersTable.id, userId));

  res.json({ success: true });
});

export default router;
