import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, quotesTable, quoteItemsTable, clientsTable } from "@workspace/db";

const router = Router();

router.get("/v1/quotes", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: quotesTable.id, quoteNumber: quotesTable.quoteNumber,
      clientId: quotesTable.clientId, clientName: clientsTable.companyName,
      opportunityId: quotesTable.opportunityId, status: quotesTable.status,
      validUntil: quotesTable.validUntil, subtotal: quotesTable.subtotal,
      discountPct: quotesTable.discountPct, gstAmount: quotesTable.gstAmount,
      totalAmount: quotesTable.totalAmount, notes: quotesTable.notes,
      createdAt: quotesTable.createdAt,
    })
    .from(quotesTable)
    .leftJoin(clientsTable, eq(quotesTable.clientId, clientsTable.id))
    .where(eq(quotesTable.companyId, req.companyId))
    .orderBy(quotesTable.createdAt);
  res.json(rows.map((r) => ({
    ...r,
    subtotal: Number(r.subtotal), discountPct: Number(r.discountPct),
    gstAmount: Number(r.gstAmount), totalAmount: Number(r.totalAmount),
    validUntil: r.validUntil?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.get("/v1/quotes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [quote] = await db.select().from(quotesTable).where(and(eq(quotesTable.id, id), eq(quotesTable.companyId, req.companyId)));
  if (!quote) { res.status(404).json({ error: "Not found" }); return; }
  const items = await db.select().from(quoteItemsTable).where(eq(quoteItemsTable.quoteId, id));
  res.json({
    ...quote,
    subtotal: Number(quote.subtotal), discountPct: Number(quote.discountPct),
    gstAmount: Number(quote.gstAmount), totalAmount: Number(quote.totalAmount),
    validUntil: quote.validUntil?.toISOString() ?? null,
    createdAt: quote.createdAt.toISOString(),
    items: items.map((i) => ({ ...i, unitPrice: Number(i.unitPrice), lineTotal: Number(i.lineTotal) })),
  });
});

router.post("/v1/quotes", async (req, res): Promise<void> => {
  const { clientId, opportunityId, validUntil, discountPct, notes, items } = req.body ?? {};
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
      companyId: req.companyId, quoteNumber, clientId, opportunityId,
      validUntil: validUntil ? new Date(validUntil) : null,
      subtotal: subtotal.toFixed(2), discountPct: disc.toFixed(2),
      gstAmount: gst.toFixed(2), totalAmount: total.toFixed(2), notes,
    }).returning();
    await tx.insert(quoteItemsTable).values(items.map((i: { description: string; quantity: number; unitPrice: number }) => ({
      quoteId: q.id, description: i.description, quantity: i.quantity,
      unitPrice: i.unitPrice.toString(), lineTotal: (i.quantity * i.unitPrice).toString(),
    })));
    return q;
  });
  res.status(201).json({ ...quote, id: quote.id });
});

router.patch("/v1/quotes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const updates: Record<string, unknown> = {};
  if (req.body.status) updates.status = req.body.status;
  if (req.body.notes !== undefined) updates.notes = req.body.notes;
  const [q] = await db.update(quotesTable).set(updates).where(and(eq(quotesTable.id, id), eq(quotesTable.companyId, req.companyId))).returning();
  if (!q) { res.status(404).json({ error: "Not found" }); return; }
  res.json(q);
});

router.delete("/v1/quotes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(quotesTable).where(and(eq(quotesTable.id, id), eq(quotesTable.companyId, req.companyId)));
  res.sendStatus(204);
});

export default router;
