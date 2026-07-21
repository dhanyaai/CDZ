import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, proformaInvoicesTable, proformaInvoiceItemsTable, clientsTable, quotesTable, quoteItemsTable, companiesTable } from "@workspace/db";

const router = Router();

function serializePI(r: typeof proformaInvoicesTable.$inferSelect, clientName: string | null) {
  return {
    id: r.id,
    piNumber: r.piNumber,
    quoteId: r.quoteId ?? null,
    clientId: r.clientId,
    clientName: clientName ?? null,
    subject: r.subject ?? null,
    status: r.status,
    validUntil: r.validUntil?.toISOString() ?? null,
    paymentTerms: r.paymentTerms ?? null,
    subtotal: Number(r.subtotal),
    discountPct: Number(r.discountPct),
    gstAmount: Number(r.gstAmount),
    totalAmount: Number(r.totalAmount),
    notes: r.notes ?? null,
    termsAndConditions: r.termsAndConditions ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

// GET /v1/proforma-invoices
router.get("/v1/proforma-invoices", async (req, res): Promise<void> => {
  const rows = await db
    .select({ pi: proformaInvoicesTable, clientName: clientsTable.companyName })
    .from(proformaInvoicesTable)
    .leftJoin(clientsTable, eq(proformaInvoicesTable.clientId, clientsTable.id))
    .where(eq(proformaInvoicesTable.companyId, req.companyId))
    .orderBy(proformaInvoicesTable.createdAt);

  res.json(rows.map(r => serializePI(r.pi, r.clientName)));
});

// GET /v1/proforma-invoices/:id
router.get("/v1/proforma-invoices/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [row] = await db
    .select({
      pi: proformaInvoicesTable,
      clientName: clientsTable.companyName,
      contactPerson: clientsTable.contactPerson,
      clientEmail: clientsTable.email,
      clientPhone: clientsTable.phone,
      clientGst: clientsTable.gstNumber,
      billingAddress: clientsTable.billingAddress,
    })
    .from(proformaInvoicesTable)
    .leftJoin(clientsTable, eq(proformaInvoicesTable.clientId, clientsTable.id))
    .where(and(eq(proformaInvoicesTable.id, id), eq(proformaInvoicesTable.companyId, req.companyId)));

  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  const items = await db.select().from(proformaInvoiceItemsTable).where(eq(proformaInvoiceItemsTable.piId, id));

  res.json({
    ...serializePI(row.pi, row.clientName),
    contactPerson: row.contactPerson ?? null,
    clientEmail: row.clientEmail ?? null,
    clientPhone: row.clientPhone ?? null,
    clientGst: row.clientGst ?? null,
    billingAddress: row.billingAddress ?? null,
    items: items.map(i => ({
      id: i.id,
      productId: i.productId ?? null,
      description: i.description,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      lineTotal: Number(i.lineTotal),
      imageUrl: i.imageUrl ?? null,
    })),
  });
});

// PATCH /v1/proforma-invoices/:id/status
router.patch("/v1/proforma-invoices/:id/status", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { status } = req.body ?? {};
  if (!status) { res.status(400).json({ error: "status required" }); return; }

  const [pi] = await db.update(proformaInvoicesTable)
    .set({ status })
    .where(and(eq(proformaInvoicesTable.id, id), eq(proformaInvoicesTable.companyId, req.companyId)))
    .returning();

  if (!pi) { res.status(404).json({ error: "Not found" }); return; }
  const [row] = await db.select({ pi: proformaInvoicesTable, clientName: clientsTable.companyName })
    .from(proformaInvoicesTable).leftJoin(clientsTable, eq(proformaInvoicesTable.clientId, clientsTable.id))
    .where(eq(proformaInvoicesTable.id, id));
  res.json(serializePI(row.pi, row.clientName));
});

// DELETE /v1/proforma-invoices/:id
router.delete("/v1/proforma-invoices/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(proformaInvoicesTable)
    .where(and(eq(proformaInvoicesTable.id, id), eq(proformaInvoicesTable.companyId, req.companyId)));
  res.sendStatus(204);
});

// POST /v1/quotes/:id/convert-to-pi — convert an existing quote into a PI
router.post("/v1/quotes/:id/convert-to-pi", async (req, res): Promise<void> => {
  const quoteId = parseInt(req.params.id as string, 10);

  const [quote] = await db.select().from(quotesTable)
    .where(and(eq(quotesTable.id, quoteId), eq(quotesTable.companyId, req.companyId)));
  if (!quote) { res.status(404).json({ error: "Quote not found" }); return; }

  // Idempotency — return existing PI if already converted
  const [existing] = await db.select({ id: proformaInvoicesTable.id, piNumber: proformaInvoicesTable.piNumber })
    .from(proformaInvoicesTable)
    .where(and(eq(proformaInvoicesTable.quoteId, quoteId), eq(proformaInvoicesTable.companyId, req.companyId)));
  if (existing) {
    res.json({ piId: existing.id, piNumber: existing.piNumber, quoteId, message: "Proforma invoice already exists for this quote" });
    return;
  }

  const quoteItems = await db.select().from(quoteItemsTable).where(eq(quoteItemsTable.quoteId, quoteId));

  // Generate PI number
  const [company] = await db.select({ name: companiesTable.name }).from(companiesTable).where(eq(companiesTable.id, req.companyId));
  const prefix = company?.name ? company.name.slice(0, 2).toUpperCase() : "PI";
  const countRows = await db.select({ id: proformaInvoicesTable.id }).from(proformaInvoicesTable)
    .where(eq(proformaInvoicesTable.companyId, req.companyId));
  const piNumber = `PI-${String(countRows.length + 1).padStart(5, "0")}`;

  const pi = await db.transaction(async (tx) => {
    const [newPi] = await tx.insert(proformaInvoicesTable).values({
      companyId: req.companyId,
      piNumber,
      quoteId: quote.id,
      clientId: quote.clientId,
      subject: quote.subject ?? null,
      status: "Draft",
      validUntil: quote.validUntil ?? null,
      paymentTerms: quote.paymentTerms ?? null,
      subtotal: quote.subtotal,
      discountPct: quote.discountPct,
      gstAmount: quote.gstAmount,
      totalAmount: quote.totalAmount,
      notes: quote.notes ?? null,
      termsAndConditions: quote.termsAndConditions ?? null,
    }).returning();

    if (quoteItems.length > 0) {
      await tx.insert(proformaInvoiceItemsTable).values(
        quoteItems.map(i => ({
          piId: newPi.id,
          productId: i.productId ?? null,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.lineTotal,
          imageUrl: i.imageUrl ?? null,
        }))
      );
    }

    return newPi;
  });

  res.status(201).json({ piId: pi.id, piNumber: pi.piNumber, quoteId, message: "Proforma invoice created from quote" });
});

export default router;
