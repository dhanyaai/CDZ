import { pgTable, serial, text, integer, uniqueIndex } from "drizzle-orm/pg-core";

export const permissionsTable = pgTable("permissions", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description"),
});

export const rolePermissionsTable = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(),
  permissionCode: text("permission_code").notNull().references(() => permissionsTable.code, { onDelete: "cascade" }),
}, (t) => [
  uniqueIndex("role_permissions_role_code_idx").on(t.role, t.permissionCode),
]);

export type Permission = typeof permissionsTable.$inferSelect;
export type RolePermission = typeof rolePermissionsTable.$inferSelect;
