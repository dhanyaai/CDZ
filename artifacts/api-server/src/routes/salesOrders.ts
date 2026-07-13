import { Router } from "express";
import { eq, and, SQL } from "drizzle-orm";
import { db, salesOrdersTable, salesOrderItemsTable, deliveryAddressesTable, clientsTable, productsTable } from "@workspace/db";

const router = Router();

function padId(id: number) {
  return `SO-${String(id).padStart(5, "0")}`;
}

async function getOrderDetail(id: number, companyId: number) {
  const [order] = await db
    .select({
      order: salesOrdersTable,
      clientName: clientsTable.companyName,
      contactPerson: clientsTable.contactPerson,
      clientEmail: clientsTable.email,
      clientPhone: clientsTable.phone,
      clientGst: clientsTable.gstNumber,
      billingAddress: clientsTable.billingAddress,
    })
    .from(salesOrdersTable)
    .leftJoin(clientsTable, eq(salesOrdersTable.clientId, clientsTable.id))
    .where(and(eq(salesOrdersTable.id, id), eq(salesOrdersTable.companyId, companyId)));

  if (!order) return null;

  const items = await db
    .select({ item: salesOrderItemsTable, product: productsTable })
    .from(salesOrderItemsTable)
    .leftJoin(productsTable, eq(salesOrderItemsTable.productId, productsTable.id))
    .where(eq(salesOrderItemsTable.salesOrderId, id));

  const addresses = await db
    .select()
    .from(deliveryAddressesTable)
    .where(eq(deliveryAddressesTable.salesOrderId, id));

  return {
    id: order.order.id,
    orderNumber: order.order.orderNumber,
    clientId: order.order.clientId,
    clientName: order.clientName ?? "Unknown",
    contactPerson: order.contactPerson ?? null,
    clientEmail: order.clientEmail ?? null,
    clientPhone: order.clientPhone ?? null,
    clientGst: order.clientGst ?? null,
    billingAddress: order.billingAddress ?? null,
    status: order.order.status,
    totalAmount: Number(order.order.totalAmount),
    discountPct: Number(order.order.discountPct ?? 0),
    gstAmount: Number(order.order.gstAmount ?? 0),
    grandTotal: Number(order.order.grandTotal ?? 0),
    paymentTerms: order.order.paymentTerms ?? null,
    deliveryDate: order.order.deliveryDate?.toISOString() ?? null,
    poNumber: order.order.poNumber ?? null,
    occasion: order.order.occasion ?? null,
    notes: order.order.notes ?? null,
    items: items.map((r) => ({
      id: r.item.id,
      productId: r.item.productId,
      productName: r.product?.name ?? "Unknown",
      productImage: r.product?.imageUrl ?? null,
      quantity: r.item.quantity,
      unitPrice: Number(r.item.unitPrice),
      totalPrice: r.item.quantity * Number(r.item.unitPrice),
    })),
    deliveryAddresses: addresses.map((a) => ({
      id: a.id,
      name: a.name,
      address: a.address,
      city: a.city ?? null,
      pincode: a.pincode ?? null,
      phone: a.phone ?? null,
    })),
    createdAt: order.order.createdAt.toISOString(),
  };
}

router.get("/v1/sales-orders", async (req, res): Promise<void> => {
  const { status, clientId } = req.query as { status?: string; clientId?: string };
  const conditions: SQL[] = [eq(salesOrdersTable.companyId, req.companyId)];
  if (status) conditions.push(eq(salesOrdersTable.status, status));
  if (clientId) conditions.push(eq(salesOrdersTable.clientId, parseInt(clientId, 10)));

  const rows = await db
    .select({ order: salesOrdersTable, clientName: clientsTable.companyName })
    .from(salesOrdersTable)
    .leftJoin(clientsTable, eq(salesOrdersTable.clientId, clientsTable.id))
    .where(and(...conditions))
    .orderBy(salesOrdersTable.createdAt);

  res.json(rows.map((r) => ({
    id: r.order.id,
    orderNumber: r.order.orderNumber,
    clientId: r.order.clientId,
    clientName: r.clientName ?? "Unknown",
    status: r.order.status,
    totalAmount: Number(r.order.totalAmount),
    discountPct: Number(r.order.discountPct ?? 0),
    gstAmount: Number(r.order.gstAmount ?? 0),
    grandTotal: Number(r.order.grandTotal ?? 0),
    paymentTerms: r.order.paymentTerms ?? null,
    deliveryDate: r.order.deliveryDate?.toISOString() ?? null,
    poNumber: r.order.poNumber ?? null,
    occasion: r.order.occasion ?? null,
    notes: r.order.notes ?? null,
    createdAt: r.order.createdAt.toISOString(),
  })));
});

