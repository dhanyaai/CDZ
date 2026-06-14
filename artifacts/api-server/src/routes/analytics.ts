import { Router } from "express";
import { eq, count, sum, and, gte, lte, sql, desc } from "drizzle-orm";
import type { Request } from "express";
import { db, clientsTable, salesOrdersTable, salesOrderItemsTable, assemblyJobsTable, invoicesTable, productsTable, purchaseOrdersTable, vendorsTable, opportunitiesTable, usersTable, paymentsTable, inventoryMovementsTable } from "@workspace/db";

const router = Router();

// ─── helpers ─────────────────────────────────────────────────────────────────
function parseDateRange(req: Request): { from?: Date; to?: Date } {
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date((req.query.to as string) + "T23:59:59.999Z") : undefined;
  return { from, to };
}

// ─── dashboard ───────────────────────────────────────────────────────────────
router.get("/v1/analytics/dashboard", async (req, res): Promise<void> => {
  const cid = req.companyId;
  const { from, to } = parseDateRange(req);

  const [clientCount] = await db.select({ count: count() }).from(clientsTable).where(eq(clientsTable.companyId, cid));

  const [activeOrders] = await db
    .select({ count: count() })
    .from(salesOrdersTable)
    .where(and(eq(salesOrdersTable.companyId, cid), sql`${salesOrdersTable.status} NOT IN ('Delivered', 'Draft')`));

  const [pendingAssembly] = await db
    .select({ count: count() })
    .from(assemblyJobsTable)
    .where(and(eq(assemblyJobsTable.companyId, cid), sql`${assemblyJobsTable.status} IN ('Pending', 'In Progress')`));

  const now = new Date();
  const [overdueInvoices] = await db
    .select({ count: count() })
    .from(invoicesTable)
    .where(and(eq(invoicesTable.companyId, cid), sql`${invoicesTable.status} != 'Paid'`, lte(invoicesTable.dueDate, now)));

  const revenueStart = from ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const revenueEnd = to;

  const revConds: Parameters<typeof and>[0][] = [
    eq(salesOrdersTable.companyId, cid),
    gte(salesOrdersTable.createdAt, revenueStart),
    sql`${salesOrdersTable.status} NOT IN ('Draft')`,
  ];
  if (revenueEnd) revConds.push(lte(salesOrdersTable.createdAt, revenueEnd));
  const [revenueInRange] = await db.select({ total: sum(salesOrdersTable.totalAmount) }).from(salesOrdersTable).where(and(...revConds));

  const [totalRevenue] = await db
    .select({ total: sum(salesOrdersTable.totalAmount) })
    .from(salesOrdersTable)
    .where(and(eq(salesOrdersTable.companyId, cid), sql`${salesOrdersTable.status} NOT IN ('Draft')`));

  const products = await db.select().from(productsTable).where(eq(productsTable.companyId, cid));
  const lowStockItems = products.filter((p) => p.stockLevel <= p.lowStockThreshold).length;

  const [pendingPOs] = await db
    .select({ count: count() })
    .from(purchaseOrdersTable)
    .where(and(eq(purchaseOrdersTable.companyId, cid), sql`${purchaseOrdersTable.status} IN ('Ordered', 'Partially Received')`));

  res.json({
    totalClients: clientCount.count,
    activeOrders: activeOrders.count,
    pendingAssembly: pendingAssembly.count,
    overdueInvoices: overdueInvoices.count,
    revenueThisMonth: Number(revenueInRange.total ?? 0),
    totalRevenue: Number(totalRevenue.total ?? 0),
    lowStockItems,
    pendingPOs: pendingPOs.count,
  });
});

// ─── sales-pipeline ──────────────────────────────────────────────────────────
router.get("/v1/analytics/sales-pipeline", async (req, res): Promise<void> => {
  const { from, to } = parseDateRange(req);
  const statuses = ["Draft", "Confirmed", "In Production", "Ready", "Dispatched", "Delivered"];
  const results = await Promise.all(
    statuses.map(async (status) => {
      const conds: Parameters<typeof and>[0][] = [
        eq(salesOrdersTable.companyId, req.companyId),
        eq(salesOrdersTable.status, status),
      ];
      if (from) conds.push(gte(salesOrdersTable.createdAt, from));
      if (to) conds.push(lte(salesOrdersTable.createdAt, to));
      const [row] = await db
        .select({ count: count(), total: sum(salesOrdersTable.totalAmount) })
        .from(salesOrdersTable)
        .where(and(...conds));
      return { status, count: row.count, value: Number(row.total ?? 0) };
    })
  );
  res.json(results);
});

