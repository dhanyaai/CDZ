import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getStoredUser, setStoredUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { format } from "date-fns";
import {
  TrendingUp, DollarSign, ShoppingCart, AlertCircle, Package, Users,
  Building2, Factory, BarChart3, FileText, Truck, Landmark, CalendarDays, Archive,
  Download, Receipt,
} from "lucide-react";

// ─── date presets ─────────────────────────────────────────────────────────────
type Preset = "month" | "3m" | "6m" | "year" | "all";
const PRESETS: { id: Preset; label: string }[] = [
  { id: "month", label: "This Month" },
  { id: "3m",    label: "Last 3M" },
  { id: "6m",    label: "Last 6M" },
  { id: "year",  label: "This Year" },
  { id: "all",   label: "All Time" },
];

function getRange(preset: Preset): { from?: string; to?: string } {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  if (preset === "month") return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0], to: today };
  if (preset === "3m") { const d = new Date(now); d.setMonth(d.getMonth() - 3); return { from: d.toISOString().split("T")[0], to: today }; }
  if (preset === "6m") { const d = new Date(now); d.setMonth(d.getMonth() - 6); return { from: d.toISOString().split("T")[0], to: today }; }
  if (preset === "year") return { from: `${now.getFullYear()}-01-01`, to: today };
  return {};
}

function qs(f: { from?: string; to?: string }): string {
  const p = new URLSearchParams();
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  const s = p.toString();
  return s ? `?${s}` : "";
}

