import { recordStatusChange } from "../lib/statusHistory";
import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, quotesTable, quoteItemsTable, clientsTable, salesOrdersTable, salesOrderItemsTable, companySettingsTable } from "@workspace/db";
import { nextDocNumber } from "../lib/numberSequence";

const router = Router();

function serializeQuote(r: typeof quotesTable.$inferSelect, clientName: string | null) {
  return {
    id: r.id,
    quoteNumber: r.quoteNumber,
    subject: r.subject ?? null,
    clientId: r.clientId,
    clientName: clientName ?? null,
    opportunityId: r.opportunityId ?? null,
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

router.get("/v1/quotes", async (req, res): Promise<void> => {
  const rows = await db
    .select({ q: quotesTable, clientName: clientsTable.companyName })
    .from(quotesTable)
    .leftJoin(clientsTable, eq(quotesTable.clientId, clientsTable.id))
    .where(eq(quotesTable.companyId, req.companyId))
    .orderBy(quotesTable.createdAt);

  res.json(rows.map((r) => serializeQuote(r.q, r.clientName)));
});

router.get("/v1/quotes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [row] = await db
    .select({
      q: quotesTable,
      clientName: clientsTable.companyName,
      contactPerson: clientsTable.contactPerson,
      clientEmail: clientsTable.email,
      clientPhone: clientsTable.phone,
      clientGst: clientsTable.gstNumber,
      billingAddress: clientsTable.billingAddress,
    })
    .from(quotesTable)
    .leftJoin(clientsTable, eq(quotesTable.clientId, clientsTable.id))
    .where(and(eq(quotesTable.id, id), eq(quotesTable.companyId, req.companyId)));

  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  const items = await db.select().from(quoteItemsTable).where(eq(quoteItemsTable.quoteId, id));

  res.json({
    ...serializeQuote(row.q, row.clientName),
    contactPerson: row.contactPerson ?? null,
    clientEmail: row.clientEmail ?? null,
    clientPhone: row.clientPhone ?? null,
    clientGst: row.clientGst ?? null,
    billingAddress: row.billingAddress ?? null,
    items: items.map((i) => ({
      ...i,
      unitPrice: Number(i.unitPrice),
      lineTotal: Number(i.lineTotal),
      imageUrl: i.imageUrl ?? null,
      productId: i.productId ?? null,
    })),
  });
});

router.post("/v1/quotes", async (req, res): Promise<void> => {
  const { clientId, opportunityId, validUntil, discountPct, notes, items, subject, paymentTerms, termsAndConditions } = req.body ?? {};
  if (!clientId || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "clientId and items[] required" }); return;
  }
  const [client] = await db.select({ id: clientsTable.id }).from(clientsTable)
    .where(and(eq(clientsTable.id, clientId), eq(clientsTable.companyId, req.companyId)));
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }

  const subtotal = items.reduce((s: number, i: { quantity: number; unitPrice: number }) => s + i.quantity * i.unitPrice, 0);
  const disc = Number(discountPct ?? 0);
  const afterDisc = subtotal * (1 - disc / 100);
  const gst = afterDisc * 0.18;
  const total = afterDisc + gst;
  const quoteNumber = `QT-${Date.now()}`;

  const quote = await db.transaction(async (tx) => {
    const [q] = await tx.insert(quotesTable).values({
      companyId: req.companyId, quoteNumber, subject: subject ?? null,
      clientId, opportunityId: opportunityId ?? null,
      validUntil: validUntil ? new Date(validUntil) : null,
      paymentTerms: paymentTerms ?? null,
      subtotal: subtotal.toFixed(2), discountPct: disc.toFixed(2),
      gstAmount: gst.toFixed(2), totalAmount: total.toFixed(2),
      notes: notes ?? null, termsAndConditions: termsAndConditions ?? null,
    }).returning();

    await tx.insert(quoteItemsTable).values(
      items.map((i: { description: string; quantity: number; unitPrice: number; productId?: number; imageUrl?: string }) => ({
        quoteId: q.id, productId: i.productId ?? null, description: i.description,
        quantity: i.quantity, unitPrice: i.unitPrice.toString(),
        lineTotal: (i.quantity * i.unitPrice).toString(), imageUrl: i.imageUrl ?? null,
      }))
    );
    return q;
  });

  const [row] = await db.select({ q: quotesTable, clientName: clientsTable.companyName })
    .from(quotesTable).leftJoin(clientsTable, eq(quotesTable.clientId, clientsTable.id))
    .where(eq(quotesTable.id, quote.id));

  res.status(201).json(serializeQuote(row.q, row.clientName));
});

