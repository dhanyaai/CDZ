import { Router } from "express";
import { and, eq, inArray, SQL } from "drizzle-orm";
import { db, sampleOrdersTable, sampleOrderItemsTable, clientsTable, productsTable, opportunitiesTable, quotesTable, quoteItemsTable } from "@workspace/db";

const router = Router();

function padId(id: number) { return `SMPL-${String(id).padStart(5, "0")}`; }

async function getDetail(id: number, companyId: number) {
  const [row] = await db
    .select({ order: sampleOrdersTable, clientName: clientsTable.companyName })
    .from(sampleOrdersTable)
    .leftJoin(clientsTable, eq(sampleOrdersTable.clientId, clientsTable.id))
    .where(and(eq(sampleOrdersTable.id, id), eq(sampleOrdersTable.companyId, companyId)));
  if (!row) return null;

  const items = await db
    .select({ item: sampleOrderItemsTable, product: productsTable })
    .from(sampleOrderItemsTable)
    .leftJoin(productsTable, eq(sampleOrderItemsTable.productId, productsTable.id))
    .where(eq(sampleOrderItemsTable.sampleOrderId, id));

  return {
    id: row.order.id,
    sampleNumber: row.order.sampleNumber,
    clientId: row.order.clientId ?? null,
    clientName: row.clientName ?? null,
    opportunityId: row.order.opportunityId ?? null,
    customerName: row.order.customerName ?? null,
    customerPhone: row.order.customerPhone ?? null,
    customerEmail: row.order.customerEmail ?? null,
    status: row.order.status,
    notes: row.order.notes ?? null,
    createdAt: row.order.createdAt.toISOString(),
    items: items.map((r) => ({
      id: r.item.id,
      productId: r.item.productId,
      productName: r.product?.name ?? "Unknown",
      quantity: r.item.quantity,
      returnedQty: r.item.returnedQty ?? 0,
      disposition: (r.item.disposition ?? null) as "gift" | "invoice" | null,
      notes: r.item.notes ?? null,
    })),
  };
}

// GET /v1/sample-orders
router.get("/v1/sample-orders", async (req, res): Promise<void> => {
  const { status, opportunityId } = req.query as { status?: string; opportunityId?: string };
  const conditions: SQL[] = [eq(sampleOrdersTable.companyId, req.companyId)];
  if (status) conditions.push(eq(sampleOrdersTable.status, status));
  if (opportunityId) {
    const oid = parseInt(opportunityId, 10);
    if (Number.isNaN(oid)) { res.status(400).json({ error: "opportunityId must be a number" }); return; }
    conditions.push(eq(sampleOrdersTable.opportunityId, oid));
  }

  const rows = await db
    .select({ order: sampleOrdersTable, clientName: clientsTable.companyName })
    .from(sampleOrdersTable)
    .leftJoin(clientsTable, eq(sampleOrdersTable.clientId, clientsTable.id))
    .where(and(...conditions))
    .orderBy(sampleOrdersTable.createdAt);

  // When filtering by opportunity, include items for inline display
  let itemsByOrderId: Record<number, { id: number; productId: number; productName: string; quantity: number; returnedQty: number; disposition: string | null; notes: string | null }[]> = {};
  if (opportunityId && rows.length > 0) {
    const orderIds = rows.map(r => r.order.id);
    const allItems = await db
      .select({ item: sampleOrderItemsTable, product: productsTable })
      .from(sampleOrderItemsTable)
      .leftJoin(productsTable, eq(sampleOrderItemsTable.productId, productsTable.id))
      .where(inArray(sampleOrderItemsTable.sampleOrderId, orderIds));
    for (const r of allItems) {
      const oid = r.item.sampleOrderId;
      if (!itemsByOrderId[oid]) itemsByOrderId[oid] = [];
      itemsByOrderId[oid].push({
        id: r.item.id,
        productId: r.item.productId,
        productName: r.product?.name ?? "Unknown",
        quantity: r.item.quantity,
        returnedQty: r.item.returnedQty ?? 0,
        disposition: r.item.disposition ?? null,
        notes: r.item.notes ?? null,
      });
    }
  }

  res.json(rows.map((r) => ({
    id: r.order.id,
    sampleNumber: r.order.sampleNumber,
    clientId: r.order.clientId ?? null,
    clientName: r.clientName ?? null,
    opportunityId: r.order.opportunityId ?? null,
    customerName: r.order.customerName ?? null,
    status: r.order.status,
    notes: r.order.notes ?? null,
    createdAt: r.order.createdAt.toISOString(),
    items: itemsByOrderId[r.order.id] ?? [],
  })));
});

// GET /v1/sample-orders/:id
router.get("/v1/sample-orders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const detail = await getDetail(id, req.companyId);
  if (!detail) { res.status(404).json({ error: "Sample order not found" }); return; }
  res.json(detail);
});

