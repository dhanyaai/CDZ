import { pgTable, serial, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";
import { productsTable } from "./products";

export const productionOrdersTable = pgTable("production_orders", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  orderNumber: text("order_number").notNull(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  producedQty: integer("produced_qty").notNull().default(0),
  status: text("status").notNull().default("Draft"),
  plannedDate: text("planned_date"),
  completedDate: text("completed_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("production_orders_company_number_idx").on(t.companyId, t.orderNumber),
]);

export const productionMaterialsTable = pgTable("production_materials", {
  id: serial("id").primaryKey(),
  productionOrderId: integer("production_order_id").notNull().references(() => productionOrdersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "restrict" }),
  requiredQty: integer("required_qty").notNull(),
  issuedQty: integer("issued_qty").notNull().default(0),
  notes: text("notes"),
});

export type ProductionOrder = typeof productionOrdersTable.$inferSelect;
export type ProductionMaterial = typeof productionMaterialsTable.$inferSelect;
