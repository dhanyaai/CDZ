import { Router } from "express";
import { eq, sql, and, inArray, asc } from "drizzle-orm";
import { db, leadsTable, leadItemsTable, opportunitiesTable, clientsTable, usersTable, quotesTable, salesOrdersTable, shipmentsTable, invoicesTable, activitiesTable } from "@workspace/db";

const router = Router();

router.get("/v1/leads", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: leadsTable.id, title: leadsTable.title, clientId: leadsTable.clientId,
      companyName: sql<string>`COALESCE(${leadsTable.companyName}, ${clientsTable.companyName})`,
      contactName: leadsTable.contactName, email: leadsTable.email, phone: leadsTable.phone,
      source: leadsTable.source, status: leadsTable.status,
      estimatedValue: leadsTable.estimatedValue, ownerId: leadsTable.ownerId,
      ownerName: usersTable.name, notes: leadsTable.notes,
      qty: leadsTable.qty, budget: leadsTable.budget, products: leadsTable.products,
      leadDate: leadsTable.leadDate,
      deliveryTime: leadsTable.deliveryTime, deliveryDate: leadsTable.deliveryDate,
      cityOfDelivery: leadsTable.cityOfDelivery,
      branding: leadsTable.branding, percentage: leadsTable.percentage, totalValue: leadsTable.totalValue,
      customProducts: leadsTable.customProducts,
      createdAt: leadsTable.createdAt, updatedAt: leadsTable.updatedAt,
    })
    .from(leadsTable)
    .leftJoin(clientsTable, eq(leadsTable.clientId, clientsTable.id))
    .leftJoin(usersTable, eq(leadsTable.ownerId, usersTable.id))
    .where(eq(leadsTable.companyId, req.companyId))
    .orderBy(leadsTable.createdAt);
  res.json(rows.map((r) => ({
    ...r, estimatedValue: r.estimatedValue ? Number(r.estimatedValue) : null,
    budget: r.budget ? Number(r.budget) : null,
    percentage: r.percentage ? Number(r.percentage) : null,
    totalValue: r.totalValue ? Number(r.totalValue) : null,
    leadDate: r.leadDate?.toISOString() ?? null,
    deliveryDate: r.deliveryDate?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
  })));
});

function serializeLead(lead: typeof leadsTable.$inferSelect) {
  return {
    ...lead,
    estimatedValue: lead.estimatedValue ? Number(lead.estimatedValue) : null,
    budget: lead.budget ? Number(lead.budget) : null,
    percentage: lead.percentage ? Number(lead.percentage) : null,
    totalValue: lead.totalValue ? Number(lead.totalValue) : null,
    leadDate: lead.leadDate?.toISOString() ?? null,
    deliveryDate: lead.deliveryDate?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(), updatedAt: lead.updatedAt.toISOString(),
  };
}

router.post("/v1/leads", async (req, res): Promise<void> => {
  const { title, clientId, companyName, contactName, email, phone, source, status, estimatedValue, ownerId, notes,
    qty, budget, products, customProducts, leadDate, deliveryTime, deliveryDate, cityOfDelivery, branding, percentage, totalValue } = req.body ?? {};
  if (!title) { res.status(400).json({ error: "title is required" }); return; }
  const [lead] = await db.insert(leadsTable).values({
    companyId: req.companyId, title, clientId, companyName, contactName, email, phone, source,
    status: status ?? "new", estimatedValue, ownerId, notes,
    qty, budget, products, customProducts,
    leadDate: leadDate ? new Date(leadDate) : null,
    deliveryTime,
    deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
    cityOfDelivery,
    branding, percentage, totalValue,
  }).returning();
  res.status(201).json(serializeLead(lead));
});

