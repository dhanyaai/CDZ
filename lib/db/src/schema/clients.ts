import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  companyName: text("company_name").notNull(),
  contactPerson: text("contact_person").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  gstNumber: text("gst_number"),
  stateCode: text("state_code"),
  industry: text("industry"),
  tags: text("tags"),
  billingAddress: text("billing_address"),
  shippingAddress: text("shipping_address"),
  creditLimit: numeric("credit_limit", { precision: 14, scale: 2 }).notNull().default("0"),
  paymentTerms: text("payment_terms"),
  stage: text("stage").notNull().default("Lead"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const clientInteractionsTable = pgTable("client_interactions", {
  id: serial("id").primaryKey(),
  clientId: serial("client_id").references(() => clientsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  notes: text("notes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true, createdAt: true, updatedAt: true, companyId: true });
export const insertClientInteractionSchema = createInsertSchema(clientInteractionsTable).omit({ id: true, createdAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;
export type ClientInteraction = typeof clientInteractionsTable.$inferSelect;
