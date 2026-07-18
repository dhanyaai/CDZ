import { useState, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  FlaskConical, Plus, Search, Package, Trash2, ChevronDown, ChevronUp,
  User, Phone, Mail, Building2, CheckCircle2, Truck, XCircle, RefreshCw, Clock, Printer,
} from "lucide-react";
import { printSampleOrder } from "@/lib/print-utils";

// ── Types ────────────────────────────────────────────────────────────────────
interface SampleOrderSummary {
  id: number; sampleNumber: string;
  clientId: number | null; clientName: string | null;
  customerName: string | null; status: string;
  notes: string | null; createdAt: string;
}
interface SampleOrderDetail extends SampleOrderSummary {
  customerPhone: string | null; customerEmail: string | null;
  items: { id: number; productId: number; productName: string; quantity: number; returnedQty: number; disposition: "gift" | "invoice" | null; notes: string | null }[];
}
interface Client { id: number; companyName: string }
interface Product { id: number; name: string; stockLevel: number }
interface LineItem { productId: string; quantity: string; notes: string }

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  Requested: { label: "Requested", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Clock },
  Dispatched: { label: "Dispatched", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Truck },
  Received:   { label: "Received",   color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
  Converted:  { label: "Converted to SO", color: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: RefreshCw },
  Rejected:   { label: "Rejected",   color: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle },
  Returned:   { label: "Returned",   color: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: Package },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, color: "bg-muted text-muted-foreground border-border", icon: Clock };
  const Icon = m.icon;
  return (
    <Badge variant="outline" className={`text-xs ${m.color}`}>
      <Icon className="w-3 h-3 mr-1" />{m.label}
    </Badge>
  );
}

const TABS = ["All", "Requested", "Dispatched", "Received", "Converted", "Rejected", "Returned"] as const;
type TabKey = typeof TABS[number];