router.post("/v1/sales-orders", async (req, res): Promise<void> => {
  const { clientId, occasion, notes, items, deliveryAddresses, discountPct, paymentTerms, deliveryDate, poNumber } = req.body ?? {};
  if (!clientId || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "clientId and items are required" });
    return;
  }

  const [client] = await db.select({ id: clientsTable.id }).from(clientsTable)
    .where(and(eq(clientsTable.id, clientId), eq(clientsTable.companyId, req.companyId)));
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }

  const subtotal = items.reduce((s: number, i: { quantity: number; unitPrice: number }) => s + i.quantity * i.unitPrice, 0);
  const disc = Number(discountPct ?? 0);
  const afterDisc = subtotal * (1 - disc / 100);
  const gst = afterDisc * 0.18;
  const grand = afterDisc + gst;

  const [order] = await db.insert(salesOrdersTable).values({
    companyId: req.companyId,
    orderNumber: `SO-TEMP`,
    clientId,
    occasion: occasion ?? null,
    notes: notes ?? null,
    totalAmount: String(afterDisc.toFixed(2)),
    discountPct: String(disc.toFixed(2)),
    gstAmount: String(gst.toFixed(2)),
    grandTotal: String(grand.toFixed(2)),
    paymentTerms: paymentTerms ?? null,
    deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
    poNumber: poNumber ?? null,
    status: "Draft",
  }).returning();

  await db.update(salesOrdersTable)
    .set({ orderNumber: padId(order.id) })
    .where(eq(salesOrdersTable.id, order.id));

  await db.insert(salesOrderItemsTable).values(
    items.map((i: { productId: number; quantity: number; unitPrice: number }) => ({
      salesOrderId: order.id,
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: String(i.unitPrice),
    }))
  );

  if (Array.isArray(deliveryAddresses) && deliveryAddresses.length > 0) {
    await db.insert(deliveryAddressesTable).values(
      deliveryAddresses.map((a: { name: string; address: string; city?: string; pincode?: string; phone?: string }) => ({
        salesOrderId: order.id,
        name: a.name,
        address: a.address,
        city: a.city ?? null,
        pincode: a.pincode ?? null,
        phone: a.phone ?? null,
      }))
    );
  }

  const detail = await getOrderDetail(order.id, req.companyId);
  res.status(201).json(detail);
});

router.get("/v1/sales-orders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const detail = await getOrderDetail(id, req.companyId);
  if (!detail) {
    res.status(404).json({ error: "Sales order not found" });
    return;
  }
  res.json(detail);
});

router.patch("/v1/sales-orders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const updates: Record<string, unknown> = {};
  if (req.body.occasion != null) updates.occasion = req.body.occasion;
  if (req.body.notes != null) updates.notes = req.body.notes;
  if (req.body.paymentTerms != null) updates.paymentTerms = req.body.paymentTerms;
  if (req.body.poNumber != null) updates.poNumber = req.body.poNumber;
  if (req.body.deliveryDate != null) updates.deliveryDate = new Date(req.body.deliveryDate);

  const [order] = await db.update(salesOrdersTable).set(updates).where(and(eq(salesOrdersTable.id, id), eq(salesOrdersTable.companyId, req.companyId))).returning();
  if (!order) { res.status(404).json({ error: "Sales order not found" }); return; }
  const detail = await getOrderDetail(id, req.companyId);
  res.json(detail);
});

router.patch("/v1/sales-orders/:id/status", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { status } = req.body ?? {};
  if (!status) { res.status(400).json({ error: "status is required" }); return; }

  const [order] = await db.update(salesOrdersTable).set({ status }).where(and(eq(salesOrdersTable.id, id), eq(salesOrdersTable.companyId, req.companyId))).returning();
  if (!order) { res.status(404).json({ error: "Sales order not found" }); return; }

  const detail = await getOrderDetail(id, req.companyId);
  res.json(detail);
});

export default router;
