import {
  LayoutDashboard,
  Users,
  Package,
  Gift,
  ShoppingCart,
  ClipboardList,
  Briefcase,
  Box,
  Settings,
  Palette,
  Truck,
  FileText,
  CreditCard,
  Target,
  TrendingUp,
  FileSpreadsheet,
  FolderTree,
  MapPin,
  Inbox,
  Receipt,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export const navItems: NavGroup[] = [
  { group: "Overview", items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }] },
  {
    group: "CRM",
    items: [
      { label: "Clients", href: "/clients", icon: Users },
      { label: "Leads", href: "/leads", icon: Target },
      { label: "Opportunities", href: "/opportunities", icon: TrendingUp },
      { label: "Quotes", href: "/quotes", icon: FileSpreadsheet },
    ],
  },
  {
    group: "Catalog",
    items: [
      { label: "Products", href: "/products", icon: Package },
      { label: "Bundles", href: "/bundles", icon: Gift },
      { label: "Categories", href: "/categories", icon: FolderTree },
    ],
  },
  {
    group: "Orders",
    items: [
      { label: "Sales Orders", href: "/sales-orders", icon: ShoppingCart },
      { label: "Purchase Orders", href: "/purchase-orders", icon: ClipboardList },
      { label: "Vendors", href: "/vendors", icon: Briefcase },
    ],
  },
  {
    group: "Operations",
    items: [
      { label: "Inventory", href: "/inventory", icon: Box },
      { label: "Locations", href: "/locations", icon: MapPin },
      { label: "Goods Receipts", href: "/grn", icon: Inbox },
      { label: "Assembly", href: "/assembly", icon: Settings },
      { label: "Artwork", href: "/artwork", icon: Palette },
    ],
  },
  { group: "Logistics", items: [{ label: "Shipments", href: "/shipments", icon: Truck }] },
  {
    group: "Finance",
    items: [
      { label: "Invoices", href: "/invoices", icon: FileText },
      { label: "Payments", href: "/payments", icon: CreditCard },
      { label: "Credit Notes", href: "/credit-notes", icon: Receipt },
    ],
  },
  {
    group: "Admin",
    items: [
      { label: "Users", href: "/users", icon: Users },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export const flatNavItems: NavItem[] = navItems.flatMap((g) => g.items);
