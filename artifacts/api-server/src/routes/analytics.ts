import { Router } from "express";
import { eq, count, sum, and, gte, lte, sql, desc } from "drizzle-orm";
import { db, clientsTable, salesOrdersTable, salesOrderItemsTable, assemblyJobsTable, invoicesTable, productsTable, purchaseOrdersTable, vendorsTable, opportunitiesTable, usersTable, paymentsTable } from "@workspace/db";

const router = Router();

router.get("/v1/analytics/dashboard", async (req, res): Promise<void> => {
  const cid = req.companyId;

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

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [revenueThisMonth] = await db
    .select({ total: sum(salesOrdersTable.totalAmount) })
    .from(salesOrdersTable)
    .where(and(eq(salesOrdersTable.companyId, cid), gte(salesOrdersTable.createdAt, startOfMonth), sql`${salesOrdersTable.status} NOT IN ('Draft')`));

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
    revenueThisMonth: Number(revenueThisMonth.total ?? 0),
    totalRevenue: Number(totalRevenue.total ?? 0),
    lowStockItems,
    pendingPOs: pendingPOs.count,
  });
});

router.get("/v1/analytics/sales-pipeline", async (req, res): Promise<void> => {
  const statuses = ["Draft", "Confirmed", "In Production", "Ready", "Dispatched", "Delivered"];
  const results = await Promise.all(
    statuses.map(async (status) => {
      const [row] = await db
        .select({ count: count(), total: sum(salesOrdersTable.totalAmount) })
        .from(salesOrdersTable)
        .where(and(eq(salesOrdersTable.companyId, req.companyId), eq(salesOrdersTable.status, status)));
      return { status, count: row.count, value: Number(row.total ?? 0) };
    })
  );
  res.json(results);
});

router.get("/v1/analytics/inventory-status", async (req, res): Promise<void> => {
  const products = await db.select().from(productsTable).where(eq(productsTable.companyId, req.companyId));
  const lowStockCount = products.filter((p) => p.stockLevel > 0 && p.stockLevel <= p.lowStockThreshold).length;
  const outOfStockCount = products.filter((p) => p.stockLevel === 0).length;
  const totalValue = products.reduce((s, p) => s + p.stockLevel * Number(p.costPrice), 0);
  res.json({ totalProducts: products.length, lowStockCount, outOfStockCount, totalValue });
});

router.get("/v1/analytics/vendor-performance", async (req, res): Promise<void> => {
  const vendors = await db.select().from(vendorsTable).where(eq(vendorsTable.companyId, req.companyId));
  const results = await Promise.all(
    vendors.map(async (vendor) => {
      const pos = await db.select().from(purchaseOrdersTable).where(and(eq(purchaseOrdersTable.vendorId, vendor.id), eq(purchaseOrdersTable.companyId, req.companyId)));
      const completedPOs = pos.filter((p) => p.status === "Fully Received").length;
      return { vendorId: vendor.id, vendorName: vendor.name, totalPOs: pos.length, completedPOs, avgLeadDays: vendor.leadTimeDays };
    })
  );
  res.json(results);
});

router.get("/v1/analytics/revenue-trend", async (req, res): Promise<void> => {
  const months = Math.min(parseInt((req.query.months as string) ?? "6", 10), 24);
  const results: { month: string; revenue: number; orders: number }[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const [row] = await db
      .select({ total: sum(salesOrdersTable.totalAmount), cnt: count() })
      .from(salesOrdersTable)
      .where(and(
        eq(salesOrdersTable.companyId, req.companyId),
        gte(salesOrdersTable.createdAt, start),
        lte(salesOrdersTable.createdAt, end),
        sql`${salesOrdersTable.status} != 'Draft'`
      ));

    results.push({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      revenue: Number(row.total ?? 0),
      orders: row.cnt,
    });
  }
  res.json(results);
});

