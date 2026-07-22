import {
  LayoutDashboard,
  Users,
  Package,
  Gift,
  ShoppingCart,
  ClipboardList,
  Briefcase,
  Box,
  ArrowRightLeft,
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
  UserCheck,
  Building2,
  CalendarClock,
  FlaskConical,
  BookOpen,
  Factory,
  Landmark,
  BarChart3,
  FileImage,
  ClipboardCheck,
  Wrench,
  Calculator,
  FilePlus2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Permission code required to see this item. Omit to show to everyone. */
  permission?: string;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export function getNavItems(opts: { production?: boolean } = {}): NavGroup[] {
  return [
    {
      group: "Overview",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "page.dashboard" },
      ],
    },
    {
      group: "CRM",
      items: [
        { label: "Clients",           href: "/clients",           icon: Users,           permission: "page.crm" },
        { label: "Contacts",          href: "/contacts",          icon: UserCheck,       permission: "page.crm" },
        { label: "Leads",             href: "/leads",             icon: Target,          permission: "page.crm" },
        { label: "Opportunities",     href: "/opportunities",     icon: TrendingUp,      permission: "page.crm" },
        { label: "Quotes",            href: "/quotes",            icon: FileSpreadsheet, permission: "page.crm" },
        { label: "Proforma Invoices", href: "/proforma-invoices", icon: FilePlus2,       permission: "page.crm" },
        { label: "Follow-ups",        href: "/follow-ups",        icon: CalendarClock,   permission: "page.crm" },
      ],
    },
    {
      group: "Catalog",
      items: [
        { label: "Products",       href: "/products",       icon: Package,    permission: "page.catalog" },
        { label: "Bundles",        href: "/bundles",        icon: Gift,       permission: "page.catalog" },
        { label: "Bundle Costing", href: "/bundle-costing", icon: Calculator, permission: "page.catalog" },
        { label: "Services",       href: "/services",       icon: Wrench,     permission: "page.catalog" },
        { label: "Categories",     href: "/categories",     icon: FolderTree, permission: "page.catalog" },
      ],
    },
    {
      group: "Orders",
      items: [
        { label: "Sales Orders",     href: "/sales-orders",    icon: ShoppingCart,   permission: "page.sales_orders" },
        { label: "Order Processing", href: "/order-processing", icon: ClipboardCheck, permission: "page.sales_orders" },
        { label: "Sample Orders",    href: "/sample-orders",   icon: FlaskConical,   permission: "page.sales_orders" },
        { label: "Purchase Orders",  href: "/purchase-orders", icon: ClipboardList,  permission: "page.purchase_orders" },
        { label: "Vendors",          href: "/vendors",         icon: Briefcase,      permission: "page.purchase_orders" },
      ],
    },
    {
      group: "Operations",
      items: [
        { label: "Inventory",      href: "/inventory",   icon: Box,            permission: "page.operations" },
        { label: "Item Ledger",    href: "/item-ledger", icon: BookOpen,       permission: "page.operations" },
        { label: "Transfers",      href: "/transfers",   icon: ArrowRightLeft, permission: "page.operations" },
        { label: "Locations",      href: "/locations",   icon: MapPin,         permission: "page.operations" },
        { label: "Goods Receipts", href: "/grn",         icon: Inbox,          permission: "page.operations" },
        { label: "Assembly",       href: "/assembly",    icon: Settings,       permission: "page.operations" },
        { label: "Artwork",        href: "/artwork",     icon: Palette,        permission: "page.operations" },
        ...(opts.production
          ? [{ label: "Production", href: "/production", icon: Factory, permission: "page.operations" }]
          : []),
      ],
    },
    {
      group: "Logistics",
      items: [
        { label: "Shipments", href: "/shipments", icon: Truck, permission: "page.logistics" },
      ],
    },
    {
      group: "Finance",
      items: [
        { label: "Invoices",     href: "/invoices",     icon: FileText,  permission: "page.finance" },
        { label: "Payments",     href: "/payments",     icon: CreditCard, permission: "page.finance" },
        { label: "Credit Notes", href: "/credit-notes", icon: Receipt,   permission: "page.finance" },
        { label: "Fixed Assets", href: "/fixed-assets", icon: Landmark,  permission: "page.finance" },
        { label: "Reports",      href: "/reports",      icon: BarChart3, permission: "page.reports" },
      ],
    },
    {
      group: "Admin",
      items: [
        { label: "Users",     href: "/users",     icon: Users,    permission: "page.admin" },
        { label: "Companies", href: "/companies", icon: Building2, permission: "page.admin" },
        { label: "Settings",  href: "/settings",  icon: Settings, permission: "page.admin" },
      ],
    },
    {
      group: "Tools",
      items: [
        { label: "PDF Image Extractor", href: "/pdf-extractor", icon: FileImage, permission: "page.tools" },
      ],
    },
  ];
}

export const navItems: NavGroup[] = getNavItems();
export const flatNavItems: NavItem[] = navItems.flatMap((g) => g.items);
