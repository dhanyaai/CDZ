import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowRightLeft, Plus, Search, Package, Warehouse, ArrowRight, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface TransferItem { productId: number; productName: string; quantity: number }
interface TransferGroup {
  batch: string | null;
  fromLocationId: number | null;
  fromLocationName: string;
  toLocationId: number | null;
  toLocationName: string;
  reference: string | null;
  createdAt: string;
  items: TransferItem[];
}
interface InventoryItem { productId: number; productName: string; stockLevel: number }
interface Location { id: number; name: string; code: string }

interface LineItem { productId: string; quantity: string }

export function Transfers() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  const [fromLocationId, setFromLocationId] = useState("0");
  const [toLocationId, setToLocationId] = useState("0");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<LineItem[]>([{ productId: "", quantity: "1" }]);

  const { data: transfers, isLoading } = useQuery<TransferGroup[]>({
    queryKey: ["transfers"],
    queryFn: () => api<TransferGroup[]>("/v1/inventory/transfers"),
  });

  const { data: inventory } = useQuery<InventoryItem[]>({
    queryKey: ["inventory-list"],
    queryFn: () => api<InventoryItem[]>("/v1/inventory"),
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: () => api<Location[]>("/v1/locations"),
  });

  const locationOptions = [{ id: 0, name: "Unassigned" }, ...(locations ?? [])];

  const resetForm = () => {
    setFromLocationId("0");
    setToLocationId("0");
    setReference("");
    setLines([{ productId: "", quantity: "1" }]);
  };

  const addLine = () => setLines((l) => [...l, { productId: "", quantity: "1" }]);
  const removeLine = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof LineItem, value: string) =>
    setLines((l) => l.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));

  const canSubmit =
    fromLocationId !== toLocationId &&
    lines.length > 0 &&
    lines.every((l) => l.productId && Number(l.quantity) > 0);

  const createTransfer = useMutation({
    mutationFn: () =>
      api("/v1/inventory/bulk-transfer", {
        method: "POST",
        body: JSON.stringify({
          fromLocationId: fromLocationId === "0" ? undefined : Number(fromLocationId),
          toLocationId: toLocationId === "0" ? undefined : Number(toLocationId),
          items: lines.map((l) => ({ productId: Number(l.productId), quantity: Number(l.quantity) })),
          reference: reference || undefined,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transfers"] });
      qc.invalidateQueries({ queryKey: ["inventory-list"] });
      qc.invalidateQueries({ queryKey: ["inventory", "by-location"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Stock transferred successfully" });
    },
    onError: (e: Error) =>
      toast({ title: "Transfer failed", description: e.message, variant: "destructive" }),
  });

  const toggleExpand = (batch: string | null) => {
    const key = batch ?? "__no_batch__";
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filtered = (transfers ?? []).filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.fromLocationName.toLowerCase().includes(q) ||
      t.toLocationName.toLowerCase().includes(q) ||
      (t.reference ?? "").toLowerCase().includes(q) ||
      (t.items ?? []).some((i) => i.productName.toLowerCase().includes(q))
    );
  });

  const totalTransfers = transfers?.length ?? 0;
  const totalUnits = transfers?.reduce((s, t) => s + (t.items ?? []).reduce((is, i) => is + i.quantity, 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stock Transfers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Move inventory between warehouse locations</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />New Transfer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="elev-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalTransfers}</div>
              <div className="text-xs text-muted-foreground">Total Transfers</div>
            </div>
          </CardContent>
        </Card>
        <Card className="elev-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalUnits.toLocaleString("en-IN")}</div>
              <div className="text-xs text-muted-foreground">Units Transferred</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by product, location, reference..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Transfer History */}
      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>From → To</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Total Qty</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <Warehouse className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="font-medium text-muted-foreground">No transfers yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Use "New Transfer" to move stock between locations</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t, idx) => {
                const key = t.batch ?? `__${idx}`;
                const expanded = expandedBatches.has(key);
                const items = t.items ?? [];
                const totalQty = items.reduce((s, i) => s + i.quantity, 0);
                return (
                  <>
                    <TableRow
                      key={key}
                      className={items.length > 1 ? "cursor-pointer hover:bg-muted/30" : ""}
                      onClick={() => items.length > 1 && toggleExpand(t.batch)}
                    >
                      <TableCell className="whitespace-nowrap text-muted-foreground text-sm align-top pt-3">
                        {format(new Date(t.createdAt), "MMM d, yyyy")}
                        <div className="text-xs opacity-60">{format(new Date(t.createdAt), "HH:mm")}</div>
                      </TableCell>
                      <TableCell className="align-top pt-3">
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <Badge variant="outline" className="text-xs bg-red-500/5 border-red-500/20 text-red-500 shrink-0">
                            <Warehouse className="w-3 h-3 mr-1" />{t.fromLocationName}
                          </Badge>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <Badge variant="outline" className="text-xs bg-emerald-500/5 border-emerald-500/20 text-emerald-500 shrink-0">
                            <Warehouse className="w-3 h-3 mr-1" />{t.toLocationName}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="align-top pt-3">
                        {items.length === 1 ? (
                          <span className="text-sm">{items[0].productName}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">{items.length} products</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums align-top pt-3">{totalQty}</TableCell>
                      <TableCell className="text-muted-foreground text-sm align-top pt-3">{t.reference ?? "—"}</TableCell>
                      <TableCell className="align-top pt-2">
                        {items.length > 1 && (
                          expanded
                            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </TableCell>
                    </TableRow>
                    {expanded && items.map((item, ii) => (
                      <TableRow key={`${key}-item-${ii}`} className="bg-muted/20 border-t-0">
                        <TableCell />
                        <TableCell />
                        <TableCell className="py-1.5 pl-6 text-sm text-muted-foreground">
                          <Package className="w-3 h-3 inline mr-1.5 opacity-60" />
                          {item.productName}
                        </TableCell>
                        <TableCell className="text-right tabular-nums py-1.5 text-sm font-medium">{item.quantity}</TableCell>
                        <TableCell colSpan={2} />
                      </TableRow>
                    ))}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Bulk Transfer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Stock Transfer</DialogTitle>
            <p className="text-sm text-muted-foreground">Add multiple products to transfer in one operation.</p>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Locations */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">From Location</label>
                <Select value={fromLocationId} onValueChange={setFromLocationId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {locationOptions.map((l) => (
                      <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">To Location</label>
                <Select value={toLocationId} onValueChange={setToLocationId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {locationOptions.map((l) => (
                      <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {fromLocationId === toLocationId && (
              <p className="text-xs text-amber-500">Source and destination must be different locations.</p>
            )}

            {/* Line Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Products *</label>
                <Button type="button" size="sm" variant="outline" onClick={addLine} className="h-7 text-xs px-2">
                  <Plus className="w-3 h-3 mr-1" />Add Row
                </Button>
              </div>

              <div className="rounded-md border divide-y">
                {/* Header */}
                <div className="grid grid-cols-[1fr_100px_32px] gap-2 px-3 py-1.5 bg-muted/40 text-xs text-muted-foreground font-medium">
                  <span>Product</span><span className="text-center">Qty</span><span />
                </div>
                {lines.map((line, i) => {
                  const selected = inventory?.find((p) => p.productId.toString() === line.productId);
                  return (
                    <div key={i} className="grid grid-cols-[1fr_100px_32px] gap-2 items-center px-3 py-2">
                      <Select value={line.productId} onValueChange={(v) => updateLine(i, "productId", v)}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {(inventory ?? []).map((p) => (
                            <SelectItem key={p.productId} value={p.productId.toString()}>
                              {p.productName}
                              <span className="text-muted-foreground ml-1 text-xs">({p.stockLevel})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="1"
                        max={selected?.stockLevel}
                        value={line.quantity}
                        onChange={(e) => updateLine(i, "quantity", e.target.value)}
                        className="h-8 text-sm text-center"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        onClick={() => removeLine(i)}
                        disabled={lines.length === 1}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Stock available shown in brackets next to each product.</p>
            </div>

            {/* Reference */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Reference / Notes</label>
              <Input
                placeholder="e.g. Monthly rebalancing"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              onClick={() => createTransfer.mutate()}
              disabled={!canSubmit || createTransfer.isPending}
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Transfer {lines.filter((l) => l.productId).length} Product{lines.filter((l) => l.productId).length !== 1 ? "s" : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
