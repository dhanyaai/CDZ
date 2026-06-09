import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Gift,
  Menu,
  X,
  Search,
  Moon,
  Sun,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings as SettingsIcon,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getStoredUser, logout } from "@/lib/auth";
import { NotificationsBell } from "@/components/notifications-bell";
import { CommandPalette } from "@/components/command-palette";
import { navItems, flatNavItems } from "@/lib/nav";
import { useTheme } from "@/lib/theme";

const COLLAPSE_KEY = "cd-sidebar-collapsed";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(
    () => typeof localStorage !== "undefined" && localStorage.getItem(COLLAPSE_KEY) === "1",
  );
  const [cmdOpen, setCmdOpen] = useState(false);
  const { theme, toggle } = useTheme();

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof localStorage !== "undefined") localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const user = getStoredUser();
  const initials = user
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "??";
  const current = flatNavItems.find(
    (i) => location === i.href || location.startsWith(`${i.href}/`),
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen bg-background overflow-hidden">
        <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 text-sidebar-foreground transition-[width,transform] duration-300 ease-in-out lg:static lg:translate-x-0 overflow-y-auto overflow-x-hidden border-r border-sidebar-border",
            "bg-gradient-to-b from-[hsl(220_25%_13%)] via-[hsl(220_24%_15%)] to-[hsl(200_30%_12%)]",
            collapsed ? "lg:w-[76px]" : "lg:w-64",
            "w-64",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div
            className={cn(
              "flex items-center h-16 border-b border-sidebar-border/60",
              collapsed ? "lg:justify-center lg:px-0 px-5 justify-between" : "px-5 justify-between",
            )}
          >
            <span className="text-xl font-bold text-white flex items-center gap-2.5">
              <span className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Gift className="w-5 h-5 text-white" />
              </span>
              <span
                className={cn(
                  "bg-gradient-to-r from-white to-amber-200 bg-clip-text text-transparent whitespace-nowrap",
                  collapsed && "lg:hidden",
                )}
              >
                Customize Duniya
              </span>
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <nav className={cn("py-3 space-y-5", collapsed ? "lg:px-2 px-3" : "px-3")}>
            {navItems.map((group) => (
              <div key={group.group}>
                <h3
                  className={cn(
                    "mb-1.5 px-3 text-[10px] font-bold text-sidebar-foreground/50 uppercase tracking-[0.12em]",
                    collapsed && "lg:hidden",
                  )}
                >
                  {group.group}
                </h3>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive =
                      location === item.href || location.startsWith(`${item.href}/`);
                    const link = (
                      <Link key={item.href} href={item.href}>
                        <span
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            "group relative flex items-center gap-3 rounded-lg transition-all cursor-pointer text-sm font-medium",
                            collapsed ? "lg:justify-center lg:px-0 lg:h-10 px-3 py-2" : "px-3 py-2",
                            isActive
                              ? "bg-gradient-to-r from-indigo-500/25 to-transparent text-white shadow-[inset_2px_0_0_hsl(243_85%_68%)]"
                              : "text-sidebar-foreground/80 hover:bg-white/[0.04] hover:text-white",
                          )}
                        >
                          <item.icon
                            className={cn(
                              "w-4 h-4 shrink-0 transition-colors",
                              isActive
                                ? "text-indigo-300"
                                : "text-sidebar-foreground/60 group-hover:text-indigo-300",
                            )}
                          />
                          <span className={cn(collapsed && "lg:hidden")}>{item.label}</span>
                        </span>
                      </Link>
                    );
                    return collapsed ? (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right" className="lg:block hidden">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      link
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center gap-2 px-4 border-b border-border/60 glass-card sticky top-0 z-30">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:inline-flex text-muted-foreground"
              onClick={toggleCollapsed}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </Button>

            <span className="hidden md:block text-sm font-semibold text-foreground/80">
              {current?.label ?? "Customize Duniya"}
            </span>

            <div className="flex-1" />

            <button
              onClick={() => setCmdOpen(true)}
              className="group hidden sm:flex items-center gap-2 h-9 w-56 rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:border-primary/30"
            >
              <Search className="w-4 h-4" />
              <span>Search...</span>
              <Kbd className="ml-auto">⌘K</Kbd>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => setCmdOpen(true)}
              title="Search"
            >
              <Search className="w-5 h-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            <NotificationsBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted/60">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-[hsl(262_70%_55%)] flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm">
                    {initials}
                  </div>
                  <div className="text-left hidden sm:block leading-tight">
                    <div className="text-sm font-medium">{user?.name ?? "Guest"}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {user?.role ?? ""}
                    </div>
                  </div>
                  <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-medium">{user?.name ?? "Guest"}</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {user?.email ?? ""}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/settings">
                    <SettingsIcon className="w-4 h-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={toggle}>
                  {theme === "dark" ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                  {theme === "dark" ? "Light mode" : "Dark mode"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => void logout()}
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="flex-1 overflow-auto p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
