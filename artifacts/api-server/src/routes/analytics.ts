import { Router } from "express";
import { eq, count, sum, and, gte, lte, sql } from "drizzle-orm";
import { db, clientsTable, salesOrdersTable, assemblyJobsTable, invoicesTable, productsTable, purchaseOrdersTable, vendorsTable, purchaseOrderItemsTable } from "@workspace/db";

const router = Router();

router.get("/v1/analytics/dashboard", async (_req, res): Promise<void> => {
  const [clientCount] = await db.select({ count: count() }).from(clientsTable);

  const [activeOrders] = await db
    .select({ count: count() })
    .from(salesOrdersTable)
    .where(sql`${salesOrdersTable.status} NOT IN ('Delivered', 'Draft')`);

  const [pendingAssembly] = await db
    .select({ count: count() })
    .from(assemblyJobsTable)
    .where(sql`${assemblyJobsTable.status} IN ('Pending', 'In Progress')`);

  const now = new Date();
  const [overdueInvoices] = await db
    .select({ count: count() })
    .from(invoicesTable)
    .where(and(
      sql`${invoicesTable.status} != 'Paid'`,
      lte(invoicesTable.dueDate, now)
    ));

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [revenueThisMonth] = await db
    .select({ total: sum(salesOrdersTable.totalAmount) })
    .from(salesOrdersTable)
    .where(and(
      gte(salesOrdersTable.createdAt, startOfMonth),
      sql`${salesOrdersTable.status} NOT IN ('Draft')`
    ));

  const [totalRevenue] = await db
    .select({ total: sum(salesOrdersTable.totalAmount) })
    .from(salesOrdersTable)
    .where(sql`${salesOrdersTable.status} NOT IN ('Draft')`);

  const products = await db.select().from(productsTable);
  const lowStockItems = products.filter((p) => p.stockLevel <= p.lowStockThreshold).length;

  const [pendingPOs] = await db
    .select({ count: count() })
    .from(purchaseOrdersTable)
    .where(sql`${purchaseOrdersTable.status} IN ('Ordered', 'Partially Received')`);

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

router.get("/v1/analytics/sales-pipeline", async (_req, res): Promise<void> => {
  const statuses = ["Draft", "Confirmed", "In Production", "Ready", "Dispatched", "Delivered"];
  const results = await Promise.all(
    statuses.map(async (status) => {
      const [row] = await db
        .select({ count: count(), total: sum(salesOrdersTable.totalAmount) })
        .from(salesOrdersTable)
        .where(eq(salesOrdersTable.status, status));
      return {
        status,
        count: row.count,
        value: Number(row.total ?? 0),
      };
    })
  );
  res.json(results);
});

router.get("/v1/analytics/inventory-status", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable);
  const lowStockCount = products.filter((p) => p.stockLevel > 0 && p.stockLevel <= p.lowStockThreshold).length;
  const outOfStockCount = products.filter((p) => p.stockLevel === 0).length;
  const totalValue = products.reduce((s, p) => s + p.stockLevel * Number(p.costPrice), 0);

  res.json({
    totalProducts: products.length,
    lowStockCount,
    outOfStockCount,
    totalValue,
  });
});

router.get("/v1/analytics/vendor-performance", async (_req, res): Promise<void> => {
  const vendors = await db.select().from(vendorsTable);
  const results = await Promise.all(
    vendors.map(async (vendor) => {
      const pos = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.vendorId, vendor.id));
      const completedPOs = pos.filter((p) => p.status === "Fully Received").length;
      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        totalPOs: pos.length,
        completedPOs,
        avgLeadDays: vendor.leadTimeDays,
      };
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

router.get("/v1/analytics/top-clients", async (_req, res): Promise<void> => {
  const clients = await db.select().from(clientsTable);
  const results = await Promise.all(
    clients.map(async (client) => {
      const orders = await db
        .select()
        .from(salesOrdersTable)
        .where(and(
          eq(salesOrdersTable.clientId, client.id),
          sql`${salesOrdersTable.status} != 'Draft'`
        ));
      const totalRevenue = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
      return {
        clientId: client.id,
        clientName: client.companyName,
        totalOrders: orders.length,
        totalRevenue,
      };
    })
  );
  results.sort((a, b) => b.totalRevenue - a.totalRevenue);
  res.json(results.slice(0, 10));
});

export default router;
