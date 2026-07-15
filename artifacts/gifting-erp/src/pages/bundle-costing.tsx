import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Package, TrendingUp, DollarSign, BarChart2, ChevronDown, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface CostingItem {
  productId: number;
  productName: string;
  category: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  lineCost: number;
  lineSelling: number;
}

interface BundleCosting {
  id: number;
  name: string;
  occasion: string | null;
  imageUrl: string | null;
  items: CostingItem[];
  totalCost: number;
  totalSelling: number;
  grossMargin: number;
  marginPct: number;
}

const fmt = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pct = (n: number) => n.toFixed(1) + "%";

function marginBadge(pct: number) {
  if (pct >= 30) return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">{pct.toFixed(1)}%</Badge>;
  if (pct >= 15) return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0">{pct.toFixed(1)}%</Badge>;
  return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0">{pct.toFixed(1)}%</Badge>;
}

export function BundleCosting() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery<BundleCosting[]>({
    queryKey: ["bundles-costing"],
    queryFn: () => api<BundleCosting[]>("/v1/bundles/costing"),
  });

  const bundles = data ?? [];

  const filtered = bundles.filter(
    (b) => b.name.toLowerCase().includes(search.toLowerCase()) || (b.occasion ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const totalCost = bundles.reduce((s, b) => s + b.totalCost, 0);
  const totalSelling = bundles.reduce((s, b) => s + b.totalSelling, 0);
  const avgMargin = bundles.length > 0 ? bundles.reduce((s, b) => s + b.marginPct, 0) / bundles.length : 0;
  const bestBundle = bundles.length > 0 ? [...bundles].sort((a, b) => b.marginPct - a.marginPct)[0] : null;

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bundle Costing</h1>
          <p className="text-muted-foreground mt-1">Cost vs selling price breakdown for all gift bundles</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> Total Bundles
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isLoading ? <Skeleton className="h-7 w-12" /> : <p className="text-2xl font-bold">{bundles.length}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Total Cost Value
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isLoading ? <Skeleton className="h-7 w-24" /> : <p className="text-2xl font-bold">{fmt(totalCost)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Total Selling Value
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isLoading ? <Skeleton className="h-7 w-24" /> : <p className="text-2xl font-bold">{fmt(totalSelling)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5" /> Avg Gross Margin
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">{pct(avgMargin)}</p>
                {bestBundle && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">Best: {bestBundle.name} ({pct(bestBundle.marginPct)})</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search bundles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Costing table */}
      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Bundle</TableHead>
              <TableHead>Occasion</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Cost Price</TableHead>
              <TableHead className="text-right">Selling Price</TableHead>
              <TableHead className="text-right">Gross Margin ₹</TableHead>
              <TableHead className="text-right">Margin %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  No bundles found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((bundle) => {
                const isOpen = expanded.has(bundle.id);
                return (
                  <>
                    <TableRow
                      key={bundle.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => toggleExpand(bundle.id)}
                    >
                      <TableCell className="pr-0">
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {bundle.imageUrl ? (
                            <img src={bundle.imageUrl} alt={bundle.name} className="w-8 h-8 rounded object-cover border border-border shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          {bundle.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{bundle.occasion ?? "—"}</TableCell>
                      <TableCell className="text-right">{bundle.items.length}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(bundle.totalCost)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(bundle.totalSelling)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-emerald-600 dark:text-emerald-400">
                        {fmt(bundle.grossMargin)}
                      </TableCell>
                      <TableCell className="text-right">{marginBadge(bundle.marginPct)}</TableCell>
                    </TableRow>

                    {isOpen && (
                      <TableRow key={`${bundle.id}-detail`} className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={8} className="p-0">
                          <div className="px-6 py-4">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Item-level Cost Breakdown</p>
                            <div className="border rounded-md overflow-hidden bg-card">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/50">
                                    <TableHead>Product</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Cost / Unit</TableHead>
                                    <TableHead className="text-right">Sell / Unit</TableHead>
                                    <TableHead className="text-right">Line Cost</TableHead>
                                    <TableHead className="text-right">Line Selling</TableHead>
                                    <TableHead className="text-right">Item Margin %</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {bundle.items.length === 0 ? (
                                    <TableRow>
                                      <TableCell colSpan={8} className="text-center py-4 text-muted-foreground text-sm">No items</TableCell>
                                    </TableRow>
                                  ) : (
                                    bundle.items.map((item) => {
                                      const itemMargin = item.lineSelling > 0 ? ((item.lineSelling - item.lineCost) / item.lineSelling) * 100 : 0;
                                      return (
                                        <TableRow key={item.productId}>
                                          <TableCell className="font-medium text-sm">{item.productName}</TableCell>
                                          <TableCell>
                                            {item.category ? (
                                              <Badge variant="outline" className="text-xs">{item.category}</Badge>
                                            ) : "—"}
                                          </TableCell>
                                          <TableCell className="text-right">{item.quantity}</TableCell>
                                          <TableCell className="text-right font-mono text-sm">{fmt(item.costPrice)}</TableCell>
                                          <TableCell className="text-right font-mono text-sm">{fmt(item.sellingPrice)}</TableCell>
                                          <TableCell className="text-right font-mono text-sm">{fmt(item.lineCost)}</TableCell>
                                          <TableCell className="text-right font-mono text-sm">{fmt(item.lineSelling)}</TableCell>
                                          <TableCell className="text-right">{marginBadge(itemMargin)}</TableCell>
                                        </TableRow>
                                      );
                                    })
                                  )}
                                </TableBody>
                              </Table>
                            </div>

                            {/* Footer totals row */}
                            <div className="mt-3 flex justify-end">
                              <div className="grid grid-cols-3 gap-6 text-sm text-right">
                                <div>
                                  <p className="text-xs text-muted-foreground">Total Cost</p>
                                  <p className="font-semibold font-mono">{fmt(bundle.totalCost)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Total Selling</p>
                                  <p className="font-semibold font-mono">{fmt(bundle.totalSelling)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Gross Margin</p>
                                  <p className={cn("font-semibold font-mono", bundle.grossMargin >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600")}>
                                    {fmt(bundle.grossMargin)} ({pct(bundle.marginPct)})
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
