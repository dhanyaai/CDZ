import { Router } from "express";
import { eq, and, SQL } from "drizzle-orm";
import { db, shipmentsTable, shipmentItemsTable, salesOrdersTable, deliveryAddressesTable } from "@workspace/db";
import { SHIPMENT_TRANSITIONS, assertTransition, StatusError, validTransitions } from "../services/stateMachine";

const router = Router();

async function getShipmentDetail(id: number, companyId: number) {
  const [row] = await db
    .select({ shipment: shipmentsTable, orderNumber: salesOrdersTable.orderNumber })
    .from(shipmentsTable)
    .leftJoin(salesOrdersTable, eq(shipmentsTable.salesOrderId, salesOrdersTable.id))
    .where(and(eq(shipmentsTable.id, id), eq(shipmentsTable.companyId, companyId)));

  if (!row) return null;

  const items = await db
    .select({ item: shipmentItemsTable })
    .from(shipmentItemsTable)
    .where(eq(shipmentItemsTable.shipmentId, id));

  return {
    id: row.shipment.id,
    shipmentNumber: row.shipment.shipmentNumber,
    salesOrderId: row.shipment.salesOrderId,
    orderNumber: row.orderNumber ?? null,
    courierPartner: row.shipment.courierPartner,
    status: row.shipment.status,
    validTransitions: validTransitions(SHIPMENT_TRANSITIONS, row.shipment.status),
    trackingNumber: row.shipment.trackingNumber ?? null,
    dispatchDate: row.shipment.dispatchDate?.toISOString() ?? null,
    estimatedDelivery: row.shipment.estimatedDelivery?.toISOString() ?? null,
    numberOfBoxes: row.shipment.numberOfBoxes ?? null,
    totalWeight: row.shipment.totalWeight != null ? Number(row.shipment.totalWeight) : null,
    freightCost: Number(row.shipment.freightCost ?? 0),
    items: items.map((r) => ({
      id: r.item.id,
      deliveryName: r.item.deliveryName,
      address: r.item.address,
      status: r.item.status,
      trackingNumber: r.item.trackingNumber ?? null,
      awbNumber: r.item.awbNumber ?? null,
      podName: r.item.podName ?? null,
      podAt: r.item.podAt?.toISOString() ?? null,
      podFileKey: r.item.podFileKey ?? null,
    })),
    createdAt: row.shipment.createdAt.toISOString(),
  };
}

router.get("/v1/shipments", async (req, res): Promise<void> => {
  const { status, salesOrderId } = req.query as { status?: string; salesOrderId?: string };
  const conditions: SQL[] = [eq(shipmentsTable.companyId, req.companyId)];
  if (status) conditions.push(eq(shipmentsTable.status, status));
  if (salesOrderId) conditions.push(eq(shipmentsTable.salesOrderId, parseInt(salesOrderId, 10)));

  const rows = await db
    .select({ shipment: shipmentsTable, orderNumber: salesOrdersTable.orderNumber })
    .from(shipmentsTable)
    .leftJoin(salesOrdersTable, eq(shipmentsTable.salesOrderId, salesOrdersTable.id))
    .where(and(...conditions))
    .orderBy(shipmentsTable.createdAt);

  res.json(rows.map((r) => ({
    id: r.shipment.id,
    shipmentNumber: r.shipment.shipmentNumber,
    salesOrderId: r.shipment.salesOrderId,
    orderNumber: r.orderNumber ?? null,
    courierPartner: r.shipment.courierPartner,
    status: r.shipment.status,
    validTransitions: validTransitions(SHIPMENT_TRANSITIONS, r.shipment.status),
    freightCost: Number(r.shipment.freightCost ?? 0),
    trackingNumber: r.shipment.trackingNumber ?? null,
    dispatchDate: r.shipment.dispatchDate?.toISOString() ?? null,
    createdAt: r.shipment.createdAt.toISOString(),
  })));
});

router.post("/v1/shipments", async (req, res): Promise<void> => {
  const { salesOrderId, courierPartner, trackingNumber, estimatedDelivery, numberOfBoxes, totalWeight, freightCost } = req.body ?? {};
  if (!salesOrderId || !courierPartner) {
    res.status(400).json({ error: "salesOrderId and courierPartner are required" });
    return;
  }

  const [so] = await db.select({ id: salesOrdersTable.id }).from(salesOrdersTable)
    .where(and(eq(salesOrdersTable.id, salesOrderId), eq(salesOrdersTable.companyId, req.companyId)));
  if (!so) { res.status(404).json({ error: "Sales order not found" }); return; }

  const [shipment] = await db.insert(shipmentsTable).values({
    companyId: req.companyId,
    shipmentNumber: "SH-TEMP",
    salesOrderId,
    courierPartner,
    trackingNumber,
    estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
    numberOfBoxes: numberOfBoxes ?? undefined,
    totalWeight: totalWeight != null ? String(totalWeight) : undefined,
    freightCost: freightCost != null ? String(freightCost) : "0",
    status: "Created",
  }).returning();

  await db.update(shipmentsTable)
    .set({ shipmentNumber: `SH-${String(shipment.id).padStart(5, "0")}` })
    .where(eq(shipmentsTable.id, shipment.id));

  const addresses = await db
    .select()
    .from(deliveryAddressesTable)
    .where(eq(deliveryAddressesTable.salesOrderId, salesOrderId));

  if (addresses.length > 0) {
    await db.insert(shipmentItemsTable).values(
      addresses.map((a) => ({
        shipmentId: shipment.id,
        deliveryAddressId: a.id,
        deliveryName: a.name,
        address: a.address,
        status: "Pending",
      }))
    );
  }

  const detail = await getShipmentDetail(shipment.id, req.companyId);
  res.status(201).json(detail);
});