// POST /v1/sample-orders
router.post("/v1/sample-orders", async (req, res): Promise<void> => {
  const { clientId, opportunityId, customerName, customerPhone, customerEmail, notes, items } = req.body ?? {};

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "items[] is required" }); return;
  }
  if (!clientId && !customerName) {
    res.status(400).json({ error: "Either clientId or customerName is required" }); return;
  }

  if (clientId) {
    const [client] = await db.select({ id: clientsTable.id }).from(clientsTable)
      .where(and(eq(clientsTable.id, clientId), eq(clientsTable.companyId, req.companyId)));
    if (!client) { res.status(404).json({ error: "Client not found" }); return; }
  }

  if (opportunityId !== undefined && opportunityId !== null && !Number.isInteger(opportunityId)) {
    res.status(400).json({ error: "opportunityId must be an integer" }); return;
  }

  if (opportunityId) {
    const [opp] = await db.select({ id: opportunitiesTable.id }).from(opportunitiesTable)
      .where(and(eq(opportunitiesTable.id, opportunityId), eq(opportunitiesTable.companyId, req.companyId)));
    if (!opp) { res.status(404).json({ error: "Opportunity not found" }); return; }
  }

  const [order] = await db.insert(sampleOrdersTable).values({
    companyId: req.companyId,
    sampleNumber: "SMPL-TEMP",
    clientId: clientId ?? null,
    opportunityId: opportunityId ?? null,
    customerName: customerName ?? null,
    customerPhone: customerPhone ?? null,
    customerEmail: customerEmail ?? null,
    notes: notes ?? null,
    status: "Requested",
  }).returning();

  await db.update(sampleOrdersTable)
    .set({ sampleNumber: padId(order.id) })
    .where(eq(sampleOrdersTable.id, order.id));

  await db.insert(sampleOrderItemsTable).values(
    items.map((i: { productId: number; quantity: number; notes?: string }) => ({
      sampleOrderId: order.id,
      productId: i.productId,
      quantity: i.quantity,
      notes: i.notes ?? null,
    }))
  );

  const detail = await getDetail(order.id, req.companyId);
  res.status(201).json(detail);
});

