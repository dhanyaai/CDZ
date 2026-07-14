import { pgTable, serial, text, integer, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";
import { productsTable } from "./products";
import { salesOrdersTable } from "./salesOrders";
import { companiesTable } from "./companies";

export const purchaseOrdersTable = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  poNumber: text("po_number").notNull(),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id, { onDelete: "restrict" }),
  salesOrderId: integer("sales_order_id").references(() => salesOrdersTable.id, { onDelete: "set null" }),
  status: text("status").notNull().default("Ordered"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  expectedDelivery: timestamp("expected_delivery", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("purchase_orders_company_number_idx").on(t.companyId, t.poNumber),
]);

export const purchaseOrderItemsTable = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchase_order_id").notNull().references(() => purchaseOrdersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  receivedQty: integer("received_qty").notNull().default(0),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrdersTable).omit({ id: true, createdAt: true, updatedAt: true, companyId: true });
export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItemsTable).omit({ id: true });
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;
export type PurchaseOrderItem = typeof purchaseOrderItemsTable.$inferSelect;