router.get("/v1/shipments/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const detail = await getShipmentDetail(id, req.companyId);
  if (!detail) { res.status(404).json({ error: "Shipment not found" }); return; }
  res.json(detail);
});

router.patch("/v1/shipments/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const updates: Record<string, unknown> = {};
  if (req.body.courierPartner != null) updates.courierPartner = req.body.courierPartner;
  if (req.body.trackingNumber != null) updates.trackingNumber = req.body.trackingNumber;
  if (req.body.dispatchDate != null) updates.dispatchDate = new Date(req.body.dispatchDate);
  if (req.body.estimatedDelivery != null) updates.estimatedDelivery = new Date(req.body.estimatedDelivery);
  if (req.body.numberOfBoxes != null) updates.numberOfBoxes = req.body.numberOfBoxes;
  if (req.body.totalWeight != null) updates.totalWeight = String(req.body.totalWeight);
  if (req.body.freightCost != null) updates.freightCost = String(req.body.freightCost);

  await db.update(shipmentsTable).set(updates)
    .where(and(eq(shipmentsTable.id, id), eq(shipmentsTable.companyId, req.companyId)));
  const detail = await getShipmentDetail(id, req.companyId);
  if (!detail) { res.status(404).json({ error: "Shipment not found" }); return; }
  res.json(detail);
});

router.patch("/v1/shipments/:id/status", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { status } = req.body ?? {};
  if (!status) { res.status(400).json({ error: "status is required" }); return; }

  const [shipment] = await db.select().from(shipmentsTable)
    .where(and(eq(shipmentsTable.id, id), eq(shipmentsTable.companyId, req.companyId)));
  if (!shipment) { res.status(404).json({ error: "Shipment not found" }); return; }

  try {
    assertTransition(SHIPMENT_TRANSITIONS, shipment.status, status, "Shipment");
  } catch (err) {
    if (err instanceof StatusError) {
      res.status(err.status).json({ error: err.message }); return;
    }
    throw err;
  }

  const updates: Record<string, unknown> = { status };
  if (status === "In Transit") updates.dispatchDate = new Date();

  await db.update(shipmentsTable).set(updates)
    .where(eq(shipmentsTable.id, id));

  if (status === "In Transit") {
    await db.update(shipmentItemsTable)
      .set({ status: "In Transit" })
      .where(eq(shipmentItemsTable.shipmentId, id));
  }

  const detail = await getShipmentDetail(id, req.companyId);
  res.json(detail);
});

router.patch("/v1/shipments/:id/items/:itemId/pod", async (req, res): Promise<void> => {
  const shipmentId = parseInt(req.params.id as string, 10);
  const itemId = parseInt(req.params.itemId as string, 10);
  const { podName, podFileKey } = req.body ?? {};

  if (!podName) { res.status(400).json({ error: "podName is required" }); return; }

  const [shipment] = await db.select().from(shipmentsTable)
    .where(and(eq(shipmentsTable.id, shipmentId), eq(shipmentsTable.companyId, req.companyId)));
  if (!shipment) { res.status(404).json({ error: "Shipment not found" }); return; }

  const [updated] = await db.update(shipmentItemsTable)
    .set({
      status: "Delivered",
      podName,
      podAt: new Date(),
      podFileKey: podFileKey ?? null,
    })
    .where(and(eq(shipmentItemsTable.id, itemId), eq(shipmentItemsTable.shipmentId, shipmentId)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Shipment item not found" }); return; }

  const allItems = await db.select().from(shipmentItemsTable)
    .where(eq(shipmentItemsTable.shipmentId, shipmentId));
  const allDelivered = allItems.every((i) => i.status === "Delivered");
  if (allDelivered) {
    await db.update(shipmentsTable).set({ status: "Delivered" })
      .where(eq(shipmentsTable.id, shipmentId));
  }

  const detail = await getShipmentDetail(shipmentId, req.companyId);
  res.json(detail);
});

router.patch("/v1/shipments/:id/items/:itemId", async (req, res): Promise<void> => {
  const shipmentId = parseInt(req.params.id as string, 10);
  const itemId = parseInt(req.params.itemId as string, 10);
  const updates: Record<string, unknown> = {};
  if (req.body.awbNumber != null) updates.awbNumber = req.body.awbNumber;
  if (req.body.trackingNumber != null) updates.trackingNumber = req.body.trackingNumber;
  if (req.body.status != null) updates.status = req.body.status;

  await db.update(shipmentItemsTable).set(updates)
    .where(and(eq(shipmentItemsTable.id, itemId), eq(shipmentItemsTable.shipmentId, shipmentId)));

  const detail = await getShipmentDetail(shipmentId, req.companyId);
  if (!detail) { res.status(404).json({ error: "Shipment not found" }); return; }
  res.json(detail);
});

export default router;
