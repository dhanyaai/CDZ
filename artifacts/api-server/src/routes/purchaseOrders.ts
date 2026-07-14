import { Router } from "express";
import { eq, and, SQL, isNull } from "drizzle-orm";
import { db, purchaseOrdersTable, purchaseOrderItemsTable, vendorsTable, productsTable, salesOrdersTable, companySettingsTable } from "@workspace/db";
import { PO_TRANSITIONS, validTransitions, assertTransition, StatusError } from "../services/stateMachine";
import { nextDocNumber } from "../lib/numberSequence";

const router = Router();

async function getSettings(companyId: number) {
  const [s] = await db.select({ poPrefix: companySettingsTable.poPrefix, fyStartMonth: companySettingsTable.fyStartMonth })
    .from(companySettingsTable).where(eq(companySettingsTable.companyId, companyId));
  return { prefix: s?.poPrefix ?? "PO", fyStartMonth: s?.fyStartMonth ?? 4 };
}

async function getPODetail(id: number, companyId: number) {
  const [row] = await db
    .select({
      po: purchaseOrdersTable,
      vendorName: vendorsTable.name,
      vendorContactPerson: vendorsTable.contactPerson,
      vendorEmail: vendorsTable.email,
      vendorPhone: vendorsTable.phone,
      vendorGst: vendorsTable.gstNumber,
      vendorAddress: vendorsTable.address,
      vendorCity: vendorsTable.city,
      vendorState: vendorsTable.state,
      vendorPincode: vendorsTable.pincode,
      vendorPaymentTerms: vendorsTable.paymentTerms,
      vendorLeadTimeDays: vendorsTable.leadTimeDays,
      orderNumber: salesOrdersTable.orderNumber,
    })
    .from(purchaseOrdersTable)
    .leftJoin(vendorsTable, eq(purchaseOrdersTable.vendorId, vendorsTable.id))
    .leftJoin(salesOrdersTable, eq(purchaseOrdersTable.salesOrderId, salesOrdersTable.id))
    .where(and(eq(purchaseOrdersTable.id, id), eq(purchaseOrdersTable.companyId, companyId)));

  if (!row) return null;

  const items = await db
    .select({ item: purchaseOrderItemsTable, product: productsTable })
    .from(purchaseOrderItemsTable)
    .leftJoin(productsTable, eq(purchaseOrderItemsTable.productId, productsTable.id))
    .where(eq(purchaseOrderItemsTable.purchaseOrderId, id));

  return {
    id: row.po.id,
    poNumber: row.po.poNumber,
    vendorId: row.po.vendorId,
    vendorName: row.vendorName ?? "Unknown",
    vendorContactPerson: row.vendorContactPerson ?? null,
    vendorEmail: row.vendorEmail ?? null,
    vendorPhone: row.vendorPhone ?? null,
    vendorGst: row.vendorGst ?? null,
    vendorAddress: row.vendorAddress ?? null,
    vendorCity: row.vendorCity ?? null,
    vendorState: row.vendorState ?? null,
    vendorPincode: row.vendorPincode ?? null,
    vendorPaymentTerms: row.vendorPaymentTerms ?? null,
    vendorLeadTimeDays: row.vendorLeadTimeDays ?? null,
    salesOrderId: row.po.salesOrderId ?? null,
    orderNumber: row.orderNumber ?? null,
    status: row.po.status,
    validTransitions: validTransitions(PO_TRANSITIONS, row.po.status),
    totalAmount: Number(row.po.totalAmount),
    expectedDelivery: row.po.expectedDelivery?.toISOString() ?? null,
    items: items.map((r) => ({
      id: r.item.id,
      productId: r.item.productId,
      productName: r.product?.name ?? "Unknown",
      hsnCode: r.product?.hsnCode ?? null,
      uom: r.product?.uom ?? "PCS",
      quantity: r.item.quantity,
      unitPrice: Number(r.item.unitPrice),
      receivedQty: r.item.receivedQty,
      pendingQty: Math.max(0, r.item.quantity - (r.item.receivedQty ?? 0)),
      lineTotal: Number(r.item.unitPrice) * r.item.quantity,
    })),
    createdAt: row.po.createdAt.toISOString(),
    updatedAt: row.po.updatedAt.toISOString(),
  };
}

