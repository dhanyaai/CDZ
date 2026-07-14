import { pgTable, serial, text, integer, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { salesOrdersTable } from "./salesOrders";
import { clientsTable } from "./clients";
import { companiesTable } from "./companies";
import { productsTable } from "./products";

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(),
  salesOrderId: integer("sales_order_id").notNull().references(() => salesOrdersTable.id, { onDelete: "restrict" }),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "restrict" }),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
  gstAmount: numeric("gst_amount", { precision: 14, scale: 2 }).notNull(),
  grandTotal: numeric("grand_total", { precision: 14, scale: 2 }).notNull(),
  status: text("status").notNull().default("Draft"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  notes: text("notes"),
  paymentTerms: text("payment_terms"),
  cgst: numeric("cgst", { precision: 14, scale: 2 }).notNull().default("0"),
  sgst: numeric("sgst", { precision: 14, scale: 2 }).notNull().default("0"),
  igst: numeric("igst", { precision: 14, scale: 2 }).notNull().default("0"),
  placeOfSupplyStateCode: text("place_of_supply_state_code"),
  roundOff: numeric("round_off", { precision: 8, scale: 2 }).notNull().default("0"),
  amountInWords: text("amount_in_words"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("invoices_company_number_idx").on(t.companyId, t.invoiceNumber),
]);

export const invoiceLinesTable = pgTable("invoice_lines", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoicesTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => productsTable.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  hsnCode: text("hsn_code"),
  uom: text("uom").notNull().default("PCS"),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 14, scale: 2 }).notNull(),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull().default("18"),
  cgst: numeric("cgst", { precision: 14, scale: 2 }).notNull().default("0"),
  sgst: numeric("sgst", { precision: 14, scale: 2 }).notNull().default("0"),
  igst: numeric("igst", { precision: 14, scale: 2 }).notNull().default("0"),
  lineTaxTotal: numeric("line_tax_total", { precision: 14, scale: 2 }).notNull().default("0"),
  lineGrandTotal: numeric("line_grand_total", { precision: 14, scale: 2 }).notNull().default("0"),
});

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  invoiceId: integer("invoice_id").notNull().references(() => invoicesTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  type: text("type").notNull(),
  paymentMode: text("payment_mode"),
  referenceNo: text("reference_no"),
  paymentDate: timestamp("payment_date", { withTimezone: true }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true, updatedAt: true, companyId: true });
export const insertInvoiceLineSchema = createInsertSchema(invoiceLinesTable).omit({ id: true });
export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true, companyId: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InsertInvoiceLine = z.infer<typeof insertInvoiceLineSchema>;
export type InvoiceLine = typeof invoiceLinesTable.$inferSelect;
export type Invoice = typeof invoicesTable.$inferSelect;
export type Payment = typeof paymentsTable.$inferSelect;
