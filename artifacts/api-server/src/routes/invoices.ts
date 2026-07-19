import { Router } from "express";
import { eq, and, SQL, isNull } from "drizzle-orm";
import {
  db, invoicesTable, invoiceLinesTable, paymentsTable,
  salesOrdersTable, salesOrderItemsTable, clientsTable,
  productsTable, companySettingsTable,
} from "@workspace/db";
import { nextDocNumber } from "../lib/numberSequence";
import { computeGst, amountInWords } from "../services/gstEngine";
import { INVOICE_TRANSITIONS, validTransitions, assertTransition, StatusError } from "../services/stateMachine";

const router = Router();

async function getSettings(companyId: number) {
  const [s] = await db.select({
    invoicePrefix: companySettingsTable.invoicePrefix,
    fyStartMonth: companySettingsTable.fyStartMonth,
    stateCode: companySettingsTable.stateCode,
  }).from(companySettingsTable).where(eq(companySettingsTable.companyId, companyId));
  return {
    prefix: s?.invoicePrefix ?? "INV",
    fyStartMonth: s?.fyStartMonth ?? 4,
    stateCode: s?.stateCode ?? null,
  };
}

function serializeInvoice(
  inv: typeof invoicesTable.$inferSelect,
  clientName: string | null,
  orderNumber: string | null,
  clientGst?: string | null,
) {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    salesOrderId: inv.salesOrderId,
    orderNumber: orderNumber ?? null,
    clientId: inv.clientId,
    clientName: clientName ?? "Unknown",
    clientGst: clientGst ?? null,
    totalAmount: Number(inv.totalAmount),
    gstAmount: Number(inv.gstAmount),
    grandTotal: Number(inv.grandTotal),
    cgst: Number(inv.cgst),
    sgst: Number(inv.sgst),
    igst: Number(inv.igst),
    placeOfSupplyStateCode: inv.placeOfSupplyStateCode ?? null,
    roundOff: Number(inv.roundOff),
    amountInWords: inv.amountInWords ?? null,
    status: inv.status,
    validTransitions: validTransitions(INVOICE_TRANSITIONS, inv.status),
    dueDate: inv.dueDate?.toISOString() ?? null,
    notes: inv.notes ?? null,
    paymentTerms: inv.paymentTerms ?? null,
    createdAt: inv.createdAt.toISOString(),
  };
}

router.get("/v1/invoices", async (req, res): Promise<void> => {
  const { status, clientId, salesOrderId } = req.query as { status?: string; clientId?: string; salesOrderId?: string };
  const conditions: SQL[] = [eq(invoicesTable.companyId, req.companyId), isNull(invoicesTable.deletedAt)];
  if (status) conditions.push(eq(invoicesTable.status, status));
  if (clientId) conditions.push(eq(invoicesTable.clientId, parseInt(clientId, 10)));
  if (salesOrderId) conditions.push(eq(invoicesTable.salesOrderId, parseInt(salesOrderId, 10)));

  const rows = await db
    .select({
      invoice: invoicesTable,
      clientName: clientsTable.companyName,
      orderNumber: salesOrdersTable.orderNumber,
      clientGst: clientsTable.gstNumber,
    })
    .from(invoicesTable)
    .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
    .leftJoin(salesOrdersTable, eq(invoicesTable.salesOrderId, salesOrdersTable.id))
    .where(and(...conditions))
    .orderBy(invoicesTable.createdAt);

  res.json(rows.map((r) => serializeInvoice(r.invoice, r.clientName, r.orderNumber, r.clientGst)));
});