router.get("/v1/purchase-orders", async (req, res): Promise<void> => {
  const { status, vendorId } = req.query as { status?: string; vendorId?: string };
  const conditions: SQL[] = [eq(purchaseOrdersTable.companyId, req.companyId), isNull(purchaseOrdersTable.deletedAt)];
  if (status) conditions.push(eq(purchaseOrdersTable.status, status));
  if (vendorId) conditions.push(eq(purchaseOrdersTable.vendorId, parseInt(vendorId, 10)));

  const rows = await db
    .select({ po: purchaseOrdersTable, vendorName: vendorsTable.name, orderNumber: salesOrdersTable.orderNumber })
    .from(purchaseOrdersTable)
    .leftJoin(vendorsTable, eq(purchaseOrdersTable.vendorId, vendorsTable.id))
    .leftJoin(salesOrdersTable, eq(purchaseOrdersTable.salesOrderId, salesOrdersTable.id))
    .where(and(...conditions))
    .orderBy(purchaseOrdersTable.createdAt);

  res.json(rows.map((r) => ({
    id: r.po.id,
    poNumber: r.po.poNumber,
    vendorId: r.po.vendorId,
    vendorName: r.vendorName ?? "Unknown",
    salesOrderId: r.po.salesOrderId ?? null,
    orderNumber: r.orderNumber ?? null,
    status: r.po.status,
    validTransitions: validTransitions(PO_TRANSITIONS, r.po.status),
    totalAmount: Number(r.po.totalAmount),
    expectedDelivery: r.po.expectedDelivery?.toISOString() ?? null,
    createdAt: r.po.createdAt.toISOString(),
  })));
});

router.post("/v1/purchase-orders", async (req, res): Promise<void> => {
  const { vendorId, salesOrderId, expectedDelivery, items } = req.body ?? {};
  if (!vendorId || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "vendorId and items are required" });
    return;
  }

  const [vendor] = await db.select({ id: vendorsTable.id }).from(vendorsTable)
    .where(and(eq(vendorsTable.id, vendorId), eq(vendorsTable.companyId, req.companyId)));
  if (!vendor) { res.status(404).json({ error: "Vendor not found" }); return; }

  if (salesOrderId) {
    const [so] = await db.select({ id: salesOrdersTable.id }).from(salesOrdersTable)
      .where(and(eq(salesOrdersTable.id, salesOrderId), eq(salesOrdersTable.companyId, req.companyId)));
    if (!so) { res.status(404).json({ error: "Sales order not found" }); return; }
  }

  const totalAmount = items.reduce((s: number, i: { quantity: number; unitPrice: number }) => s + i.quantity * i.unitPrice, 0);
  const { prefix, fyStartMonth } = await getSettings(req.companyId);

  const po = await db.transaction(async (tx) => {
    const poNumber = await nextDocNumber(tx, req.companyId, "PO", prefix, fyStartMonth);
    const [p] = await tx.insert(purchaseOrdersTable).values({
      companyId: req.companyId,
      poNumber,
      vendorId,
      salesOrderId: salesOrderId ?? null,
      totalAmount: String(totalAmount),
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
      status: "Draft",
    }).returning();

    await tx.insert(purchaseOrderItemsTable).values(
      items.map((i: { productId: number; quantity: number; unitPrice: number }) => ({
        purchaseOrderId: p.id,
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: String(i.unitPrice),
        receivedQty: 0,
      }))
    );
    return p;
  });

  const detail = await getPODetail(po.id, req.companyId);
  res.status(201).json(detail);
});

router.get("/v1/purchase-orders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const detail = await getPODetail(id, req.companyId);
  if (!detail) { res.status(404).json({ error: "Purchase order not found" }); return; }
  res.json(detail);
});

router.patch("/v1/purchase-orders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const updates: Record<string, unknown> = {};
  if (req.body.expectedDelivery != null) updates.expectedDelivery = new Date(req.body.expectedDelivery);

  await db.update(purchaseOrdersTable).set(updates)
    .where(and(eq(purchaseOrdersTable.id, id), eq(purchaseOrdersTable.companyId, req.companyId)));
  const detail = await getPODetail(id, req.companyId);
  if (!detail) { res.status(404).json({ error: "Purchase order not found" }); return; }
  res.json(detail);
});

router.patch("/v1/purchase-orders/:id/status", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { status } = req.body ?? {};
  if (!status) { res.status(400).json({ error: "status is required" }); return; }

  try {
    const [po] = await db.select().from(purchaseOrdersTable)
      .where(and(eq(purchaseOrdersTable.id, id), eq(purchaseOrdersTable.companyId, req.companyId)));
    if (!po) { res.status(404).json({ error: "Purchase order not found" }); return; }

    assertTransition(PO_TRANSITIONS, po.status, status, "Purchase Order");

    await db.update(purchaseOrdersTable).set({ status })
      .where(eq(purchaseOrdersTable.id, id));

    const detail = await getPODetail(id, req.companyId);
    res.json(detail);
  } catch (err) {
    if (err instanceof StatusError) {
      res.status(err.status).json({ error: err.message });
    } else {
      throw err;
    }
  }
});

router.delete("/v1/purchase-orders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [po] = await db.select().from(purchaseOrdersTable)
    .where(and(eq(purchaseOrdersTable.id, id), eq(purchaseOrdersTable.companyId, req.companyId)));
  if (!po) { res.status(404).json({ error: "Purchase order not found" }); return; }
  if (!["Draft", "Cancelled"].includes(po.status)) {
    res.status(400).json({ error: "Only Draft or Cancelled POs can be deleted" }); return;
  }
  await db.update(purchaseOrdersTable).set({ deletedAt: new Date() }).where(eq(purchaseOrdersTable.id, id));
  res.sendStatus(204);
});

export default router;
