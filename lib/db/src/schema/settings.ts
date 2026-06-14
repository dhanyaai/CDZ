import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const companySettingsTable = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  companyName: text("company_name").notNull().default("Customize Duniya"),
  legalName: text("legal_name"),
  gstNumber: text("gst_number"),
  pan: text("pan"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  website: text("website"),
  logoUrl: text("logo_url"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  quotePrefix: text("quote_prefix").notNull().default("QT"),
  defaultGstPct: text("default_gst_pct").notNull().default("18"),
  currency: text("currency").notNull().default("INR"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type CompanySettings = typeof companySettingsTable.$inferSelect;
