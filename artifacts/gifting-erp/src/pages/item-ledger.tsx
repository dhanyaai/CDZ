import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  BookOpen, Search, ArrowUp, ArrowDown, ArrowRightLeft,
  Package, Warehouse, TrendingUp, TrendingDown, BarChart3,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Product { id: number; name: string; stockLevel: number }

interface LedgerEntry {
  id: number;
  createdAt: string;
  type: string;
  qty: number;
  qtyIn: number;
  qtyOut: number;
  balance: number;
  locationId: number | null;
  locationName: string | null;
  batch: string | null;
  reference: string | null;
}

interface LedgerResponse {
  product: { id: number; name: string; sku: string | null; stockLevel: number };
  summary: { totalIn: number; totalOut: number; closingBalance: number };
  entries: LedgerEntry[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const TYPE_META: Record<string, { label: string; color: string; dir: "in" | "out" | "xfer" }> = {
  inward:       { label: "Inward",        color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", dir: "in" },
  grn:          { label: "GRN",           color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", dir: "in" },
  assembly_in:  { label: "Assembly In",   color: "bg-blue-500/10 text-blue-600 border-blue-500/20",          dir: "in" },
  transfer_in:  { label: "Transfer In",   color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",   dir: "xfer" },
  outward:      { label: "Outward",       color: "bg-red-500/10 text-red-500 border-red-500/20",            dir: "out" },
  assembly_out: { label: "Assembly Out",  color: "bg-orange-500/10 text-orange-600 border-orange-500/20",   dir: "out" },
  transfer_out: { label: "Transfer Out",  color: "bg-purple-500/10 text-purple-600 border-purple-500/20",  dir: "xfer" },
};

function TypeBadge({ type }: { type: string }) {
  const m = TYPE_META[type] ?? { label: type, color: "bg-muted text-muted-foreground border-border", dir: "out" as const };
  const Icon = m.dir === "in" ? ArrowDown : m.dir === "out" ? ArrowUp : ArrowRightLeft;
  return (
    <Badge variant="outline" className={`text-xs ${m.color} gap-1`}>
      <Icon className="w-2.5 h-2.5" />{m.label}
    </Badge>
  );
}

function QtyCell({ value, isIn }: { value: number; isIn: boolean }) {
  if (value === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={`font-semibold tabular-nums ${isIn ? "text-emerald-600" : "text-red-500"}`}>
      {isIn ? "+" : "−"}{value}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ItemLedger() {
  const [productId, setProductId] = useState<string>("none");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products-list"],
    queryFn: () => api<Product[]>("/v1/products"),
  });

  const { data: ledger, isLoading } = useQuery<LedgerResponse>({
    queryKey: ["item-ledger", productId, from, to],
    queryFn: () => {
      const params = new URLSearchParams({ productId });
      if (from) params.set("from", new Date(from).toISOString());
      if (to)   params.set("to",   new Date(to + "T23:59:59").toISOString());
      return api<LedgerResponse>(`/v1/inventory/ledger?${params}`);
    },
    enabled: productId !== "none",
  });

  // filtered search within the date-range result
  const entries = useMemo(() => {
    if (!ledger) return [];
    return ledger.entries.filter((e) => {
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (e.locationName ?? "").toLowerCase().includes(q) ||
        (e.batch ?? "").toLowerCase().includes(q) ||
        (e.reference ?? "").toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q)
      );
    });
  }, [ledger, typeFilter, search]);

  const allTypes = useMemo(() => {
    if (!ledger) return [];
    return [...new Set(ledger.entries.map((e) => e.type))];
  }, [ledger]);

  const selected = products.find((p) => p.id.toString() === productId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-primary" />Item Ledger
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Full stock movement history with running balance for any product
        </p>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1 min-w-[240px] flex-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Product</label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a product to view its ledger" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" disabled>Select product</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()} textValue={p.name}>
                  <span>{p.name}</span>
                  <span className="text-muted-foreground text-xs ml-2">({p.stockLevel} in stock)</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {allTypes.map((t) => (
                <SelectItem key={t} value={t}>{TYPE_META[t]?.label ?? t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1 min-w-[180px]">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Location, batch, reference…" value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
        </div>
      </div>

      {/* Summary cards — shown only when a product is selected */}
      {productId === "none" ? (
        <div className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-24 text-center">
          <Package className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Select a product above</p>
          <p className="text-sm text-muted-foreground mt-1">
            The complete stock movement history and running balance will appear here
          </p>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : ledger ? (
        <>
          {/* Product banner */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{ledger.product.name}</p>
              {ledger.product.sku && <p className="text-xs text-muted-foreground">SKU: {ledger.product.sku}</p>}
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-muted-foreground">Current Stock (system)</p>
              <p className="text-lg font-bold">{ledger.product.stockLevel}</p>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="elev-1">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">+{ledger.summary.totalIn}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Total received / in</p>
                </div>
              </CardContent>
            </Card>
            <Card className="elev-1">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-500">−{ledger.summary.totalOut}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Total dispatched / out</p>
                </div>
              </CardContent>
            </Card>
            <Card className="elev-1">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${ledger.summary.closingBalance < 0 ? "text-red-500" : ""}`}>
                    {ledger.summary.closingBalance}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Closing balance (period)</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ledger table */}
          <div className="border rounded-md bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Date & Time</TableHead>
                  <TableHead className="w-36">Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Reference / Batch</TableHead>
                  <TableHead className="text-right w-24">Qty In</TableHead>
                  <TableHead className="text-right w-24">Qty Out</TableHead>
                  <TableHead className="text-right w-28">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="font-medium text-muted-foreground">No movements found</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {search || typeFilter !== "all"
                          ? "Try clearing your filters"
                          : "No stock movements have been recorded for this product yet"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry, idx) => (
                    <TableRow key={entry.id}
                      className={idx === entries.length - 1 ? "font-medium bg-muted/20" : ""}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        <div>{format(new Date(entry.createdAt), "d MMM yyyy")}</div>
                        <div className="opacity-70">{format(new Date(entry.createdAt), "HH:mm")}</div>
                      </TableCell>
                      <TableCell><TypeBadge type={entry.type} /></TableCell>
                      <TableCell>
                        {entry.locationName ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Warehouse className="w-3 h-3 text-muted-foreground shrink-0" />
                            {entry.locationName}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.reference && (
                          <span className="text-muted-foreground">{entry.reference}</span>
                        )}
                        {entry.batch && (
                          <Badge variant="secondary" className="text-xs ml-1.5 font-mono">
                            {entry.batch.replace(/^XFER-/, "").substring(0, 8)}
                          </Badge>
                        )}
                        {!entry.reference && !entry.batch && (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <QtyCell value={entry.qtyIn} isIn={true} />
                      </TableCell>
                      <TableCell className="text-right">
                        <QtyCell value={entry.qtyOut} isIn={false} />
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold tabular-nums text-sm ${
                          entry.balance < 0 ? "text-red-500" : entry.balance === 0 ? "text-muted-foreground" : ""
                        }`}>
                          {entry.balance}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground text-right">
            {entries.length} entries · Balance column shows cumulative stock after each movement
          </p>
        </>
      ) : null}
    </div>
  );
}
