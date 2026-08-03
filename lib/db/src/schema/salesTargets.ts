import { pgTable, serial, text, timestamp, integer, numeric, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { usersTable } from "./users";

// Monthly sales targets per user (month stored as "YYYY-MM")
export const salesTargetsTable = pgTable("sales_targets", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  month: text("month").notNull(), // "YYYY-MM"
  targetLeads: integer("target_leads").notNull().default(0),
  targetQuotes: integer("target_quotes").notNull().default(0),
  targetRevenue: numeric("target_revenue", { precision: 14, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("sales_targets_company_user_month_uq").on(t.companyId, t.userId, t.month),
]);

export const insertSalesTargetSchema = createInsertSchema(salesTargetsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSalesTarget = z.infer<typeof insertSalesTargetSchema>;
export type SalesTarget = typeof salesTargetsTable.$inferSelect;
