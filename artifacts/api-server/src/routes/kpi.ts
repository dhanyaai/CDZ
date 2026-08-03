import { Router } from "express";
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  db, leadsTable, opportunitiesTable, quotesTable, salesOrdersTable,
  invoicesTable, paymentsTable, usersTable, purchaseOrdersTable,
  grnTable, vendorsTable,
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

  res.json({ deadlines: D, funnel, teamKpis, purchases });
});

export default router;
