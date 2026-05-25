import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const pricingTiersTable = pgTable("pricing_tiers", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  tierName: text("tier_name").notNull(),
  minQuantity: integer("min_quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PricingTier = typeof pricingTiersTable.$inferSelect;