// ── Component ─────────────────────────────────────────────────────────────────
export function SampleOrders() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [tab, setTab] = useState<TabKey>("All");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [useClient, setUseClient] = useState<"client" | "manual">("client");
  const [clientId, setClientId] = useState("none");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([{ productId: "", quantity: "1", notes: "" }]);

  // Detail panel
  const [detailOpen, setDetailOpen] = useState(false);

  // ── Data queries ─────────────────────────────────────────────────────────────
  const { data: orders = [], isLoading } = useQuery<SampleOrderSummary[]>({
    queryKey: ["sample-orders"],
    queryFn: () => api<SampleOrderSummary[]>("/v1/sample-orders"),
  });
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients-list"],
    queryFn: () => api<Client[]>("/v1/clients"),
  });
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products-list"],
    queryFn: () => api<Product[]>("/v1/products"),
  });
  const { data: detail } = useQuery<SampleOrderDetail>({
    queryKey: ["sample-order", selectedId],
    queryFn: () => api<SampleOrderDetail>(`/v1/sample-orders/${selectedId}`),
    enabled: selectedId != null,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const resetCreate = () => {
    setUseClient("client"); setClientId("none");
    setCustName(""); setCustPhone(""); setCustEmail(""); setOrderNotes("");
    setLines([{ productId: "", quantity: "1", notes: "" }]);
  };

  const canCreate = lines.every((l) => l.productId && Number(l.quantity) > 0)
    && lines.length > 0
    && (useClient === "client" ? clientId !== "none" : custName.trim().length > 0);

  const createMutation = useMutation({
    mutationFn: () => api("/v1/sample-orders", {
      method: "POST",
      body: JSON.stringify({
        clientId: useClient === "client" ? Number(clientId) : undefined,
        customerName: useClient === "manual" ? custName : undefined,
        customerPhone: custPhone || undefined,
        customerEmail: custEmail || undefined,
        notes: orderNotes || undefined,
        items: lines.map((l) => ({ productId: Number(l.productId), quantity: Number(l.quantity), notes: l.notes || undefined })),
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sample-orders"] });
      setCreateOpen(false); resetCreate();
      toast({ title: "Sample order created" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/v1/sample-orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sample-orders"] });
      qc.invalidateQueries({ queryKey: ["sample-order", selectedId] });
      toast({ title: "Status updated" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const [returnOpen, setReturnOpen] = useState(false);
  const [returnQtys, setReturnQtys] = useState<Record<number, number>>({});
  const [dispositions, setDispositions] = useState<Record<number, "gift" | "invoice" | null>>({});

  const openReturn = () => {
    if (!detail) return;
    setReturnQtys(Object.fromEntries(detail.items.map(i => [i.id, i.quantity])));
    setDispositions(Object.fromEntries(detail.items.map(i => [i.id, i.disposition])));
    setReturnOpen(true);
  };

  const returnMutation = useMutation({
    mutationFn: () => api(`/v1/sample-orders/${detail!.id}/return`, {
      method: "PATCH",
      body: JSON.stringify({
        items: detail!.items.map(i => ({
          itemId: i.id,
          returnedQty: returnQtys[i.id] ?? 0,
          disposition: (returnQtys[i.id] ?? 0) < i.quantity ? (dispositions[i.id] ?? null) : null,
        })),
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sample-orders"] });
      qc.invalidateQueries({ queryKey: ["sample-order", selectedId] });
      setReturnOpen(false); setDetailOpen(false);
      toast({ title: "Return recorded — status set to Returned" });
    },
    onError: (e: Error) => toast({ title: "Failed to record return", description: e.message, variant: "destructive" }),
  });

  // ── Filtering ────────────────────────────────────────────────────────────────
  const filtered = orders.filter((o) => {
    if (tab !== "All" && o.status !== tab) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.sampleNumber.toLowerCase().includes(q) ||
      (o.clientName ?? "").toLowerCase().includes(q) ||
      (o.customerName ?? "").toLowerCase().includes(q) ||
      (o.notes ?? "").toLowerCase().includes(q)
    );
  });

  const countFor = (s: TabKey) => s === "All" ? orders.length : orders.filter((o) => o.status === s).length;

  // ── Line item helpers ────────────────────────────────────────────────────────
  const addLine = () => setLines((l) => [...l, { productId: "", quantity: "1", notes: "" }]);
  const removeLine = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof LineItem, value: string) =>
    setLines((l) => l.map((row, idx) => idx === i ? { ...row, [field]: value } : row));

  // Next status options based on current
  function nextStatuses(current: string): string[] {
    if (current === "Requested") return ["Dispatched", "Rejected"];
    if (current === "Dispatched") return ["Received", "Rejected"];
    if (current === "Received") return ["Converted", "Rejected"];
    return [];
  }

  function canReturn(current: string) { return current === "Received"; }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sample Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track product samples dispatched to customers</p>
        </div>
        <Button onClick={() => { resetCreate(); setCreateOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />New Sample Order
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {(["Requested", "Dispatched", "Received", "Converted", "Rejected"] as const).map((s) => {
          const m = STATUS_META[s];
          const Icon = m.icon;
          const count = orders.filter((o) => o.status === s).length;
          return (
            <Card key={s} className={`elev-1 cursor-pointer transition-all ${tab === s ? "ring-2 ring-primary/40" : ""}`}
              onClick={() => setTab((prev) => prev === s ? "All" : s)}>
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xl font-bold leading-none">{count}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{m.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs + Search */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <div className="flex items-center gap-4 flex-wrap">
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t} value={t} className="gap-1.5">
                {t}
                <span className="text-xs opacity-60">({countFor(t)})</span>
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search sample#, customer, notes…" value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        {TABS.map((t) => (
          <TabsContent key={t} value={t} className="mt-4">
            <div className="border rounded-md bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-6" />
                    <TableHead>Sample #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array(4).fill(0).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-14">
                        <FlaskConical className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="font-medium text-muted-foreground">No sample orders</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {tab === "All" ? 'Click "New Sample Order" to create one' : `No orders with status "${tab}"`}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((o) => (
                      <Fragment key={o.id}>
                        <TableRow className="cursor-pointer hover:bg-muted/20"
                          onClick={() => { setSelectedId(o.id); setDetailOpen(true); }}>
                          <TableCell onClick={(e) => { e.stopPropagation(); setExpanded((p) => p === o.id ? null : o.id); }}
                            className="w-6 cursor-pointer">
                            {expanded === o.id
                              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </TableCell>
                          <TableCell className="font-mono text-sm font-medium">{o.sampleNumber}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm">
                              {o.clientId ? <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                              <span>{o.clientName ?? o.customerName ?? "—"}</span>
                              {o.clientName && <Badge variant="secondary" className="text-xs h-4 px-1">CRM</Badge>}
                            </div>
                          </TableCell>
                          <TableCell><StatusBadge status={o.status} /></TableCell>
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                            {format(new Date(o.createdAt), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                            {o.notes ?? "—"}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {nextStatuses(o.status).map((ns) => (
                                <Button key={ns} size="sm" variant="outline" className="h-7 text-xs px-2"
                                  onClick={() => statusMutation.mutate({ id: o.id, status: ns })}
                                  disabled={statusMutation.isPending}>
                                  {ns === "Dispatched" && <Truck className="w-3 h-3 mr-1" />}
                                  {ns === "Received" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                  {ns === "Converted" && <RefreshCw className="w-3 h-3 mr-1" />}
                                  {ns === "Rejected" && <XCircle className="w-3 h-3 mr-1" />}
                                  {ns}
                                </Button>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>

                        {expanded === o.id && detail?.id === o.id && (
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={7} className="pl-10 pb-3 pt-2">
                              <div className="text-xs text-muted-foreground space-y-1.5">
                                {detail.customerPhone && (
                                  <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{detail.customerPhone}</div>
                                )}
                                {detail.customerEmail && (
                                  <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{detail.customerEmail}</div>
                                )}
                                <div className="mt-2 space-y-1">
                                  {detail.items.map((item) => (
                                    <div key={item.id} className="flex items-center gap-2">
                                      <Package className="w-3 h-3 opacity-60" />
                                      <span>{item.productName}</span>
                                      <span className="font-semibold">×{item.quantity}</span>
                                      {item.notes && <span className="text-muted-foreground">· {item.notes}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* ── Create Dialog ── */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetCreate(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />New Sample Order
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Record samples dispatched to a customer — CRM client or walk-in.
            </p>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {/* Customer type toggle */}
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={useClient === "client" ? "default" : "outline"}
                onClick={() => { setUseClient("client"); setClientId("none"); }}>
                <Building2 className="w-3.5 h-3.5 mr-1.5" />CRM Client
              </Button>
              <Button type="button" size="sm" variant={useClient === "manual" ? "default" : "outline"}
                onClick={() => { setUseClient("manual"); setClientId("none"); }}>
                <User className="w-3.5 h-3.5 mr-1.5" />Manual Entry
              </Button>
            </div>

            {useClient === "client" ? (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Client *</label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>Select a client</SelectItem>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.companyName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-sm font-medium">Customer Name *</label>
                  <Input placeholder="e.g. Rahul Mehta" value={custName} onChange={(e) => setCustName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Phone</label>
                  <Input placeholder="+91 98765 43210" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Email</label>
                  <Input placeholder="customer@email.com" value={custEmail} onChange={(e) => setCustEmail(e.target.value)} />
                </div>
              </div>
            )}

            {/* Product lines */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Products *</label>
                <Button type="button" size="sm" variant="outline" onClick={addLine} className="h-7 text-xs px-2">
                  <Plus className="w-3 h-3 mr-1" />Add Row
                </Button>
              </div>
              <div className="rounded-md border divide-y">
                <div className="grid grid-cols-[1fr_70px_28px] gap-2 px-3 py-1.5 bg-muted/40 text-xs text-muted-foreground font-medium">
                  <span>Product</span><span className="text-center">Qty</span><span />
                </div>
                {lines.map((line, i) => (
                  <div key={i} className="grid grid-cols-[1fr_70px_28px] gap-2 items-center px-3 py-2">
                    <Select value={line.productId || "none"} onValueChange={(v) => updateLine(i, "productId", v === "none" ? "" : v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select product" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" disabled>Select product</SelectItem>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.name} <span className="text-muted-foreground text-xs ml-1">({p.stockLevel})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="number" min="1" value={line.quantity}
                      onChange={(e) => updateLine(i, "quantity", e.target.value)}
                      className="h-8 text-sm text-center" />
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-500"
                      onClick={() => removeLine(i)} disabled={lines.length === 1}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Textarea placeholder="Occasion, event, special instructions…"
                value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} rows={2} />
            </div>

            <Button className="w-full" onClick={() => createMutation.mutate()}
              disabled={!canCreate || createMutation.isPending}>
              <FlaskConical className="w-4 h-4 mr-2" />Create Sample Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          {!detail ? (
            <div className="py-10 text-center text-muted-foreground">Loading…</div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4" />{detail.sampleNumber}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <StatusBadge status={detail.status} />
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(detail.createdAt), "MMM d, yyyy · HH:mm")}
                  </span>
                </div>

                {/* Customer info */}
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    {detail.clientId ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    {detail.clientName ?? detail.customerName ?? "—"}
                    {detail.clientName && <Badge variant="secondary" className="text-xs h-4 px-1">CRM</Badge>}
                  </div>
                  {detail.customerPhone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3 h-3" />{detail.customerPhone}
                    </div>
                  )}
                  {detail.customerEmail && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3 h-3" />{detail.customerEmail}
                    </div>
                  )}
                  {detail.notes && <p className="text-muted-foreground text-xs mt-1 pt-1 border-t">{detail.notes}</p>}
                </div>

                {/* Items */}
                <div>
                  <p className="text-sm font-medium mb-2">Products</p>
                  <div className="divide-y border rounded-md">
                    {detail.items.map((item) => {
                      const keptQty = item.quantity - item.returnedQty;
                      return (
                        <div key={item.id} className="px-3 py-2 text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{item.productName}</span>
                              {item.notes && <span className="text-xs text-muted-foreground ml-2">· {item.notes}</span>}
                            </div>
                            <span className="font-semibold tabular-nums">×{item.quantity}</span>
                          </div>
                          {item.returnedQty > 0 && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-orange-600 font-medium">↩ {item.returnedQty} returned</span>
                              {keptQty > 0 && item.disposition === "gift" && (
                                <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">🎁 {keptQty} gifted</span>
                              )}
                              {keptQty > 0 && item.disposition === "invoice" && (
                                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">🧾 {keptQty} to invoice</span>
                              )}
                              {keptQty > 0 && !item.disposition && (
                                <span className="text-muted-foreground">{keptQty} kept — disposition pending</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Print */}
                <Button variant="outline" size="sm" className="w-full" onClick={() => printSampleOrder(detail)} data-testid="button-print-sample">
                  <Printer className="w-4 h-4 mr-2" />Print / Save as PDF
                </Button>

                {/* Return action */}
                {canReturn(detail.status) && (
                  <Button variant="outline" size="sm" className="w-full text-orange-600 border-orange-300 hover:bg-orange-50"
                    onClick={openReturn}>
                    <Package className="w-4 h-4 mr-2" />Record Return (full or partial)
                  </Button>
                )}

                {/* Status actions */}
                {nextStatuses(detail.status).length > 0 && (
                  <div className="flex gap-2">
                    {nextStatuses(detail.status).map((ns) => (
                      <Button key={ns} className="flex-1"
                        variant={ns === "Rejected" ? "destructive" : "default"}
                        size="sm"
                        onClick={() => { statusMutation.mutate({ id: detail.id, status: ns }); setDetailOpen(false); }}
                        disabled={statusMutation.isPending}>
                        {ns}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Return Dialog (sibling, NOT nested inside Detail) ── */}
      <Dialog open={returnOpen} onOpenChange={(o) => { setReturnOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Package className="w-4 h-4" />Record Return — {detail?.sampleNumber}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Set returned qty. For any units kept, choose Gift or Invoice.</p>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-orange-600"
                  onClick={() => setReturnQtys(Object.fromEntries(detail.items.map(i => [i.id, i.quantity])))}>
                  Return All
                </Button>
              </div>
              <div className="divide-y border rounded-lg overflow-hidden">
                {detail.items.map(item => {
                  const rQty = returnQtys[item.id] ?? item.quantity;
                  const keptQty = item.quantity - rQty;
                  const disp = dispositions[item.id] ?? null;
                  return (
                    <div key={item.id} className="px-3 py-2.5 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium flex-1 min-w-0 truncate">{item.productName}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">sent {item.quantity}</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                          <span>return</span>
                          <Input
                            type="number" min={0} max={item.quantity}
                            className="w-14 h-7 text-sm text-center px-1"
                            value={rQty}
                            onChange={e => setReturnQtys(q => ({ ...q, [item.id]: Math.min(item.quantity, Math.max(0, Number(e.target.value))) }))}
                          />
                        </div>
                      </div>
                      {keptQty > 0 && (
                        <div className="flex items-center gap-2 pl-1">
                          <span className="text-xs text-muted-foreground">Kept {keptQty} →</span>
                          <button
                            type="button"
                            onClick={() => setDispositions(d => ({ ...d, [item.id]: "gift" }))}
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${disp === "gift" ? "bg-emerald-500 text-white border-emerald-500" : "border-muted-foreground/30 text-muted-foreground hover:border-emerald-400 hover:text-emerald-600"}`}>
                            🎁 Gift
                          </button>
                          <button
                            type="button"
                            onClick={() => setDispositions(d => ({ ...d, [item.id]: "invoice" }))}
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${disp === "invoice" ? "bg-blue-500 text-white border-blue-500" : "border-muted-foreground/30 text-muted-foreground hover:border-blue-400 hover:text-blue-600"}`}>
                            🧾 Invoice
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => returnMutation.mutate()} disabled={returnMutation.isPending}>
                  {returnMutation.isPending ? "Recording…" : "Confirm Return"}
                </Button>
                <Button variant="outline" className="shrink-0" title="Print sample order"
                  onClick={() => printSampleOrder(detail)}>
                  <Printer className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
