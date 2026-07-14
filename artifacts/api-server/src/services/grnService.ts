import { and, eq, sql } from "drizzle-orm";
import {
  db,
  grnTable, grnItemsTable,
  purchaseOrdersTable, purchaseOrderItemsTable,
  productsTable, inventoryMovementsTable,
  companySettingsTable,
} from "@workspace/db";
import { nextDocNumber } from "../lib/numberSequence";
import { StatusError } from "./stateMachine";

async function getSettings(companyId: number) {
  const [s] = await db.select({
    grnPrefix: companySettingsTable.grnPrefix,
    fyStartMonth: companySettingsTable.fyStartMonth,
  }).from(companySettingsTable).where(eq(companySettingsTable.companyId, companyId));
  return { prefix: s?.grnPrefix ?? "GRN", fyStartMonth: s?.fyStartMonth ?? 4 };
}

interface GrnItem {
  productId: number;
  quantityReceived: number;
  quantityRejected?: number;
  remarks?: string;
}

export async function postGRN(
  companyId: number,
  purchaseOrderId: number,
  items: GrnItem[],
  notes?: string,
) {
  const [po] = await db.select().from(purchaseOrdersTable)
    .where(and(eq(purchaseOrdersTable.id, purchaseOrderId), eq(purchaseOrdersTable.companyId, companyId)));
  if (!po) throw new StatusError(404, "Purchase order not found");

  if (!["Ordered", "Partially Received", "Draft"].includes(po.status)) {
    throw new StatusError(400, `Cannot post GRN against PO in status "${po.status}"`);
  }

  const poItems = await db.select().from(purchaseOrderItemsTable)
    .where(eq(purchaseOrderItemsTable.purchaseOrderId, purchaseOrderId));

  const { prefix, fyStartMonth } = await getSettings(companyId);

  const grn = await db.transaction(async (tx) => {
    const grnNumber = await nextDocNumber(tx, companyId, "GRN", prefix, fyStartMonth);
    const [g] = await tx.insert(grnTable).values({
      companyId,
      grnNumber,
      purchaseOrderId,
      notes: notes ?? null,
    }).returning();

    if (items.length > 0) {
      await tx.insert(grnItemsTable).values(
        items.map((i) => ({
          grnId: g.id,
          productId: i.productId,
          quantityReceived: i.quantityReceived,
          quantityRejected: i.quantityRejected ?? 0,
          remarks: i.remarks ?? null,
        }))
      );
    }

    for (const item of items) {
      const accepted = item.quantityReceived - (item.quantityRejected ?? 0);
      if (accepted > 0) {
        await tx.update(productsTable)
          .set({ stockLevel: sql`${productsTable.stockLevel} + ${accepted}` })
          .where(eq(productsTable.id, item.productId));

        await tx.insert(inventoryMovementsTable).values({
          companyId,
          productId: item.productId,
          type: "grn",
          quantity: accepted,
          reference: grnNumber,
        });
      }
    }

    for (const item of items) {
      const poItem = poItems.find((p) => p.productId === item.productId);
      if (poItem) {
        const newReceived = (poItem.receivedQty ?? 0) + item.quantityReceived;
        await tx.update(purchaseOrderItemsTable)
          .set({ receivedQty: newReceived })
          .where(eq(purchaseOrderItemsTable.id, poItem.id));
      }
    }

    const updatedPoItems = await tx.select().from(purchaseOrderItemsTable)
      .where(eq(purchaseOrderItemsTable.purchaseOrderId, purchaseOrderId));

    const allReceived = updatedPoItems.every((i) => (i.receivedQty ?? 0) >= i.quantity);
    const anyReceived = updatedPoItems.some((i) => (i.receivedQty ?? 0) > 0);
    const newPoStatus = allReceived ? "Fully Received" : anyReceived ? "Partially Received" : "Ordered";

    await tx.update(purchaseOrdersTable)
      .set({ status: newPoStatus })
      .where(eq(purchaseOrdersTable.id, purchaseOrderId));

    return g;
  });

  return grn;
}
