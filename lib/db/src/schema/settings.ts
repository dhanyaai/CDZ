import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const companySettingsTable = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  companyName: text("company_name").notNull().default("Customize Duniya"),
  legalName: text("legal_name"),
  gstNumber: text("gst_number"),
  stateCode: text("state_code"),
  pan: text("pan"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  website: text("website"),
  logoUrl: text("logo_url"),
  bankDetails: text("bank_details"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  soPrefix: text("so_prefix").notNull().default("SO"),
  poPrefix: text("po_prefix").notNull().default("PO"),
  grnPrefix: text("grn_prefix").notNull().default("GRN"),
  shipPrefix: text("ship_prefix").notNull().default("SHP"),
  quotePrefix: text("quote_prefix").notNull().default("QT"),
  fyStartMonth: integer("fy_start_month").notNull().default(4),
  defaultGstPct: text("default_gst_pct").notNull().default("18"),
  currency: text("currency").notNull().default("INR"),
  assemblyCapacityPerDay: integer("assembly_capacity_per_day").notNull().default(500),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type CompanySettings = typeof companySettingsTable.$inferSelect;
