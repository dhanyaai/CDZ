import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useListClients } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowRight, FileSpreadsheet, IndianRupee, Clock, CheckCircle2, XCircle, Printer } from "lucide-react";
import { printQuote } from "@/lib/print-utils";
import { format } from "date-fns";

type Quote = {
  id: number; quoteNumber: string; clientId: number; clientName: string | null;
  status: string; validUntil: string | null; subtotal: number; discountPct: number;
  gstAmount: number; totalAmount: number; createdAt: string; notes?: string | null;
};

type LineItem = { description: string; quantity: number; unitPrice: number };

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Draft", color: "bg-slate-500/10 text-slate-400 border-slate-500/20", icon: FileSpreadsheet },
  sent: { label: "Sent", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Clock },
  accepted: { label: "Accepted", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle },
  expired: { label: "Expired", color: "bg-orange-500/10 text-orange-400 border-orange-500/20", icon: XCircle },
};

export function Quotes() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [selected, setSelected] = useState<Quote | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientId, setClientId] = useState("");
  const [discountPct, setDiscountPct] = useState("0");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unitPrice: 0 }]);

  const { data: quotes, isLoading } = useQuery({ queryKey: ["quotes"], queryFn: () => api<Quote[]>("/v1/quotes") });
  const { data: clients } = useListClients();

  const create = useMutation({
    mutationFn: () => api("/v1/quotes", { method: "POST", body: JSON.stringify({
      clientId: Number(clientId), discountPct: Number(discountPct), validUntil: validUntil || null, notes: notes || null,
      items: items.filter(i => i.description),
    })}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes"] }); setDialog(false);
      setItems([{ description: "", quantity: 1, unitPrice: 0 }]); setDiscountPct("0"); setValidUntil(""); setClientId(""); setNotes("");
      toast({ title: "Quote created" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/v1/quotes/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); },
  });

  const convertToOrder = useMutation({
    mutationFn: (id: number) => api(`/v1/quotes/${id}/convert`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes"] }); qc.invalidateQueries({ queryKey: ["sales-orders"] });
      toast({ title: "Converted to Sales Order" }); setSelected(null);
    },
    onError: () => toast({ title: "Conversion failed", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/v1/quotes/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); toast({ title: "Quote deleted" }); setSelected(null); },
  });

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const afterDisc = subtotal * (1 - Number(discountPct || 0) / 100);
  const gst = afterDisc * 0.18;
  const total = afterDisc + gst;

  const filtered = (quotes ?? []).filter(q => statusFilter === "all" || q.status === statusFilter);
  const totalQuoted = (quotes ?? []).reduce((s, q) => s + Number(q.totalAmount ?? 0), 0);
  const acceptedValue = (quotes ?? []).filter(q => q.status === "accepted").reduce((s, q) => s + Number(q.totalAmount ?? 0), 0);
  const pendingCount = (quotes ?? []).filter(q => ["draft","sent"].includes(q.status)).length;
  const conversionRate = (quotes ?? []).length ? Math.round(((quotes ?? []).filter(q => q.status === "accepted").length / (quotes ?? []).length) * 100) : 0;

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6" data-testid="page-quotes">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quotes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create and manage customer quotations</p>
        </div>
        <Button onClick={() => setDialog(true)}><Plus className="w-4 h-4 mr-2" />New Quote</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Quoted", value: `₹${totalQuoted.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: IndianRupee, color: "text-primary" },
          { label: "Accepted Value", value: `₹${acceptedValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Pending", value: pendingCount, icon: Clock, color: "text-amber-500" },
          { label: "Conversion Rate", value: `${conversionRate}%`, icon: ArrowRight, color: "text-violet-500" },
        ].map(s => (
          <Card key={s.label} className="elev-1">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">All ({(quotes ?? []).length})</TabsTrigger>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <TabsTrigger key={k} value={k}>{v.label} ({(quotes ?? []).filter(q => q.status === k).length})</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">GST</TableHead>
              <TableHead className="text-right font-bold">Total</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(q => {
              const cfg = STATUS_CONFIG[q.status] ?? STATUS_CONFIG.draft;
              const isExpired = q.validUntil && new Date(q.validUntil) < new Date() && q.status === "sent";
              return (
                <TableRow key={q.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelected(q)}>
                  <TableCell className="font-medium">{q.quoteNumber}</TableCell>
                  <TableCell>{q.clientName}</TableCell>
                  <TableCell>
                    <Badge className={`border text-xs ${cfg.color}`}>{cfg.label}</Badge>
                  </TableCell>
                  <TableCell className={isExpired ? "text-red-500 font-medium" : ""}>
                    {q.validUntil ? format(new Date(q.validUntil), "MMM d, yyyy") : "—"}
                    {isExpired && " (expired)"}
                  </TableCell>
                  <TableCell className="text-right">₹{(Number(q.totalAmount ?? 0) - Number(q.gstAmount ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                  <TableCell className="text-right text-muted-foreground">₹{Number(q.gstAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                  <TableCell className="text-right font-bold">₹{Number(q.totalAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => del.mutate(q.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {!filtered.length && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">No quotes found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* New quote dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Quote</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Client *" /></SelectTrigger>
              <SelectContent>{clients?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} placeholder="Valid until" />
              <Input type="number" placeholder="Discount %" min="0" max="100" value={discountPct} onChange={e => setDiscountPct(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Line Items</div>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <Input className="col-span-6" placeholder="Description" value={item.description}
                    onChange={e => { const n = [...items]; n[i].description = e.target.value; setItems(n); }} />
                  <Input className="col-span-2" type="number" placeholder="Qty" value={item.quantity}
                    onChange={e => { const n = [...items]; n[i].quantity = Number(e.target.value); setItems(n); }} />
                  <Input className="col-span-3" type="number" placeholder="Unit price ₹" value={item.unitPrice}
                    onChange={e => { const n = [...items]; n[i].unitPrice = Number(e.target.value); setItems(n); }} />
                  <Button className="col-span-1" size="icon" variant="ghost" onClick={() => setItems(items.filter((_, x) => x !== i))}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setItems([...items, { description: "", quantity: 1, unitPrice: 0 }])}>
                <Plus className="w-3 h-3 mr-1" />Add line
              </Button>
            </div>
            <div className="bg-muted/40 rounded-lg p-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
              {Number(discountPct) > 0 && <div className="flex justify-between text-amber-600"><span>Discount ({discountPct}%)</span><span>−₹{(subtotal - afterDisc).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>}
              <div className="flex justify-between text-muted-foreground"><span>GST 18%</span><span>₹{gst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between font-bold text-base pt-1 border-t border-border"><span>Total</span><span>₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
            </div>
            <Button onClick={() => create.mutate()} disabled={!clientId || create.isPending} className="w-full">Create Quote</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quote detail drawer */}
      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (() => {
            const cfg = STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.draft;
            const subtotalAmt = Number(selected.totalAmount ?? 0) - Number(selected.gstAmount ?? 0);
            return (
              <>
                <SheetHeader className="mb-6">
                  <SheetTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
                    {selected.quoteNumber}
                  </SheetTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={`border ${cfg.color}`}>{cfg.label}</Badge>
                    <span className="text-sm text-muted-foreground">{selected.clientName}</span>
                  </div>
                </SheetHeader>
                <div className="space-y-5">
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="text-xs text-muted-foreground mb-0.5">Quote Total</div>
                    <div className="text-3xl font-bold text-primary">₹{Number(selected.totalAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotalAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                      <div className="flex justify-between"><span>GST 18%</span><span>₹{Number(selected.gstAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                      {selected.discountPct > 0 && <div className="flex justify-between text-amber-500"><span>Discount</span><span>{selected.discountPct}%</span></div>}
                    </div>
                  </div>
                  {selected.validUntil && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>Valid until <strong>{format(new Date(selected.validUntil), "MMM d, yyyy")}</strong></span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={selected.status} onValueChange={v => {
                      updateStatus.mutate({ id: selected.id, status: v });
                      setSelected({ ...selected, status: v });
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selected.status === "accepted" && (
                    <Button className="w-full" onClick={() => convertToOrder.mutate(selected.id)} disabled={convertToOrder.isPending}>
                      <ArrowRight className="w-4 h-4 mr-2" />Convert to Sales Order
                    </Button>
                  )}
                  <Button variant="outline" className="w-full" onClick={() => printQuote(selected)}>
                    <Printer className="w-4 h-4 mr-2" />Print Quote
                  </Button>
                  <Button variant="destructive" className="w-full" onClick={() => del.mutate(selected.id)} disabled={del.isPending}>
                    <Trash2 className="w-4 h-4 mr-2" />Delete Quote
                  </Button>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
