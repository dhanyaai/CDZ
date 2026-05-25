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
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getStoredUser, logout } from "@/lib/auth";

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
  { group: "Admin", items: [{ label: "Users", href: "/users", icon: Users }] }
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
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 overflow-y-auto border-r border-sidebar-border",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          <span className="text-xl font-bold text-white flex items-center gap-2">
            <Gift className="w-6 h-6 text-sidebar-primary" />
            GiftERP
          </span>
          <Button variant="ghost" size="icon" className="lg:hidden text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="p-4 space-y-6">
          {navItems.map((group) => (
            <div key={group.group}>
              <h3 className="mb-2 px-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                {group.group}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location === item.href || location.startsWith(`${item.href}/`);
                  return (
                    <Link key={item.href} href={item.href}>
                      <span className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm font-medium",
                        isActive 
                          ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white"
                      )}>
                        <item.icon className={cn("w-4 h-4", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70")} />
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
        <header className="h-16 flex items-center justify-between px-4 border-b bg-card">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            {(() => {
              const u = getStoredUser();
              const initials = u ? u.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() : "??";
              return (
                <>
                  <div className="text-right hidden sm:block">
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
