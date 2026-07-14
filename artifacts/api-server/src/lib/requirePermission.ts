import type { Request, Response, NextFunction } from "express";

const ROLE_PERMISSIONS: Record<string, string[]> = {
  Admin: ["*"],
  Sales: [
    "sales_order.view","sales_order.create","sales_order.confirm","sales_order.cancel",
    "client.view","client.create","product.view","invoice.view","report.view",
  ],
  Purchase: [
    "purchase_order.view","purchase_order.create","purchase_order.confirm",
    "grn.create","product.view","inventory.view","inventory.adjust","report.view",
  ],
  Warehouse: [
    "inventory.view","inventory.adjust","assembly.view","assembly.manage",
    "product.view","sales_order.view","purchase_order.view",
  ],
  Finance: [
    "invoice.view","invoice.create","invoice.payment","report.view",
    "client.view","sales_order.view","purchase_order.view",
  ],
  Production: [
    "assembly.view","assembly.manage","inventory.view","product.view","sales_order.view",
  ],
};

export function hasPermission(role: string, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  return perms.includes("*") || perms.includes(permission);
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.userRole ?? "";
    if (!hasPermission(role, permission)) {
      res.status(403).json({ error: `Insufficient permissions. Required: ${permission}` });
      return;
    }
    next();
  };
}
