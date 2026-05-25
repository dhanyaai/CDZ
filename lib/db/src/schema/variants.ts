import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const productVariantsTable = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  sku: text("sku").notNull().unique(),
  variantName: text("variant_name").notNull(),
  size: text("size"),
  color: text("color"),
  material: text("material"),
  priceAdjustment: numeric("price_adjustment", { precision: 12, scale: 2 }).notNull().default("0"),
  stockLevel: integer("stock_level").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProductVariant = typeof productVariantsTable.$inferSelect;
