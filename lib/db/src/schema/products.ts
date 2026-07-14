import { pgTable, serial, text, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";
import { companiesTable } from "./companies";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sku: text("sku"),
  brand: text("brand"),
  productType: text("product_type"),
  category: text("category").notNull(),
  hsnCode: text("hsn_code"),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull().default("18"),
  uom: text("uom").notNull().default("PCS"),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }).notNull(),
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }).notNull(),
  stockLevel: integer("stock_level").notNull().default(0),
  reservedQty: integer("reserved_qty").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
  reorderQty: integer("reorder_qty").notNull().default(0),
  isPerishable: boolean("is_perishable").notNull().default(false),
  shelfLifeDays: integer("shelf_life_days"),
  brandable: boolean("brandable").notNull().default(false),
  vendorId: integer("vendor_id").references(() => vendorsTable.id, { onDelete: "set null" }),
  imageUrl: text("image_url"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true, companyId: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
