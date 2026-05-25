import { useState } from "react";
import { Link, useLocation } from "wouter";
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
  Menu,
  X,
  Target,
  TrendingUp,
  FileSpreadsheet,
  FolderTree,
  MapPin,
  Inbox,
  Receipt
} from "lucide-react";
import { LogOut, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getStoredUser, logout } from "@/lib/auth";
import { NotificationsBell } from "@/components/notifications-bell";

const navItems = [
  { group: "Overview", items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }] },
  { group: "CRM", items: [
    { label: "Clients", href: "/clients", icon: Users },
    { label: "Leads", href: "/leads", icon: Target },
    { label: "Opportunities", href: "/opportunities", icon: TrendingUp },
    { label: "Quotes", href: "/quotes", icon: FileSpreadsheet },
  ]},
  { group: "Catalog", items: [
    { label: "Products", href: "/products", icon: Package },
    { label: "Bundles", href: "/bundles", icon: Gift },
    { label: "Categories", href: "/categories", icon: FolderTree },
  ]},
  { group: "Orders", items: [
    { label: "Sales Orders", href: "/sales-orders", icon: ShoppingCart },
    { label: "Purchase Orders", href: "/purchase-orders", icon: ClipboardList },
    { label: "Vendors", href: "/vendors", icon: Briefcase }
  ]},
  { group: "Operations", items: [
    { label: "Inventory", href: "/inventory", icon: Box },
    { label: "Locations", href: "/locations", icon: MapPin },
    { label: "Goods Receipts", href: "/grn", icon: Inbox },
    { label: "Assembly", href: "/assembly", icon: Settings },
    { label: "Artwork", href: "/artwork", icon: Palette }
  ]},
  { group: "Logistics", items: [{ label: "Shipments", href: "/shipments", icon: Truck }] },
  { group: "Finance", items: [
    { label: "Invoices", href: "/invoices", icon: FileText },
    { label: "Payments", href: "/payments", icon: CreditCard },
    { label: "Credit Notes", href: "/credit-notes", icon: Receipt },
  ]},
  { group: "Admin", items: [
    { label: "Users", href: "/users", icon: Users },
    { label: "Settings", href: "/settings", icon: Settings },
  ]}
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 text-sidebar-foreground transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 overflow-y-auto border-r border-sidebar-border",
        "bg-gradient-to-b from-[hsl(220_25%_13%)] via-[hsl(220_24%_15%)] to-[hsl(200_30%_12%)]",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-5 border-b border-sidebar-border/60">
          <span className="text-xl font-bold text-white flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
              <Gift className="w-5 h-5 text-white" />
            </span>
            <span className="bg-gradient-to-r from-white to-teal-200 bg-clip-text text-transparent">GiftERP</span>
          </span>
          <Button variant="ghost" size="icon" className="lg:hidden text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="p-3 space-y-5">
          {navItems.map((group) => (
            <div key={group.group}>
              <h3 className="mb-1.5 px-3 text-[10px] font-bold text-sidebar-foreground/50 uppercase tracking-[0.12em]">
                {group.group}
              </h3>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = location === item.href || location.startsWith(`${item.href}/`);
                  return (
                    <Link key={item.href} href={item.href}>
                      <span className={cn(
                        "group relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer text-sm font-medium",
                        isActive
                          ? "bg-gradient-to-r from-teal-500/20 to-transparent text-white shadow-[inset_2px_0_0_hsl(170_80%_50%)]"
                          : "text-sidebar-foreground/80 hover:bg-white/[0.04] hover:text-white"
                      )}>
                        <item.icon className={cn("w-4 h-4 transition-colors", isActive ? "text-teal-300" : "text-sidebar-foreground/60 group-hover:text-teal-300")} />
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-4 border-b border-border/60 glass-card sticky top-0 z-30">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <Link href="/settings">
              <Button variant="ghost" size="icon" title="Settings"><SettingsIcon className="w-4 h-4" /></Button>
            </Link>
            {(() => {
              const u = getStoredUser();
              const initials = u ? u.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() : "??";
              return (
                <>
                  <div className="text-right hidden sm:block ml-2">
                    <div className="text-sm font-medium leading-tight">{u?.name ?? "Guest"}</div>
                    <div className="text-xs text-muted-foreground capitalize">{u?.role ?? ""}</div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">{initials}</div>
                  <Button variant="ghost" size="icon" onClick={logout} title="Sign out" data-testid="button-logout"><LogOut className="w-4 h-4" /></Button>
                </>
              );
            })()}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
