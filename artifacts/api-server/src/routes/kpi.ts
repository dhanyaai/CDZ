import { Router } from "express";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import {
  db, leadsTable, opportunitiesTable, quotesTable, salesOrdersTable,
  invoicesTable, paymentsTable, usersTable, purchaseOrdersTable,
  grnTable, vendorsTable, orderProcessingFormsTable, statusHistoryTable,
} from "@workspace/db";

const router = Router();

// Stage deadline targets in days (defaults; can be made configurable later)
export const KPI_DEADLINES = {
  leadToOpportunity: 1,   // follow up on a lead within 1 day
  opportunityToQuote: 2,  // send quote within 2 days
  quoteToOrder: 3,        // order confirmation within 3 days
  orderToInvoice: 7,      // invoice within 7 days of order
  invoiceToPayment: 30,   // payment within 30 days of invoice
  poToGrn: 7,             // goods received within 7 days of PO
};

// Internal order-processing step targets, in days from sales-order creation
export const PROCESSING_DEADLINES = {
  procurement: 2,
  designStart: 2,
  mockupApproval: 4,
  preProduction: 6,
  productionStart: 7,
  qc: 10,
  stockUpdate: 12,
  dispatch: 14,
};

const DAY_MS = 24 * 60 * 60 * 1000;
const daysBetween = (a: Date, b: Date) => Math.round(((b.getTime() - a.getTime()) / DAY_MS) * 10) / 10;

