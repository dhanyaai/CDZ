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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Factory, Plus, Search, Trash2, ChevronDown, ChevronUp,
  PlayCircle, CheckCircle2, XCircle, Clock, Package,
} from "lucide-react";

interface Product { id: number; name: string; stockLevel: number }
interface Material { id: number; productId: number; productName: string; requiredQty: number; issuedQty: number; notes: string | null }
interface ProductionOrder {
  id: number; orderNumber: string; productId: number; productName: string;
  quantity: number; producedQty: number; status: string;
  plannedDate: string | null; completedDate?: string | null;
  notes: string | null; createdAt: string;
}
interface ProductionOrderDetail extends ProductionOrder { materials: Material[] }
interface LineItem { productId: string; requiredQty: string }

const STATUS_META: Record<string, { color: string; icon: React.ElementType }> = {
  Draft:        { color: "bg-muted text-muted-foreground border-border",           icon: Clock },
  "In Progress":{ color: "bg-blue-500/10 text-blue-600 border-blue-500/20",        icon: PlayCircle },
  Completed:    { color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
  Cancelled:    { color: "bg-red-500/10 text-red-500 border-red-500/20",           icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { color: "bg-muted text-muted-foreground border-border", icon: Clock };
  const Icon = m.icon;
  return <Badge variant="outline" className={`text-xs ${m.color} gap-1`}><Icon className="w-3 h-3" />{status}</Badge>;
}

const TABS = ["All", "Draft", "In Progress", "Completed", "Cancelled"] as const;

export function ProductionOrders() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [produceOpen, setProduceOpen] = useState<ProductionOrderDetail | null>(null);
  const [produceQty, setProduceQty] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [form, setForm] = useState({ productId: "", quantity: "", plannedDate: "", notes: "" });
  const [materials, setMaterials] = useState<LineItem[]>([{ productId: "", requiredQty: "" }]);

  const { data: orders = [], isLoading } = useQuery<ProductionOrder[]>({
    queryKey: ["production-orders"],
    queryFn: () => api<ProductionOrder[]>("/v1/production-orders"),
  });
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products-list"],
    queryFn: () => api<Product[]>("/v1/products"),
  });
  const { data: detail } = useQuery<ProductionOrderDetail>({
    queryKey: ["production-order", selectedId],
    queryFn: () => api<ProductionOrderDetail>(`/v1/production-orders/${selectedId}`),
    enabled: selectedId != null,
  });

  const resetCreate = () => {
    setForm({ productId: "", quantity: "", plannedDate: "", notes: "" });
    setMaterials([{ productId: "", requiredQty: "" }]);
  };

  const createMutation = useMutation({
    mutationFn: () => api("/v1/production-orders", {
      method: "POST",
      body: JSON.stringify({
        productId: Number(form.productId),
        quantity: Number(form.quantity),
        plannedDate: form.plannedDate || undefined,
        notes: form.notes || undefined,
        materials: materials.filter((m) => m.productId && m.requiredQty).map((m) => ({
          productId: Number(m.productId),
          requiredQty: Number(m.requiredQty),
        })),
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["production-orders"] });
      setCreateOpen(false); resetCreate();
      toast({ title: "Production order created" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/v1/production-orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["production-orders"] });
      qc.invalidateQueries({ queryKey: ["production-order", selectedId] });
      toast({ title: "Status updated" });
    },
  });

  const produceMutation = useMutation({
    mutationFn: ({ id, qty }: { id: number; qty: number }) =>
      api(`/v1/production-orders/${id}/produce`, { method: "POST", body: JSON.stringify({ qty }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["production-orders"] });
      qc.invalidateQueries({ queryKey: ["production-order", selectedId] });
      qc.invalidateQueries({ queryKey: ["products-list"] });
      setProduceOpen(null); setProduceQty("");
      toast({ title: "Production recorded — stock updated" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const filtered = orders.filter((o) => {
    if (tab !== "All" && o.status !== tab) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return o.orderNumber.toLowerCase().includes(q) || o.productName.toLowerCase().includes(q);
  });

  const count = (s: string) => s === "All" ? orders.length : orders.filter((o) => o.status === s).length;

  const addMaterial = () => setMaterials((m) => [...m, { productId: "", requiredQty: "" }]);
  const removeMaterial = (i: number) => setMaterials((m) => m.filter((_, idx) => idx !== i));
  const updateMaterial = (i: number, k: keyof LineItem, v: string) =>
    setMaterials((m) => m.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  function nextStatuses(s: string) {
    if (s === "Draft") return ["In Progress", "Cancelled"];
    if (s === "In Progress") return ["Completed", "Cancelled"];
    return [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Production Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage manufacturing work orders and BOM consumption</p>
        </div>
        <Button onClick={() => { resetCreate(); setCreateOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />New Production Order
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3">
        {(["Draft", "In Progress", "Completed", "Cancelled"] as const).map((s) => {
          const m = STATUS_META[s];
          const Icon = m.icon;
          return (
            <Card key={s} className="elev-1 cursor-pointer" onClick={() => setTab((p) => p === s ? "All" : s)}>
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xl font-bold leading-none">{count(s)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center gap-4 flex-wrap">
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t} value={t} className="gap-1.5">
                {t}<span className="text-xs opacity-60">({count(t)})</span>
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search order#, product…" value={search}
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
                    <TableHead>Order #</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Planned Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array(3).fill(0).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-14">
                        <Factory className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="font-medium text-muted-foreground">No production orders</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((order) => {
                      const pct = order.quantity > 0 ? Math.min(100, (order.producedQty / order.quantity) * 100) : 0;
                      return (
                        <Fragment key={order.id}>
                          <TableRow className="cursor-pointer hover:bg-muted/20"
                            onClick={() => { setSelectedId(order.id); setDetailOpen(true); }}>
                            <TableCell onClick={(e) => { e.stopPropagation(); setExpanded((p) => p === order.id ? null : order.id); }} className="cursor-pointer">
                              {expanded === order.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                            </TableCell>
                            <TableCell className="font-mono text-sm font-medium">{order.orderNumber}</TableCell>
                            <TableCell>
                              <div className="font-medium">{order.productName}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-muted-foreground mb-1">{order.producedQty} / {order.quantity}</div>
                              <Progress value={pct} className="h-1.5 w-28" />
                            </TableCell>
                            <TableCell><StatusBadge status={order.status} /></TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {order.plannedDate ? format(new Date(order.plannedDate), "d MMM yyyy") : "—"}
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                {["Draft", "In Progress"].includes(order.status) && (
                                  <Button size="sm" variant="default" className="h-7 text-xs px-2"
                                    onClick={() => { setSelectedId(order.id); setProduceOpen(order as ProductionOrderDetail); setProduceQty(""); }}>
                                    <Factory className="w-3 h-3 mr-1" />Produce
                                  </Button>
                                )}
                                {nextStatuses(order.status).map((ns) => (
                                  <Button key={ns} size="sm" variant="outline" className="h-7 text-xs px-2"
                                    onClick={() => statusMutation.mutate({ id: order.id, status: ns })}
                                    disabled={statusMutation.isPending}>
                                    {ns}
                                  </Button>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>

                          {expanded === order.id && detail?.id === order.id && (
                            <TableRow className="bg-muted/20 hover:bg-muted/20">
                              <TableCell colSpan={7} className="pl-10 pb-3 pt-2">
                                <div className="text-xs space-y-1">
                                  <p className="font-medium text-muted-foreground mb-1.5">Bill of Materials:</p>
                                  {detail.materials.length === 0 ? (
                                    <p className="text-muted-foreground">No materials listed</p>
                                  ) : (
                                    detail.materials.map((m) => (
                                      <div key={m.id} className="flex items-center gap-2">
                                        <Package className="w-3 h-3 opacity-60" />
                                        <span>{m.productName}</span>
                                        <span className="font-semibold">Required: {m.requiredQty}</span>
                                        <span className="text-muted-foreground">Issued: {m.issuedQty}</span>
                                      </div>
                                    ))
                                  )}
                                  {detail.notes && <p className="text-muted-foreground mt-1.5">{detail.notes}</p>}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetCreate(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Factory className="w-4 h-4" />New Production Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Output Product *</label>
                <Select value={form.productId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, productId: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Product to manufacture" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>Select product</SelectItem>
                    {products.map((p) => <SelectItem key={p.id} value={p.id.toString()} textValue={p.name}><span>{p.name}</span></SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Quantity *</label>
                <Input type="number" min="1" placeholder="Qty to produce"
                  value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Planned Date</label>
                <Input type="date" value={form.plannedDate}
                  onChange={(e) => setForm((f) => ({ ...f, plannedDate: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Bill of Materials</label>
                <Button type="button" size="sm" variant="outline" onClick={addMaterial} className="h-7 text-xs px-2">
                  <Plus className="w-3 h-3 mr-1" />Add Material
                </Button>
              </div>
              <div className="rounded-md border divide-y">
                <div className="grid grid-cols-[1fr_80px_28px] gap-2 px-3 py-1.5 bg-muted/40 text-xs text-muted-foreground font-medium">
                  <span>Material / Component</span><span className="text-center">Required Qty</span><span />
                </div>
                {materials.map((mat, i) => (
                  <div key={i} className="grid grid-cols-[1fr_80px_28px] gap-2 items-center px-3 py-2">
                    <Select value={mat.productId || "none"} onValueChange={(v) => updateMaterial(i, "productId", v === "none" ? "" : v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select material" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" disabled>Select</SelectItem>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()} textValue={p.name}>
                            <span>{p.name}</span><span className="text-muted-foreground text-xs ml-1">({p.stockLevel})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="number" min="1" value={mat.requiredQty}
                      onChange={(e) => updateMaterial(i, "requiredQty", e.target.value)}
                      className="h-8 text-sm text-center" />
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 hover:text-red-500"
                      onClick={() => removeMaterial(i)} disabled={materials.length === 1}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Textarea placeholder="Production notes, instructions…" value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>

            <Button className="w-full" onClick={() => createMutation.mutate()}
              disabled={!form.productId || !form.quantity || createMutation.isPending}>
              <Factory className="w-4 h-4 mr-2" />Create Production Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Produce Dialog */}
      <Dialog open={!!produceOpen} onOpenChange={(o) => { if (!o) { setProduceOpen(null); setProduceQty(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Factory className="w-4 h-4" />Record Production</DialogTitle>
          </DialogHeader>
          {produceOpen && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 border p-3 text-sm space-y-1">
                <div className="font-medium">{produceOpen.productName}</div>
                <div className="text-muted-foreground">
                  Target: <span className="font-semibold text-foreground">{produceOpen.quantity}</span> ·
                  Produced so far: <span className="font-semibold text-foreground">{produceOpen.producedQty}</span> ·
                  Remaining: <span className="font-semibold text-foreground">{produceOpen.quantity - produceOpen.producedQty}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Quantity Produced Now *</label>
                <Input type="number" min="1" max={produceOpen.quantity - produceOpen.producedQty}
                  placeholder="Enter qty" value={produceQty} onChange={(e) => setProduceQty(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  This will add {produceQty || "—"} units to inventory and deduct materials proportionally.
                </p>
              </div>
              <Button className="w-full"
                onClick={() => produceMutation.mutate({ id: produceOpen.id, qty: Number(produceQty) })}
                disabled={!produceQty || Number(produceQty) <= 0 || produceMutation.isPending}>
                <Factory className="w-4 h-4 mr-2" />Confirm Production
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
