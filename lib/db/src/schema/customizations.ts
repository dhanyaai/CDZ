import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const customizationOptionsTable = pgTable("customization_options", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  optionType: text("option_type").notNull(),
  optionName: text("option_name").notNull(),
  description: text("description"),
  priceUplift: numeric("price_uplift", { precision: 12, scale: 2 }).notNull().default("0"),
  leadTimeDays: integer("lead_time_days").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CustomizationOption = typeof customizationOptionsTable.$inferSelect;