// PATCH /v1/sample-orders/:id/status
router.patch("/v1/sample-orders/:id/status", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { status } = req.body ?? {};
  const allowed = ["Requested", "Dispatched", "Received", "Converted", "Rejected", "Returned"];
  if (!status || !allowed.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` }); return;
  }
  const [updated] = await db.update(sampleOrdersTable)
    .set({ status })
    .where(and(eq(sampleOrdersTable.id, id), eq(sampleOrdersTable.companyId, req.companyId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Sample order not found" }); return; }
  const detail = await getDetail(id, req.companyId);
  res.json(detail);
});

// POST /v1/sample-orders/:id/convert-to-quote
// Atomically: create a quote from the sample's items, mark the sample Converted,
// and advance the linked opportunity samples → quotation_sent. Safe to retry:
// an already-Converted sample returns 409 instead of creating a duplicate quote.
router.post("/v1/sample-orders/:id/convert-to-quote", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  // Optional frontend-calculated prices (catalogue pricing), keyed by productId
  const prices = (req.body?.productPrices ?? {}) as Record<string, number>;

  try {
    const result = await db.transaction(async (tx) => {
      const [so] = await tx.select().from(sampleOrdersTable)
        .where(and(eq(sampleOrdersTable.id, id), eq(sampleOrdersTable.companyId, req.companyId)))
        .for("update");
      if (!so) throw Object.assign(new Error("Sample order not found"), { httpStatus: 404 });
      if (so.status === "Converted") throw Object.assign(new Error("This sample order was already converted to a quote"), { httpStatus: 409 });
      if (so.status === "Rejected") throw Object.assign(new Error("A rejected sample order cannot be converted"), { httpStatus: 400 });

      const items = await tx
        .select({ item: sampleOrderItemsTable, product: productsTable })
        .from(sampleOrderItemsTable)
        .leftJoin(productsTable, eq(sampleOrderItemsTable.productId, productsTable.id))
        .where(eq(sampleOrderItemsTable.sampleOrderId, id));
      if (items.length === 0) throw Object.assign(new Error("This sample order has no items"), { httpStatus: 400 });

      let opportunity: typeof opportunitiesTable.$inferSelect | undefined;
      if (so.opportunityId != null) {
        const oppRows = await tx.select().from(opportunitiesTable)
          .where(and(eq(opportunitiesTable.id, so.opportunityId), eq(opportunitiesTable.companyId, req.companyId)))
          .for("update");
        opportunity = oppRows[0];
      }

      const clientId = so.clientId ?? opportunity?.clientId ?? null;
      if (!clientId) throw Object.assign(new Error("No client linked — set a client on the opportunity first (Edit → Client)"), { httpStatus: 400 });

      const quoteLines = items.map((r) => {
        const provided = Number(prices[String(r.item.productId)]);
        const fallback = r.product ? Number(r.product.sellingPrice) : 0;
        const unitPrice = Number.isFinite(provided) && provided >= 0
          ? provided
          : (Number.isFinite(fallback) ? fallback : 0);
        return {
          productId: r.item.productId,
          description: r.product?.name ?? "Unknown product",
          quantity: r.item.quantity,
          unitPrice,
          imageUrl: r.product?.imageUrl ?? null,
        };
      });

      const subtotal = quoteLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
      const gst = subtotal * 0.18;
      const total = subtotal + gst;

      const [q] = await tx.insert(quotesTable).values({
        companyId: req.companyId,
        quoteNumber: `QT-${Date.now()}`,
        subject: opportunity?.title ?? `Sample ${so.sampleNumber}`,
        clientId,
        opportunityId: so.opportunityId ?? null,
        subtotal: subtotal.toFixed(2), discountPct: "0.00",
        gstAmount: gst.toFixed(2), totalAmount: total.toFixed(2),
        notes: `Created from sample order ${so.sampleNumber}`,
      }).returning();

      await tx.insert(quoteItemsTable).values(quoteLines.map((l) => ({
        quoteId: q.id, productId: l.productId, description: l.description,
        quantity: l.quantity, unitPrice: l.unitPrice.toString(),
        lineTotal: (l.quantity * l.unitPrice).toString(), imageUrl: l.imageUrl,
      })));

      await tx.update(sampleOrdersTable).set({ status: "Converted" })
        .where(eq(sampleOrdersTable.id, so.id));

      let opportunityStage: string | null = null;
      if (opportunity && opportunity.stage === "samples") {
        await tx.update(opportunitiesTable).set({ stage: "quotation_sent" })
          .where(eq(opportunitiesTable.id, opportunity.id));
        opportunityStage = "quotation_sent";
      }

      return { quoteId: q.id, quoteNumber: q.quoteNumber, opportunityStage };
    });

    res.status(201).json(result);
  } catch (err) {
    const httpStatus = (err as { httpStatus?: number }).httpStatus;
    if (httpStatus) { res.status(httpStatus).json({ error: (err as Error).message }); return; }
    console.error("convert-to-quote failed:", err);
    res.status(500).json({ error: "Failed to convert sample order to quote" });
  }
});

// PATCH /v1/sample-orders/:id/return
router.patch("/v1/sample-orders/:id/return", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { items, notes } = req.body ?? {};

  const [order] = await db.select({ id: sampleOrdersTable.id, status: sampleOrdersTable.status })
    .from(sampleOrdersTable)
    .where(and(eq(sampleOrdersTable.id, id), eq(sampleOrdersTable.companyId, req.companyId)));
  if (!order) { res.status(404).json({ error: "Sample order not found" }); return; }
  if (order.status !== "Received" && order.status !== "Returned") {
    res.status(400).json({ error: "Only received or returned orders can be updated" }); return;
  }

  const alreadyReturned = order.status === "Returned";

  if (Array.isArray(items) && items.length > 0) {
    for (const { itemId, returnedQty, disposition } of items) {
      if (typeof itemId !== "number") continue;
      const validDisposition = ["gift", "invoice"].includes(disposition) ? disposition : null;
      if (alreadyReturned) {
        // Disposition-only update — qty is finalised
        await db.update(sampleOrderItemsTable)
          .set({ disposition: validDisposition })
          .where(and(eq(sampleOrderItemsTable.id, itemId), eq(sampleOrderItemsTable.sampleOrderId, id)));
      } else {
        if (typeof returnedQty !== "number" || returnedQty < 0) continue;
        await db.update(sampleOrderItemsTable)
          .set({ returnedQty, disposition: validDisposition })
          .where(and(eq(sampleOrderItemsTable.id, itemId), eq(sampleOrderItemsTable.sampleOrderId, id)));
      }
    }
  }

  if (!alreadyReturned) {
    const updates: Record<string, unknown> = { status: "Returned" };
    if (notes !== undefined) updates.notes = notes;
    await db.update(sampleOrdersTable).set(updates)
      .where(and(eq(sampleOrdersTable.id, id), eq(sampleOrdersTable.companyId, req.companyId)));
  }

  const detail = await getDetail(id, req.companyId);
  res.json(detail);
});

// PATCH /v1/sample-orders/:id
router.patch("/v1/sample-orders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const updates: Record<string, unknown> = {};
  if (req.body.notes !== undefined) updates.notes = req.body.notes;
  if (req.body.customerName !== undefined) updates.customerName = req.body.customerName;
  if (req.body.customerPhone !== undefined) updates.customerPhone = req.body.customerPhone;
  if (req.body.customerEmail !== undefined) updates.customerEmail = req.body.customerEmail;
  const [updated] = await db.update(sampleOrdersTable)
    .set(updates)
    .where(and(eq(sampleOrdersTable.id, id), eq(sampleOrdersTable.companyId, req.companyId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Sample order not found" }); return; }
  const detail = await getDetail(id, req.companyId);
  res.json(detail);
});

// DELETE /v1/sample-orders/:id
router.delete("/v1/sample-orders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(sampleOrdersTable)
    .where(and(eq(sampleOrdersTable.id, id), eq(sampleOrdersTable.companyId, req.companyId)));
  res.sendStatus(204);
});

export default router;
