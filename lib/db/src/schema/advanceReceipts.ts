import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { opportunitiesTable } from "./leads";

export const advanceReceiptsTable = pgTable("advance_receipts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  opportunityId: integer("opportunity_id").notNull().references(() => opportunitiesTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  paymentMode: text("payment_mode"),
  referenceNo: text("reference_no"),
  receiptDate: timestamp("receipt_date", { withTimezone: true }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAdvanceReceiptSchema = createInsertSchema(advanceReceiptsTable).omit({ id: true, createdAt: true, companyId: true });
export type AdvanceReceipt = typeof advanceReceiptsTable.$inferSelect;
export type InsertAdvanceReceipt = z.infer<typeof insertAdvanceReceiptSchema>;