router.patch("/v1/leads/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const fields = ["title", "clientId", "companyName", "contactName", "email", "phone", "source", "status", "estimatedValue", "ownerId", "notes",
    "qty", "budget", "products", "customProducts", "deliveryTime", "cityOfDelivery", "branding", "percentage", "totalValue"] as const;
  const updates: Record<string, unknown> = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.leadDate !== undefined) {
    updates.leadDate = req.body.leadDate ? new Date(req.body.leadDate) : null;
  }
  if (req.body.deliveryDate !== undefined) {
    updates.deliveryDate = req.body.deliveryDate ? new Date(req.body.deliveryDate) : null;
  }
  const [lead] = await db.update(leadsTable).set(updates).where(and(eq(leadsTable.id, id), eq(leadsTable.companyId, req.companyId))).returning();
  if (!lead) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializeLead(lead));
});

router.delete("/v1/leads/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(leadsTable).where(and(eq(leadsTable.id, id), eq(leadsTable.companyId, req.companyId)));
  res.sendStatus(204);
});

router.get("/v1/leads/:id/items", async (req, res): Promise<void> => {
  const leadId = parseInt(req.params.id as string, 10);
  const [lead] = await db.select({ id: leadsTable.id }).from(leadsTable)
    .where(and(eq(leadsTable.id, leadId), eq(leadsTable.companyId, req.companyId)));
  if (!lead) { res.status(404).json({ error: "Not found" }); return; }
  const items = await db.select().from(leadItemsTable)
    .where(eq(leadItemsTable.leadId, leadId))
    .orderBy(asc(leadItemsTable.slNo), asc(leadItemsTable.id));
  res.json(items.map(i => ({
    ...i,
    budget: i.budget ? Number(i.budget) : null,
    margin: i.margin ? Number(i.margin) : null,
    createdAt: i.createdAt.toISOString(),
  })));
});

router.post("/v1/leads/:id/items", async (req, res): Promise<void> => {
  const leadId = parseInt(req.params.id as string, 10);
  const [lead] = await db.select({ id: leadsTable.id }).from(leadsTable)
    .where(and(eq(leadsTable.id, leadId), eq(leadsTable.companyId, req.companyId)));
  if (!lead) { res.status(404).json({ error: "Not found" }); return; }
  const { slNo, productName, customProduct, qty, budget, margin } = req.body ?? {};
  const toNum = (v: unknown) => v != null && v !== "" ? Number(v) : null;
  const [item] = await db.insert(leadItemsTable).values({
    leadId, slNo: slNo ?? 1,
    productName: productName || null, customProduct: customProduct || null,
    qty: toNum(qty), budget: toNum(budget) != null ? String(toNum(budget)) : null, margin: toNum(margin) != null ? String(toNum(margin)) : null,
  }).returning();
  res.status(201).json({ ...item, budget: item.budget ? Number(item.budget) : null, margin: item.margin ? Number(item.margin) : null, createdAt: item.createdAt.toISOString() });
});

router.delete("/v1/leads/:id/items", async (req, res): Promise<void> => {
  const leadId = parseInt(req.params.id as string, 10);
  const [lead] = await db.select({ id: leadsTable.id }).from(leadsTable)
    .where(and(eq(leadsTable.id, leadId), eq(leadsTable.companyId, req.companyId)));
  if (!lead) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(leadItemsTable).where(eq(leadItemsTable.leadId, leadId));
  res.sendStatus(204);
});

router.delete("/v1/leads/:id/items/:itemId", async (req, res): Promise<void> => {
  const leadId = parseInt(req.params.id as string, 10);
  const itemId = parseInt(req.params.itemId as string, 10);
  await db.delete(leadItemsTable).where(and(eq(leadItemsTable.id, itemId), eq(leadItemsTable.leadId, leadId)));
  res.sendStatus(204);
});

