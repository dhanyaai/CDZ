import { pgTable, serial, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";
import { clientsTable } from "./clients";
import { productsTable } from "./products";

export const sampleOrdersTable = pgTable("sample_orders", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  sampleNumber: text("sample_number").notNull(),
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  status: text("status").notNull().default("Requested"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("sample_orders_company_number_idx").on(t.companyId, t.sampleNumber),
]);

export const sampleOrderItemsTable = pgTable("sample_order_items", {
  id: serial("id").primaryKey(),
  sampleOrderId: integer("sample_order_id").notNull().references(() => sampleOrdersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"),
});

export type SampleOrder = typeof sampleOrdersTable.$inferSelect;
export type SampleOrderItem = typeof sampleOrderItemsTable.$inferSelect;
