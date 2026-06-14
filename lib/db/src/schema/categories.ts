import { pgTable, serial, text, timestamp, integer, uniqueIndex, type AnyPgColumn } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  parentId: integer("parent_id").references((): AnyPgColumn => categoriesTable.id, { onDelete: "set null" }),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("categories_company_slug_idx").on(t.companyId, t.slug),
]);

export type Category = typeof categoriesTable.$inferSelect;
