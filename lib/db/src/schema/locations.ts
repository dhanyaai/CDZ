import { pgTable, serial, text, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const warehouseLocationsTable = pgTable("warehouse_locations", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  zone: text("zone"),
  bin: text("bin"),
  type: text("type").notNull().default("storage"),
  capacity: integer("capacity"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("warehouse_locations_company_code_idx").on(t.companyId, t.code),
]);

export type WarehouseLocation = typeof warehouseLocationsTable.$inferSelect;
