import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";
import { usersTable } from "./users";

// Records every status/stage transition across modules so reports can show
// how long records sat in each state and who moved them.
export const statusHistoryTable = pgTable("status_history", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(), // lead | opportunity | quote | sales_order | invoice | purchase_order | sample_order | proforma_invoice
  entityId: integer("entity_id").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  changedBy: integer("changed_by").references(() => usersTable.id, { onDelete: "set null" }),
  reason: text("reason"), // picklist value, e.g. "Price too high" — set when a lead/opportunity is lost or dropped
  reasonNote: text("reason_note"), // optional free-text detail accompanying the reason
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("status_history_entity_idx").on(t.companyId, t.entityType, t.entityId),
]);

export type StatusHistory = typeof statusHistoryTable.$inferSelect;
