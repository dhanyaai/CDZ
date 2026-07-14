import { pgTable, serial, text, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const numberSequencesTable = pgTable("number_sequences", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  docType: text("doc_type").notNull(),
  fyLabel: text("fy_label").notNull(),
  lastNumber: integer("last_number").notNull().default(0),
}, (t) => [
  uniqueIndex("number_sequences_company_type_fy_idx").on(t.companyId, t.docType, t.fyLabel),
]);

export type NumberSequence = typeof numberSequencesTable.$inferSelect;
