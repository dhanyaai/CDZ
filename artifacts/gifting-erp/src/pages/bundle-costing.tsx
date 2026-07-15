import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useListProducts } from "@workspace/api-client-react";
import { api } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Package, TrendingUp, DollarSign, BarChart2,
  ChevronDown, ChevronRight, Search, Wand2, CheckCircle2,
} from "lucide-react";
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

const fmtShort = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

const pct = (n: number) => n.toFixed(1) + "%";

function MarginBadge({ value }: { value: number }) {
  if (value >= 30) return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">{value.toFixed(1)}%</Badge>;
  if (value >= 15) return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0">{value.toFixed(1)}%</Badge>;
  return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0">{value.toFixed(1)}%</Badge>;
}

export function BundleCosting() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Smart Suggest state
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [suggestResult, setSuggestResult] = useState<null | {
    items: Array<{ productId: number; productName: string; quantity: number; costPrice: number; sellingPrice: number }>;
    totalCost: number;
    totalSelling: number;
    budgetUtilization: number;
    withinRange: boolean;
  }>(null);

  const { data: products } = useListProducts();

  const suggestCosting = useMutation({
    mutationFn: (body: { maxBudget: number; minBudget?: number; categories?: string[] }) =>
      api<typeof suggestResult>("/v1/bundles/suggest-costing", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (res) => setSuggestResult(res),
  });

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

  const categoryOptions = Array.from(
    new Set((products ?? []).map((p: any) => p.category).filter(Boolean))
  ).sort() as string[];

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
    setSuggestResult(null);
  };

  const handleSuggest = () => {
    if (!maxBudget) return;
    setSuggestResult(null);
    suggestCosting.mutate({
      maxBudget: Number(maxBudget),
      ...(minBudget ? { minBudget: Number(minBudget) } : {}),
      ...(selectedCategories.length > 0 ? { categories: selectedCategories } : {}),
    });
  };

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

      {/* Smart Suggest */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            Smart Suggest
          </CardTitle>
          <p className="text-sm text-muted-foreground">Set a budget range, pick categories, then click Suggest Bundle to see matching products</p>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Controls row */}
          <div className="flex flex-wrap items-end gap-4">

            {/* Budget range */}
            <div className="space-y-1.5 shrink-0">
              <label className="text-xs font-semibold text-foreground">Budget Range (₹)</label>
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Min</p>
                  <Input
                    type="number"
                    min="0"
                    value={minBudget}
                    onChange={(e) => { setMinBudget(e.target.value); setSuggestResult(null); }}
                    placeholder="e.g. 500"
                    className="h-9 w-32"
                  />
                </div>
                <span className="text-muted-foreground mt-5">—</span>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Max *</p>
                  <Input
                    type="number"
                    min="1"
                    value={maxBudget}
                    onChange={(e) => { setMaxBudget(e.target.value); setSuggestResult(null); }}
                    placeholder="e.g. 2000"
                    className="h-9 w-32"
                  />
                </div>
              </div>
            </div>

            {/* Vertical divider */}
            <div className="hidden lg:block w-px h-16 bg-border shrink-0" />

            {/* Category pills */}
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-foreground">Item Categories</label>
                {selectedCategories.length > 0 && (
                  <button
                    className="text-[10px] text-muted-foreground hover:text-foreground underline"
                    onClick={() => { setSelectedCategories([]); setSuggestResult(null); }}
                  >
                    Clear
                  </button>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {selectedCategories.length === 0 ? "— all" : `${selectedCategories.length} selected`}
                </span>
              </div>
              {categoryOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No categories found in catalog</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {categoryOptions.map((cat) => {
                    const active = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"}`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Suggest button */}
            <Button
              onClick={handleSuggest}
              disabled={!maxBudget || suggestCosting.isPending}
              className="shrink-0 h-9 px-6"
            >
              {suggestCosting.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Analysing…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Wand2 className="w-3.5 h-3.5" />Suggest Bundle
                </span>
              )}
            </Button>
          </div>

          {/* Results */}
          {suggestResult && (
            <div className={`rounded-lg border-2 p-4 space-y-3 ${suggestResult.withinRange ? "border-green-500/40 bg-green-50/30 dark:bg-green-950/10" : "border-amber-400/40 bg-amber-50/30 dark:bg-amber-950/10"}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${suggestResult.withinRange ? "text-green-600" : "text-amber-500"}`} />
                  <span className="font-semibold text-sm">Suggested Products</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span>Purchase Cost: <strong className="text-foreground">{fmtShort(suggestResult.totalCost)}</strong></span>
                  <span>Selling Value: <strong className="text-foreground">{fmtShort(suggestResult.totalSelling)}</strong></span>
                  <span>Budget used: <strong className={suggestResult.budgetUtilization >= 80 ? "text-green-600" : "text-amber-600"}>{Math.round(suggestResult.budgetUtilization)}%</strong></span>
                </div>
              </div>

              {suggestResult.items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No matching products found for this budget and category selection.</p>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="w-28 text-center">Cost Price</TableHead>
                        <TableHead className="w-16 text-center">Qty</TableHead>
                        <TableHead className="w-32 text-right">Line Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suggestResult.items.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="text-center">{fmtShort(item.costPrice)}</TableCell>
                          <TableCell className="text-center font-semibold">{item.quantity}</TableCell>
                          <TableCell className="text-right font-medium">{fmtShort(item.costPrice * item.quantity)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableHeader>
                      <TableRow>
                        <TableHead colSpan={3} className="text-xs">Total Purchase Cost</TableHead>
                        <TableHead className="text-right font-bold text-foreground">{fmtShort(suggestResult.totalCost)}</TableHead>
                      </TableRow>
                    </TableHeader>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
                      <TableCell className="text-right"><MarginBadge value={bundle.marginPct} /></TableCell>
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
                                          <TableCell className="text-right"><MarginBadge value={itemMargin} /></TableCell>
                                        </TableRow>
                                      );
                                    })
                                  )}
                                </TableBody>
                              </Table>
                            </div>

                            {/* Footer totals */}
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
