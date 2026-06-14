import { pgTable, serial, text, timestamp, integer, numeric, uniqueIndex } from "drizzle-orm/pg-core";
import { invoicesTable } from "./invoices";
import { clientsTable } from "./clients";
import { companiesTable } from "./companies";

export const creditNotesTable = pgTable("credit_notes", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  creditNoteNumber: text("credit_note_number").notNull(),
  invoiceId: integer("invoice_id").references(() => invoicesTable.id, { onDelete: "set null" }),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("issued"),
  issuedDate: timestamp("issued_date", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("credit_notes_company_number_idx").on(t.companyId, t.creditNoteNumber),
]);

export type CreditNote = typeof creditNotesTable.$inferSelect;
