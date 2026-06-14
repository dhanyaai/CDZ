import { useState, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  SendHorizonal, PackageCheck, Plus, Search, Package,
  Warehouse, ArrowRight, Trash2, ChevronDown, ChevronUp, Clock, CheckCircle2,
} from "lucide-react";

interface TransferItem { productId: number; productName: string; quantity: number }
interface TransferGroup {
  batch: string | null;
  status: "in_transit" | "completed";
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

  const [tab, setTab] = useState<"in_transit" | "completed">("in_transit");
  const [search, setSearch] = useState("");
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  // Send dialog state
  const [sendOpen, setSendOpen] = useState(false);
  const [sendFrom, setSendFrom] = useState("0");
  const [sendRef, setSendRef] = useState("");
  const [sendLines, setSendLines] = useState<LineItem[]>([{ productId: "", quantity: "1" }]);

  // Receive dialog state
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receivingTransfer, setReceivingTransfer] = useState<TransferGroup | null>(null);
  const [receiveTo, setReceiveTo] = useState("0");

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

  // ── Send helpers ─────────────────────────────────────────────────────────────
  const resetSend = () => { setSendFrom("0"); setSendRef(""); setSendLines([{ productId: "", quantity: "1" }]); };
  const addSendLine = () => setSendLines((l) => [...l, { productId: "", quantity: "1" }]);
  const removeSendLine = (i: number) => setSendLines((l) => l.filter((_, idx) => idx !== i));
  const updateSendLine = (i: number, field: keyof LineItem, value: string) =>
    setSendLines((l) => l.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));

  const canSend = sendLines.length > 0 && sendLines.every((l) => l.productId && Number(l.quantity) > 0);

  const sendMutation = useMutation({
    mutationFn: () => api("/v1/inventory/send-transfer", {
      method: "POST",
      body: JSON.stringify({
        fromLocationId: sendFrom === "0" ? undefined : Number(sendFrom),
        items: sendLines.map((l) => ({ productId: Number(l.productId), quantity: Number(l.quantity) })),
        reference: sendRef || undefined,
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transfers"] });
      qc.invalidateQueries({ queryKey: ["inventory-list"] });
      qc.invalidateQueries({ queryKey: ["inventory", "by-location"] });
      setSendOpen(false); resetSend();
      setTab("in_transit");
      toast({ title: "Transfer dispatched", description: "Stock is now in transit. Confirm receipt when it arrives." });
    },
    onError: (e: Error) => toast({ title: "Send failed", description: e.message, variant: "destructive" }),
  });

  // ── Receive helpers ───────────────────────────────────────────────────────────
  const openReceive = (t: TransferGroup) => { setReceivingTransfer(t); setReceiveTo("0"); setReceiveOpen(true); };

  const receiveMutation = useMutation({
    mutationFn: () => api("/v1/inventory/receive-transfer", {
      method: "POST",
      body: JSON.stringify({
        batch: receivingTransfer?.batch,
        toLocationId: receiveTo === "0" ? undefined : Number(receiveTo),
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transfers"] });
      qc.invalidateQueries({ queryKey: ["inventory-list"] });
      qc.invalidateQueries({ queryKey: ["inventory", "by-location"] });
      setReceiveOpen(false); setReceivingTransfer(null);
      setTab("completed");
      toast({ title: "Transfer received", description: "Stock has been added to the destination location." });
    },
    onError: (e: Error) => toast({ title: "Receive failed", description: e.message, variant: "destructive" }),
  });

  const toggleExpand = (batch: string | null) => {
    const key = batch ?? "__no_batch__";
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // ── Filtering ─────────────────────────────────────────────────────────────────
  const all = transfers ?? [];
  const inTransit = all.filter((t) => t.status === "in_transit");
  const completed = all.filter((t) => t.status === "completed");

  const filterFn = (t: TransferGroup) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.fromLocationName.toLowerCase().includes(q) ||
      t.toLocationName.toLowerCase().includes(q) ||
      (t.reference ?? "").toLowerCase().includes(q) ||
      (t.items ?? []).some((i) => i.productName.toLowerCase().includes(q))
    );
  };

  const displayList = (tab === "in_transit" ? inTransit : completed).filter(filterFn);

  const totalUnits = all.reduce((s, t) => s + (t.items ?? []).reduce((is, i) => is + i.quantity, 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stock Transfers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Send stock in transit and confirm receipt at destination</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { resetSend(); setSendOpen(true); }}>
            <SendHorizonal className="w-4 h-4 mr-2" />Send Stock
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="elev-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{inTransit.length}</div>
              <div className="text-xs text-muted-foreground">In Transit</div>
            </div>
          </CardContent>
        </Card>
        <Card className="elev-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{completed.length}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
          </CardContent>
        </Card>
        <Card className="elev-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalUnits.toLocaleString("en-IN")}</div>
              <div className="text-xs text-muted-foreground">Units Moved</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + Search */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <div className="flex items-center gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="in_transit" className="gap-2">
              <Clock className="w-3.5 h-3.5" />
              In Transit
              {inTransit.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5 bg-amber-500/15 text-amber-600">{inTransit.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed
            </TabsTrigger>
          </TabsList>
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by product, location, reference…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        {/* ── In Transit tab ── */}
        <TabsContent value="in_transit" className="mt-4">
          {isLoading ? (
            <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
          ) : displayList.length === 0 ? (
            <div className="text-center py-16 border rounded-lg bg-card">
              <SendHorizonal className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">No transfers in transit</p>
              <p className="text-sm text-muted-foreground mt-1">Click "Send Stock" to dispatch stock to another location</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayList.map((t) => {
                const items = t.items ?? [];
                const totalQty = items.reduce((s, i) => s + i.quantity, 0);
                return (
                  <Card key={t.batch} className="elev-1 border-amber-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                              <Clock className="w-3 h-3 mr-1" />In Transit
                            </Badge>
                            <span className="text-xs text-muted-foreground">{format(new Date(t.createdAt), "MMM d, yyyy · HH:mm")}</span>
                            {t.reference && <span className="text-xs text-muted-foreground">· {t.reference}</span>}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="bg-red-500/5 border-red-500/20 text-red-500 shrink-0">
                              <Warehouse className="w-3 h-3 mr-1" />{t.fromLocationName}
                            </Badge>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <Badge variant="outline" className="bg-muted border-muted text-muted-foreground shrink-0">
                              <Warehouse className="w-3 h-3 mr-1" />Awaiting destination
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {items.length === 1
                              ? <><span className="font-medium text-foreground">{items[0].productName}</span> · {totalQty} units</>
                              : <><span className="font-medium text-foreground">{items.length} products</span> · {totalQty} total units</>}
                          </div>
                          {items.length > 1 && (
                            <button
                              onClick={() => toggleExpand(t.batch)}
                              className="text-xs text-primary flex items-center gap-1 hover:underline"
                            >
                              {expandedBatches.has(t.batch ?? "") ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              {expandedBatches.has(t.batch ?? "") ? "Hide items" : "Show all items"}
                            </button>
                          )}
                          {expandedBatches.has(t.batch ?? "") && (
                            <div className="ml-2 space-y-0.5 border-l-2 border-muted pl-3">
                              {items.map((item, ii) => (
                                <div key={ii} className="text-sm flex justify-between">
                                  <span className="text-muted-foreground">{item.productName}</span>
                                  <span className="font-medium tabular-nums">{item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button size="sm" onClick={() => openReceive(t)} className="shrink-0">
                          <PackageCheck className="w-4 h-4 mr-1.5" />Receive
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Completed tab ── */}
        <TabsContent value="completed" className="mt-4">
          <div className="border rounded-md bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>From → To</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="w-6" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(4).fill(0).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                  ))
                ) : displayList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <CheckCircle2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="font-medium text-muted-foreground">No completed transfers yet</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayList.map((t, idx) => {
                    const key = t.batch ?? `__${idx}`;
                    const expanded = expandedBatches.has(key);
                    const items = t.items ?? [];
                    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
                    return (
                      <Fragment key={key}>
                        <TableRow
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
                            {items.length === 1
                              ? <span className="text-sm">{items[0].productName}</span>
                              : <span className="text-sm text-muted-foreground">{items.length} products</span>}
                          </TableCell>
                          <TableCell className="text-right font-bold tabular-nums align-top pt-3">{totalQty}</TableCell>
                          <TableCell className="text-muted-foreground text-sm align-top pt-3">{t.reference ?? "—"}</TableCell>
                          <TableCell className="align-top pt-2">
                            {items.length > 1 && (expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />)}
                          </TableCell>
                        </TableRow>
                        {expanded && items.map((item, ii) => (
                          <TableRow key={`${key}-item-${ii}`} className="bg-muted/20">
                            <TableCell /><TableCell />
                            <TableCell className="py-1.5 pl-6 text-sm text-muted-foreground">
                              <Package className="w-3 h-3 inline mr-1.5 opacity-60" />{item.productName}
                            </TableCell>
                            <TableCell className="text-right tabular-nums py-1.5 text-sm font-medium">{item.quantity}</TableCell>
                            <TableCell colSpan={2} />
                          </TableRow>
                        ))}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Send Dialog ── */}
      <Dialog open={sendOpen} onOpenChange={(o) => { setSendOpen(o); if (!o) resetSend(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><SendHorizonal className="w-4 h-4" />Send Stock</DialogTitle>
            <p className="text-sm text-muted-foreground">Dispatch stock from a location. The receiver will confirm where it arrives.</p>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">From Location (Dispatch Source)</label>
              <Select value={sendFrom} onValueChange={setSendFrom}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {locationOptions.map((l) => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Products to Send *</label>
                <Button type="button" size="sm" variant="outline" onClick={addSendLine} className="h-7 text-xs px-2">
                  <Plus className="w-3 h-3 mr-1" />Add Row
                </Button>
              </div>
              <div className="rounded-md border divide-y">
                <div className="grid grid-cols-[1fr_90px_28px] gap-2 px-3 py-1.5 bg-muted/40 text-xs text-muted-foreground font-medium">
                  <span>Product</span><span className="text-center">Qty</span><span />
                </div>
                {sendLines.map((line, i) => {
                  const sel = inventory?.find((p) => p.productId.toString() === line.productId);
                  return (
                    <div key={i} className="grid grid-cols-[1fr_90px_28px] gap-2 items-center px-3 py-2">
                      <Select value={line.productId} onValueChange={(v) => updateSendLine(i, "productId", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select product" /></SelectTrigger>
                        <SelectContent>
                          {(inventory ?? []).map((p) => (
                            <SelectItem key={p.productId} value={p.productId.toString()}>
                              {p.productName} <span className="text-muted-foreground text-xs ml-1">({p.stockLevel})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input type="number" min="1" max={sel?.stockLevel} value={line.quantity}
                        onChange={(e) => updateSendLine(i, "quantity", e.target.value)} className="h-8 text-sm text-center" />
                      <Button type="button" size="icon" variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        onClick={() => removeSendLine(i)} disabled={sendLines.length === 1}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Stock available shown in brackets next to each product.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Reference / Notes</label>
              <Input placeholder="e.g. Branch transfer, dispatch note #42" value={sendRef} onChange={(e) => setSendRef(e.target.value)} />
            </div>

            <Button className="w-full" onClick={() => sendMutation.mutate()} disabled={!canSend || sendMutation.isPending}>
              <SendHorizonal className="w-4 h-4 mr-2" />
              Dispatch {sendLines.filter((l) => l.productId).length} Product{sendLines.filter((l) => l.productId).length !== 1 ? "s" : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Receive Dialog ── */}
      <Dialog open={receiveOpen} onOpenChange={(o) => { setReceiveOpen(o); if (!o) setReceivingTransfer(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PackageCheck className="w-4 h-4" />Confirm Receipt</DialogTitle>
            <p className="text-sm text-muted-foreground">Select where the incoming stock will be stored.</p>
          </DialogHeader>
          {receivingTransfer && (
            <div className="space-y-4 pt-1">
              {/* Summary */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="bg-red-500/5 border-red-500/20 text-red-500 shrink-0">
                    <Warehouse className="w-3 h-3 mr-1" />{receivingTransfer.fromLocationName}
                  </Badge>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <Badge variant="outline" className="bg-emerald-500/5 border-emerald-500/20 text-emerald-500 shrink-0">
                    <Warehouse className="w-3 h-3 mr-1" />Destination (select below)
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Dispatched {format(new Date(receivingTransfer.createdAt), "MMM d, yyyy · HH:mm")}
                  {receivingTransfer.reference && ` · ${receivingTransfer.reference}`}
                </div>
                <div className="divide-y border rounded-md bg-background">
                  {(receivingTransfer.items ?? []).map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-1.5 text-sm">
                      <span className="text-muted-foreground">{item.productName}</span>
                      <span className="font-semibold tabular-nums">{item.quantity} units</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Destination */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Receive Into Location *</label>
                <Select value={receiveTo} onValueChange={setReceiveTo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {locationOptions.map((l) => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => receiveMutation.mutate()} disabled={receiveMutation.isPending}>
                <PackageCheck className="w-4 h-4 mr-2" />Confirm Receipt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