// GET /v1/reports/kpi — funnel timing, team KPIs, purchase timing
router.get("/v1/reports/kpi", async (req, res): Promise<void> => {
  const cid = req.companyId;

  const [leads, opps, quotes, orders, invoices, payments, users] = await Promise.all([
    db.select({
      id: leadsTable.id, title: leadsTable.title, companyName: leadsTable.companyName,
      status: leadsTable.status, ownerId: leadsTable.ownerId, createdAt: leadsTable.createdAt,
    }).from(leadsTable).where(eq(leadsTable.companyId, cid)),
    db.select({
      id: opportunitiesTable.id, leadId: opportunitiesTable.leadId, stage: opportunitiesTable.stage,
      ownerId: opportunitiesTable.ownerId, createdAt: opportunitiesTable.createdAt,
    }).from(opportunitiesTable).where(eq(opportunitiesTable.companyId, cid)),
    db.select({
      id: quotesTable.id, opportunityId: quotesTable.opportunityId, createdAt: quotesTable.createdAt,
    }).from(quotesTable).where(eq(quotesTable.companyId, cid)),
    db.select({
      id: salesOrdersTable.id, quoteId: salesOrdersTable.quoteId, orderNumber: salesOrdersTable.orderNumber,
      status: salesOrdersTable.status, grandTotal: salesOrdersTable.grandTotal, createdAt: salesOrdersTable.createdAt,
    }).from(salesOrdersTable).where(and(eq(salesOrdersTable.companyId, cid), isNull(salesOrdersTable.deletedAt))),
    db.select({
      id: invoicesTable.id, salesOrderId: invoicesTable.salesOrderId, status: invoicesTable.status,
      createdAt: invoicesTable.createdAt,
    }).from(invoicesTable).where(and(eq(invoicesTable.companyId, cid), isNull(invoicesTable.deletedAt))),
    db.select({
      invoiceId: paymentsTable.invoiceId, firstPayment: sql<string>`MIN(${paymentsTable.paymentDate})`,
    }).from(paymentsTable).where(eq(paymentsTable.companyId, cid)).groupBy(paymentsTable.invoiceId),
    db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(eq(usersTable.companyId, cid)),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.name]));

  // Earliest linked record per parent
  const oppByLead = new Map<number, typeof opps[number]>();
  for (const o of opps) {
    if (o.leadId == null) continue;
    const prev = oppByLead.get(o.leadId);
    if (!prev || o.createdAt < prev.createdAt) oppByLead.set(o.leadId, o);
  }
  const quoteByOpp = new Map<number, typeof quotes[number]>();
  for (const q of quotes) {
    if (q.opportunityId == null) continue;
    const prev = quoteByOpp.get(q.opportunityId);
    if (!prev || q.createdAt < prev.createdAt) quoteByOpp.set(q.opportunityId, q);
  }
  const orderByQuote = new Map<number, typeof orders[number]>();
  for (const so of orders) {
    if (so.quoteId == null) continue;
    const prev = orderByQuote.get(so.quoteId);
    if (!prev || so.createdAt < prev.createdAt) orderByQuote.set(so.quoteId, so);
  }
  const invoiceByOrder = new Map<number, typeof invoices[number]>();
  for (const inv of invoices) {
    const prev = invoiceByOrder.get(inv.salesOrderId);
    if (!prev || inv.createdAt < prev.createdAt) invoiceByOrder.set(inv.salesOrderId, inv);
  }
  const paymentByInvoice = new Map(payments.map((p) => [p.invoiceId, new Date(p.firstPayment)]));

  const now = new Date();
  const D = KPI_DEADLINES;

  type StageCell = { date: string | null; days: number | null; overdue: boolean };
  const cell = (from: Date | null, to: Date | null, limit: number, stillOpen: boolean): StageCell => {
    if (!from) return { date: to ? to.toISOString() : null, days: null, overdue: false };
    if (to) return { date: to.toISOString(), days: daysBetween(from, to), overdue: daysBetween(from, to) > limit };
    // stage not reached yet — overdue if the chain is still open and past the limit
    return { date: null, days: null, overdue: stillOpen && daysBetween(from, now) > limit };
  };

  const funnel = leads.map((lead) => {
    const opp = oppByLead.get(lead.id) ?? null;
    const quote = opp ? quoteByOpp.get(opp.id) ?? null : null;
    const order = quote ? orderByQuote.get(quote.id) ?? null : null;
    const invoice = order ? invoiceByOrder.get(order.id) ?? null : null;
    const paymentDate = invoice ? paymentByInvoice.get(invoice.id) ?? null : null;

    const leadOpen = !["lost", "dropped", "junk"].includes((lead.status ?? "").toLowerCase());
    const oppOpen = opp ? !["lost", "dropped"].includes(opp.stage.toLowerCase()) : false;
    const orderOpen = order ? order.status !== "Cancelled" : false;
    const invoiceOpen = invoice ? invoice.status !== "Cancelled" : false;

    return {
      leadId: lead.id,
      title: lead.title,
      companyName: lead.companyName,
      owner: lead.ownerId != null ? userMap.get(lead.ownerId) ?? null : null,
      status: lead.status,
      leadCreatedAt: lead.createdAt.toISOString(),
      opportunity: cell(lead.createdAt, opp?.createdAt ?? null, D.leadToOpportunity, leadOpen),
      quote: cell(opp?.createdAt ?? null, quote?.createdAt ?? null, D.opportunityToQuote, oppOpen),
      order: cell(quote?.createdAt ?? null, order?.createdAt ?? null, D.quoteToOrder, oppOpen),
      invoice: cell(order?.createdAt ?? null, invoice?.createdAt ?? null, D.orderToInvoice, orderOpen),
      payment: cell(invoice?.createdAt ?? null, paymentDate, D.invoiceToPayment, invoiceOpen),
      orderNumber: order?.orderNumber ?? null,
      orderValue: order ? Number(order.grandTotal ?? 0) : null,
      totalCycleDays: paymentDate ? daysBetween(lead.createdAt, paymentDate) : null,
    };
  }).sort((a, b) => b.leadCreatedAt.localeCompare(a.leadCreatedAt));

  // Team KPIs (per lead owner)
  const team = new Map<string, {
    owner: string; leads: number; opportunities: number; quotes: number;
    orders: number; revenue: number; leadToOrderDaysSum: number; leadToOrderCount: number; overdueStages: number;
  }>();
  for (const row of funnel) {
    const key = row.owner ?? "Unassigned";
    let t = team.get(key);
    if (!t) { t = { owner: key, leads: 0, opportunities: 0, quotes: 0, orders: 0, revenue: 0, leadToOrderDaysSum: 0, leadToOrderCount: 0, overdueStages: 0 }; team.set(key, t); }
    t.leads++;
    if (row.opportunity.date) t.opportunities++;
    if (row.quote.date) t.quotes++;
    if (row.order.date) {
      t.orders++;
      t.revenue += row.orderValue ?? 0;
      t.leadToOrderDaysSum += daysBetween(new Date(row.leadCreatedAt), new Date(row.order.date));
      t.leadToOrderCount++;
    }
    for (const s of [row.opportunity, row.quote, row.order, row.invoice, row.payment]) if (s.overdue) t.overdueStages++;
  }
  const teamKpis = Array.from(team.values()).map((t) => ({
    owner: t.owner,
    leads: t.leads,
    opportunities: t.opportunities,
    quotes: t.quotes,
    orders: t.orders,
    revenue: t.revenue,
    conversionPct: t.leads ? Math.round((t.orders / t.leads) * 100) : 0,
    avgLeadToOrderDays: t.leadToOrderCount ? Math.round((t.leadToOrderDaysSum / t.leadToOrderCount) * 10) / 10 : null,
    overdueStages: t.overdueStages,
  })).sort((a, b) => b.revenue - a.revenue);

  // Purchase timing: PO -> first GRN
  const [pos, grns, vendors] = await Promise.all([
    db.select({
      id: purchaseOrdersTable.id, poNumber: purchaseOrdersTable.poNumber, vendorId: purchaseOrdersTable.vendorId,
      status: purchaseOrdersTable.status, createdAt: purchaseOrdersTable.createdAt,
    }).from(purchaseOrdersTable).where(and(eq(purchaseOrdersTable.companyId, cid), isNull(purchaseOrdersTable.deletedAt))),
    db.select({
      purchaseOrderId: grnTable.purchaseOrderId, firstReceipt: sql<string>`MIN(${grnTable.receivedDate})`,
    }).from(grnTable).where(eq(grnTable.companyId, cid)).groupBy(grnTable.purchaseOrderId),
    db.select({ id: vendorsTable.id, name: vendorsTable.name }).from(vendorsTable).where(eq(vendorsTable.companyId, cid)),
  ]);
  const vendorMap = new Map(vendors.map((v) => [v.id, v.name]));
  const grnMap = new Map(grns.map((g) => [g.purchaseOrderId, new Date(g.firstReceipt)]));
  const purchases = pos.map((po) => {
    const received = grnMap.get(po.id) ?? null;
    const open = !["Cancelled", "Closed"].includes(po.status);
    return {
      poId: po.id,
      poNumber: po.poNumber,
      vendor: po.vendorId != null ? vendorMap.get(po.vendorId) ?? null : null,
      status: po.status,
      createdAt: po.createdAt.toISOString(),
      receivedAt: received ? received.toISOString() : null,
      days: received ? daysBetween(po.createdAt, received) : null,
      overdue: received ? daysBetween(po.createdAt, received) > D.poToGrn : (open && daysBetween(po.createdAt, now) > D.poToGrn),
    };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Order processing internal steps (from processing form dates), vs targets in days from SO creation
  const forms = await db.select({
    salesOrderId: orderProcessingFormsTable.salesOrderId,
    formData: orderProcessingFormsTable.formData,
  }).from(orderProcessingFormsTable).where(eq(orderProcessingFormsTable.companyId, cid));
  const formBySo = new Map(forms.map((f) => [f.salesOrderId, (f.formData ?? {}) as Record<string, unknown>]));

  const P = PROCESSING_DEADLINES;
  // Step dates in formData are date-only strings (YYYY-MM-DD). Compare on
  // whole calendar days (UTC midnight vs SO creation date) to avoid timezone
  // drift producing negative/off-by-one deltas for same-day entries.
  const dayFloor = (d0: Date) => Math.floor(d0.getTime() / DAY_MS);
  const stepCell = (soCreated: Date, raw: unknown, limit: number, open: boolean): StageCell => {
    const s = typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : null;
    const dt = s ? new Date(`${s}T00:00:00Z`) : null;
    if (dt && !Number.isNaN(dt.getTime())) {
      const days = Math.max(0, dayFloor(dt) - dayFloor(soCreated));
      return { date: dt.toISOString(), days, overdue: days > limit };
    }
    return { date: null, days: null, overdue: open && daysBetween(soCreated, now) > limit };
  };

  const processing = orders
    .filter((so) => so.status !== "Cancelled")
    .map((so) => {
      const fd = formBySo.get(so.id) ?? {};
      const open = !["Dispatched", "Delivered", "Closed", "Completed"].includes(so.status);
      return {
        salesOrderId: so.id,
        orderNumber: so.orderNumber,
        status: so.status,
        orderedAt: so.createdAt.toISOString(),
        hasForm: formBySo.has(so.id),
        procurement: stepCell(so.createdAt, fd.procurementDate, P.procurement, open),
        designStart: stepCell(so.createdAt, fd.designStartDate, P.designStart, open),
        mockupApproval: stepCell(so.createdAt, fd.mockupApprovalEndDate, P.mockupApproval, open),
        preProduction: stepCell(so.createdAt, fd.preProductionApprovalEndDate, P.preProduction, open),
        productionStart: stepCell(so.createdAt, fd.productionInitiateDate, P.productionStart, open),
        qc: stepCell(so.createdAt, (fd.qc2EndDate as string) || (fd.qc1EndDate as string), P.qc, open),
        stockUpdate: stepCell(so.createdAt, fd.stockUpdateDate, P.stockUpdate, open),
        dispatch: stepCell(so.createdAt, fd.dispatchDate, P.dispatch, open),
      };
    })
    .sort((a, b) => b.orderedAt.localeCompare(a.orderedAt));

  res.json({ deadlines: D, processingDeadlines: P, funnel, teamKpis, purchases, processing });
});

// GET /v1/reports/kpi/history?leadId=N — recorded status changes for a lead and its linked documents
router.get("/v1/reports/kpi/history", async (req, res): Promise<void> => {
  const cid = req.companyId;
  const leadId = parseInt(String(req.query.leadId ?? ""), 10);
  if (Number.isNaN(leadId)) { res.status(400).json({ error: "leadId is required" }); return; }

  // Resolve the chain: lead -> opportunities -> quotes -> sales orders -> invoices
  const chainOpps = await db.select({ id: opportunitiesTable.id }).from(opportunitiesTable)
    .where(and(eq(opportunitiesTable.companyId, cid), eq(opportunitiesTable.leadId, leadId)));
  const oppIds = chainOpps.map((o) => o.id);
  const chainQuotes = oppIds.length ? await db.select({ id: quotesTable.id }).from(quotesTable)
    .where(and(eq(quotesTable.companyId, cid), inArray(quotesTable.opportunityId, oppIds))) : [];
  const quoteIds = chainQuotes.map((q) => q.id);
  const chainOrders = quoteIds.length ? await db.select({ id: salesOrdersTable.id }).from(salesOrdersTable)
    .where(and(eq(salesOrdersTable.companyId, cid), inArray(salesOrdersTable.quoteId, quoteIds))) : [];
  const orderIds = chainOrders.map((o) => o.id);
  const chainInvoices = orderIds.length ? await db.select({ id: invoicesTable.id }).from(invoicesTable)
    .where(and(eq(invoicesTable.companyId, cid), inArray(invoicesTable.salesOrderId, orderIds))) : [];
  const invoiceIds = chainInvoices.map((i) => i.id);

  const conds = [
    and(eq(statusHistoryTable.entityType, "lead"), eq(statusHistoryTable.entityId, leadId)),
    oppIds.length ? and(eq(statusHistoryTable.entityType, "opportunity"), inArray(statusHistoryTable.entityId, oppIds)) : null,
    quoteIds.length ? and(eq(statusHistoryTable.entityType, "quote"), inArray(statusHistoryTable.entityId, quoteIds)) : null,
    orderIds.length ? and(eq(statusHistoryTable.entityType, "sales_order"), inArray(statusHistoryTable.entityId, orderIds)) : null,
    invoiceIds.length ? and(eq(statusHistoryTable.entityType, "invoice"), inArray(statusHistoryTable.entityId, invoiceIds)) : null,
  ].filter((c): c is NonNullable<typeof c> => c != null);

  const rows = await db.select({
    id: statusHistoryTable.id,
    entityType: statusHistoryTable.entityType,
    entityId: statusHistoryTable.entityId,
    fromStatus: statusHistoryTable.fromStatus,
    toStatus: statusHistoryTable.toStatus,
    changedAt: statusHistoryTable.changedAt,
    changedByName: usersTable.name,
  }).from(statusHistoryTable)
    .leftJoin(usersTable, eq(statusHistoryTable.changedBy, usersTable.id))
    .where(and(eq(statusHistoryTable.companyId, cid), or(...conds)))
    .orderBy(statusHistoryTable.changedAt);

  res.json({ history: rows.map((r) => ({ ...r, changedAt: r.changedAt.toISOString() })) });
});

export default router;
