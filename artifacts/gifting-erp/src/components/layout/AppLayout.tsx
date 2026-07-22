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
  Building2,
  Check,
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
import { getStoredUser, setStoredUser, logout, getStoredCompanyId, setStoredCompanyId } from "@/lib/auth";
import { NotificationsBell } from "@/components/notifications-bell";
import { CommandPalette } from "@/components/command-palette";
import { getNavItems } from "@/lib/nav";
import { can } from "@/lib/permissions";
import { useTheme } from "@/lib/theme";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, setToken } from "@/lib/api";

interface Company { id: number; name: string; createdAt: string; isCurrent: boolean }

const COLLAPSE_KEY = "cd-sidebar-collapsed";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(
    () => typeof localStorage !== "undefined" && localStorage.getItem(COLLAPSE_KEY) === "1",
  );
  const [cmdOpen, setCmdOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const queryClient = useQueryClient();

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
  const currentCompanyId = getStoredCompanyId();

  const [productionEnabled, setProductionEnabled] = useState(
    () => getStoredUser()?.productionEnabled ?? false,
  );

  useEffect(() => {
    const handler = () => setProductionEnabled(getStoredUser()?.productionEnabled ?? false);
    window.addEventListener("auth-user-changed", handler);
    return () => window.removeEventListener("auth-user-changed", handler);
  }, []);

  const initials = user
    ? user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : "??";

  const role = user?.role ?? "";
  const allNavItems = getNavItems({ production: productionEnabled });
  const navItems = allNavItems
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.permission || can(role, item.permission),
      ),
    }))
    .filter((group) => group.items.length > 0);
  const flatNavItems = navItems.flatMap((g) => g.items);

  const current = flatNavItems.find(
    (i) => location === i.href || location.startsWith(`${i.href}/`),
  );

  // Company data for switcher
  const { data: companies } = useQuery<Company[]>({
    queryKey: ["companies"],
    queryFn: () => api<Company[]>("/v1/companies"),
  });

  const currentCompany = companies?.find(c => c.id === currentCompanyId) ?? companies?.[0];

  const switchMutation = useMutation({
    mutationFn: (id: number) =>
      api<{ success: boolean; token: string; companyId: number; companyName: string; productionEnabled: boolean }>(`/v1/companies/${id}/switch`, { method: "POST" }),
    onSuccess: (data) => {
      setToken(data.token);
      setStoredCompanyId(data.companyId);
      const current = getStoredUser();
      if (current) setStoredUser({ ...current, companyId: data.companyId, productionEnabled: data.productionEnabled });
      queryClient.clear();
    },
  });

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
            "fixed inset-y-0 left-0 z-50 flex flex-col text-sidebar-foreground transition-[width,transform] duration-300 ease-in-out lg:static lg:translate-x-0 overflow-hidden border-r border-white/[0.07]",
            "bg-gradient-to-b from-[hsl(243_44%_11%)] via-[hsl(246_40%_13%)] to-[hsl(263_44%_12%)]",
            collapsed ? "lg:w-[76px]" : "lg:w-64",
            "w-64",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {/* ambient brand glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-80"
            style={{
              backgroundImage:
                "radial-gradient(130% 80% at 0% 0%, hsl(243 85% 55% / 0.18), transparent 60%), radial-gradient(120% 70% at 100% 0%, hsl(38 90% 55% / 0.06), transparent 55%)",
            }}
          />

          <div
            className={cn(
              "relative flex items-center h-16 shrink-0 border-b border-white/[0.06]",
              collapsed ? "lg:justify-center lg:px-0 px-5 justify-between" : "px-5 justify-between",
            )}
          >
            <span className="text-xl font-bold text-white flex items-center gap-2.5">
              <span className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 ring-1 ring-amber-300/30">
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

          {/* Company switcher */}
          {companies && companies.length > 0 && (
            <div className={cn("relative border-b border-white/[0.06]", collapsed ? "lg:px-2 px-3 py-2" : "px-3 py-2")}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="hidden lg:flex w-full h-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors">
                          <Building2 className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">{currentCompany?.name ?? "Company"}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <button className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 h-9 text-sm text-white/80 hover:bg-white/[0.06] hover:text-white transition-colors",
                      collapsed && "lg:hidden"
                    )}>
                      <Building2 className="w-3.5 h-3.5 shrink-0 text-indigo-300/70" />
                      <span className="truncate flex-1 text-left">{currentCompany?.name ?? "…"}</span>
                      {companies.length > 1 && <ChevronsUpDown className="w-3 h-3 text-white/40 shrink-0" />}
                    </button>
                  )}
                </DropdownMenuTrigger>
                {companies.length > 1 && (
                  <DropdownMenuContent side="right" align="start" className="w-52">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Switch Company</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {companies.map((c) => (
                      <DropdownMenuItem
                        key={c.id}
                        className="cursor-pointer"
                        onClick={() => { if (c.id !== currentCompanyId) switchMutation.mutate(c.id); }}
                      >
                        <Building2 className="w-4 h-4" />
                        <span className="flex-1 truncate">{c.name}</span>
                        {c.id === currentCompanyId && <Check className="w-3.5 h-3.5 text-primary" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                )}
              </DropdownMenu>
            </div>
          )}

          <nav
            className={cn(
              "relative flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-6",
              collapsed ? "lg:px-2 px-3" : "px-3",
            )}
          >
            {navItems.map((group) => (
              <div key={group.group}>
                <h3
                  className={cn(
                    "mb-2 px-3 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-[0.14em]",
                    collapsed ? "lg:hidden" : "",
                  )}
                >
                  {group.group}
                </h3>
                {collapsed && (
                  <div className="hidden lg:block mx-2 mb-2 h-px bg-white/[0.06]" />
                )}
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
                              ? "bg-indigo-500/15 text-white ring-1 ring-inset ring-indigo-400/25 shadow-[inset_2px_0_0_hsl(243_90%_70%)]"
                              : "text-sidebar-foreground/75 hover:bg-white/[0.05] hover:text-white",
                          )}
                        >
                          <item.icon
                            className={cn(
                              "w-4 h-4 shrink-0 transition-colors",
                              isActive
                                ? "text-indigo-300"
                                : "text-sidebar-foreground/55 group-hover:text-indigo-300",
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

          {/* Footer: quick search */}
          <div className="relative shrink-0 border-t border-white/[0.06] p-3">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setCmdOpen(true)}
                    className="hidden lg:flex w-full h-10 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Quick search · ⌘K</TooltipContent>
              </Tooltip>
            ) : null}
            <button
              onClick={() => setCmdOpen(true)}
              className={cn(
                "group flex w-full items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 h-10 text-sm text-sidebar-foreground/70 transition-colors hover:bg-white/[0.06] hover:text-white",
                collapsed && "lg:hidden",
              )}
            >
              <Search className="w-4 h-4" />
              <span>Quick search</span>
              <Kbd className="ml-auto border-white/15 bg-white/10 text-white/70">⌘K</Kbd>
            </button>
          </div>
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
