import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { format } from "date-fns";
import {
  TrendingUp, DollarSign, ShoppingCart, AlertCircle, Package, Users,
  Building2, Factory, BarChart3, FileText, Truck, Landmark,
} from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────
const INR = (n: number) => `₹${(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const pct = (n: number, d: number) => (d ? ((n / d) * 100).toFixed(1) : "0");
const fmtMonth = (m: string) => { try { return format(new Date(m + "-01"), "MMM yy"); } catch { return m; } };

const PALETTE = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#14b8a6", "#f97316"];

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-foreground">{children}</h2>;
}

function EmptyRow({ cols, label }: { cols: number; label?: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="text-center py-10 text-muted-foreground">
        {label ?? "No data available"}
      </TableCell>
    </TableRow>
  );
}

// ─── types ─────────────────────────────────────────────────────────────────────
interface Dashboard { totalClients: number; activeOrders: number; overdueInvoices: number; revenueThisMonth: number; totalRevenue: number; lowStockItems: number; pendingPOs: number }
interface RevenueTrend { month: string; revenue: number; orders: number }
interface Pipeline { status: string; count: number; value: number }
interface TopClient { clientId: number; clientName: string; orders: number; revenue: number }
interface TopProduct { productId: number; productName: string; quantity: number; revenue: number }
interface ArAging { buckets: { bucket: string; value: number }[]; total: number; detail: { clientName: string; invoiceNumber: string; amount: number; days: number }[] }
interface VendorPerf { vendorId: number; vendorName: string; poCount: number; totalValue: number; onTimeRate: number }
interface InvStatus { totalProducts: number; lowStockCount: number; outOfStockCount: number; totalValue: number }
interface Product { id: number; name: string; category: string; stockLevel: number; price: number; costPrice: number; sku: string }
interface AssetSummary { totalAssets: number; activeAssets: number; totalCost: number; totalBookValue: number; totalDepreciation: number; byCategory: { category: string; count: number; totalCost: number; totalBV: number }[] }
interface FixedAsset { id: number; assetCode: string; name: string; category: string; purchaseCost: number; currentBookValue: number; totalDepreciation: number; status: string; purchaseDate: string; locationName: string | null }
interface ProdOrder { id: number; orderNumber: string; productName: string; quantity: number; producedQty: number; status: string; plannedDate: string | null }

// ─── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab() {
  const { data: dash, isLoading: dL } = useQuery<Dashboard>({ queryKey: ["r-dashboard"], queryFn: () => api("/v1/analytics/dashboard") });
  const { data: trend = [], isLoading: tL } = useQuery<RevenueTrend[]>({ queryKey: ["r-trend"], queryFn: () => api("/v1/analytics/revenue-trend") });
  const { data: pipe = [], isLoading: pL } = useQuery<Pipeline[]>({ queryKey: ["r-pipeline"], queryFn: () => api("/v1/analytics/sales-pipeline") });

  const kpis = [
    { label: "Revenue This Month", value: INR(dash?.revenueThisMonth ?? 0), icon: DollarSign, color: "bg-indigo-500/10 text-indigo-500" },
    { label: "Total Revenue", value: INR(dash?.totalRevenue ?? 0), sub: "all time", icon: TrendingUp, color: "bg-emerald-500/10 text-emerald-600" },
    { label: "Active Orders", value: dash?.activeOrders ?? 0, icon: ShoppingCart, color: "bg-blue-500/10 text-blue-500" },
    { label: "Total Clients", value: dash?.totalClients ?? 0, icon: Users, color: "bg-violet-500/10 text-violet-500" },
    { label: "Overdue Invoices", value: dash?.overdueInvoices ?? 0, icon: AlertCircle, color: "bg-red-500/10 text-red-500" },
    { label: "Low Stock Items", value: dash?.lowStockItems ?? 0, icon: Package, color: "bg-amber-500/10 text-amber-600" },
    { label: "Pending POs", value: dash?.pendingPOs ?? 0, icon: Truck, color: "bg-teal-500/10 text-teal-600" },
    { label: "Pending Assembly", value: (dash as any)?.pendingAssembly ?? 0, icon: Factory, color: "bg-orange-500/10 text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-3">
        {dL ? Array(8).fill(0).map((_, i) => <Card key={i} className="elev-1"><CardContent className="p-4"><Skeleton className="h-14 w-full" /></CardContent></Card>)
          : kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 elev-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Revenue Trend (last 6 months)</CardTitle></CardHeader>
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
                    <Progress value={p.count > 0 ? Math.max(8, (p.count / Math.max(...pipe.map(x => x.count), 1)) * 100) : 0}
                      className="h-1.5" style={{ "--progress-bg": PALETTE[i] } as React.CSSProperties} />
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
function SalesTab() {
  const { data: clients = [], isLoading: cL } = useQuery<TopClient[]>({ queryKey: ["r-top-clients"], queryFn: () => api("/v1/analytics/top-clients") });
  const { data: products = [], isLoading: pL } = useQuery<TopProduct[]>({ queryKey: ["r-top-products"], queryFn: () => api("/v1/analytics/top-products") });
  const { data: trend = [] } = useQuery<RevenueTrend[]>({ queryKey: ["r-trend"], queryFn: () => api("/v1/analytics/revenue-trend") });

  const totalClientRev = clients.reduce((a, c) => a + c.revenue, 0);
  const totalProductRev = products.reduce((a, p) => a + p.revenue, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Top Clients */}
        <Card className="elev-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-1.5"><Users className="w-4 h-4 text-indigo-500" />Top Clients by Revenue</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {cL ? <TableRow><TableCell colSpan={5}><Skeleton className="h-32 w-full" /></TableCell></TableRow>
                  : clients.length === 0 ? <EmptyRow cols={5} />
                  : clients.slice(0, 10).map((c, i) => (
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

        {/* Top Products */}
        <Card className="elev-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-1.5"><Package className="w-4 h-4 text-emerald-500" />Top Products by Revenue</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {pL ? <TableRow><TableCell colSpan={5}><Skeleton className="h-32 w-full" /></TableCell></TableRow>
                  : products.length === 0 ? <EmptyRow cols={5} />
                  : products.slice(0, 10).map((p, i) => (
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

      {/* Monthly Revenue Table */}
      <Card className="elev-1">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Monthly Revenue Breakdown</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead>Trend</TableHead>
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
                        {delta != null ? (
                          <span className={`text-xs font-medium ${delta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {delta >= 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}%
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
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
function FinanceTab() {
  const { data: aging, isLoading } = useQuery<ArAging>({ queryKey: ["r-ar-aging"], queryFn: () => api("/v1/analytics/ar-aging") });

  const bucketColors: Record<string, string> = {
    current: "#22c55e", "1-30": "#6366f1", "31-60": "#f59e0b", "61-90": "#f97316", "90+": "#ef4444",
  };
  const bucketLabel: Record<string, string> = {
    current: "Current", "1-30": "1–30 days", "31-60": "31–60 days", "61-90": "61–90 days", "90+": "90+ days",
  };

  return (
    <div className="space-y-6">
      {/* AR Aging Overview */}
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
                    {aging?.buckets.map((b) => (
                      <Cell key={b.bucket} fill={bucketColors[b.bucket] ?? "#6366f1"} />
                    ))}
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

      {/* Overdue Detail */}
      <Card className="elev-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-red-500" />Overdue Invoice Detail
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Days Overdue</TableHead>
              <TableHead>Risk</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={5}><Skeleton className="h-24 w-full" /></TableCell></TableRow>
                : (aging?.detail ?? []).length === 0 ? <EmptyRow cols={5} label="No overdue invoices" />
                : (aging?.detail ?? []).map((d, i) => {
                  const risk = d.days > 90 ? { label: "High", cls: "bg-red-500/10 text-red-500 border-red-500/20" }
                    : d.days > 60 ? { label: "Medium", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" }
                    : { label: "Low", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-sm">{d.invoiceNumber}</TableCell>
                      <TableCell className="font-medium text-sm">{d.clientName}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{INR(d.amount)}</TableCell>
                      <TableCell className="text-right text-sm">{d.days} days</TableCell>
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
function InventoryTab() {
  const { data: status } = useQuery<InvStatus>({ queryKey: ["r-inv-status"], queryFn: () => api("/v1/analytics/inventory-status") });
  const { data: products = [], isLoading } = useQuery<Product[]>({ queryKey: ["products-list"], queryFn: () => api("/v1/products") });

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
              <TableHead>SKU</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Stock Qty</TableHead>
              <TableHead>Level</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Stock Value</TableHead>
              <TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? Array(4).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)
                : products.length === 0 ? <EmptyRow cols={8} />
                : [...products].sort((a, b) => b.stockLevel - a.stockLevel).map((p) => {
                  const stockVal = p.stockLevel * (p.costPrice ?? p.price ?? 0);
                  const stockPct = (p.stockLevel / maxStock) * 100;
                  const st = p.stockLevel === 0 ? { label: "Out", cls: "bg-red-500/10 text-red-500 border-red-500/20" }
                    : p.stockLevel < 10 ? { label: "Low", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" }
                    : { label: "OK", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{p.sku || "—"}</TableCell>
                      <TableCell className="font-medium text-sm">{p.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.category || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.stockLevel}</TableCell>
                      <TableCell className="w-28"><Progress value={stockPct} className="h-1.5" /></TableCell>
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
function PurchasingTab() {
  const { data: pipe = [] } = useQuery<Pipeline[]>({ queryKey: ["r-pipeline"], queryFn: () => api("/v1/analytics/sales-pipeline") });
  const { data: vendors = [], isLoading } = useQuery<VendorPerf[]>({ queryKey: ["r-vendor-perf"], queryFn: () => api("/v1/analytics/vendor-performance") });

  return (
    <div className="space-y-6">
      {/* PO Pipeline */}
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

      {/* Vendor Performance */}
      <Card className="elev-1">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-1.5"><Building2 className="w-4 h-4" />Vendor Performance</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">POs</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
              <TableHead className="text-right">On-Time Rate</TableHead>
              <TableHead>Rating</TableHead>
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
                          <span className="text-sm tabular-nums">{v.onTimeRate.toFixed(0)}%</span>
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
function AssetsTab() {
  const { data: summary } = useQuery<AssetSummary>({ queryKey: ["fixed-assets-summary"], queryFn: () => api("/v1/fixed-assets/summary") });
  const { data: assets = [], isLoading } = useQuery<FixedAsset[]>({ queryKey: ["fixed-assets"], queryFn: () => api("/v1/fixed-assets") });

  const deprPct = summary && summary.totalCost > 0
    ? Math.min(100, (summary.totalDepreciation / summary.totalCost) * 100) : 0;

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

      {/* By Category */}
      {(summary?.byCategory ?? []).length > 0 && (
        <Card className="elev-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Category Breakdown</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Assets</TableHead>
                <TableHead className="text-right">Gross Block</TableHead>
                <TableHead className="text-right">Net Block</TableHead>
                <TableHead className="text-right">Depreciated</TableHead>
                <TableHead>Depr %</TableHead>
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

      {/* Asset Register */}
      <Card className="elev-1">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Full Asset Register</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Asset Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Purchase Date</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Book Value</TableHead>
              <TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? Array(3).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)
                : assets.length === 0 ? <EmptyRow cols={8} label="No assets registered yet" />
                : assets.map((a) => {
                  const st = a.status === "Active" ? { cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" }
                    : a.status === "Under Maintenance" ? { cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" }
                    : { cls: "bg-muted text-muted-foreground" };
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.assetCode}</TableCell>
                      <TableCell className="font-medium text-sm">{a.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.category}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.locationName ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.purchaseDate ? format(new Date(a.purchaseDate), "d MMM yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{INR(a.purchaseCost)}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium">{INR(a.currentBookValue)}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${st.cls}`}>{a.status}</Badge></TableCell>
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
function ProductionTab() {
  const { data: orders = [], isLoading } = useQuery<ProdOrder[]>({ queryKey: ["production-orders"], queryFn: () => api("/v1/production-orders") });

  const byStatus = ["Draft", "In Progress", "Completed", "Cancelled"].map((s) => ({
    status: s, count: orders.filter(o => o.status === s).length,
  }));

  const completionRate = orders.length > 0
    ? (orders.filter(o => o.status === "Completed").length / orders.length) * 100 : 0;

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
                <TableHead>Order #</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Produced</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Planned</TableHead>
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

// ─── Main Reports Page ──────────────────────────────────────────────────────────
export function Reports() {
  const user = getStoredUser();
  const [tab, setTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "sales", label: "Sales", icon: TrendingUp },
    { id: "finance", label: "Finance", icon: FileText },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "purchasing", label: "Purchasing", icon: Truck },
    { id: "assets", label: "Fixed Assets", icon: Landmark },
    ...(user?.productionEnabled ? [{ id: "production", label: "Production", icon: Factory }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Business intelligence across all modules</p>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md bg-card hover:bg-muted/50 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />Print / Export
        </button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <TabsTrigger key={id} value={id} className="flex items-center gap-1.5 text-sm">
              <Icon className="w-3.5 h-3.5" />{label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-4"><OverviewTab /></TabsContent>
        <TabsContent value="sales" className="mt-4"><SalesTab /></TabsContent>
        <TabsContent value="finance" className="mt-4"><FinanceTab /></TabsContent>
        <TabsContent value="inventory" className="mt-4"><InventoryTab /></TabsContent>
        <TabsContent value="purchasing" className="mt-4"><PurchasingTab /></TabsContent>
        <TabsContent value="assets" className="mt-4"><AssetsTab /></TabsContent>
        {user?.productionEnabled && <TabsContent value="production" className="mt-4"><ProductionTab /></TabsContent>}
      </Tabs>
    </div>
  );
}
