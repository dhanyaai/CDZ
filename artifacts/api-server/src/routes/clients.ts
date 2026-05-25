import { Router } from "express";
import { eq, ilike, and, SQL } from "drizzle-orm";
import { db, clientsTable, clientInteractionsTable } from "@workspace/db";

const router = Router();

function serializeClient(c: typeof clientsTable.$inferSelect) {
  return {
    id: c.id,
    companyName: c.companyName,
    contactPerson: c.contactPerson,
    email: c.email,
    phone: c.phone ?? null,
    gstNumber: c.gstNumber ?? null,
    industry: c.industry ?? null,
    tags: c.tags ?? null,
    billingAddress: c.billingAddress ?? null,
    shippingAddress: c.shippingAddress ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/v1/clients", async (req, res): Promise<void> => {
  const { search, industry } = req.query as { search?: string; industry?: string };
  const conditions: SQL[] = [];
  if (search) {
    conditions.push(ilike(clientsTable.companyName, `%${search}%`));
  }
  if (industry) {
    conditions.push(eq(clientsTable.industry, industry));
  }

  const clients = conditions.length > 0
    ? await db.select().from(clientsTable).where(and(...conditions)).orderBy(clientsTable.companyName)
    : await db.select().from(clientsTable).orderBy(clientsTable.companyName);

  res.json(clients.map(serializeClient));
});

router.post("/v1/clients", async (req, res): Promise<void> => {
  const { companyName, contactPerson, email, phone, gstNumber, industry, tags, billingAddress, shippingAddress } = req.body ?? {};
  if (!companyName || !contactPerson || !email) {
    res.status(400).json({ error: "companyName, contactPerson, and email are required" });
    return;
  }

  const [client] = await db
    .insert(clientsTable)
    .values({ companyName, contactPerson, email, phone, gstNumber, industry, tags, billingAddress, shippingAddress })
    .returning();

  res.status(201).json(serializeClient(client));
});

router.get("/v1/clients/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, id));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(serializeClient(client));
});

router.patch("/v1/clients/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const fields = ["companyName", "contactPerson", "email", "phone", "gstNumber", "industry", "tags", "billingAddress", "shippingAddress"] as const;
  const updates: Record<string, unknown> = {};
  for (const f of fields) {
    if (req.body[f] != null) updates[f] = req.body[f];
  }

  const [client] = await db.update(clientsTable).set(updates).where(eq(clientsTable.id, id)).returning();
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(serializeClient(client));
});

router.delete("/v1/clients/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [client] = await db.delete(clientsTable).where(eq(clientsTable.id, id)).returning();
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/v1/clients/:id/interactions", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const interactions = await db
    .select()
    .from(clientInteractionsTable)
    .where(eq(clientInteractionsTable.clientId, id))
    .orderBy(clientInteractionsTable.createdAt);

  res.json(interactions.map((i) => ({
    id: i.id,
    clientId: i.clientId,
    type: i.type,
    notes: i.notes,
    createdAt: i.createdAt.toISOString(),
  })));
});

router.post("/v1/clients/:id/interactions", async (req, res): Promise<void> => {
  const clientId = parseInt(req.params.id as string, 10);
  const { type, notes } = req.body ?? {};
  if (!type || !notes) {
    res.status(400).json({ error: "type and notes are required" });
    return;
  }

  const [interaction] = await db
    .insert(clientInteractionsTable)
    .values({ clientId, type, notes })
    .returning();

  res.status(201).json({
    id: interaction.id,
    clientId: interaction.clientId,
    type: interaction.type,
    notes: interaction.notes,
    createdAt: interaction.createdAt.toISOString(),
  });
});

export default router;
