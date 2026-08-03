import { recordStatusChange } from "../lib/statusHistory";
import { Router } from "express";
import { eq, sql, and, inArray, asc } from "drizzle-orm";
import { db, leadsTable, leadItemsTable, opportunitiesTable, clientsTable, usersTable, quotesTable, salesOrdersTable, shipmentsTable, invoicesTable, activitiesTable, statusHistoryTable } from "@workspace/db";

const router = Router();

router.get("/v1/leads", async (req, res): Promise<void> => {
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
  const [lead] = await db.select({ id: leadsTable.id }).from(leadsTable)
    .where(and(eq(leadsTable.id, id), eq(leadsTable.companyId, req.companyId)));

  const statusReason = typeof req.body?.statusReason === "string" && req.body.statusReason.trim() ? req.body.statusReason.trim() : null;
  if (!lead) { res.status(404).json({ error: "Not found" }); return; }
  if (req.body.status !== undefined && oldStatus !== null) {
    await recordStatusChange({
      companyId: req.companyId, entityType: "lead", entityId: id, fromStatus: oldStatus, toStatus: lead.status, changedBy: req.userId,
      reason: typeof req.body.statusReason === "string" && req.body.statusReason.trim() ? req.body.statusReason.trim() : null,
      reasonNote: typeof req.body.statusReasonNote === "string" && req.body.statusReasonNote.trim() ? req.body.statusReasonNote.trim() : null,
    });
  }
  res.json(serializeLead(lead));
});

router.delete("/v1/leads/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const fields = ["title", "clientId", "stage", "value", "probability", "ownerId", "notes"] as const;
  const updates: Record<string, unknown> = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.leadDate !== undefined) {
    updates.leadDate = req.body.leadDate ? new Date(req.body.leadDate) : null;
  }
  if (req.body.deliveryDate !== undefined) {
    updates.deliveryDate = req.body.deliveryDate ? new Date(req.body.deliveryDate) : null;
  }
  let oldStatus: string | null = null;
  if (req.body.status !== undefined) {
    const [cur] = await db.select({ stage: opportunitiesTable.stage }).from(opportunitiesTable)
      .where(and(eq(opportunitiesTable.id, id), eq(opportunitiesTable.companyId, req.companyId)));
    oldStatus = cur?.status ?? null;
  }
  const [lead] = await db.select({ id: leadsTable.id }).from(leadsTable)
    .where(and(eq(leadsTable.id, id), eq(leadsTable.companyId, req.companyId)));

  const statusReason = typeof req.body?.statusReason === "string" && req.body.statusReason.trim() ? req.body.statusReason.trim() : null;
  if (!lead) { res.status(404).json({ error: "Not found" }); return; }
  if (req.body.status !== undefined && oldStatus !== null) {
    await recordStatusChange({
      companyId: req.companyId, entityType: "lead", entityId: id, fromStatus: oldStatus, toStatus: lead.status, changedBy: req.userId,
      reason: typeof req.body.statusReason === "string" && req.body.statusReason.trim() ? req.body.statusReason.trim() : null,
      reasonNote: typeof req.body.statusReasonNote === "string" && req.body.statusReasonNote.trim() ? req.body.statusReasonNote.trim() : null,
    });
  }
  res.json(serializeLead(lead));
});

router.delete("/v1/leads/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const deleted = await db.delete(opportunitiesTable).where(and(eq(opportunitiesTable.id, id), eq(opportunitiesTable.companyId, req.companyId))).returning({ id: opportunitiesTable.id });
  if (deleted.length) {
    // Remove status history so reports (e.g. recent losses) don't show orphan entries
    await db.delete(statusHistoryTable).where(and(
      eq(statusHistoryTable.companyId, req.companyId),
      eq(statusHistoryTable.entityType, "lead"),
      eq(statusHistoryTable.entityId, id),
    ));
  }
  res.sendStatus(204);
});

