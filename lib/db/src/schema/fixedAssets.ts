import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";
import { warehouseLocationsTable } from "./locations";

export const fixedAssetsTable = pgTable("fixed_assets", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  assetCode: text("asset_code").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  serialNumber: text("serial_number"),
  purchaseDate: text("purchase_date").notNull(),
  purchaseCost: numeric("purchase_cost", { precision: 14, scale: 2 }).notNull(),
  usefulLifeYears: integer("useful_life_years").notNull().default(5),
  depreciationMethod: text("depreciation_method").notNull().default("straight_line"),
  residualValue: numeric("residual_value", { precision: 14, scale: 2 }).notNull().default("0"),
  currentBookValue: numeric("current_book_value", { precision: 14, scale: 2 }).notNull(),
  locationId: integer("location_id").references(() => warehouseLocationsTable.id, { onDelete: "set null" }),
  status: text("status").notNull().default("Active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type FixedAsset = typeof fixedAssetsTable.$inferSelect;
