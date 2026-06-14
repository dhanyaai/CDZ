import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";
import { companiesTable } from "./companies";

export const contactsTable = pgTable("contacts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1).references(() => companiesTable.id, { onDelete: "cascade" }),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  designation: text("designation"),
  department: text("department"),
  email: text("email"),
  phone: text("phone"),
  isPrimary: boolean("is_primary").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Contact = typeof contactsTable.$inferSelect;