router.patch("/v1/quotes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const updates: Record<string, unknown> = {};
  if (req.body.status) updates.status = req.body.status;
  if (req.body.notes !== undefined) updates.notes = req.body.notes;
  if (req.body.paymentTerms !== undefined) updates.paymentTerms = req.body.paymentTerms;
  if (req.body.validUntil !== undefined) updates.validUntil = req.body.validUntil ? new Date(req.body.validUntil) : null;
  if (req.body.subject !== undefined) updates.subject = req.body.subject;
  if (req.body.termsAndConditions !== undefined) updates.termsAndConditions = req.body.termsAndConditions;

  let oldStatus: string | null = null;
  if (req.body.status) {
    const [cur] = await db.select({ status: quotesTable.status }).from(quotesTable)
      .where(and(eq(quotesTable.id, id), eq(quotesTable.companyId, req.companyId)));
    oldStatus = cur?.status ?? null;
  }
  const [q] = await db.update(quotesTable).set(updates)
    .where(and(eq(quotesTable.id, id), eq(quotesTable.companyId, req.companyId))).returning();
  if (!q) { res.status(404).json({ error: "Not found" }); return; }
  if (req.body.status && oldStatus !== null) {
    await recordStatusChange({ companyId: req.companyId, entityType: "quote", entityId: id, fromStatus: oldStatus, toStatus: q.status, changedBy: req.userId });
  }

  const [row] = await db.select({ q: quotesTable, clientName: clientsTable.companyName })
    .from(quotesTable).leftJoin(clientsTable, eq(quotesTable.clientId, clientsTable.id))
    .where(eq(quotesTable.id, id));
  res.json(serializeQuote(row.q, row.clientName));
});

router.delete("/v1/quotes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(quotesTable).where(and(eq(quotesTable.id, id), eq(quotesTable.companyId, req.companyId)));
  res.sendStatus(204);
});

// PATCH /v1/quotes/:id/items/:itemId — edit qty and/or unit price for one line
router.patch("/v1/quotes/:id/items/:itemId", async (req, res): Promise<void> => {
  const quoteId = parseInt(req.params.id, 10);
  const itemId  = parseInt(req.params.itemId, 10);
  const { quantity, unitPrice } = req.body ?? {};
  if ((quantity !== undefined && (typeof quantity !== "number" || quantity < 1)) ||
      (unitPrice !== undefined && (typeof unitPrice !== "number" || unitPrice < 0))) {
    res.status(400).json({ error: "quantity must be ≥ 1 and unitPrice must be ≥ 0" }); return;
  }

  const [quote] = await db.select().from(quotesTable)
    .where(and(eq(quotesTable.id, quoteId), eq(quotesTable.companyId, req.companyId)));
  if (!quote) { res.status(404).json({ error: "Quote not found" }); return; }

  const [item] = await db.select().from(quoteItemsTable)
    .where(and(eq(quoteItemsTable.id, itemId), eq(quoteItemsTable.quoteId, quoteId)));
  if (!item) { res.status(404).json({ error: "Line item not found" }); return; }

  const newQty   = quantity  !== undefined ? quantity  : item.quantity;
  const newPrice = unitPrice !== undefined ? unitPrice : Number(item.unitPrice);
  const newLine  = newQty * newPrice;
  const discountPct = Number(quote.discountPct);

  await db.transaction(async (tx) => {
    await tx.update(quoteItemsTable)
      .set({ quantity: newQty, unitPrice: newPrice.toFixed(2), lineTotal: newLine.toFixed(2) })
      .where(eq(quoteItemsTable.id, itemId));
    // Recompute parent quote totals
    const allItems = await tx.select().from(quoteItemsTable).where(eq(quoteItemsTable.quoteId, quoteId));
    const subtotal = allItems.reduce((s, i) => s + Number(i.lineTotal), 0);
    const afterDisc = subtotal * (1 - discountPct / 100);
    const gst = afterDisc * 0.18;
    await tx.update(quotesTable)
      .set({ subtotal: subtotal.toFixed(2), gstAmount: gst.toFixed(2), totalAmount: (afterDisc + gst).toFixed(2) })
      .where(eq(quotesTable.id, quoteId));
  });

  const [updated] = await db.select().from(quoteItemsTable).where(eq(quoteItemsTable.id, itemId));
  const [updatedQuote] = await db.select().from(quotesTable).where(eq(quotesTable.id, quoteId));
  res.json({
    item: { ...updated, unitPrice: Number(updated.unitPrice), lineTotal: Number(updated.lineTotal) },
    quote: { subtotal: Number(updatedQuote.subtotal), gstAmount: Number(updatedQuote.gstAmount), totalAmount: Number(updatedQuote.totalAmount) },
  });
});

