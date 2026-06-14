import { Router } from "express";
import { eq, and, SQL } from "drizzle-orm";
import { db, shipmentsTable, shipmentItemsTable, salesOrdersTable, deliveryAddressesTable } from "@workspace/db";

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
    trackingNumber: row.shipment.trackingNumber ?? null,
    dispatchDate: row.shipment.dispatchDate?.toISOString() ?? null,
    items: items.map((r) => ({
      id: r.item.id,
      deliveryName: r.item.deliveryName,
      address: r.item.address,
      status: r.item.status,
      trackingNumber: r.item.trackingNumber ?? null,
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
    trackingNumber: r.shipment.trackingNumber ?? null,
    dispatchDate: r.shipment.dispatchDate?.toISOString() ?? null,
    createdAt: r.shipment.createdAt.toISOString(),
  })));
});

router.post("/v1/shipments", async (req, res): Promise<void> => {
  const { salesOrderId, courierPartner, trackingNumber } = req.body ?? {};
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
    status: "Preparing",
  }).returning();

  await db.update(shipmentsTable).set({ shipmentNumber: `SH-${String(shipment.id).padStart(5, "0")}` }).where(eq(shipmentsTable.id, shipment.id));

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

  await db.update(shipmentsTable).set(updates).where(and(eq(shipmentsTable.id, id), eq(shipmentsTable.companyId, req.companyId)));
  const detail = await getShipmentDetail(id, req.companyId);
  if (!detail) { res.status(404).json({ error: "Shipment not found" }); return; }
  res.json(detail);
});

router.patch("/v1/shipments/:id/status", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { status } = req.body ?? {};
  if (!status) { res.status(400).json({ error: "status is required" }); return; }
  const [shipment] = await db.update(shipmentsTable).set({ status })
    .where(and(eq(shipmentsTable.id, id), eq(shipmentsTable.companyId, req.companyId)))
    .returning();
  if (!shipment) { res.status(404).json({ error: "Shipment not found" }); return; }

  const detail = await getShipmentDetail(id, req.companyId);
  res.json(detail);
});

export default router;
