import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, contactsTable } from "@workspace/db";

const router = Router();

router.get("/v1/clients/:clientId/contacts", async (req, res): Promise<void> => {
  const clientId = parseInt(req.params.clientId as string, 10);
  const contacts = await db.select().from(contactsTable).where(eq(contactsTable.clientId, clientId)).orderBy(contactsTable.isPrimary);
  res.json(contacts.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })));
});

router.post("/v1/clients/:clientId/contacts", async (req, res): Promise<void> => {
  const clientId = parseInt(req.params.clientId as string, 10);
  const { firstName, lastName, designation, department, email, phone, isPrimary, notes } = req.body ?? {};
  if (!firstName) {
    res.status(400).json({ error: "firstName is required" });
    return;
  }
  const [contact] = await db.insert(contactsTable).values({
    clientId, firstName, lastName, designation, department, email, phone,
    isPrimary: !!isPrimary, notes,
  }).returning();
  res.status(201).json({ ...contact, createdAt: contact.createdAt.toISOString() });
});

router.patch("/v1/contacts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const fields = ["firstName", "lastName", "designation", "department", "email", "phone", "isPrimary", "notes"] as const;
  const updates: Record<string, unknown> = {};
  for (const f of fields) if (req.body[f] != null) updates[f] = req.body[f];
  const [contact] = await db.update(contactsTable).set(updates).where(eq(contactsTable.id, id)).returning();
  if (!contact) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...contact, createdAt: contact.createdAt.toISOString() });
});

router.delete("/v1/contacts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(contactsTable).where(eq(contactsTable.id, id));
  res.sendStatus(204);
});

export default router;
