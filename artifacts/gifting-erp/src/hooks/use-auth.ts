import { getStoredUser, type AuthUser } from "@/lib/auth";
import { can as canCheck } from "@/lib/permissions";

export interface AuthHook {
  user: AuthUser | null;
  role: string;
  isAdmin: boolean;
  can: (permission: string) => boolean;
}

/**
 * Returns the current user and a `can(permission)` helper.
 *
 * Example:
 *   const { can, isAdmin, role } = useAuth();
 *   {can("field.cost_price") && <span>Cost: ₹{product.costPrice}</span>}
 *   {can("feature.delete") && <Button>Delete</Button>}
 */
export function useAuth(): AuthHook {
  const user = getStoredUser();
  const role = user?.role ?? "";
  return {
    user,
    role,
    isAdmin: role === "Admin",
    can: (permission: string) => canCheck(role, permission),
  };
}