router.post("/v1/leads/:id/convert-to-client", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [lead] = await db.select().from(leadsTable).where(and(eq(leadsTable.id, id), eq(leadsTable.companyId, req.companyId)));
  if (!lead) { res.status(404).json({ error: "Not found" }); return; }

  if (!lead.email) { res.status(400).json({ error: "Lead must have an email address to convert to a client" }); return; }

  // If already linked to an existing client, return it
  if (lead.clientId) {
    const [existing] = await db.select().from(clientsTable).where(and(eq(clientsTable.id, lead.clientId), eq(clientsTable.companyId, req.companyId)));
    if (existing) { res.json({ ...existing, createdAt: existing.createdAt.toISOString(), alreadyExisted: true }); return; }
  }

  const [client] = await db.insert(clientsTable).values({
    companyId: req.companyId,
    companyName: lead.companyName ?? lead.title,
    contactPerson: lead.contactName ?? "—",
    email: lead.email,
    phone: lead.phone ?? null,
  }).returning();

  await db.update(leadsTable).set({ clientId: client.id }).where(eq(leadsTable.id, id));

  res.status(201).json({ ...client, createdAt: client.createdAt.toISOString() });
});

router.post("/v1/leads/:id/convert", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [lead] = await db.select().from(leadsTable).where(and(eq(leadsTable.id, id), eq(leadsTable.companyId, req.companyId)));
  if (!lead) { res.status(404).json({ error: "Not found" }); return; }
  const [opp] = await db.insert(opportunitiesTable).values({
    companyId: req.companyId, title: lead.title, clientId: lead.clientId, leadId: lead.id,
    stage: "enquiry", value: lead.estimatedValue, ownerId: lead.ownerId,
  }).returning();
  await db.update(leadsTable).set({ status: "converted" }).where(eq(leadsTable.id, id));
  res.status(201).json(opp);
});

router.get("/v1/opportunities", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: opportunitiesTable.id, title: opportunitiesTable.title,
      clientId: opportunitiesTable.clientId, clientName: clientsTable.companyName,
      leadId: opportunitiesTable.leadId, stage: opportunitiesTable.stage,
      value: opportunitiesTable.value, probability: opportunitiesTable.probability,
      expectedCloseDate: opportunitiesTable.expectedCloseDate,
      ownerId: opportunitiesTable.ownerId, ownerName: usersTable.name,
      notes: opportunitiesTable.notes,
      createdAt: opportunitiesTable.createdAt, updatedAt: opportunitiesTable.updatedAt,
    })
    .from(opportunitiesTable)
    .leftJoin(clientsTable, eq(opportunitiesTable.clientId, clientsTable.id))
    .leftJoin(usersTable, eq(opportunitiesTable.ownerId, usersTable.id))
    .where(eq(opportunitiesTable.companyId, req.companyId))
    .orderBy(opportunitiesTable.createdAt);
  res.json(rows.map((r) => ({
    ...r, value: r.value ? Number(r.value) : null,
    expectedCloseDate: r.expectedCloseDate?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
  })));
});

router.post("/v1/opportunities", async (req, res): Promise<void> => {
  const { title, clientId, leadId, stage, value, probability, expectedCloseDate, ownerId, notes } = req.body ?? {};
  if (!title) { res.status(400).json({ error: "title is required" }); return; }
  const [opp] = await db.insert(opportunitiesTable).values({
    companyId: req.companyId, title, clientId, leadId, stage: stage ?? "enquiry",
    value, probability: probability ?? 50,
    expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
    ownerId, notes,
  }).returning();
  res.status(201).json(opp);
});

router.patch("/v1/opportunities/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const fields = ["title", "clientId", "stage", "value", "probability", "ownerId", "notes"] as const;
  const updates: Record<string, unknown> = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.expectedCloseDate !== undefined) {
    updates.expectedCloseDate = req.body.expectedCloseDate ? new Date(req.body.expectedCloseDate) : null;
  }
  const [opp] = await db.update(opportunitiesTable).set(updates).where(and(eq(opportunitiesTable.id, id), eq(opportunitiesTable.companyId, req.companyId))).returning();
  if (!opp) { res.status(404).json({ error: "Not found" }); return; }
  res.json(opp);
});

router.delete("/v1/opportunities/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(opportunitiesTable).where(and(eq(opportunitiesTable.id, id), eq(opportunitiesTable.companyId, req.companyId)));
  res.sendStatus(204);
});

