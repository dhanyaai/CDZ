import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const catalogueSharesTable = pgTable("catalogue_shares", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  companyName: text("company_name").notNull(),
  opportunityId: integer("opportunity_id"),
  clientId: integer("client_id"),
  opportunityTitle: text("opportunity_title").notNull(),
  clientName: text("client_name"),
  catalogueType: text("catalogue_type").notNull(),
  productIds: text("product_ids").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});
