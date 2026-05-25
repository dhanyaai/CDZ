import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { purchaseOrdersTable } from "./purchaseOrders";
import { productsTable } from "./products";

export const grnTable = pgTable("goods_receipts", {
  id: serial("id").primaryKey(),
  grnNumber: text("grn_number").notNull().unique(),
  purchaseOrderId: integer("purchase_order_id").notNull().references(() => purchaseOrdersTable.id, { onDelete: "cascade" }),
  receivedDate: timestamp("received_date", { withTimezone: true }).notNull().defaultNow(),
  notes: text("notes"),
  status: text("status").notNull().default("received"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const grnItemsTable = pgTable("goods_receipt_items", {
  id: serial("id").primaryKey(),
  grnId: integer("grn_id").notNull().references(() => grnTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "restrict" }),
  quantityReceived: integer("quantity_received").notNull(),
  quantityRejected: integer("quantity_rejected").notNull().default(0),
  remarks: text("remarks"),
});

export type Grn = typeof grnTable.$inferSelect;
export type GrnItem = typeof grnItemsTable.$inferSelect;
