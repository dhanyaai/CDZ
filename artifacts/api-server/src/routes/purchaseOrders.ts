import { Router } from "express";
import { eq, and, SQL } from "drizzle-orm";
import { db, purchaseOrdersTable, purchaseOrderItemsTable, vendorsTable, productsTable, salesOrdersTable } from "@workspace/db";

const router = Router();

async function getPODetail(id: number, companyId: number) {
  const [row] = await db
    .select({ po: purchaseOrdersTable, vendorName: vendorsTable.name, orderNumber: salesOrdersTable.orderNumber })
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
    salesOrderId: row.po.salesOrderId ?? null,
    status: row.po.status,
    totalAmount: Number(row.po.totalAmount),
    expectedDelivery: row.po.expectedDelivery?.toISOString() ?? null,
    items: items.map((r) => ({
      id: r.item.id,
      productId: r.item.productId,
      productName: r.product?.name ?? "Unknown",
      quantity: r.item.quantity,
      unitPrice: Number(r.item.unitPrice),
      receivedQty: r.item.receivedQty,
    })),
    createdAt: row.po.createdAt.toISOString(),
  };
}

router.get("/v1/purchase-orders", async (req, res): Promise<void> => {
  const { status, vendorId } = req.query as { status?: string; vendorId?: string };
  const conditions: SQL[] = [eq(purchaseOrdersTable.companyId, req.companyId)];
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
    status: r.po.status,
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

  const [po] = await db.insert(purchaseOrdersTable).values({
    companyId: req.companyId,
    poNumber: "PO-TEMP",
    vendorId,
    salesOrderId: salesOrderId ?? null,
    totalAmount: String(totalAmount),
    expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
    status: "Ordered",
  }).returning();

  await db.update(purchaseOrdersTable).set({ poNumber: `PO-${String(po.id).padStart(5, "0")}` }).where(eq(purchaseOrdersTable.id, po.id));

  await db.insert(purchaseOrderItemsTable).values(
    items.map((i: { productId: number; quantity: number; unitPrice: number }) => ({
      purchaseOrderId: po.id,
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: String(i.unitPrice),
      receivedQty: 0,
    }))
  );

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

  await db.update(purchaseOrdersTable).set(updates).where(and(eq(purchaseOrdersTable.id, id), eq(purchaseOrdersTable.companyId, req.companyId)));
  const detail = await getPODetail(id, req.companyId);
  if (!detail) { res.status(404).json({ error: "Purchase order not found" }); return; }
  res.json(detail);
});

router.patch("/v1/purchase-orders/:id/status", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { status } = req.body ?? {};
  if (!status) { res.status(400).json({ error: "status is required" }); return; }
  const [po] = await db.update(purchaseOrdersTable).set({ status })
    .where(and(eq(purchaseOrdersTable.id, id), eq(purchaseOrdersTable.companyId, req.companyId)))
    .returning();
  if (!po) { res.status(404).json({ error: "Purchase order not found" }); return; }

  const detail = await getPODetail(id, req.companyId);
  res.json(detail);
});

export default router;
