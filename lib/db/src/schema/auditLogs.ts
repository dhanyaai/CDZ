import { pgTable, serial, integer, text, json, timestamp } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  entity: text("entity").notNull(),
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(),
  oldValues: json("old_values"),
  newValues: json("new_values"),
  ip: text("ip"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
