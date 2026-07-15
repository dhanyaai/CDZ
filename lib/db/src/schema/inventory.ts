import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";
import { companiesTable } from "./companies";
import { warehouseLocationsTable } from "./locations";

export const inventoryMovementsTable = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  locationId: integer("location_id").references(() => warehouseLocationsTable.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  quantity: integer("quantity").notNull(),
  ownership: text("ownership").notNull().default("COMPANY"),
  clientId: integer("client_id"),
  batch: text("batch"),
  reference: text("reference"),
  userId: integer("user_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInventoryMovementSchema = createInsertSchema(inventoryMovementsTable).omit({ id: true, createdAt: true, companyId: true });
export type InsertInventoryMovement = z.infer<typeof insertInventoryMovementSchema>;
export type InventoryMovement = typeof inventoryMovementsTable.$inferSelect;