router.post("/v1/invoices", async (req, res): Promise<void> => {
  const { salesOrderId, dueDate, notes, paymentTerms } = req.body ?? {};
  if (!salesOrderId) {
    res.status(400).json({ error: "salesOrderId is required" }); return;
  }

  const [order] = await db
    .select({ order: salesOrdersTable, clientId: salesOrdersTable.clientId })
    .from(salesOrdersTable)
    .where(and(eq(salesOrdersTable.id, salesOrderId), eq(salesOrdersTable.companyId, req.companyId)));
  if (!order) { res.status(404).json({ error: "Sales order not found" }); return; }

  const [client] = await db
    .select({ stateCode: clientsTable.stateCode })
    .from(clientsTable)
    .where(eq(clientsTable.id, order.clientId));

  const soItems = await db
    .select({ item: salesOrderItemsTable, product: productsTable })
    .from(salesOrderItemsTable)
    .leftJoin(productsTable, eq(salesOrderItemsTable.productId, productsTable.id))
    .where(eq(salesOrderItemsTable.salesOrderId, salesOrderId));

  const { prefix, fyStartMonth, stateCode: companyStateCode } = await getSettings(req.companyId);
  const clientStateCode = client?.stateCode ?? null;

  const invoice = await db.transaction(async (tx) => {
    const invoiceNumber = await nextDocNumber(tx, req.companyId, "INV", prefix, fyStartMonth);

    let totalAmount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const lineValues = soItems.map(({ item, product }) => {
      const qty = item.quantity;
      const unitPrice = Number(item.unitPrice);
      const lineTotal = qty * unitPrice;
      const gstRate = Number(product?.gstRate ?? 18);
      const gst = computeGst(companyStateCode, clientStateCode, lineTotal, gstRate);

      totalAmount += lineTotal;
      totalCgst += Number(gst.cgst);
      totalSgst += Number(gst.sgst);
      totalIgst += Number(gst.igst);

      return {
        invoiceId: 0,
        productId: item.productId,
        description: product?.name ?? "Item",
        hsnCode: product?.hsnCode ?? null,
        uom: product?.uom ?? "PCS",
        quantity: String(qty),
        unitPrice: String(unitPrice),
        lineTotal: String(lineTotal),
        gstRate: String(gstRate),
        cgst: gst.cgst,
        sgst: gst.sgst,
        igst: gst.igst,
        lineTaxTotal: gst.taxTotal,
        lineGrandTotal: String((lineTotal + Number(gst.taxTotal)).toFixed(2)),
      };
    });

    const gstAmount = totalCgst + totalSgst + totalIgst;
    const rawGrand = totalAmount + gstAmount;
    const roundOff = Math.round(rawGrand) - rawGrand;
    const grandTotal = rawGrand + roundOff;

    const [inv] = await tx.insert(invoicesTable).values({
      companyId: req.companyId,
      invoiceNumber,
      salesOrderId,
      clientId: order.clientId,
      totalAmount: String(totalAmount.toFixed(2)),
      gstAmount: String(gstAmount.toFixed(2)),
      grandTotal: String(grandTotal.toFixed(2)),
      cgst: String(totalCgst.toFixed(2)),
      sgst: String(totalSgst.toFixed(2)),
      igst: String(totalIgst.toFixed(2)),
      placeOfSupplyStateCode: clientStateCode,
      roundOff: String(roundOff.toFixed(2)),
      amountInWords: amountInWords(grandTotal),
      status: "Draft",
      dueDate: dueDate ? new Date(dueDate) : null,
      notes: notes ?? null,
      paymentTerms: paymentTerms ?? null,
    }).returning();

    if (lineValues.length > 0) {
      await tx.insert(invoiceLinesTable).values(
        lineValues.map((l) => ({ ...l, invoiceId: inv.id }))
      );
    }

    return inv;
  });

  const [row] = await db
    .select({
      invoice: invoicesTable,
      clientName: clientsTable.companyName,
      orderNumber: salesOrdersTable.orderNumber,
      clientGst: clientsTable.gstNumber,
    })
    .from(invoicesTable)
    .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
    .leftJoin(salesOrdersTable, eq(invoicesTable.salesOrderId, salesOrdersTable.id))
    .where(eq(invoicesTable.id, invoice.id));

  res.status(201).json(serializeInvoice(row.invoice, row.clientName, row.orderNumber, row.clientGst));
});