// ─── helpers ──────────────────────────────────────────────────────────────────
const INR = (n: number) => `₹${(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const pct = (n: number, d: number) => (d ? ((n / d) * 100).toFixed(1) : "0");
const fmtMonth = (m: string) => { try { return format(new Date(m + "-01"), "MMM yy"); } catch { return m; } };

const PALETTE = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#14b8a6", "#f97316"];

interface Filters { from?: string; to?: string }
interface TabProps { filters: Filters; cid: number }

// ─── types ────────────────────────────────────────────────────────────────────
interface Company { id: number; name: string; isCurrent: boolean }
interface Dashboard { totalClients: number; activeOrders: number; overdueInvoices: number; revenueThisMonth: number; totalRevenue: number; lowStockItems: number; pendingPOs: number; pendingAssembly: number }
interface RevenueTrend { month: string; revenue: number; orders: number }
interface Pipeline { status: string; count: number; value: number }
interface TopClient { clientId: number; clientName: string; orders: number; revenue: number }
interface TopProduct { productId: number; productName: string; quantity: number; revenue: number }
interface ArAging { buckets: { bucket: string; value: number }[]; total: number; detail: { bucket: string; invoiceNumber: string; clientName: string; balance: number; daysOverdue: number }[] }
interface VendorPerf { vendorId: number; vendorName: string; poCount: number; totalValue: number; onTimeRate: number }
interface InvStatus { totalProducts: number; lowStockCount: number; outOfStockCount: number; totalValue: number }
interface Product { id: number; name: string; category: string; stockLevel: number; price: number; costPrice: number; sku: string }
interface AssetSummary { totalAssets: number; activeAssets: number; totalCost: number; totalBookValue: number; totalDepreciation: number; byCategory: { category: string; count: number; totalCost: number; totalBV: number }[] }
interface FixedAsset { id: number; assetCode: string; name: string; category: string; purchaseCost: number; currentBookValue: number; totalDepreciation: number; status: string; purchaseDate: string; locationName: string | null }
interface ProdOrder { id: number; orderNumber: string; productName: string; quantity: number; producedQty: number; status: string; plannedDate: string | null }
interface StockAgeBuckets { "0-30": number; "31-60": number; "61-90": number; "90+": number }
interface StockAgeItem { productId: number; productName: string; sku: string; category: string; currentStock: number; costPrice: number; totalValue: number; avgAge: number; oldestAge: number; buckets: StockAgeBuckets }
interface StockAgeData { summary: Record<string, { qty: number; value: number }>; items: StockAgeItem[] }

// ─── small shared components ──────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border rounded-lg px-3 py-2 shadow-lg text-sm space-y-1">
      {label && <p className="font-medium text-muted-foreground mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          <span className="font-medium">{p.name}:</span>{" "}
          {p.value > 999 ? INR(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <Card className="elev-1">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xl font-bold leading-none truncate">{value}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyRow({ cols, label }: { cols: number; label?: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="text-center py-10 text-muted-foreground">{label ?? "No data available"}</TableCell>
    </TableRow>
  );
}

// ─── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ filters, cid }: TabProps) {
  const q = qs(filters);
  const { data: dash, isLoading: dL } = useQuery<Dashboard>({ queryKey: ["r-dashboard", cid, filters.from, filters.to], queryFn: () => api(`/v1/analytics/dashboard${q}`) });
  const { data: trend = [], isLoading: tL } = useQuery<RevenueTrend[]>({ queryKey: ["r-trend", cid, filters.from, filters.to], queryFn: () => api(`/v1/analytics/revenue-trend${q}`) });
  const { data: pipe = [], isLoading: pL } = useQuery<Pipeline[]>({ queryKey: ["r-pipeline", cid, filters.from, filters.to], queryFn: () => api(`/v1/analytics/sales-pipeline${q}`) });

  const kpis = [
    { label: filters.from ? "Revenue in Period" : "Revenue This Month", value: INR(dash?.revenueThisMonth ?? 0), icon: DollarSign, color: "bg-indigo-500/10 text-indigo-500" },
    { label: "Total Revenue (All Time)", value: INR(dash?.totalRevenue ?? 0), icon: TrendingUp, color: "bg-emerald-500/10 text-emerald-600" },
    { label: "Active Orders", value: dash?.activeOrders ?? 0, icon: ShoppingCart, color: "bg-blue-500/10 text-blue-500" },
    { label: "Total Clients", value: dash?.totalClients ?? 0, icon: Users, color: "bg-violet-500/10 text-violet-500" },
    { label: "Overdue Invoices", value: dash?.overdueInvoices ?? 0, icon: AlertCircle, color: "bg-red-500/10 text-red-500" },
    { label: "Low Stock Items", value: dash?.lowStockItems ?? 0, icon: Package, color: "bg-amber-500/10 text-amber-600" },
    { label: "Pending POs", value: dash?.pendingPOs ?? 0, icon: Truck, color: "bg-teal-500/10 text-teal-600" },
    { label: "Pending Assembly", value: dash?.pendingAssembly ?? 0, icon: Factory, color: "bg-orange-500/10 text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-3">
        {dL ? Array(8).fill(0).map((_, i) => <Card key={i} className="elev-1"><CardContent className="p-4"><Skeleton className="h-14 w-full" /></CardContent></Card>)
          : kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 elev-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Revenue Trend</CardTitle></CardHeader>
          <CardContent className="h-56">
            {tL ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend.map((t) => ({ ...t, month: fmtMonth(t.month) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="orders" name="Orders" stroke="#22c55e" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="elev-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Sales Pipeline</CardTitle></CardHeader>
          <CardContent className="pt-0">
            {pL ? <Skeleton className="h-48 w-full" /> : (
              <div className="space-y-2.5 mt-1">
                {pipe.map((p, i) => (
                  <div key={p.status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{p.status}</span>
                      <span className="text-muted-foreground">{p.count} · {INR(p.value)}</span>
                    </div>
                    <Progress value={p.count > 0 ? Math.max(8, (p.count / Math.max(...pipe.map(x => x.count), 1)) * 100) : 0} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Sales Tab ─────────────────────────────────────────────────────────────────
function SalesTab({ filters, cid }: TabProps) {
  const q = qs(filters);
  const { data: clients = [], isLoading: cL } = useQuery<TopClient[]>({ queryKey: ["r-top-clients", cid, filters.from, filters.to], queryFn: () => api(`/v1/analytics/top-clients${q}`) });
  const { data: products = [], isLoading: pL } = useQuery<TopProduct[]>({ queryKey: ["r-top-products", cid, filters.from, filters.to], queryFn: () => api(`/v1/analytics/top-products${q}`) });
  const { data: trend = [] } = useQuery<RevenueTrend[]>({ queryKey: ["r-trend", cid, filters.from, filters.to], queryFn: () => api(`/v1/analytics/revenue-trend${q}`) });

  const totalClientRev = clients.reduce((a, c) => a + c.revenue, 0);
  const totalProductRev = products.reduce((a, p) => a + p.revenue, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card className="elev-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-1.5"><Users className="w-4 h-4 text-indigo-500" />Top Clients by Revenue</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-8">#</TableHead><TableHead>Client</TableHead><TableHead className="text-right">Orders</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Share</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {cL ? <TableRow><TableCell colSpan={5}><Skeleton className="h-32 w-full" /></TableCell></TableRow>
                  : clients.length === 0 ? <EmptyRow cols={5} />
                  : clients.map((c, i) => (
                    <TableRow key={c.clientId}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="font-medium text-sm">{c.clientName}</TableCell>
                      <TableCell className="text-right text-sm">{c.orders}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{INR(c.revenue)}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{pct(c.revenue, totalClientRev)}%</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="elev-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-1.5"><Package className="w-4 h-4 text-emerald-500" />Top Products by Revenue</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-8">#</TableHead><TableHead>Product</TableHead><TableHead className="text-right">Qty Sold</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Share</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {pL ? <TableRow><TableCell colSpan={5}><Skeleton className="h-32 w-full" /></TableCell></TableRow>
                  : products.length === 0 ? <EmptyRow cols={5} />
                  : products.map((p, i) => (
                    <TableRow key={p.productId}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="font-medium text-sm">{p.productName}</TableCell>
                      <TableCell className="text-right text-sm">{p.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{INR(p.revenue)}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{pct(p.revenue, totalProductRev)}%</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="elev-1">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Monthly Revenue Breakdown</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Month</TableHead><TableHead className="text-right">Orders</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead>MoM</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {trend.length === 0 ? <EmptyRow cols={4} />
                : [...trend].reverse().map((t, i, arr) => {
                  const prev = arr[i + 1];
                  const delta = prev && prev.revenue > 0 ? ((t.revenue - prev.revenue) / prev.revenue) * 100 : null;
                  return (
                    <TableRow key={t.month}>
                      <TableCell className="font-medium">{fmtMonth(t.month)}</TableCell>
                      <TableCell className="text-right">{t.orders}</TableCell>
                      <TableCell className="text-right tabular-nums">{INR(t.revenue)}</TableCell>
                      <TableCell>
                        {delta != null
                          ? <span className={`text-xs font-medium ${delta >= 0 ? "text-emerald-600" : "text-red-500"}`}>{delta >= 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}%</span>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Finance Tab ────────────────────────────────────────────────────────────────
function FinanceTab({ filters, cid }: TabProps) {
  const { data: aging, isLoading } = useQuery<ArAging>({ queryKey: ["r-ar-aging", cid, filters.from, filters.to], queryFn: () => api(`/v1/analytics/ar-aging${qs(filters)}`) });

  const bucketColors: Record<string, string> = { current: "#22c55e", "1-30": "#6366f1", "31-60": "#f59e0b", "61-90": "#f97316", "90+": "#ef4444" };
  const bucketLabel: Record<string, string> = { current: "Current", "1-30": "1–30 days", "31-60": "31–60 days", "61-90": "61–90 days", "90+": "90+ days" };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 elev-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Accounts Receivable Aging</CardTitle></CardHeader>
          <CardContent className="h-56">
            {isLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aging?.buckets.map(b => ({ ...b, bucket: bucketLabel[b.bucket] ?? b.bucket })) ?? []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="bucket" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name="Outstanding" radius={[0, 4, 4, 0]}>
                    {aging?.buckets.map((b) => <Cell key={b.bucket} fill={bucketColors[b.bucket] ?? "#6366f1"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="elev-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-1">
            <div className="text-2xl font-bold">{INR(aging?.total ?? 0)}</div>
            <div className="text-xs text-muted-foreground">Total outstanding</div>
            <div className="border-t pt-3 space-y-2">
              {aging?.buckets.map((b) => (
                <div key={b.bucket} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: bucketColors[b.bucket] }} />
                    <span className="text-muted-foreground">{bucketLabel[b.bucket] ?? b.bucket}</span>
                  </div>
                  <span className="font-medium tabular-nums">{INR(b.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="elev-1">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-1.5"><AlertCircle className="w-4 h-4 text-red-500" />Overdue Invoice Detail</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Invoice #</TableHead><TableHead>Client</TableHead><TableHead className="text-right">Balance</TableHead><TableHead className="text-right">Days Overdue</TableHead><TableHead>Risk</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={5}><Skeleton className="h-24 w-full" /></TableCell></TableRow>
                : (aging?.detail ?? []).length === 0 ? <EmptyRow cols={5} label="No overdue invoices" />
                : (aging?.detail ?? []).map((d, i) => {
                  const risk = d.daysOverdue > 90 ? { label: "High", cls: "bg-red-500/10 text-red-500 border-red-500/20" }
                    : d.daysOverdue > 60 ? { label: "Medium", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" }
                    : { label: "Low", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-sm">{d.invoiceNumber}</TableCell>
                      <TableCell className="font-medium text-sm">{d.clientName}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{INR(d.balance)}</TableCell>
                      <TableCell className="text-right text-sm">{d.daysOverdue} days</TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${risk.cls}`}>{risk.label}</Badge></TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Inventory Tab ──────────────────────────────────────────────────────────────
