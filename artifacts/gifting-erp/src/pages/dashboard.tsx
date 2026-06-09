import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetDashboardStats, useGetTopClients, useGetRevenueTrend, useGetSalesPipeline } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Users, ShoppingCart, Settings, FileText, Package, Briefcase,
  TrendingUp, AlertTriangle, IndianRupee, Clock, Medal, CheckCircle2,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { DashboardWidgets } from "@/components/dashboard-widgets";

type ArAging = { bucket: string; count: number; amount: number };
type Leaderboard = { userId: number; userName: string; totalRevenue: number; orderCount: number };
type TopProduct = { productId: number; productName: string; totalQty: number; totalRevenue: number };
type VendorPerf = { vendorId: number; vendorName: string; totalOrders: number; totalAmount: number; fulfilmentRate: number };
type InventoryStatus = { status: string; count: number };

const AR_COLORS: Record<string, string> = {
  "Current": "#10b981",
  "1–30 days": "#f59e0b",
  "31–60 days": "#f97316",
  "61+ days": "#ef4444",
};
const PIE_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function Dashboard() {
  const [months, setMonths] = useState(6);
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: topClients } = useGetTopClients();
  const { data: revenueTrend, isLoading: revenueLoading } = useGetRevenueTrend({ months });
  const { data: pipeline } = useGetSalesPipeline();
  const { data: arAging } = useQuery({ queryKey: ["ar-aging"], queryFn: () => api<ArAging[]>("/v1/analytics/ar-aging") });
  const { data: leaderboard } = useQuery({ queryKey: ["sales-leaderboard"], queryFn: () => api<Leaderboard[]>("/v1/analytics/sales-leaderboard") });
  const { data: topProducts } = useQuery({ queryKey: ["top-products"], queryFn: () => api<TopProduct[]>("/v1/analytics/top-products") });
  const { data: vendorPerf } = useQuery({ queryKey: ["vendor-performance"], queryFn: () => api<VendorPerf[]>("/v1/analytics/vendor-performance") });
  const { data: inventoryStatus } = useQuery({ queryKey: ["inventory-status"], queryFn: () => api<InventoryStatus[]>("/v1/analytics/inventory-status") });

  const statCards = [
    { title: "Total Clients", value: stats?.totalClients ?? 0, icon: Users, tile: "stat-card-blue", iconBg: "bg-blue-500/10 text-blue-500", hint: "Active accounts" },
    { title: "Active Orders", value: stats?.activeOrders ?? 0, icon: ShoppingCart, tile: "stat-card-green", iconBg: "bg-amber-500/10 text-amber-500", hint: "In progress" },
    { title: "Pending Assembly", value: stats?.pendingAssembly ?? 0, icon: Settings, tile: "stat-card-amber", iconBg: "bg-violet-500/10 text-violet-500", hint: "Awaiting build" },
    { title: "Overdue Invoices", value: stats?.overdueInvoices ?? 0, icon: FileText, tile: "stat-card-red", iconBg: "bg-red-500/10 text-red-500", hint: "Need follow-up" },
    { title: "Low Stock Items", value: stats?.lowStockItems ?? 0, icon: Package, tile: "stat-card-orange", iconBg: "bg-orange-500/10 text-orange-500", hint: "Reorder soon" },
    { title: "Pending POs", value: stats?.pendingPOs ?? 0, icon: Briefcase, tile: "stat-card-purple", iconBg: "bg-indigo-500/10 text-indigo-500", hint: "Open with vendors" },
  ];

  const tooltipStyle = {
    contentStyle: { backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px" },
    itemStyle: { color: "hsl(var(--foreground))" },
  };

  return (
    <div className="space-y-6" data-testid="page-dashboard">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live overview of Customize Duniya operations · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Select value={String(months)} onValueChange={v => setMonths(Number(v))}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
            <SelectItem value="24">Last 24 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statsLoading
          ? Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)
          : statCards.map((stat, i) => (
            <Card key={i} className={`elev-1 border ${stat.tile} transition-all hover:elev-2 hover:-translate-y-0.5`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.iconBg}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 text-3xl font-bold tracking-tight">{stat.value}</div>
                <div className="text-xs font-medium text-muted-foreground mt-1">{stat.title}</div>
                <div className="text-[11px] text-muted-foreground/70 mt-0.5">{stat.hint}</div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Revenue + Pipeline */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 elev-1">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {revenueLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}
                    tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="#d97706" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 elev-1">
          <CardHeader>
            <CardTitle>Sales Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipeline} layout="vertical" margin={{ left: 16, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="status" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={90} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Value"]} />
                <Bar dataKey="value" fill="#d97706" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Advanced analytics widgets */}
      <DashboardWidgets />

      {/* AR Aging + Inventory Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 elev-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              AR Aging
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!arAging ? (
              <Skeleton className="h-32 w-full" />
            ) : arAging.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No outstanding invoices</div>
            ) : (
              <div className="space-y-3">
                {arAging.map(bucket => {
                  const total = arAging.reduce((s, b) => s + b.amount, 0);
                  const pct = total > 0 ? Math.round((bucket.amount / total) * 100) : 0;
                  const color = AR_COLORS[bucket.bucket] ?? "#8b5cf6";
                  return (
                    <div key={bucket.bucket} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{bucket.bucket}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{bucket.count} invoices</span>
                          <span className="font-semibold">₹{bucket.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 elev-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Inventory Status
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[220px]">
            {!inventoryStatus ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={inventoryStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    dataKey="count" nameKey="status" paddingAngle={3}>
                    {inventoryStatus.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend formatter={v => <span className="text-xs text-muted-foreground">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales Leaderboard + Top Products + Vendor Performance */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="elev-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Medal className="w-4 h-4 text-amber-500" />
              Sales Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!leaderboard ? (
              <Skeleton className="h-48 w-full" />
            ) : leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No sales data yet</p>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((rep, i) => (
                  <div key={rep.userId} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? "bg-amber-500/20 text-amber-500" : i === 1 ? "bg-slate-500/20 text-slate-400" : i === 2 ? "bg-orange-500/20 text-orange-500" : "bg-muted text-muted-foreground"
                    }`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{rep.userName}</div>
                      <div className="text-xs text-muted-foreground">{rep.orderCount} orders</div>
                    </div>
                    <div className="font-semibold text-sm">₹{rep.totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="elev-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Top Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!topProducts ? (
              <Skeleton className="h-48 w-full" />
            ) : topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No product data yet</p>
            ) : (
              <div className="space-y-3">
                {topProducts.slice(0, 5).map((p, i) => (
                  <div key={p.productId} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{p.productName}</div>
                      <div className="text-xs text-muted-foreground">{p.totalQty} units sold</div>
                    </div>
                    <div className="font-semibold text-sm">₹{p.totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="elev-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-violet-500" />
              Vendor Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!vendorPerf ? (
              <Skeleton className="h-48 w-full" />
            ) : vendorPerf.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No vendor data yet</p>
            ) : (
              <div className="space-y-3">
                {vendorPerf.slice(0, 5).map(v => (
                  <div key={v.vendorId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium truncate flex-1 mr-2">{v.vendorName}</span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 ${v.fulfilmentRate >= 90 ? "border-emerald-500/40 text-emerald-500" : v.fulfilmentRate >= 70 ? "border-amber-500/40 text-amber-500" : "border-red-500/40 text-red-500"}`}>
                        {v.fulfilmentRate}%
                      </Badge>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${v.fulfilmentRate}%`, backgroundColor: v.fulfilmentRate >= 90 ? "#10b981" : v.fulfilmentRate >= 70 ? "#f59e0b" : "#ef4444" }} />
                    </div>
                    <div className="text-xs text-muted-foreground">{v.totalOrders} orders · ₹{v.totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Clients */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 elev-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Top Clients by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topClients?.map((client, i) => {
                const maxRev = topClients[0]?.totalRevenue ?? 1;
                const pct = Math.round((client.totalRevenue / maxRev) * 100);
                return (
                  <div key={client.clientId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                        <span className="font-medium">{client.clientName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{client.totalOrders} orders</span>
                        <span className="font-semibold">₹{client.totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {!topClients?.length && <p className="text-sm text-muted-foreground text-center py-4">No client data available</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 elev-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "New Sales Order", href: "/sales-orders", color: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20" },
              { label: "Create Invoice", href: "/invoices", color: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20" },
              { label: "Record Inventory", href: "/inventory", color: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" },
              { label: "Add Lead", href: "/leads", color: "bg-violet-500/10 text-violet-600 hover:bg-violet-500/20" },
              { label: "New Purchase Order", href: "/purchase-orders", color: "bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20" },
            ].map(a => (
              <a key={a.href} href={a.href}
                className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${a.color}`}>
                <span>{a.label}</span>
                <span className="text-lg leading-none">→</span>
              </a>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