// ─── inventory-status ────────────────────────────────────────────────────────
router.get("/v1/analytics/inventory-status", async (req, res): Promise<void> => {
  const products = await db.select().from(productsTable).where(eq(productsTable.companyId, req.companyId));
  const lowStockCount = products.filter((p) => p.stockLevel > 0 && p.stockLevel <= p.lowStockThreshold).length;
  const outOfStockCount = products.filter((p) => p.stockLevel === 0).length;
  const totalValue = products.reduce((s, p) => s + p.stockLevel * Number(p.costPrice), 0);
  res.json({ totalProducts: products.length, lowStockCount, outOfStockCount, totalValue });
});

// ─── vendor-performance ──────────────────────────────────────────────────────
router.get("/v1/analytics/vendor-performance", async (req, res): Promise<void> => {
  const { from, to } = parseDateRange(req);
  const vendors = await db.select().from(vendorsTable).where(eq(vendorsTable.companyId, req.companyId));
  const results = await Promise.all(
    vendors.map(async (vendor) => {
      const conds: Parameters<typeof and>[0][] = [
        eq(purchaseOrdersTable.vendorId, vendor.id),
        eq(purchaseOrdersTable.companyId, req.companyId),
      ];
      if (from) conds.push(gte(purchaseOrdersTable.createdAt, from));
      if (to) conds.push(lte(purchaseOrdersTable.createdAt, to));
      const pos = await db.select().from(purchaseOrdersTable).where(and(...conds));
      if (pos.length === 0) return null;
      const completedPOs = pos.filter((p) => p.status === "Fully Received").length;
      const totalValue = pos.reduce((s, p) => s + Number(p.totalAmount ?? 0), 0);
      const onTimeRate = pos.length > 0 ? Math.round((completedPOs / pos.length) * 100) : 0;
      return { vendorId: vendor.id, vendorName: vendor.name, poCount: pos.length, totalValue, onTimeRate };
    })
  );
  res.json(results.filter(Boolean));
});

