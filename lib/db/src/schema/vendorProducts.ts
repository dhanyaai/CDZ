import { pgTable, serial, integer, numeric, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";
import { productsTable } from "./products";
import { companiesTable } from "./companies";

export const vendorProductsTable = pgTable("vendor_products", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  priceTiers: json("price_tiers"),
  leadTimeDays: integer("lead_time_days").notNull().default(7),
  isPreferred: integer("is_preferred").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertVendorProductSchema = createInsertSchema(vendorProductsTable).omit({ id: true, createdAt: true, updatedAt: true, companyId: true });
export type InsertVendorProduct = z.infer<typeof insertVendorProductSchema>;
export type VendorProduct = typeof vendorProductsTable.$inferSelect;
