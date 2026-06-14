import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";
import { usersTable } from "./users";
import { companiesTable } from "./companies";

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  companyName: text("company_name"),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  source: text("source"),
  status: text("status").notNull().default("new"),
  estimatedValue: numeric("estimated_value", { precision: 12, scale: 2 }),
  ownerId: integer("owner_id").references(() => usersTable.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const opportunitiesTable = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  leadId: integer("lead_id").references(() => leadsTable.id, { onDelete: "set null" }),
  stage: text("stage").notNull().default("prospect"),
  value: numeric("value", { precision: 12, scale: 2 }),
  probability: integer("probability").notNull().default(50),
  expectedCloseDate: timestamp("expected_close_date", { withTimezone: true }),
  ownerId: integer("owner_id").references(() => usersTable.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Lead = typeof leadsTable.$inferSelect;
export type Opportunity = typeof opportunitiesTable.$inferSelect;
