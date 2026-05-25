import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { salesOrdersTable } from "./salesOrders";
import { productsTable } from "./products";

export const assemblyJobsTable = pgTable("assembly_jobs", {
  id: serial("id").primaryKey(),
  jobNumber: text("job_number").notNull().unique(),
  salesOrderId: integer("sales_order_id").notNull().references(() => salesOrdersTable.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("Pending"),
  totalKits: integer("total_kits").notNull(),
  completedKits: integer("completed_kits").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const assemblyItemsTable = pgTable("assembly_items", {
  id: serial("id").primaryKey(),
  assemblyJobId: integer("assembly_job_id").notNull().references(() => assemblyJobsTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  status: text("status").notNull().default("Pending"),
  qcNotes: text("qc_notes"),
});

export const insertAssemblyJobSchema = createInsertSchema(assemblyJobsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAssemblyItemSchema = createInsertSchema(assemblyItemsTable).omit({ id: true });
export type InsertAssemblyJob = z.infer<typeof insertAssemblyJobSchema>;
export type AssemblyJob = typeof assemblyJobsTable.$inferSelect;
export type AssemblyItem = typeof assemblyItemsTable.$inferSelect;