router.get("/v1/leads/:id/history", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [lead] = await db.select({ id: leadsTable.id }).from(leadsTable)
    .where(and(eq(leadsTable.id, id), eq(leadsTable.companyId, req.companyId)));
  if (!lead) { res.status(404).json({ error: "Not found" }); return; }

  const [opportunities, activities] = await Promise.all([
    db.select({
      id: opportunitiesTable.id, title: opportunitiesTable.title,
      stage: opportunitiesTable.stage, value: opportunitiesTable.value,
      createdAt: opportunitiesTable.createdAt,
    }).from(opportunitiesTable).where(eq(opportunitiesTable.leadId, id)),
    db.select({
      id: activitiesTable.id, type: activitiesTable.type,
      subject: activitiesTable.subject, dueDate: activitiesTable.dueDate,
      completedAt: activitiesTable.completedAt, createdAt: activitiesTable.createdAt,
    }).from(activitiesTable).where(eq(activitiesTable.leadId, id)),
  ]);

  const oppIds = opportunities.map(o => o.id);
  const quotes = oppIds.length
    ? await db.select({
        id: quotesTable.id, quoteNumber: quotesTable.quoteNumber,
        subject: quotesTable.subject, status: quotesTable.status,
        totalAmount: quotesTable.totalAmount, opportunityId: quotesTable.opportunityId,
        createdAt: quotesTable.createdAt,
      }).from(quotesTable).where(inArray(quotesTable.opportunityId, oppIds))
    : [];

  const quoteIds = quotes.map(q => q.id);
  const salesOrders = quoteIds.length
    ? await db.select({
        id: salesOrdersTable.id, orderNumber: salesOrdersTable.orderNumber,
        status: salesOrdersTable.status, grandTotal: salesOrdersTable.grandTotal,
        quoteId: salesOrdersTable.quoteId, createdAt: salesOrdersTable.createdAt,
      }).from(salesOrdersTable).where(inArray(salesOrdersTable.quoteId, quoteIds))
    : [];

  const soIds = salesOrders.map(s => s.id);
  const [shipments, invoices] = soIds.length
    ? await Promise.all([
        db.select({
          id: shipmentsTable.id, shipmentNumber: shipmentsTable.shipmentNumber,
          status: shipmentsTable.status, courierPartner: shipmentsTable.courierPartner,
          dispatchDate: shipmentsTable.dispatchDate, salesOrderId: shipmentsTable.salesOrderId,
          createdAt: shipmentsTable.createdAt,
        }).from(shipmentsTable).where(inArray(shipmentsTable.salesOrderId, soIds)),
        db.select({
          id: invoicesTable.id, invoiceNumber: invoicesTable.invoiceNumber,
          status: invoicesTable.status, grandTotal: invoicesTable.grandTotal,
          salesOrderId: invoicesTable.salesOrderId, createdAt: invoicesTable.createdAt,
        }).from(invoicesTable).where(inArray(invoicesTable.salesOrderId, soIds)),
      ])
    : [[], []];

  res.json({
    opportunities: opportunities.map(o => ({ ...o, value: o.value ? Number(o.value) : null, createdAt: o.createdAt.toISOString() })),
    quotes: quotes.map(q => ({ ...q, totalAmount: Number(q.totalAmount), createdAt: q.createdAt.toISOString() })),
    salesOrders: salesOrders.map(s => ({ ...s, grandTotal: Number(s.grandTotal), createdAt: s.createdAt.toISOString() })),
    shipments: shipments.map(s => ({ ...s, dispatchDate: s.dispatchDate?.toISOString() ?? null, createdAt: s.createdAt.toISOString() })),
    invoices: invoices.map(i => ({ ...i, grandTotal: Number(i.grandTotal), createdAt: i.createdAt.toISOString() })),
    activities: activities.map(a => ({ ...a, dueDate: a.dueDate?.toISOString() ?? null, completedAt: a.completedAt?.toISOString() ?? null, createdAt: a.createdAt.toISOString() })),
  });
});

export default router;
