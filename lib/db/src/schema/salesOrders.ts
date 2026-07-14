import { pgTable, serial, text, integer, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";
import { productsTable } from "./products";
import { companiesTable } from "./companies";

export const salesOrdersTable = pgTable("sales_orders", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  orderNumber: text("order_number").notNull(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("Draft"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  discountPct: numeric("discount_pct", { precision: 5, scale: 2 }).notNull().default("0"),
  gstAmount: numeric("gst_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  grandTotal: numeric("grand_total", { precision: 14, scale: 2 }).notNull().default("0"),
  paymentTerms: text("payment_terms"),
  deliveryDate: timestamp("delivery_date", { withTimezone: true }),
  poNumber: text("po_number"),
  occasion: text("occasion"),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("sales_orders_company_number_idx").on(t.companyId, t.orderNumber),
]);

export const salesOrderItemsTable = pgTable("sales_order_items", {
  id: serial("id").primaryKey(),
  salesOrderId: integer("sales_order_id").notNull().references(() => salesOrdersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
});

export const deliveryAddressesTable = pgTable("delivery_addresses", {
  id: serial("id").primaryKey(),
  salesOrderId: integer("sales_order_id").notNull().references(() => salesOrdersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city"),
  pincode: text("pincode"),
  phone: text("phone"),
});

export const insertSalesOrderSchema = createInsertSchema(salesOrdersTable).omit({ id: true, createdAt: true, updatedAt: true, companyId: true });
export const insertSalesOrderItemSchema = createInsertSchema(salesOrderItemsTable).omit({ id: true });
export const insertDeliveryAddressSchema = createInsertSchema(deliveryAddressesTable).omit({ id: true });
export type InsertSalesOrder = z.infer<typeof insertSalesOrderSchema>;
export type SalesOrder = typeof salesOrdersTable.$inferSelect;
export type SalesOrderItem = typeof salesOrderItemsTable.$inferSelect;
export type DeliveryAddress = typeof deliveryAddressesTable.$inferSelect;
