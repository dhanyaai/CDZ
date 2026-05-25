import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";
import { usersTable } from "./users";

export const activitiesTable = pgTable("activities", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  subject: text("subject").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ownerId: integer("owner_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Activity = typeof activitiesTable.$inferSelect;
