/**
 * Frontend permission definitions.
 *
 * Admin always has access to everything — no need to list Admin here.
 * Add any other role to a permission's array to grant it.
 *
 * Usage in components:
 *   const { can } = useAuth();
 *   if (can("field.cost_price")) { ... }
 *   <Button disabled={!can("feature.delete")}>Delete</Button>
 */

// ── Permission → roles that have it (Admin is implicit everywhere) ──

export const PERMISSIONS: Record<string, string[]> = {
  // Pages ──────────────────────────────────────────────────────────
  "page.dashboard":        ["Sales", "Purchase Manager", "Warehouse", "Finance", "Production"],
  "page.crm":              ["Sales", "Finance"],
  "page.catalog":          ["Sales", "Purchase Manager", "Warehouse", "Production"],
  "page.sales_orders":     ["Sales", "Warehouse", "Finance"],
  "page.purchase_orders":  ["Purchase Manager", "Warehouse"],
  "page.operations":       ["Purchase Manager", "Warehouse", "Production"],
  "page.logistics":        ["Sales", "Warehouse"],
  "page.finance":          ["Finance"],
  "page.reports":          ["Sales", "Finance", "Warehouse", "Purchase Manager", "Production"],
  "page.admin":            [],           // Admin only
  "page.tools":            ["Sales"],

  // Fields ─────────────────────────────────────────────────────────
  "field.cost_price":      ["Finance", "Purchase Manager"],
  "field.margin":          ["Finance"],

  // Features ───────────────────────────────────────────────────────
  "feature.delete":        [],           // Admin only
  "feature.edit_invoice":  ["Finance"],
  "feature.approve_po":    ["Purchase Manager"],
  "feature.manage_users":  [],           // Admin only
};

/**
 * Returns true if the given role has the requested permission.
 * Admin is always granted.
 */
export function can(role: string | null | undefined, permission: string): boolean {
  if (!role) return false;
  if (role === "Admin") return true;
  return (PERMISSIONS[permission] ?? []).includes(role);
}
