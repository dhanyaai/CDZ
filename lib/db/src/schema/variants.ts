import { pgTable, serial, text, timestamp, integer, numeric, uniqueIndex } from "drizzle-orm/pg-core";
import { productsTable } from "./products";
import { companiesTable } from "./companies";

export const productVariantsTable = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  sku: text("sku").notNull(),
  variantName: text("variant_name").notNull(),
  size: text("size"),
  color: text("color"),
  material: text("material"),
  priceAdjustment: numeric("price_adjustment", { precision: 12, scale: 2 }).notNull().default("0"),
  stockLevel: integer("stock_level").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("product_variants_company_sku_idx").on(t.companyId, t.sku),
]);

export type ProductVariant = typeof productVariantsTable.$inferSelect;
