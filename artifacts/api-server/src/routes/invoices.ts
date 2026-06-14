import { Router } from "express";
import { eq, and, SQL } from "drizzle-orm";
import { db, invoicesTable, paymentsTable, salesOrdersTable, clientsTable } from "@workspace/db";

const router = Router();

function serializeInvoice(inv: typeof invoicesTable.$inferSelect, clientName: string | null, orderNumber: string | null) {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    salesOrderId: inv.salesOrderId,
    orderNumber: orderNumber ?? null,
    clientId: inv.clientId,
    clientName: clientName ?? "Unknown",
    totalAmount: Number(inv.totalAmount),
    gstAmount: Number(inv.gstAmount),
    grandTotal: Number(inv.grandTotal),
    status: inv.status,
    dueDate: inv.dueDate?.toISOString() ?? null,
    createdAt: inv.createdAt.toISOString(),
  };
}

router.get("/v1/invoices", async (req, res): Promise<void> => {
  const { status, clientId } = req.query as { status?: string; clientId?: string };
  const conditions: SQL[] = [eq(invoicesTable.companyId, req.companyId)];
  if (status) conditions.push(eq(invoicesTable.status, status));
  if (clientId) conditions.push(eq(invoicesTable.clientId, parseInt(clientId, 10)));

  const rows = await db
    .select({ invoice: invoicesTable, clientName: clientsTable.companyName, orderNumber: salesOrdersTable.orderNumber })
    .from(invoicesTable)
    .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
    .leftJoin(salesOrdersTable, eq(invoicesTable.salesOrderId, salesOrdersTable.id))
    .where(and(...conditions))
    .orderBy(invoicesTable.createdAt);

  res.json(rows.map((r) => serializeInvoice(r.invoice, r.clientName, r.orderNumber)));
});

router.post("/v1/invoices", async (req, res): Promise<void> => {
  const { salesOrderId, gstPercent, dueDate } = req.body ?? {};
  if (!salesOrderId || gstPercent == null) {
    res.status(400).json({ error: "salesOrderId and gstPercent are required" });
    return;
  }

  const [order] = await db
    .select({ order: salesOrdersTable, clientId: salesOrdersTable.clientId })
    .from(salesOrdersTable)
    .where(and(eq(salesOrdersTable.id, salesOrderId), eq(salesOrdersTable.companyId, req.companyId)));

  if (!order) {
    res.status(404).json({ error: "Sales order not found" });
    return;
  }

  const totalAmount = Number(order.order.totalAmount);
  const gstAmount = totalAmount * (gstPercent / 100);
  const grandTotal = totalAmount + gstAmount;

  const [invoice] = await db.insert(invoicesTable).values({
    companyId: req.companyId,
    invoiceNumber: "INV-TEMP",
    salesOrderId,
    clientId: order.clientId,
    totalAmount: String(totalAmount),
    gstAmount: String(gstAmount),
    grandTotal: String(grandTotal),
    status: "Draft",
    dueDate: dueDate ? new Date(dueDate) : null,
  }).returning();

  await db.update(invoicesTable).set({ invoiceNumber: `INV-${String(invoice.id).padStart(5, "0")}` }).where(eq(invoicesTable.id, invoice.id));

  const [row] = await db
    .select({ invoice: invoicesTable, clientName: clientsTable.companyName, orderNumber: salesOrdersTable.orderNumber })
    .from(invoicesTable)
    .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
    .leftJoin(salesOrdersTable, eq(invoicesTable.salesOrderId, salesOrdersTable.id))
    .where(eq(invoicesTable.id, invoice.id));

  res.status(201).json(serializeInvoice(row.invoice, row.clientName, row.orderNumber));
});

router.get("/v1/invoices/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [row] = await db
    .select({ invoice: invoicesTable, clientName: clientsTable.companyName, orderNumber: salesOrdersTable.orderNumber })
    .from(invoicesTable)
    .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
    .leftJoin(salesOrdersTable, eq(invoicesTable.salesOrderId, salesOrdersTable.id))
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.companyId, req.companyId)));

  if (!row) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  res.json(serializeInvoice(row.invoice, row.clientName, row.orderNumber));
});

router.get("/v1/payments", async (req, res): Promise<void> => {
  const { invoiceId } = req.query as { invoiceId?: string };
  const payments = invoiceId
    ? await db.select().from(paymentsTable).where(and(eq(paymentsTable.invoiceId, parseInt(invoiceId, 10)), eq(paymentsTable.companyId, req.companyId))).orderBy(paymentsTable.paymentDate)
    : await db.select().from(paymentsTable).where(eq(paymentsTable.companyId, req.companyId)).orderBy(paymentsTable.paymentDate);

  res.json(payments.map((p) => ({
    id: p.id,
    invoiceId: p.invoiceId,
    amount: Number(p.amount),
    type: p.type,
    paymentDate: p.paymentDate.toISOString(),
    notes: p.notes ?? null,
    createdAt: p.createdAt.toISOString(),
  })));
});

router.post("/v1/payments", async (req, res): Promise<void> => {
  const { invoiceId, amount, type, paymentDate, notes } = req.body ?? {};
  if (!invoiceId || amount == null || !type || !paymentDate) {
    res.status(400).json({ error: "invoiceId, amount, type, and paymentDate are required" });
    return;
  }

  const [invoice] = await db.select().from(invoicesTable).where(and(eq(invoicesTable.id, invoiceId), eq(invoicesTable.companyId, req.companyId)));
  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }

  const [payment] = await db.insert(paymentsTable).values({
    companyId: req.companyId,
    invoiceId,
    amount: String(amount),
    type,
    paymentDate: new Date(paymentDate),
    notes,
  }).returning();

  const allPayments = await db.select().from(paymentsTable).where(and(eq(paymentsTable.invoiceId, invoiceId), eq(paymentsTable.companyId, req.companyId)));
  const totalPaid = allPayments.reduce((s, p) => s + Number(p.amount), 0);
  if (totalPaid >= Number(invoice.grandTotal)) {
    await db.update(invoicesTable).set({ status: "Paid" }).where(eq(invoicesTable.id, invoiceId));
  } else if (invoice.status === "Draft") {
    await db.update(invoicesTable).set({ status: "Sent" }).where(eq(invoicesTable.id, invoiceId));
  }

  res.status(201).json({
    id: payment.id,
    invoiceId: payment.invoiceId,
    amount: Number(payment.amount),
    type: payment.type,
    paymentDate: payment.paymentDate.toISOString(),
    notes: payment.notes ?? null,
    createdAt: payment.createdAt.toISOString(),
  });
});

export default router;
