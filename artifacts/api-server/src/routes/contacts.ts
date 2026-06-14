import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, contactsTable, clientsTable } from "@workspace/db";

const router = Router();

router.get("/v1/clients/:clientId/contacts", async (req, res): Promise<void> => {
  const clientId = parseInt(req.params.clientId as string, 10);
  const [client] = await db.select().from(clientsTable).where(and(eq(clientsTable.id, clientId), eq(clientsTable.companyId, req.companyId)));
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }
  const contacts = await db.select().from(contactsTable)
    .where(and(eq(contactsTable.clientId, clientId), eq(contactsTable.companyId, req.companyId)))
    .orderBy(contactsTable.isPrimary);
  res.json(contacts.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })));
});

router.post("/v1/clients/:clientId/contacts", async (req, res): Promise<void> => {
  const clientId = parseInt(req.params.clientId as string, 10);
  const [client] = await db.select().from(clientsTable).where(and(eq(clientsTable.id, clientId), eq(clientsTable.companyId, req.companyId)));
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }
  const { firstName, lastName, designation, department, email, phone, isPrimary, notes } = req.body ?? {};
  if (!firstName) { res.status(400).json({ error: "firstName is required" }); return; }
  const [contact] = await db.insert(contactsTable).values({
    companyId: req.companyId, clientId, firstName, lastName, designation, department, email, phone,
    isPrimary: !!isPrimary, notes,
  }).returning();
  res.status(201).json({ ...contact, createdAt: contact.createdAt.toISOString() });
});

router.patch("/v1/contacts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const fields = ["firstName", "lastName", "designation", "department", "email", "phone", "isPrimary", "notes"] as const;
  const updates: Record<string, unknown> = {};
  for (const f of fields) if (req.body[f] != null) updates[f] = req.body[f];
  const [contact] = await db.update(contactsTable).set(updates)
    .where(and(eq(contactsTable.id, id), eq(contactsTable.companyId, req.companyId)))
    .returning();
  if (!contact) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...contact, createdAt: contact.createdAt.toISOString() });
});

router.delete("/v1/contacts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(contactsTable).where(and(eq(contactsTable.id, id), eq(contactsTable.companyId, req.companyId)));
  res.sendStatus(204);
});

export default router;
