import { Router } from "express";
import { and, eq, lte, gte, sql, isNull } from "drizzle-orm";
import { db, invoicesTable, productsTable, activitiesTable, quotesTable, grnTable } from "@workspace/db";

const router = Router();

router.get("/v1/notifications", async (_req, res): Promise<void> => {
  const now = new Date();
  const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const overdue = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      grandTotal: invoicesTable.grandTotal,
      dueDate: invoicesTable.dueDate,
    })
    .from(invoicesTable)
    .where(and(sql`${invoicesTable.status} != 'Paid'`, lte(invoicesTable.dueDate, now)))
    .limit(20);

  const products = await db.select().from(productsTable);
  const lowStock = products
    .filter((p) => p.stockLevel <= p.lowStockThreshold)
    .slice(0, 20)
    .map((p) => ({ id: p.id, name: p.name, stockLevel: p.stockLevel, threshold: p.lowStockThreshold }));

  const dueActivities = await db
    .select({
      id: activitiesTable.id,
      subject: activitiesTable.subject,
      type: activitiesTable.type,
      dueDate: activitiesTable.dueDate,
      clientId: activitiesTable.clientId,
    })
    .from(activitiesTable)
    .where(and(isNull(activitiesTable.completedAt), lte(activitiesTable.dueDate, in3days)))
    .limit(20);

  const draftQuotes = await db
    .select({ id: quotesTable.id, quoteNumber: quotesTable.quoteNumber, totalAmount: quotesTable.totalAmount })
    .from(quotesTable)
    .where(eq(quotesTable.status, "draft"))
    .limit(20);

  const pendingGrn = await db
    .select({ id: grnTable.id, grnNumber: grnTable.grnNumber })
    .from(grnTable)
    .where(eq(grnTable.status, "partial"))
    .limit(20);

  const items = [
    ...overdue.map((i) => ({
      type: "overdue_invoice" as const,
      severity: "high" as const,
      title: `Invoice ${i.invoiceNumber} overdue`,
      detail: `₹${Number(i.grandTotal).toLocaleString()} · due ${i.dueDate ? i.dueDate.toISOString().slice(0, 10) : "—"}`,
      href: "/invoices",
      id: i.id,
    })),
    ...lowStock.map((p) => ({
      type: "low_stock" as const,
      severity: p.stockLevel === 0 ? ("high" as const) : ("medium" as const),
      title: `${p.name} low stock`,
      detail: `${p.stockLevel} on hand (threshold ${p.threshold})`,
      href: "/inventory",
      id: p.id,
    })),
    ...dueActivities.map((a) => ({
      type: "due_activity" as const,
      severity: a.dueDate && a.dueDate < now ? ("high" as const) : ("medium" as const),
      title: a.subject,
      detail: `${a.type} · due ${a.dueDate ? a.dueDate.toISOString().slice(0, 10) : "today"}`,
      href: a.clientId ? `/clients/${a.clientId}` : "/clients",
      id: a.id,
    })),
    ...draftQuotes.map((q) => ({
      type: "draft_quote" as const,
      severity: "low" as const,
      title: `Draft quote ${q.quoteNumber}`,
      detail: `₹${Number(q.totalAmount).toLocaleString()} · pending send`,
      href: "/quotes",
      id: q.id,
    })),
    ...pendingGrn.map((g) => ({
      type: "partial_grn" as const,
      severity: "medium" as const,
      title: `GRN ${g.grnNumber} partial`,
      detail: "Awaiting balance shipment",
      href: "/grn",
      id: g.id,
    })),
  ];

  const counts = {
    total: items.length,
    high: items.filter((i) => i.severity === "high").length,
    medium: items.filter((i) => i.severity === "medium").length,
    low: items.filter((i) => i.severity === "low").length,
  };

  res.json({ counts, items });
});

export default router;
