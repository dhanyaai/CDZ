import { and, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  salesOrdersTable, salesOrderItemsTable,
  clientsTable, productsTable,
} from "@workspace/db";
import { SO_TRANSITIONS, assertTransition, StatusError } from "./stateMachine";

export async function confirmSO(soId: number, companyId: number): Promise<void> {
  const [so] = await db.select().from(salesOrdersTable)
    .where(and(eq(salesOrdersTable.id, soId), eq(salesOrdersTable.companyId, companyId)));
  if (!so) throw new StatusError(404, "Sales order not found");

  assertTransition(SO_TRANSITIONS, so.status, "Confirmed", "Sales Order");

  const [client] = await db.select({
    creditLimit: clientsTable.creditLimit,
    stateCode: clientsTable.stateCode,
  }).from(clientsTable)
    .where(and(eq(clientsTable.id, so.clientId), eq(clientsTable.companyId, companyId)));

  const creditLimit = Number(client?.creditLimit ?? 0);
  if (creditLimit > 0) {
    const openOrders = await db.select({ grandTotal: salesOrdersTable.grandTotal })
      .from(salesOrdersTable)
      .where(and(
        eq(salesOrdersTable.clientId, so.clientId),
        eq(salesOrdersTable.companyId, companyId),
        inArray(salesOrdersTable.status, ["Confirmed", "In Production", "Ready to Dispatch", "Dispatched"]),
      ));
    const openExposure = openOrders.reduce((s, o) => s + Number(o.grandTotal), 0);
    const newOrderTotal = Number(so.grandTotal);
    if (openExposure + newOrderTotal > creditLimit) {
      throw new StatusError(422, `Credit limit exceeded. Limit: ₹${creditLimit.toLocaleString("en-IN")}, Current exposure: ₹${openExposure.toLocaleString("en-IN")}, New order: ₹${newOrderTotal.toLocaleString("en-IN")}`);
    }
  }

  const items = await db.select({
    productId: salesOrderItemsTable.productId,
    quantity: salesOrderItemsTable.quantity,
    productName: productsTable.name,
    stockLevel: productsTable.stockLevel,
    reservedQty: productsTable.reservedQty,
  }).from(salesOrderItemsTable)
    .leftJoin(productsTable, eq(salesOrderItemsTable.productId, productsTable.id))
    .where(eq(salesOrderItemsTable.salesOrderId, soId));

  const shortfalls: string[] = [];
  for (const item of items) {
    const available = (item.stockLevel ?? 0) - (item.reservedQty ?? 0);
    if (available < item.quantity) {
      shortfalls.push(`${item.productName ?? item.productId}: need ${item.quantity}, available ${available}`);
    }
  }
  if (shortfalls.length > 0) {
    throw new StatusError(422, `Insufficient stock: ${shortfalls.join("; ")}`);
  }

  await db.transaction(async (tx) => {
    await tx.update(salesOrdersTable)
      .set({ status: "Confirmed" })
      .where(eq(salesOrdersTable.id, soId));

    for (const item of items) {
      if (item.productId) {
        await tx.update(productsTable)
          .set({ reservedQty: sql`${productsTable.reservedQty} + ${item.quantity}` })
          .where(eq(productsTable.id, item.productId));
      }
    }
  });
}

export async function cancelSO(soId: number, companyId: number): Promise<void> {
  const [so] = await db.select().from(salesOrdersTable)
    .where(and(eq(salesOrdersTable.id, soId), eq(salesOrdersTable.companyId, companyId)));
  if (!so) throw new StatusError(404, "Sales order not found");

  assertTransition(SO_TRANSITIONS, so.status, "Cancelled", "Sales Order");

  const wasConfirmed = ["Confirmed", "In Production", "Ready to Dispatch"].includes(so.status);

  await db.transaction(async (tx) => {
    await tx.update(salesOrdersTable)
      .set({ status: "Cancelled" })
      .where(eq(salesOrdersTable.id, soId));

    if (wasConfirmed) {
      const items = await tx.select({
        productId: salesOrderItemsTable.productId,
        quantity: salesOrderItemsTable.quantity,
      }).from(salesOrderItemsTable).where(eq(salesOrderItemsTable.salesOrderId, soId));

      for (const item of items) {
        if (item.productId) {
          await tx.update(productsTable)
            .set({ reservedQty: sql`GREATEST(0, ${productsTable.reservedQty} - ${item.quantity})` })
            .where(eq(productsTable.id, item.productId));
        }
      }
    }
  });
}

export async function advanceSO(soId: number, companyId: number, toStatus: string): Promise<void> {
  const [so] = await db.select().from(salesOrdersTable)
    .where(and(eq(salesOrdersTable.id, soId), eq(salesOrdersTable.companyId, companyId)));
  if (!so) throw new StatusError(404, "Sales order not found");
  assertTransition(SO_TRANSITIONS, so.status, toStatus, "Sales Order");
  await db.update(salesOrdersTable)
    .set({ status: toStatus })
    .where(eq(salesOrdersTable.id, soId));
}