function InventoryTab({ cid }: TabProps) {
  const { data: status } = useQuery<InvStatus>({ queryKey: ["r-inv-status", cid], queryFn: () => api("/v1/analytics/inventory-status") });
  const { data: products = [], isLoading } = useQuery<Product[]>({ queryKey: ["products-list", cid], queryFn: () => api("/v1/products") });
  const maxStock = Math.max(...products.map(p => p.stockLevel), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total SKUs", value: status?.totalProducts ?? 0, icon: Package, color: "bg-indigo-500/10 text-indigo-500" },
          { label: "Total Stock Value", value: INR(status?.totalValue ?? 0), icon: DollarSign, color: "bg-emerald-500/10 text-emerald-600" },
          { label: "Low Stock Items", value: status?.lowStockCount ?? 0, icon: AlertCircle, color: "bg-amber-500/10 text-amber-600" },
          { label: "Out of Stock", value: status?.outOfStockCount ?? 0, icon: AlertCircle, color: "bg-red-500/10 text-red-500" },
        ].map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      <Card className="elev-1">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-1.5"><Package className="w-4 h-4" />Product Stock Report</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>SKU</TableHead><TableHead>Product</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Stock</TableHead><TableHead>Level</TableHead><TableHead className="text-right">Unit Price</TableHead><TableHead className="text-right">Stock Value</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? Array(4).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)
                : products.length === 0 ? <EmptyRow cols={8} />
                : [...products].sort((a, b) => b.stockLevel - a.stockLevel).map((p) => {
                  const stockVal = p.stockLevel * (p.costPrice ?? p.price ?? 0);
                  const st = p.stockLevel === 0 ? { label: "Out", cls: "bg-red-500/10 text-red-500 border-red-500/20" }
                    : p.stockLevel < 10 ? { label: "Low", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" }
                    : { label: "OK", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{p.sku || "—"}</TableCell>
                      <TableCell className="font-medium text-sm">{p.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.category || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.stockLevel}</TableCell>
                      <TableCell className="w-28"><Progress value={(p.stockLevel / maxStock) * 100} className="h-1.5" /></TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{INR(p.price ?? 0)}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium">{INR(stockVal)}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${st.cls}`}>{st.label}</Badge></TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Purchasing Tab ─────────────────────────────────────────────────────────────
function PurchasingTab({ filters, cid }: TabProps) {
  const q = qs(filters);
  const { data: pipe = [] } = useQuery<Pipeline[]>({ queryKey: ["r-pipeline", cid, filters.from, filters.to], queryFn: () => api(`/v1/analytics/sales-pipeline${q}`) });
  const { data: vendors = [], isLoading } = useQuery<VendorPerf[]>({ queryKey: ["r-vendor-perf", cid, filters.from, filters.to], queryFn: () => api(`/v1/analytics/vendor-performance${q}`) });

  return (
    <div className="space-y-6">
      <Card className="elev-1">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-1.5"><Truck className="w-4 h-4" />Purchase Order Pipeline</CardTitle></CardHeader>
        <CardContent className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pipe}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Orders" radius={[4, 4, 0, 0]}>
                {pipe.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="elev-1">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-1.5"><Building2 className="w-4 h-4" />Vendor Performance</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Vendor</TableHead><TableHead className="text-right">POs</TableHead><TableHead className="text-right">Total Value</TableHead><TableHead className="text-right">On-Time Rate</TableHead><TableHead>Rating</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={5}><Skeleton className="h-24 w-full" /></TableCell></TableRow>
                : vendors.length === 0 ? <EmptyRow cols={5} />
                : vendors.map((v) => {
                  const rating = v.onTimeRate >= 90 ? { label: "Excellent", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" }
                    : v.onTimeRate >= 70 ? { label: "Good", cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" }
                    : { label: "Poor", cls: "bg-red-500/10 text-red-500 border-red-500/20" };
                  return (
                    <TableRow key={v.vendorId}>
                      <TableCell className="font-medium text-sm">{v.vendorName}</TableCell>
                      <TableCell className="text-right">{v.poCount}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{INR(v.totalValue)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress value={v.onTimeRate} className="h-1.5 w-16" />
                          <span className="text-sm tabular-nums">{v.onTimeRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${rating.cls}`}>{rating.label}</Badge></TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Fixed Assets Tab ───────────────────────────────────────────────────────────
function AssetsTab({ cid }: TabProps) {
  const { data: summary } = useQuery<AssetSummary>({ queryKey: ["fixed-assets-summary", cid], queryFn: () => api("/v1/fixed-assets/summary") });
  const { data: assets = [], isLoading } = useQuery<FixedAsset[]>({ queryKey: ["fixed-assets", cid], queryFn: () => api("/v1/fixed-assets") });
  const deprPct = summary && summary.totalCost > 0 ? Math.min(100, (summary.totalDepreciation / summary.totalCost) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Assets", value: summary?.totalAssets ?? 0, sub: `${summary?.activeAssets ?? 0} active`, icon: Landmark, color: "bg-indigo-500/10 text-indigo-500" },
          { label: "Gross Block", value: INR(summary?.totalCost ?? 0), sub: "original cost", icon: DollarSign, color: "bg-blue-500/10 text-blue-500" },
          { label: "Net Block", value: INR(summary?.totalBookValue ?? 0), sub: "current book value", icon: Building2, color: "bg-emerald-500/10 text-emerald-600" },
          { label: "Depreciation", value: INR(summary?.totalDepreciation ?? 0), sub: `${deprPct.toFixed(1)}% of gross`, icon: TrendingUp, color: "bg-amber-500/10 text-amber-600" },
        ].map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      {(summary?.byCategory ?? []).length > 0 && (
        <Card className="elev-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Category Breakdown</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Category</TableHead><TableHead className="text-right">Assets</TableHead><TableHead className="text-right">Gross Block</TableHead><TableHead className="text-right">Net Block</TableHead><TableHead className="text-right">Depreciated</TableHead><TableHead>Depr %</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(summary?.byCategory ?? []).map((c) => (
                  <TableRow key={c.category}>
                    <TableCell className="font-medium text-sm">{c.category}</TableCell>
                    <TableCell className="text-right">{c.count}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{INR(c.totalCost)}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{INR(c.totalBV)}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-amber-600">{INR(c.totalCost - c.totalBV)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={c.totalCost > 0 ? ((c.totalCost - c.totalBV) / c.totalCost) * 100 : 0} className="h-1.5 w-16" />
                        <span className="text-xs text-muted-foreground">{pct(c.totalCost - c.totalBV, c.totalCost)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="elev-1">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Full Asset Register</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Code</TableHead><TableHead>Asset Name</TableHead><TableHead>Category</TableHead><TableHead>Location</TableHead><TableHead>Purchase Date</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Book Value</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? Array(3).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)
                : assets.length === 0 ? <EmptyRow cols={8} label="No assets registered yet" />
                : assets.map((a) => {
                  const st = a.status === "Active" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : a.status === "Under Maintenance" ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : "bg-muted text-muted-foreground";
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.assetCode}</TableCell>
                      <TableCell className="font-medium text-sm">{a.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.category}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.locationName ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.purchaseDate ? format(new Date(a.purchaseDate), "d MMM yyyy") : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{INR(a.purchaseCost)}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium">{INR(a.currentBookValue)}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${st}`}>{a.status}</Badge></TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Stock Ageing Tab ────────────────────────────────────────────────────────────
const BUCKET_META = [
  { key: "0-30",  label: "Fresh",        sub: "0–30 days",   color: "#22c55e", cardCls: "bg-emerald-500/10 text-emerald-600", badgeCls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  { key: "31-60", label: "Aging",        sub: "31–60 days",  color: "#6366f1", cardCls: "bg-indigo-500/10 text-indigo-500",   badgeCls: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" },
  { key: "61-90", label: "Slow Moving",  sub: "61–90 days",  color: "#f59e0b", cardCls: "bg-amber-500/10 text-amber-600",     badgeCls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { key: "90+",   label: "Dead Stock",   sub: "90+ days",    color: "#ef4444", cardCls: "bg-red-500/10 text-red-500",         badgeCls: "bg-red-500/10 text-red-500 border-red-500/20" },
];

function StockAgeingTab({ cid }: TabProps) {
  const { data, isLoading } = useQuery<StockAgeData>({
    queryKey: ["r-stock-ageing", cid],
    queryFn: () => api("/v1/analytics/stock-ageing"),
  });

  const chartData = BUCKET_META.map((b) => ({
    label: b.label,
    qty: data?.summary[b.key]?.qty ?? 0,
    value: data?.summary[b.key]?.value ?? 0,
  }));

  const totalValue = Object.values(data?.summary ?? {}).reduce((s, b) => s + b.value, 0);
  const totalQty   = Object.values(data?.summary ?? {}).reduce((s, b) => s + b.qty,   0);

  return (
    <div className="space-y-6">
      {/* KPI banner */}
      <div className="grid grid-cols-4 gap-3">
        {BUCKET_META.map((b) => {
          const s = data?.summary[b.key];
          return (
            <Card key={b.key} className="elev-1">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: b.color }} />
                  <span className="text-xs font-medium text-muted-foreground">{b.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{b.sub}</span>
                </div>
                <div className="text-xl font-bold">{isLoading ? "—" : (s?.qty ?? 0)} <span className="text-sm font-normal text-muted-foreground">units</span></div>
                <div className="text-sm text-muted-foreground tabular-nums">{isLoading ? "—" : INR(s?.value ?? 0)}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart + totals */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 elev-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Stock Value by Age Bucket</CardTitle></CardHeader>
          <CardContent className="h-52">
            {isLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name="Value" radius={[4, 4, 0, 0]}>
                    {BUCKET_META.map((b) => <Cell key={b.key} fill={b.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="elev-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Portfolio Summary</CardTitle></CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div>
              <div className="text-2xl font-bold">{INR(totalValue)}</div>
              <div className="text-xs text-muted-foreground">Total stock value</div>
            </div>
            <div>
              <div className="text-xl font-bold">{totalQty} <span className="text-sm font-normal text-muted-foreground">units</span></div>
              <div className="text-xs text-muted-foreground">Total stock quantity</div>
            </div>
            <div className="border-t pt-3 space-y-2">
              {BUCKET_META.map((b) => {
                const s = data?.summary[b.key];
                const share = totalValue > 0 ? (((s?.value ?? 0) / totalValue) * 100).toFixed(0) : "0";
                return (
                  <div key={b.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{b.label}</span>
                      <span className="font-medium">{share}%</span>
                    </div>
                    <Progress value={Number(share)} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product-level detail */}
      <Card className="elev-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <Archive className="w-4 h-4" />Stock Ageing Detail (FIFO)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Total Qty</TableHead>
                <TableHead className="text-right text-emerald-600">0–30d</TableHead>
                <TableHead className="text-right text-indigo-500">31–60d</TableHead>
                <TableHead className="text-right text-amber-600">61–90d</TableHead>
                <TableHead className="text-right text-red-500">90+d</TableHead>
                <TableHead className="text-right">Avg Age</TableHead>
                <TableHead className="text-right">Stock Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array(3).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={11}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)
                : (data?.items ?? []).length === 0
                ? <EmptyRow cols={11} label="No stock on hand" />
                : (data?.items ?? []).map((item) => {
                    const meta = item.avgAge <= 30 ? BUCKET_META[0] : item.avgAge <= 60 ? BUCKET_META[1] : item.avgAge <= 90 ? BUCKET_META[2] : BUCKET_META[3];
                    return (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium text-sm">{item.productName}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{item.sku || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.category || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.currentStock}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-emerald-600 font-medium">{item.buckets["0-30"] || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-indigo-500 font-medium">{item.buckets["31-60"] || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-amber-600 font-medium">{item.buckets["61-90"] || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-red-500 font-medium">{item.buckets["90+"] || "—"}</TableCell>
                        <TableCell className="text-right text-sm">{item.avgAge}d</TableCell>
                        <TableCell className="text-right tabular-nums text-sm font-medium">{INR(item.totalValue)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${meta.badgeCls}`}>{meta.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Production Tab ──────────────────────────────────────────────────────────────
function ProductionTab({ cid }: TabProps) {
  const { data: orders = [], isLoading } = useQuery<ProdOrder[]>({ queryKey: ["production-orders", cid], queryFn: () => api("/v1/production-orders") });
  const byStatus = ["Draft", "In Progress", "Completed", "Cancelled"].map((s) => ({ status: s, count: orders.filter(o => o.status === s).length }));
  const completionRate = orders.length > 0 ? (orders.filter(o => o.status === "Completed").length / orders.length) * 100 : 0;
  const totalProduced = orders.filter(o => o.status === "Completed").reduce((a, o) => a + o.producedQty, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Orders", value: orders.length, icon: Factory, color: "bg-indigo-500/10 text-indigo-500" },
          { label: "In Progress", value: orders.filter(o => o.status === "In Progress").length, icon: Factory, color: "bg-blue-500/10 text-blue-500" },
          { label: "Completion Rate", value: `${completionRate.toFixed(0)}%`, icon: TrendingUp, color: "bg-emerald-500/10 text-emerald-600" },
          { label: "Units Produced", value: totalProduced, icon: Package, color: "bg-amber-500/10 text-amber-600" },
        ].map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="elev-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Orders by Status</CardTitle></CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70} label={({ status, count }) => count > 0 ? `${status}: ${count}` : ""} labelLine={false}>
                  {byStatus.map((_, i) => <Cell key={i} fill={PALETTE[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-2 elev-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">All Production Orders</CardTitle></CardHeader>
          <CardContent className="p-0 max-h-64 overflow-y-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Order #</TableHead><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Produced</TableHead><TableHead>Status</TableHead><TableHead>Planned</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {isLoading ? <TableRow><TableCell colSpan={6}><Skeleton className="h-24 w-full" /></TableCell></TableRow>
                  : orders.length === 0 ? <EmptyRow cols={6} />
                  : orders.map((o) => {
                    const st = o.status === "Completed" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : o.status === "In Progress" ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                      : o.status === "Cancelled" ? "bg-red-500/10 text-red-500 border-red-500/20"
                      : "bg-muted text-muted-foreground";
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.orderNumber}</TableCell>
                        <TableCell className="font-medium text-sm">{o.productName}</TableCell>
                        <TableCell className="text-right">{o.quantity}</TableCell>
                        <TableCell className="text-right">{o.producedQty}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-xs ${st}`}>{o.status}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{o.plannedDate ? format(new Date(o.plannedDate), "d MMM yy") : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── GSTR-1 Tab ───────────────────────────────────────────────────────────────
interface Gstr1B2bItem { invoiceNumber: string; invoiceDate: string; invoiceValue: number; placeOfSupply: string; reverseCharge: string; items: { hsnCode: string; taxableValue: number; gstRate: number; cgst: number; sgst: number; igst: number }[] }
interface Gstr1B2b { gstin: string; clientName: string; invoices: Gstr1B2bItem[] }
interface Gstr1B2cs { stateCode: string; gstRate: number; taxableValue: number; cgst: number; sgst: number; igst: number }
interface Gstr1Hsn { hsnCode: string; description: string; gstRate: number; qty: number; taxableValue: number; cgst: number; sgst: number; igst: number; total: number }
interface Gstr1Totals { invoiceCount: number; taxableValue: number; cgst: number; sgst: number; igst: number; grandTotal: number }
interface Gstr1Data { period: { from: string; to: string }; totals: Gstr1Totals; b2b: Gstr1B2b[]; b2cs: Gstr1B2cs[]; hsnSummary: Gstr1Hsn[] }

function Gstr1Tab({ filters }: { filters: Filters }) {
  const q = qs(filters);
  const { data, isLoading } = useQuery<Gstr1Data>({
    queryKey: ["gstr1", filters.from, filters.to],
    queryFn: () => api(`/v1/reports/gstr1${q}`),
  });
  const [activeSection, setActiveSection] = useState<"b2b" | "b2cs" | "hsn">("b2b");

  const downloadJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `GSTR1_${data.period.from}_${data.period.to}.json`; a.click();
  };

  const downloadCsv = () => {
    if (!data) return;
    const rows: string[][] = [];
    if (activeSection === "b2b") {
      rows.push(["GSTIN", "Client", "Invoice No", "Date", "Invoice Value", "Place of Supply", "HSN", "Taxable", "GST%", "CGST", "SGST", "IGST"]);
      for (const r of data.b2b) {
        for (const inv of r.invoices) {
          for (const item of inv.items) {
            rows.push([r.gstin, r.clientName, inv.invoiceNumber, inv.invoiceDate, String(inv.invoiceValue), inv.placeOfSupply, item.hsnCode, String(item.taxableValue), String(item.gstRate), String(item.cgst), String(item.sgst), String(item.igst)]);
          }
        }
      }
    } else if (activeSection === "b2cs") {
      rows.push(["State Code", "GST Rate", "Taxable Value", "CGST", "SGST", "IGST"]);
      for (const r of data.b2cs) rows.push([r.stateCode, String(r.gstRate), String(r.taxableValue), String(r.cgst), String(r.sgst), String(r.igst)]);
    } else {
      rows.push(["HSN Code", "Description", "GST Rate", "Taxable Value", "CGST", "SGST", "IGST", "Total"]);
      for (const r of data.hsnSummary) rows.push([r.hsnCode, r.description, String(r.gstRate), String(r.taxableValue), String(r.cgst), String(r.sgst), String(r.igst), String(r.total)]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `GSTR1_${activeSection}_${data.period.from}_${data.period.to}.csv`; a.click();
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  const t = data?.totals;

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Invoices", value: t?.invoiceCount ?? 0 },
          { label: "Taxable Value", value: INR(t?.taxableValue ?? 0) },
          { label: "CGST", value: INR(t?.cgst ?? 0) },
          { label: "SGST", value: INR(t?.sgst ?? 0) },
          { label: "IGST", value: INR(t?.igst ?? 0) },
          { label: "Grand Total", value: INR(t?.grandTotal ?? 0) },
        ].map((k) => (
          <Card key={k.label} className="elev-1">
            <CardContent className="p-3">
              <div className="text-lg font-bold leading-none">{k.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{k.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section + actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {(["b2b", "b2cs", "hsn"] as const).map((s) => (
            <Button key={s} size="sm" variant={activeSection === s ? "default" : "outline"} className="text-xs uppercase" onClick={() => setActiveSection(s)}>
              {s === "b2b" ? "B2B" : s === "b2cs" ? "B2CS" : "HSN Summary"}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={downloadCsv}><Download className="w-3.5 h-3.5 mr-1.5" />CSV</Button>
          <Button size="sm" variant="outline" onClick={downloadJson}><Download className="w-3.5 h-3.5 mr-1.5" />JSON</Button>
        </div>
      </div>

      {/* B2B section */}
      {activeSection === "b2b" && (
        <Card className="elev-1">
          <CardHeader className="pb-2"><CardTitle className="text-base">B2B — Supplies to Registered Dealers</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GSTIN</TableHead><TableHead>Client</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Taxable</TableHead>
                  <TableHead className="text-right">CGST</TableHead>
                  <TableHead className="text-right">SGST</TableHead>
                  <TableHead className="text-right">IGST</TableHead>
                  <TableHead className="text-right">Invoice Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.b2b ?? []).map((r) => {
                  const taxable = r.invoices.reduce((s, inv) => s + inv.items.reduce((a, it) => a + it.taxableValue, 0), 0);
                  const cgst = r.invoices.reduce((s, inv) => s + inv.items.reduce((a, it) => a + it.cgst, 0), 0);
                  const sgst = r.invoices.reduce((s, inv) => s + inv.items.reduce((a, it) => a + it.sgst, 0), 0);
                  const igst = r.invoices.reduce((s, inv) => s + inv.items.reduce((a, it) => a + it.igst, 0), 0);
                  const total = r.invoices.reduce((s, inv) => s + inv.invoiceValue, 0);
                  return (
                    <TableRow key={r.gstin}>
                      <TableCell className="font-mono text-xs">{r.gstin}</TableCell>
                      <TableCell className="font-medium">{r.clientName}</TableCell>
                      <TableCell className="text-right">{r.invoices.length}</TableCell>
                      <TableCell className="text-right">{INR(taxable)}</TableCell>
                      <TableCell className="text-right">{INR(cgst)}</TableCell>
                      <TableCell className="text-right">{INR(sgst)}</TableCell>
                      <TableCell className="text-right">{INR(igst)}</TableCell>
                      <TableCell className="text-right font-semibold">{INR(total)}</TableCell>
                    </TableRow>
                  );
                })}
                {!(data?.b2b.length) && <EmptyRow cols={8} label="No B2B invoices in this period" />}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* B2CS section */}
      {activeSection === "b2cs" && (
        <Card className="elev-1">
          <CardHeader className="pb-2"><CardTitle className="text-base">B2CS — Supplies to Unregistered Buyers</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State Code</TableHead>
                  <TableHead className="text-right">GST Rate</TableHead>
                  <TableHead className="text-right">Taxable Value</TableHead>
                  <TableHead className="text-right">CGST</TableHead>
                  <TableHead className="text-right">SGST</TableHead>
                  <TableHead className="text-right">IGST</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.b2cs ?? []).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono">{r.stateCode}</TableCell>
                    <TableCell className="text-right">{r.gstRate}%</TableCell>
                    <TableCell className="text-right">{INR(r.taxableValue)}</TableCell>
                    <TableCell className="text-right">{INR(r.cgst)}</TableCell>
                    <TableCell className="text-right">{INR(r.sgst)}</TableCell>
                    <TableCell className="text-right">{INR(r.igst)}</TableCell>
                  </TableRow>
                ))}
                {!(data?.b2cs.length) && <EmptyRow cols={6} label="No B2CS invoices in this period" />}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* HSN Summary */}
      {activeSection === "hsn" && (
        <Card className="elev-1">
          <CardHeader className="pb-2"><CardTitle className="text-base">HSN-wise Summary</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>HSN Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">GST%</TableHead>
                  <TableHead className="text-right">Taxable</TableHead>
                  <TableHead className="text-right">CGST</TableHead>
                  <TableHead className="text-right">SGST</TableHead>
                  <TableHead className="text-right">IGST</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.hsnSummary ?? []).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-sm">{r.hsnCode || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[220px] truncate">{r.description}</TableCell>
                    <TableCell className="text-right">{r.gstRate}%</TableCell>
                    <TableCell className="text-right">{INR(r.taxableValue)}</TableCell>
                    <TableCell className="text-right">{INR(r.cgst)}</TableCell>
                    <TableCell className="text-right">{INR(r.sgst)}</TableCell>
                    <TableCell className="text-right">{INR(r.igst)}</TableCell>
                    <TableCell className="text-right font-semibold">{INR(r.total)}</TableCell>
                  </TableRow>
                ))}
                {!(data?.hsnSummary.length) && <EmptyRow cols={8} label="No line items found for this period" />}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Reports Page ──────────────────────────────────────────────────────────
export function Reports() {
  const user = getStoredUser();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("overview");
  const [preset, setPreset] = useState<Preset>("6m");
  const [selectedCid, setSelectedCid] = useState<number | null>(null);

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["companies"],
    queryFn: () => api("/v1/companies"),
  });

  const currentCompany = companies.find(c => c.isCurrent);
  const activeCid = selectedCid ?? currentCompany?.id ?? 1;
  const filters = getRange(preset);

  const switchMutation = useMutation({
    mutationFn: (id: number) => api(`/v1/companies/${id}/switch`, { method: "POST" }),
    onSuccess: async (_data, id) => {
      setSelectedCid(id);
      const me = await api<{ id: number; name: string; email: string; role: string; companyId: number; productionEnabled?: boolean }>("/v1/auth/me");
      const stored = getStoredUser();
      if (stored) {
        setStoredUser({ ...stored, ...me });
        window.dispatchEvent(new Event("auth-user-changed"));
      }
      queryClient.invalidateQueries();
    },
  });

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "sales", label: "Sales", icon: TrendingUp },
    { id: "finance", label: "Finance", icon: FileText },
    { id: "inventory",    label: "Inventory",     icon: Package },
    { id: "stock-ageing", label: "Stock Ageing",  icon: Archive },
    { id: "purchasing",   label: "Purchasing",    icon: Truck },
    { id: "assets", label: "Fixed Assets", icon: Landmark },
    ...(user?.productionEnabled ? [{ id: "production", label: "Production", icon: Factory }] : []),
    { id: "gstr1", label: "GSTR-1", icon: Receipt },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Business intelligence across all modules</p>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md bg-card hover:bg-muted/50 transition-colors shrink-0"
        >
          <FileText className="w-3.5 h-3.5" />Print
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Company selector */}
        {companies.length > 1 && (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <Select
              value={String(activeCid)}
              onValueChange={(v) => {
                const id = Number(v);
                if (id !== activeCid) switchMutation.mutate(id);
              }}
            >
              <SelectTrigger className="h-8 w-48 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Date presets */}
        <div className="flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          {PRESETS.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={preset === p.id ? "default" : "outline"}
              className="h-8 text-xs px-3"
              onClick={() => setPreset(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Active range label */}
        {filters.from && (
          <span className="text-xs text-muted-foreground ml-1">
            {format(new Date(filters.from), "d MMM yyyy")} – {filters.to ? format(new Date(filters.to), "d MMM yyyy") : "today"}
          </span>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <TabsTrigger key={id} value={id} className="flex items-center gap-1.5 text-sm">
              <Icon className="w-3.5 h-3.5" />{label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview"   className="mt-4"><OverviewTab   filters={filters} cid={activeCid} /></TabsContent>
        <TabsContent value="sales"      className="mt-4"><SalesTab      filters={filters} cid={activeCid} /></TabsContent>
        <TabsContent value="finance"    className="mt-4"><FinanceTab    filters={filters} cid={activeCid} /></TabsContent>
        <TabsContent value="inventory"    className="mt-4"><InventoryTab  filters={filters} cid={activeCid} /></TabsContent>
        <TabsContent value="stock-ageing" className="mt-4"><StockAgeingTab filters={filters} cid={activeCid} /></TabsContent>
        <TabsContent value="purchasing"   className="mt-4"><PurchasingTab filters={filters} cid={activeCid} /></TabsContent>
        <TabsContent value="assets"     className="mt-4"><AssetsTab     filters={filters} cid={activeCid} /></TabsContent>
        {user?.productionEnabled && <TabsContent value="production" className="mt-4"><ProductionTab filters={filters} cid={activeCid} /></TabsContent>}
        <TabsContent value="gstr1" className="mt-4"><Gstr1Tab filters={filters} /></TabsContent>
      </Tabs>
    </div>
  );
}