// DELETE /v1/quotes/:id/items/:itemId — remove one line (blocked if it's the last item)
router.delete("/v1/quotes/:id/items/:itemId", async (req, res): Promise<void> => {
  const quoteId = parseInt(req.params.id, 10);
  const itemId  = parseInt(req.params.itemId, 10);

  const [quote] = await db.select().from(quotesTable)
    .where(and(eq(quotesTable.id, quoteId), eq(quotesTable.companyId, req.companyId)));
  if (!quote) { res.status(404).json({ error: "Quote not found" }); return; }

  const allItems = await db.select().from(quoteItemsTable).where(eq(quoteItemsTable.quoteId, quoteId));
  if (!allItems.find(i => i.id === itemId)) { res.status(404).json({ error: "Line item not found" }); return; }
  if (allItems.length <= 1) { res.status(400).json({ error: "Cannot delete the last line item — delete the whole quote instead" }); return; }

  const discountPct = Number(quote.discountPct);
  await db.transaction(async (tx) => {
    await tx.delete(quoteItemsTable).where(eq(quoteItemsTable.id, itemId));
    const remaining = await tx.select().from(quoteItemsTable).where(eq(quoteItemsTable.quoteId, quoteId));
    const subtotal = remaining.reduce((s, i) => s + Number(i.lineTotal), 0);
    const afterDisc = subtotal * (1 - discountPct / 100);
    const gst = afterDisc * 0.18;
    await tx.update(quotesTable)
      .set({ subtotal: subtotal.toFixed(2), gstAmount: gst.toFixed(2), totalAmount: (afterDisc + gst).toFixed(2) })
      .where(eq(quotesTable.id, quoteId));
  });

  const [updatedQuote] = await db.select().from(quotesTable).where(eq(quotesTable.id, quoteId));
  res.json({
    quote: { subtotal: Number(updatedQuote.subtotal), gstAmount: Number(updatedQuote.gstAmount), totalAmount: Number(updatedQuote.totalAmount) },
  });
});

router.post("/v1/quotes/:id/convert", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const rawPo = (req.body as { poNumber?: unknown } | undefined)?.poNumber;
  if (rawPo !== undefined && rawPo !== null && typeof rawPo !== "string") {
    res.status(400).json({ error: "poNumber must be a string" }); return;
  }
  const trimmedPo = typeof rawPo === "string" ? rawPo.trim() : "";
  if (trimmedPo.length > 100) {
    res.status(400).json({ error: "PO number too long (max 100 characters)" }); return;
  }
  const poNumber = trimmedPo || null;

  const [quote] = await db.select().from(quotesTable)
    .where(and(eq(quotesTable.id, id), eq(quotesTable.companyId, req.companyId)));
  if (!quote) { res.status(404).json({ error: "Quote not found" }); return; }
  if (quote.status !== "accepted") { res.status(400).json({ error: "Quote must be accepted before converting" }); return; }

  // Idempotency guard — if an SO already exists for this quote, return it instead of creating another
  const [existingSO] = await db.select({ id: salesOrdersTable.id, orderNumber: salesOrdersTable.orderNumber })
    .from(salesOrdersTable)
    .where(and(eq(salesOrdersTable.quoteId, id), eq(salesOrdersTable.companyId, req.companyId)));
  if (existingSO) {
    res.json({ salesOrderId: existingSO.id, orderNumber: existingSO.orderNumber, quoteId: id, message: "Sales order already exists for this quote" });
    return;
  }

  const items = await db.select().from(quoteItemsTable).where(eq(quoteItemsTable.quoteId, id));

  const [settings] = await db.select({ soPrefix: companySettingsTable.soPrefix, fyStartMonth: companySettingsTable.fyStartMonth })
    .from(companySettingsTable).where(eq(companySettingsTable.companyId, req.companyId));
  const prefix = settings?.soPrefix ?? "SO";
  const fyStartMonth = settings?.fyStartMonth ?? 4;

  let so: typeof salesOrdersTable.$inferSelect;
  try {
    so = await db.transaction(async (tx) => {
      const orderNumber = await nextDocNumber(tx, req.companyId, "SO", prefix, fyStartMonth);
      const [order] = await tx.insert(salesOrdersTable).values({
        companyId: req.companyId,
        orderNumber,
        clientId: quote.clientId,
        quoteId: quote.id,
        poNumber,
        status: "Draft",
        totalAmount: quote.subtotal,
        discountPct: quote.discountPct,
        gstAmount: quote.gstAmount,
        grandTotal: quote.totalAmount,
        paymentTerms: quote.paymentTerms ?? null,
        notes: quote.notes ?? null,
      }).returning();

      if (items.length > 0) {
        await tx.insert(salesOrderItemsTable).values(
          items.map((item) => ({
            salesOrderId: order.id,
            productId: item.productId ?? null,
            productName: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.lineTotal,
          }))
        );
      }

      await tx.update(quotesTable).set({ status: "accepted" }).where(eq(quotesTable.id, id));

      return order;
    });
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to convert quote to sales order");
    const msg = err instanceof Error ? err.message : "Database error during conversion";
    res.status(500).json({ error: `Conversion failed: ${msg}` });
    return;
  }

  res.status(201).json({
    salesOrderId: so.id,
    orderNumber: so.orderNumber,
    quoteId: id,
    message: "Sales order created from quote",
  });
});

export default router;
