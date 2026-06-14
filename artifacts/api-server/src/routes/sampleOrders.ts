import { Router } from "express";
import { and, eq, SQL } from "drizzle-orm";
import { db, sampleOrdersTable, sampleOrderItemsTable, clientsTable, productsTable } from "@workspace/db";

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
      notes: r.item.notes ?? null,
    })),
  };
}

// GET /v1/sample-orders
router.get("/v1/sample-orders", async (req, res): Promise<void> => {
  const { status } = req.query as { status?: string };
  const conditions: SQL[] = [eq(sampleOrdersTable.companyId, req.companyId)];
  if (status) conditions.push(eq(sampleOrdersTable.status, status));

  const rows = await db
    .select({ order: sampleOrdersTable, clientName: clientsTable.companyName })
    .from(sampleOrdersTable)
    .leftJoin(clientsTable, eq(sampleOrdersTable.clientId, clientsTable.id))
    .where(and(...conditions))
    .orderBy(sampleOrdersTable.createdAt);

  res.json(rows.map((r) => ({
    id: r.order.id,
    sampleNumber: r.order.sampleNumber,
    clientId: r.order.clientId ?? null,
    clientName: r.clientName ?? null,
    customerName: r.order.customerName ?? null,
    status: r.order.status,
    notes: r.order.notes ?? null,
    createdAt: r.order.createdAt.toISOString(),
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
  const { clientId, customerName, customerPhone, customerEmail, notes, items } = req.body ?? {};

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

  const [order] = await db.insert(sampleOrdersTable).values({
    companyId: req.companyId,
    sampleNumber: "SMPL-TEMP",
    clientId: clientId ?? null,
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
  const allowed = ["Requested", "Dispatched", "Received", "Converted", "Rejected"];
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