// ─── revenue-trend ───────────────────────────────────────────────────────────
router.get("/v1/analytics/revenue-trend", async (req, res): Promise<void> => {
  const { from, to } = parseDateRange(req);
  const now = new Date();

  let monthStarts: Date[];

  if (from) {
    monthStarts = [];
    let cur = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = to ?? now;
    while (cur <= end && monthStarts.length < 24) {
      monthStarts.push(new Date(cur));
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  } else {
    const months = Math.min(parseInt((req.query.months as string) ?? "6", 10), 24);
    monthStarts = Array.from({ length: months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      return d;
    });
  }

  const results = await Promise.all(
    monthStarts.map(async (d) => {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const conds: Parameters<typeof and>[0][] = [
        eq(salesOrdersTable.companyId, req.companyId),
        gte(salesOrdersTable.createdAt, start),
        lte(salesOrdersTable.createdAt, end),
        sql`${salesOrdersTable.status} != 'Draft'`,
      ];
      // Clamp to the user's requested range
      if (from && from > start) conds.push(gte(salesOrdersTable.createdAt, from));
      if (to && to < end) conds.push(lte(salesOrdersTable.createdAt, to));

      const [row] = await db
        .select({ total: sum(salesOrdersTable.totalAmount), cnt: count() })
        .from(salesOrdersTable)
        .where(and(...conds));

      return {
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        revenue: Number(row.total ?? 0),
        orders: row.cnt,
      };
    })
  );
  res.json(results);
});

// ─── top-clients ─────────────────────────────────────────────────────────────
router.get("/v1/analytics/top-clients", async (req, res): Promise<void> => {
  const { from, to } = parseDateRange(req);
  const clients = await db.select().from(clientsTable).where(eq(clientsTable.companyId, req.companyId));
  const results = await Promise.all(
    clients.map(async (client) => {
      const conds: Parameters<typeof and>[0][] = [
        eq(salesOrdersTable.companyId, req.companyId),
        eq(salesOrdersTable.clientId, client.id),
        sql`${salesOrdersTable.status} != 'Draft'`,
      ];
      if (from) conds.push(gte(salesOrdersTable.createdAt, from));
      if (to) conds.push(lte(salesOrdersTable.createdAt, to));
      const orders = await db.select().from(salesOrdersTable).where(and(...conds));
      const revenue = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
      return { clientId: client.id, clientName: client.companyName, orders: orders.length, revenue };
    })
  );
  results.sort((a, b) => b.revenue - a.revenue);
  res.json(results.filter((r) => r.orders > 0 || r.revenue > 0).slice(0, 10));
});

// ─── top-products ─────────────────────────────────────────────────────────────
router.get("/v1/analytics/top-products", async (req, res): Promise<void> => {
  const { from, to } = parseDateRange(req);
  const orderConds: Parameters<typeof and>[0][] = [
    eq(salesOrdersTable.companyId, req.companyId),
    sql`${salesOrdersTable.status} != 'Draft'`,
  ];
  if (from) orderConds.push(gte(salesOrdersTable.createdAt, from));
  if (to) orderConds.push(lte(salesOrdersTable.createdAt, to));

  const rows = await db
    .select({
      productId: salesOrderItemsTable.productId,
      productName: productsTable.name,
      quantity: sql<number>`COALESCE(SUM(${salesOrderItemsTable.quantity}), 0)::int`,
      revenue: sql<string>`COALESCE(SUM(${salesOrderItemsTable.quantity} * ${salesOrderItemsTable.unitPrice}), 0)`,
    })
    .from(salesOrderItemsTable)
    .innerJoin(productsTable, and(eq(productsTable.id, salesOrderItemsTable.productId), eq(productsTable.companyId, req.companyId)))
    .innerJoin(salesOrdersTable, and(eq(salesOrdersTable.id, salesOrderItemsTable.salesOrderId), ...orderConds))
    .groupBy(salesOrderItemsTable.productId, productsTable.name)
    .orderBy(desc(sql`SUM(${salesOrderItemsTable.quantity} * ${salesOrderItemsTable.unitPrice})`))
    .limit(10);

  res.json(rows.map((r) => ({
    productId: r.productId,
    productName: r.productName,
    quantity: Number(r.quantity),
    revenue: Number(r.revenue),
  })));
});

// ─── ar-aging ────────────────────────────────────────────────────────────────
router.get("/v1/analytics/ar-aging", async (req, res): Promise<void> => {
  const { from, to } = parseDateRange(req);
  const now = new Date();

  const invConds: Parameters<typeof and>[0][] = [
    eq(invoicesTable.companyId, req.companyId),
    sql`${invoicesTable.status} != 'Paid'`,
  ];
  if (from) invConds.push(gte(invoicesTable.createdAt, from));
  if (to) invConds.push(lte(invoicesTable.createdAt, to));

  const invoices = await db
    .select({ id: invoicesTable.id, invoiceNumber: invoicesTable.invoiceNumber, clientId: invoicesTable.clientId, grandTotal: invoicesTable.grandTotal, dueDate: invoicesTable.dueDate, status: invoicesTable.status })
    .from(invoicesTable)
    .where(and(...invConds));

  const paid = await db
    .select({ invoiceId: paymentsTable.invoiceId, total: sql<string>`COALESCE(SUM(${paymentsTable.amount}), 0)` })
    .from(paymentsTable)
    .where(eq(paymentsTable.companyId, req.companyId))
    .groupBy(paymentsTable.invoiceId);
  const paidMap = new Map(paid.map((p) => [p.invoiceId, Number(p.total)]));

  // Fetch client names
  const clients = await db.select({ id: clientsTable.id, name: clientsTable.companyName }).from(clientsTable).where(eq(clientsTable.companyId, req.companyId));
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  const buckets = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  const detail: Array<{ bucket: string; invoiceNumber: string; clientName: string; balance: number; daysOverdue: number }> = [];

  for (const inv of invoices) {
    const balance = Number(inv.grandTotal) - (paidMap.get(inv.id) ?? 0);
    if (balance <= 0) continue;
    if (!inv.dueDate) continue;
    const daysOverdue = Math.floor((now.getTime() - inv.dueDate.getTime()) / (24 * 60 * 60 * 1000));
    let bucket: keyof typeof buckets;
    if (daysOverdue <= 0) bucket = "current";
    else if (daysOverdue <= 30) bucket = "1-30";
    else if (daysOverdue <= 60) bucket = "31-60";
    else if (daysOverdue <= 90) bucket = "61-90";
    else bucket = "90+";
    buckets[bucket] += balance;
    detail.push({ bucket, invoiceNumber: inv.invoiceNumber, clientName: clientMap.get(inv.clientId) ?? "Unknown", balance, daysOverdue });
  }

  res.json({
    buckets: Object.entries(buckets).map(([bucket, value]) => ({ bucket, value })),
    total: Object.values(buckets).reduce((a, b) => a + b, 0),
    detail: detail.sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 20),
  });
});