router.get("/v1/invoices/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [row] = await db
    .select({
      invoice: invoicesTable,
      clientName: clientsTable.companyName,
      orderNumber: salesOrdersTable.orderNumber,
      clientGst: clientsTable.gstNumber,
      contactPerson: clientsTable.contactPerson,
      billingAddress: clientsTable.billingAddress,
    })
    .from(invoicesTable)
    .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
    .leftJoin(salesOrdersTable, eq(invoicesTable.salesOrderId, salesOrdersTable.id))
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.companyId, req.companyId)));

  if (!row) { res.status(404).json({ error: "Invoice not found" }); return; }

  const lines = await db
    .select()
    .from(invoiceLinesTable)
    .where(eq(invoiceLinesTable.invoiceId, id));

  const payments = await db.select().from(paymentsTable)
    .where(and(eq(paymentsTable.invoiceId, id), eq(paymentsTable.companyId, req.companyId)))
    .orderBy(paymentsTable.paymentDate);

  res.json({
    ...serializeInvoice(row.invoice, row.clientName, row.orderNumber, row.clientGst),
    contactPerson: row.contactPerson ?? null,
    billingAddress: row.billingAddress ?? null,
    lines: lines.map((l) => ({
      id: l.id,
      productId: l.productId ?? null,
      description: l.description,
      hsnCode: l.hsnCode ?? null,
      uom: l.uom,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      lineTotal: Number(l.lineTotal),
      gstRate: Number(l.gstRate),
      cgst: Number(l.cgst),
      sgst: Number(l.sgst),
      igst: Number(l.igst),
      lineTaxTotal: Number(l.lineTaxTotal),
      lineGrandTotal: Number(l.lineGrandTotal),
    })),
    payments: payments.map((p) => ({
      id: p.id, amount: Number(p.amount),
      type: p.type, paymentMode: p.paymentMode ?? null, referenceNo: p.referenceNo ?? null,
      paymentDate: p.paymentDate.toISOString(), notes: p.notes ?? null,
    })),
  });
});

router.patch("/v1/invoices/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const updates: Record<string, unknown> = {};
  if (req.body.status) updates.status = req.body.status;
  if (req.body.notes !== undefined) updates.notes = req.body.notes;
  if (req.body.paymentTerms !== undefined) updates.paymentTerms = req.body.paymentTerms;
  if (req.body.dueDate !== undefined) updates.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;

  const [inv] = await db.update(invoicesTable).set(updates)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.companyId, req.companyId))).returning();
  if (!inv) { res.status(404).json({ error: "Invoice not found" }); return; }

  const [row] = await db
    .select({
      invoice: invoicesTable,
      clientName: clientsTable.companyName,
      orderNumber: salesOrdersTable.orderNumber,
      clientGst: clientsTable.gstNumber,
    })
    .from(invoicesTable)
    .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
    .leftJoin(salesOrdersTable, eq(invoicesTable.salesOrderId, salesOrdersTable.id))
    .where(eq(invoicesTable.id, id));

  res.json(serializeInvoice(row.invoice, row.clientName, row.orderNumber, row.clientGst));
});

router.patch("/v1/invoices/:id/status", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { status } = req.body ?? {};
  if (!status) { res.status(400).json({ error: "status is required" }); return; }

  const [inv] = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.companyId, req.companyId)));
  if (!inv) { res.status(404).json({ error: "Invoice not found" }); return; }

  try {
    assertTransition(INVOICE_TRANSITIONS, inv.status, status, "Invoice");
  } catch (err) {
    if (err instanceof StatusError) {
      res.status(err.status).json({ error: err.message }); return;
    }
    throw err;
  }

  const [updated] = await db.update(invoicesTable).set({ status })
    .where(eq(invoicesTable.id, id)).returning();

  const [row] = await db
    .select({
      invoice: invoicesTable,
      clientName: clientsTable.companyName,
      orderNumber: salesOrdersTable.orderNumber,
      clientGst: clientsTable.gstNumber,
    })
    .from(invoicesTable)
    .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
    .leftJoin(salesOrdersTable, eq(invoicesTable.salesOrderId, salesOrdersTable.id))
    .where(eq(invoicesTable.id, updated.id));

  res.json(serializeInvoice(row.invoice, row.clientName, row.orderNumber, row.clientGst));
});

