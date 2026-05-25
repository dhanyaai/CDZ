import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const warehouseLocationsTable = pgTable("warehouse_locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  zone: text("zone"),
  bin: text("bin"),
  type: text("type").notNull().default("storage"),
  capacity: integer("capacity"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WarehouseLocation = typeof warehouseLocationsTable.$inferSelect;