// ─── sales-leaderboard ───────────────────────────────────────────────────────
router.get("/v1/analytics/sales-leaderboard", async (req, res): Promise<void> => {
  const { from, to } = parseDateRange(req);
  const users = await db.select().from(usersTable).where(eq(usersTable.companyId, req.companyId));

  const oppConds: Parameters<typeof and>[0][] = [eq(opportunitiesTable.companyId, req.companyId)];
  if (from) oppConds.push(gte(opportunitiesTable.createdAt, from));
  if (to) oppConds.push(lte(opportunitiesTable.createdAt, to));

  const rows = await db
    .select({ ownerId: opportunitiesTable.ownerId, stage: opportunitiesTable.stage, total: sql<string>`COALESCE(SUM(${opportunitiesTable.value}), 0)`, cnt: count() })
    .from(opportunitiesTable)
    .where(and(...oppConds))
    .groupBy(opportunitiesTable.ownerId, opportunitiesTable.stage);

  const byUser = new Map<number, { ownerId: number; name: string; role: string; pipeline: number; won: number; openCount: number; wonCount: number }>();
  for (const u of users) {
    byUser.set(u.id, { ownerId: u.id, name: u.name, role: u.role, pipeline: 0, won: 0, openCount: 0, wonCount: 0 });
  }
  for (const r of rows) {
    if (r.ownerId == null) continue;
    const entry = byUser.get(r.ownerId);
    if (!entry) continue;
    const v = Number(r.total);
    if (r.stage === "closed_won") { entry.won += v; entry.wonCount += r.cnt; }
    else if (r.stage !== "closed_lost") { entry.pipeline += v; entry.openCount += r.cnt; }
  }
  const out = Array.from(byUser.values()).filter((u) => u.pipeline > 0 || u.won > 0).sort((a, b) => b.won + b.pipeline - (a.won + a.pipeline));
  res.json(out);
});

// ─── stock-ageing ─────────────────────────────────────────────────────────────
router.get("/v1/analytics/stock-ageing", async (req, res): Promise<void> => {
  const cid = req.companyId;
  const now = new Date();

  const products = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.companyId, cid), sql`${productsTable.stockLevel} > 0`));

  type BucketKey = "0-30" | "31-60" | "61-90" | "90+";
  const getBucket = (days: number): BucketKey =>
    days <= 30 ? "0-30" : days <= 60 ? "31-60" : days <= 90 ? "61-90" : "90+";

  const summaryTotals: Record<BucketKey, { qty: number; value: number }> = {
    "0-30": { qty: 0, value: 0 },
    "31-60": { qty: 0, value: 0 },
    "61-90": { qty: 0, value: 0 },
    "90+": { qty: 0, value: 0 },
  };

  const items = await Promise.all(
    products.map(async (product) => {
      // Fetch inward movements newest-first for FIFO ageing
      const movements = await db
        .select()
        .from(inventoryMovementsTable)
        .where(
          and(
            eq(inventoryMovementsTable.companyId, cid),
            eq(inventoryMovementsTable.productId, product.id),
            sql`${inventoryMovementsTable.type} = ANY(ARRAY['inward','transfer_in','opening']::text[])`
          )
        )
        .orderBy(desc(inventoryMovementsTable.createdAt));

      let remaining = product.stockLevel;
      const buckets: Record<BucketKey, number> = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
      let oldestAge = 0;
      let totalAgeDays = 0;
      let totalQtyAccounted = 0;

      for (const mov of movements) {
        if (remaining <= 0) break;
        const qty = Math.min(mov.quantity, remaining);
        const days = Math.max(0, Math.floor((now.getTime() - mov.createdAt.getTime()) / 86400000));
        const bucket = getBucket(days);
        buckets[bucket] += qty;
        totalAgeDays += days * qty;
        totalQtyAccounted += qty;
        if (days > oldestAge) oldestAge = days;
        remaining -= qty;
      }

      // Fallback for stock with no recorded inward movements
      if (remaining > 0) {
        const refDate = product.createdAt ?? now;
        const days = Math.max(0, Math.floor((now.getTime() - refDate.getTime()) / 86400000));
        const bucket = getBucket(days);
        buckets[bucket] += remaining;
        totalAgeDays += days * remaining;
        totalQtyAccounted += remaining;
        if (days > oldestAge) oldestAge = days;
      }

      const costPrice = Number(product.costPrice ?? 0);
      const totalValue = product.stockLevel * costPrice;
      const avgAge = totalQtyAccounted > 0 ? Math.round(totalAgeDays / totalQtyAccounted) : 0;

      for (const [b, qty] of Object.entries(buckets) as [BucketKey, number][]) {
        summaryTotals[b].qty += qty;
        summaryTotals[b].value += qty * costPrice;
      }

      return {
        productId: product.id,
        productName: product.name,
        sku: "",
        category: product.category ?? "",
        currentStock: product.stockLevel,
        costPrice,
        totalValue,
        avgAge,
        oldestAge,
        buckets,
      };
    })
  );

  items.sort((a, b) => b.oldestAge - a.oldestAge);
  res.json({ summary: summaryTotals, items });
});

export default router;
