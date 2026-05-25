import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";
import { salesOrdersTable } from "./salesOrders";

export const artworkApprovalsTable = pgTable("artwork_approvals", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  salesOrderId: integer("sales_order_id").references(() => salesOrdersTable.id, { onDelete: "set null" }),
  assetName: text("asset_name").notNull(),
  assetUrl: text("asset_url"),
  status: text("status").notNull().default("Pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertArtworkApprovalSchema = createInsertSchema(artworkApprovalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertArtworkApproval = z.infer<typeof insertArtworkApprovalSchema>;
export type ArtworkApproval = typeof artworkApprovalsTable.$inferSelect;
