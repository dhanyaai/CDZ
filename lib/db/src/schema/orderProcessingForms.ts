import { pgTable, serial, integer, json, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { salesOrdersTable } from "./salesOrders";
import { companiesTable } from "./companies";

export const orderProcessingFormsTable = pgTable("order_processing_forms", {
  id: serial("id").primaryKey(),
  salesOrderId: integer("sales_order_id").notNull().references(() => salesOrdersTable.id, { onDelete: "cascade" }),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  formData: json("form_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("order_processing_forms_so_company_idx").on(t.salesOrderId, t.companyId),
]);