router.get("/v1/leads/:id/items", async (req, res): Promise<void> => {
  const leadId = parseInt(req.params.id as string, 10);
  const [lead] = await db.select({ id: leadsTable.id }).from(leadsTable)
    .where(and(eq(leadsTable.id, id), eq(leadsTable.companyId, req.companyId)));

  const statusReason = typeof req.body?.statusReason === "string" && req.body.statusReason.trim() ? req.body.statusReason.trim() : null;
  if (!lead) { res.status(404).json({ error: "Not found" }); return; }
  const items = await db.select().from(leadItemsTable)
    .where(eq(leadItemsTable.leadId, leadId))
    .orderBy(asc(leadItemsTable.slNo), asc(leadItemsTable.id));
  res.json(items.map(i => ({
    ...i,
    budget: i.budget ? Number(i.budget) : null,
    transportation: i.transportation ? Number(i.transportation) : null,
    margin: i.margin ? Number(i.margin) : null,
    createdAt: i.createdAt.toISOString(),
  })));
});

router.post("/v1/leads/:id/items", async (req, res): Promise<void> => {
  const leadId = parseInt(req.params.id as string, 10);
  const [lead] = await db.select({ id: leadsTable.id }).from(leadsTable)
    .where(and(eq(leadsTable.id, id), eq(leadsTable.companyId, req.companyId)));

  const statusReason = typeof req.body?.statusReason === "string" && req.body.statusReason.trim() ? req.body.statusReason.trim() : null;
  if (!lead) { res.status(404).json({ error: "Not found" }); return; }
  const { slNo, productName, customProduct, qty, category, budget, transportation, margin } = req.body ?? {};
  const toNum = (v: unknown) => v != null && v !== "" ? Number(v) : null;
  const [item] = await db.insert(leadItemsTable).values({
    leadId, slNo: slNo ?? 1,
    productName: productName || null, customProduct: customProduct || null,
    qty: toNum(qty),
    category: category || null,
    budget: toNum(budget) != null ? String(toNum(budget)) : null,
    transportation: toNum(transportation) != null ? String(toNum(transportation)) : null,
    margin: toNum(margin) != null ? String(toNum(margin)) : null,
  }).returning();
  res.status(201).json({ ...item, budget: item.budget ? Number(item.budget) : null, transportation: item.transportation ? Number(item.transportation) : null, margin: item.margin ? Number(item.margin) : null, createdAt: item.createdAt.toISOString() });
});

router.delete("/v1/leads/:id/items", async (req, res): Promise<void> => {
  const leadId = parseInt(req.params.id as string, 10);
  const [lead] = await db.select({ id: leadsTable.id }).from(leadsTable)
    .where(and(eq(leadsTable.id, id), eq(leadsTable.companyId, req.companyId)));

  const statusReason = typeof req.body?.statusReason === "string" && req.body.statusReason.trim() ? req.body.statusReason.trim() : null;
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
  const [lead] = await db.select({ id: leadsTable.id }).from(leadsTable)
    .where(and(eq(leadsTable.id, id), eq(leadsTable.companyId, req.companyId)));

  const statusReason = typeof req.body?.statusReason === "string" && req.body.statusReason.trim() ? req.body.statusReason.trim() : null;
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
  const [lead] = await db.select({ id: leadsTable.id }).from(leadsTable)
    .where(and(eq(leadsTable.id, id), eq(leadsTable.companyId, req.companyId)));

  const statusReason = typeof req.body?.statusReason === "string" && req.body.statusReason.trim() ? req.body.statusReason.trim() : null;
  const [opp] = await db.update(opportunitiesTable).set(updates).where(and(eq(opportunitiesTable.id, id), eq(opportunitiesTable.companyId, req.companyId))).returning();
  await db.update(leadsTable).set({ status: "converted" }).where(eq(leadsTable.id, id));
  await recordStatusChange({ companyId: req.companyId, entityType: "lead", entityId: id, fromStatus: lead.status, toStatus: "converted", changedBy: req.userId, reason: statusReason, reasonNote: statusReasonNote });
  await recordStatusChange({ companyId: req.companyId, entityType: "opportunity", entityId: opp.id, fromStatus: null, toStatus: "enquiry", changedBy: req.userId });
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
  const [opp] = await db.update(opportunitiesTable).set(updates).where(and(eq(opportunitiesTable.id, id), eq(opportunitiesTable.companyId, req.companyId))).returning();
  if (!opp) { res.status(404).json({ error: "Not found" }); return; }
  if (req.body.stage !== undefined && oldStage !== null) {
    await recordStatusChange({
      companyId: req.companyId, entityType: "opportunity", entityId: id, fromStatus: oldStage, toStatus: opp.stage, changedBy: req.userId,
      reason: typeof req.body.statusReason === "string" && req.body.statusReason.trim() ? req.body.statusReason.trim() : null,
      reasonNote: typeof req.body.statusReasonNote === "string" && req.body.statusReasonNote.trim() ? req.body.statusReasonNote.trim() : null,
    });
  }
  res.json(opp);
});

