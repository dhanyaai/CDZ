import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, contactsTable, clientsTable } from "@workspace/db";

const router = Router();

function serialize(c: typeof contactsTable.$inferSelect & { clientName?: string | null }) {
  return {
    id: c.id,
    clientId: c.clientId,
    clientName: c.clientName ?? null,
    firstName: c.firstName,
    lastName: c.lastName ?? null,
    designation: c.designation ?? null,
    department: c.department ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
    isPrimary: c.isPrimary,
    notes: c.notes ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/v1/contacts", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: contactsTable.id,
      clientId: contactsTable.clientId,
      firstName: contactsTable.firstName,
      lastName: contactsTable.lastName,
      designation: contactsTable.designation,
      department: contactsTable.department,
      email: contactsTable.email,
      phone: contactsTable.phone,
      isPrimary: contactsTable.isPrimary,
      notes: contactsTable.notes,
      createdAt: contactsTable.createdAt,
      clientName: clientsTable.companyName,
    })
    .from(contactsTable)
    .leftJoin(clientsTable, eq(contactsTable.clientId, clientsTable.id))
    .where(eq(contactsTable.companyId, req.companyId))
    .orderBy(desc(contactsTable.isPrimary), contactsTable.firstName);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/v1/contacts", async (req, res): Promise<void> => {
  const { clientId, firstName, lastName, designation, department, email, phone, isPrimary, notes } = req.body ?? {};
  if (!firstName) { res.status(400).json({ error: "firstName is required" }); return; }
  if (!clientId) { res.status(400).json({ error: "clientId is required" }); return; }
  const [contact] = await db.insert(contactsTable).values({
    companyId: req.companyId, clientId: Number(clientId),
    firstName, lastName: lastName || null, designation: designation || null,
    department: department || null, email: email || null, phone: phone || null,
    isPrimary: !!isPrimary, notes: notes || null,
  }).returning();
  res.status(201).json(serialize({ ...contact, clientName: null }));
});

router.get("/v1/clients/:clientId/contacts", async (req, res): Promise<void> => {
  const clientId = parseInt(req.params.clientId as string, 10);
  const [client] = await db.select().from(clientsTable).where(and(eq(clientsTable.id, clientId), eq(clientsTable.companyId, req.companyId)));
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }
  const contacts = await db.select().from(contactsTable)
    .where(and(eq(contactsTable.clientId, clientId), eq(contactsTable.companyId, req.companyId)))
    .orderBy(desc(contactsTable.isPrimary));
  res.json(contacts.map(c => serialize({ ...c, clientName: client.companyName })));
});

router.post("/v1/clients/:clientId/contacts", async (req, res): Promise<void> => {
  const clientId = parseInt(req.params.clientId as string, 10);
  const [client] = await db.select().from(clientsTable).where(and(eq(clientsTable.id, clientId), eq(clientsTable.companyId, req.companyId)));
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }
  const { firstName, lastName, designation, department, email, phone, isPrimary, notes } = req.body ?? {};
  if (!firstName) { res.status(400).json({ error: "firstName is required" }); return; }
  const [contact] = await db.insert(contactsTable).values({
    companyId: req.companyId, clientId, firstName, lastName: lastName || null,
    designation: designation || null, department: department || null,
    email: email || null, phone: phone || null, isPrimary: !!isPrimary, notes: notes || null,
  }).returning();
  res.status(201).json(serialize({ ...contact, clientName: client.companyName }));
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
  res.json(serialize({ ...contact, clientName: null }));
});

router.delete("/v1/contacts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(contactsTable).where(and(eq(contactsTable.id, id), eq(contactsTable.companyId, req.companyId)));
  res.sendStatus(204);
});

export default router;
