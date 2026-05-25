import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { salesOrdersTable } from "./salesOrders";
import { deliveryAddressesTable } from "./salesOrders";

export const shipmentsTable = pgTable("shipments", {
  id: serial("id").primaryKey(),
  shipmentNumber: text("shipment_number").notNull().unique(),
  salesOrderId: integer("sales_order_id").notNull().references(() => salesOrdersTable.id, { onDelete: "restrict" }),
  courierPartner: text("courier_partner").notNull(),
  status: text("status").notNull().default("Preparing"),
  trackingNumber: text("tracking_number"),
  dispatchDate: timestamp("dispatch_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const shipmentItemsTable = pgTable("shipment_items", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull().references(() => shipmentsTable.id, { onDelete: "cascade" }),
  deliveryAddressId: integer("delivery_address_id").references(() => deliveryAddressesTable.id, { onDelete: "set null" }),
  deliveryName: text("delivery_name").notNull(),
  address: text("address").notNull(),
  status: text("status").notNull().default("Pending"),
  trackingNumber: text("tracking_number"),
});

export const insertShipmentSchema = createInsertSchema(shipmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertShipmentItemSchema = createInsertSchema(shipmentItemsTable).omit({ id: true });
export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type Shipment = typeof shipmentsTable.$inferSelect;
export type ShipmentItem = typeof shipmentItemsTable.$inferSelect;