router.delete("/v1/opportunities/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const fields = ["title", "clientId", "stage", "value", "probability", "ownerId", "notes"] as const;
  const updates: Record<string, unknown> = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.expectedCloseDate !== undefined) {
    updates.expectedCloseDate = req.body.expectedCloseDate ? new Date(req.body.expectedCloseDate) : null;
  }
  let oldStage: string | null = null;
  if (req.body.stage !== undefined) {
    const [cur] = await db.select({ stage: opportunitiesTable.stage }).from(opportunitiesTable)
      .where(and(eq(opportunitiesTable.id, id), eq(opportunitiesTable.companyId, req.companyId)));
    oldStage = cur?.stage ?? null;
  }
  const [opp] = await db.update(opportunitiesTable).set(updates).where(and(eq(opportunitiesTable.id, id), eq(opportunitiesTable.companyId, req.companyId))).returning();
  if (!opp) { res.status(404).json({ error: "Not found" }); return; }
  if (req.body.stage !== undefined && oldStage !== null) {
    await recordStatusChange({
      companyId: req.companyId, entityType: "opportunity", entityId: id, fromStatus: oldStage, toStatus: opp.stage, changedBy: req.userId,
      reason: typeof req.body.statusReason === "string" && req.body.statusReason.trim() ? req.body.statusReason.trim() : null,
      reasonNote: typeof req.body.statusReasonNote === "string" && req.body.statusReasonNote.trim() ? req.body.statusReasonNote.trim() : null,
    });
  }
  res.json(opp);
});

router.delete("/v1/opportunities/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const deleted = await db.delete(opportunitiesTable).where(and(eq(opportunitiesTable.id, id), eq(opportunitiesTable.companyId, req.companyId))).returning({ id: opportunitiesTable.id });
  if (deleted.length) {
    // Remove status history so reports (e.g. recent losses) don't show orphan entries
    await db.delete(statusHistoryTable).where(and(
      eq(statusHistoryTable.companyId, req.companyId),
      eq(statusHistoryTable.entityType, "opportunity"),
      eq(statusHistoryTable.entityId, id),
    ));
  }
  res.sendStatus(204);
});

router.get("/v1/leads/:id/history", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [lead] = await db.select({ id: leadsTable.id }).from(leadsTable)
    .where(and(eq(leadsTable.id, id), eq(leadsTable.companyId, req.companyId)));

  const statusReason = typeof req.body?.statusReason === "string" && req.body.statusReason.trim() ? req.body.statusReason.trim() : null;
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

  const statusReasonNote = typeof req.body?.statusReasonNote === "string" && req.body.statusReasonNote.trim() ? req.body.statusReasonNote.trim() : null;
