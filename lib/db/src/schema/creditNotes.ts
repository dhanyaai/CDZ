import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { invoicesTable } from "./invoices";
import { clientsTable } from "./clients";

export const creditNotesTable = pgTable("credit_notes", {
  id: serial("id").primaryKey(),
  creditNoteNumber: text("credit_note_number").notNull().unique(),
  invoiceId: integer("invoice_id").references(() => invoicesTable.id, { onDelete: "set null" }),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("issued"),
  issuedDate: timestamp("issued_date", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CreditNote = typeof creditNotesTable.$inferSelect;