router.get("/v1/analytics/top-clients", async (req, res): Promise<void> => {
  const clients = await db.select().from(clientsTable).where(eq(clientsTable.companyId, req.companyId));
  const results = await Promise.all(
    clients.map(async (client) => {
      const orders = await db
        .select()
        .from(salesOrdersTable)
        .where(and(eq(salesOrdersTable.companyId, req.companyId), eq(salesOrdersTable.clientId, client.id), sql`${salesOrdersTable.status} != 'Draft'`));
      const totalRevenue = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
      return { clientId: client.id, clientName: client.companyName, totalOrders: orders.length, totalRevenue };
    })
  );
  results.sort((a, b) => b.totalRevenue - a.totalRevenue);
  res.json(results.slice(0, 10));
});

router.get("/v1/analytics/top-products", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      productId: salesOrderItemsTable.productId,
      productName: productsTable.name,
      qty: sql<number>`COALESCE(SUM(${salesOrderItemsTable.quantity}), 0)::int`,
      revenue: sql<string>`COALESCE(SUM(${salesOrderItemsTable.quantity} * ${salesOrderItemsTable.unitPrice}), 0)`,
    })
    .from(salesOrderItemsTable)
    .innerJoin(productsTable, and(eq(productsTable.id, salesOrderItemsTable.productId), eq(productsTable.companyId, req.companyId)))
    .innerJoin(salesOrdersTable, and(eq(salesOrdersTable.id, salesOrderItemsTable.salesOrderId), eq(salesOrdersTable.companyId, req.companyId)))
    .where(sql`${salesOrdersTable.status} != 'Draft'`)
    .groupBy(salesOrderItemsTable.productId, productsTable.name)
    .orderBy(desc(sql`SUM(${salesOrderItemsTable.quantity} * ${salesOrderItemsTable.unitPrice})`))
    .limit(8);

  res.json(rows.map((r) => ({
    productId: r.productId,
    productName: r.productName,
    qty: Number(r.qty),
    revenue: Number(r.revenue),
  })));
});

router.get("/v1/analytics/ar-aging", async (req, res): Promise<void> => {
  const now = new Date();
  const invoices = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      clientId: invoicesTable.clientId,
      grandTotal: invoicesTable.grandTotal,
      dueDate: invoicesTable.dueDate,
      status: invoicesTable.status,
    })
    .from(invoicesTable)
    .where(and(eq(invoicesTable.companyId, req.companyId), sql`${invoicesTable.status} != 'Paid'`));

  const paid = await db
    .select({
      invoiceId: paymentsTable.invoiceId,
      total: sql<string>`COALESCE(SUM(${paymentsTable.amount}), 0)`,
    })
    .from(paymentsTable)
    .groupBy(paymentsTable.invoiceId);
  const paidMap = new Map(paid.map((p) => [p.invoiceId, Number(p.total)]));

  const buckets = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  const detail: Array<{ bucket: string; invoiceNumber: string; balance: number; daysOverdue: number; clientId: number }> = [];

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
    detail.push({ bucket, invoiceNumber: inv.invoiceNumber, balance, daysOverdue, clientId: inv.clientId });
  }

  res.json({
    buckets: Object.entries(buckets).map(([bucket, value]) => ({ bucket, value })),
    total: Object.values(buckets).reduce((a, b) => a + b, 0),
    detail: detail.sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 10),
  });
});

router.get("/v1/analytics/sales-leaderboard", async (req, res): Promise<void> => {
  const users = await db.select().from(usersTable).where(eq(usersTable.companyId, req.companyId));
  const rows = await db
    .select({
      ownerId: opportunitiesTable.ownerId,
      stage: opportunitiesTable.stage,
      total: sql<string>`COALESCE(SUM(${opportunitiesTable.value}), 0)`,
      cnt: count(),
    })
    .from(opportunitiesTable)
    .where(eq(opportunitiesTable.companyId, req.companyId))
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
  const out = Array.from(byUser.values())
    .filter((u) => u.pipeline > 0 || u.won > 0)
    .sort((a, b) => b.won + b.pipeline - (a.won + a.pipeline));
  res.json(out);
});

export default router;