router.get("/v1/payments", async (req, res): Promise<void> => {
  const { invoiceId } = req.query as { invoiceId?: string };
  const payments = invoiceId
    ? await db.select().from(paymentsTable).where(and(eq(paymentsTable.invoiceId, parseInt(invoiceId, 10)), eq(paymentsTable.companyId, req.companyId))).orderBy(paymentsTable.paymentDate)
    : await db.select().from(paymentsTable).where(eq(paymentsTable.companyId, req.companyId)).orderBy(paymentsTable.paymentDate);

  res.json(payments.map((p) => ({
    id: p.id, invoiceId: p.invoiceId, amount: Number(p.amount),
    type: p.type, paymentMode: p.paymentMode ?? null, referenceNo: p.referenceNo ?? null,
    paymentDate: p.paymentDate.toISOString(),
    notes: p.notes ?? null, createdAt: p.createdAt.toISOString(),
  })));
});

router.post("/v1/payments", async (req, res): Promise<void> => {
  const { invoiceId, amount, type, paymentMode, referenceNo, paymentDate, notes } = req.body ?? {};
  if (!invoiceId || amount == null || !type || !paymentDate) {
    res.status(400).json({ error: "invoiceId, amount, type, and paymentDate are required" }); return;
  }

  const [invoice] = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.id, invoiceId), eq(invoicesTable.companyId, req.companyId)));
  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
  if (invoice.status === "Paid") {
    res.status(400).json({ error: "Invoice is already fully paid" }); return;
  }

  const [payment] = await db.transaction(async (tx) => {
    const [p] = await tx.insert(paymentsTable).values({
      companyId: req.companyId, invoiceId, amount: String(amount),
      type, paymentMode: paymentMode ?? null, referenceNo: referenceNo ?? null,
      paymentDate: new Date(paymentDate), notes,
    }).returning();

    const allPayments = await tx.select().from(paymentsTable)
      .where(and(eq(paymentsTable.invoiceId, invoiceId), eq(paymentsTable.companyId, req.companyId)));
    const totalPaid = allPayments.reduce((s, p2) => s + Number(p2.amount), 0);
    const grandTotal = Number(invoice.grandTotal);

    let newStatus = invoice.status;
    if (totalPaid >= grandTotal) newStatus = "Paid";
    else if (totalPaid > 0) newStatus = "Partially Paid";
    else if (invoice.status === "Draft") newStatus = "Issued";

    if (newStatus !== invoice.status) {
      await tx.update(invoicesTable).set({ status: newStatus }).where(eq(invoicesTable.id, invoiceId));
    }

    return [p];
  });

  res.status(201).json({
    id: payment.id, invoiceId: payment.invoiceId, amount: Number(payment.amount),
    type: payment.type, paymentMode: payment.paymentMode ?? null, referenceNo: payment.referenceNo ?? null,
    paymentDate: payment.paymentDate.toISOString(),
    notes: payment.notes ?? null, createdAt: payment.createdAt.toISOString(),
  });
});

router.delete("/v1/invoices/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [inv] = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.companyId, req.companyId)));
  if (!inv) { res.status(404).json({ error: "Invoice not found" }); return; }
  if (!["Draft", "Cancelled"].includes(inv.status)) {
    res.status(400).json({ error: "Only Draft or Cancelled invoices can be deleted" }); return;
  }
  await db.update(invoicesTable).set({ deletedAt: new Date() })
    .where(eq(invoicesTable.id, id));
  res.status(204).send();
});

export default router;
