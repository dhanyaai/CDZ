import { pgTable, serial, text, timestamp, integer, numeric, uniqueIndex } from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";
import { companiesTable } from "./companies";
import { productsTable } from "./products";
import { quotesTable } from "./quotes";

export const proformaInvoicesTable = pgTable("proforma_invoices", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  piNumber: text("pi_number").notNull(),
  quoteId: integer("quote_id").references(() => quotesTable.id, { onDelete: "set null" }),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  subject: text("subject"),
  status: text("status").notNull().default("Draft"),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  paymentTerms: text("payment_terms"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  discountPct: numeric("discount_pct", { precision: 5, scale: 2 }).notNull().default("0"),
  gstAmount: numeric("gst_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  termsAndConditions: text("terms_and_conditions"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("pi_company_number_idx").on(t.companyId, t.piNumber),
]);

export const proformaInvoiceItemsTable = pgTable("proforma_invoice_items", {
  id: serial("id").primaryKey(),
  piId: integer("pi_id").notNull().references(() => proformaInvoicesTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => productsTable.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
});

export type ProformaInvoice = typeof proformaInvoicesTable.$inferSelect;
export type ProformaInvoiceItem = typeof proformaInvoiceItemsTable.$inferSelect;
