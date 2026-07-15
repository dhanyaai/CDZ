import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useListClients } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowRight, FileSpreadsheet, IndianRupee, Clock, CheckCircle2, XCircle, Printer, Package, Building2, Phone, Mail, CreditCard } from "lucide-react";
import { printQuote } from "@/lib/print-utils";
import { format } from "date-fns";

const PAYMENT_TERMS = ["Immediate", "Net 7", "Net 15", "Net 30", "Net 45", "Net 60", "50% Advance", "100% Advance"];

type Quote = {
  id: number; quoteNumber: string; subject: string | null; clientId: number; clientName: string | null;
  status: string; validUntil: string | null; paymentTerms: string | null;
  subtotal: number; discountPct: number; gstAmount: number; totalAmount: number;
  notes?: string | null; termsAndConditions?: string | null; createdAt: string;
};

type QuoteItem = {
  id: number; description: string; quantity: number; unitPrice: number;
  lineTotal: number; imageUrl?: string | null; productId?: number | null;
};

type QuoteDetail = Quote & {
  items: QuoteItem[];
  contactPerson?: string | null; clientEmail?: string | null; clientPhone?: string | null;
  clientGst?: string | null; billingAddress?: string | null;
};

type Product = { id: number; name: string; sellingPrice: string | number; imageUrl?: string | null; category?: string };
type LineItem = { productId?: number; description: string; quantity: number; unitPrice: number; imageUrl?: string | null };

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft:    { label: "Draft",    color: "bg-slate-500/10 text-slate-400 border-slate-500/20",   icon: FileSpreadsheet },
  sent:     { label: "Sent",     color: "bg-blue-500/10 text-blue-400 border-blue-500/20",       icon: Clock },
  accepted: { label: "Accepted", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-500/10 text-red-400 border-red-500/20",         icon: XCircle },
  expired:  { label: "Expired",  color: "bg-orange-500/10 text-orange-400 border-orange-500/20", icon: XCircle },
};

export function Quotes() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [selected, setSelected] = useState<Quote | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  // Form state
  const [clientId, setClientId] = useState("");
  const [subject, setSubject] = useState("");
  const [discountPct, setDiscountPct] = useState("0");
  const [validUntil, setValidUntil] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unitPrice: 0 }]);

  const { data: quotes, isLoading } = useQuery({ queryKey: ["quotes"], queryFn: () => api<Quote[]>("/v1/quotes") });
  const { data: clients } = useListClients();
  const { data: products } = useQuery<Product[]>({ queryKey: ["products"], queryFn: () => api<Product[]>("/v1/products") });

  const { data: quoteDetail } = useQuery<QuoteDetail>({
    queryKey: ["quote-detail", selected?.id],
    queryFn: () => api<QuoteDetail>(`/v1/quotes/${selected!.id}`),
    enabled: !!selected,
  });

  const resetForm = () => {
    setClientId(""); setSubject(""); setDiscountPct("0"); setValidUntil("");
    setPaymentTerms(""); setNotes(""); setTermsAndConditions("");
    setItems([{ description: "", quantity: 1, unitPrice: 0 }]);
  };

  const filledItems = items.filter(i => i.description.trim());

  const create = useMutation({
    mutationFn: () => api("/v1/quotes", { method: "POST", body: JSON.stringify({
      clientId: Number(clientId), subject: subject || null, discountPct: Number(discountPct),
      validUntil: validUntil || null, paymentTerms: paymentTerms || null,
      notes: notes || null, termsAndConditions: termsAndConditions || null,
      items: filledItems.map(i => ({
        productId: i.productId, description: i.description,
        quantity: i.quantity, unitPrice: i.unitPrice, imageUrl: i.imageUrl,
      })),
    })}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      setDialog(false); resetForm();
      toast({ title: "Quote created" });
    },
    onError: (err: unknown) => {
      toast({ title: "Failed to create quote", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/v1/quotes/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); qc.invalidateQueries({ queryKey: ["quote-detail", selected?.id] }); },
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
  const pendingCount = (quotes ?? []).filter(q => ["draft", "sent"].includes(q.status)).length;
  const conversionRate = (quotes ?? []).length ? Math.round(((quotes ?? []).filter(q => q.status === "accepted").length / (quotes ?? []).length) * 100) : 0;

  function pickProduct(lineIdx: number, productId: string) {
    const prod = (products ?? []).find(p => String(p.id) === productId);
    if (!prod) return;
    setItems(prev => prev.map((it, i) => i === lineIdx ? {
      ...it, productId: prod.id, description: prod.name,
      unitPrice: Number(prod.sellingPrice), imageUrl: prod.imageUrl ?? null,
    } : it));
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6" data-testid="page-quotes">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quotes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create and manage customer quotations</p>
        </div>
        <Button onClick={() => { resetForm(); setDialog(true); }}><Plus className="w-4 h-4 mr-2" />New Quote</Button>
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
              <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 ${s.color}`}><s.icon className="w-5 h-5" /></div>
              <div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status tabs */}
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
              <TableHead>Subject</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment Terms</TableHead>
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
              const subtotalAmt = Number(q.totalAmount ?? 0) - Number(q.gstAmount ?? 0);
              return (
                <TableRow key={q.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelected(q)}>
                  <TableCell className="font-medium">{q.quoteNumber}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{q.subject || "—"}</TableCell>
                  <TableCell>{q.clientName}</TableCell>
                  <TableCell><Badge className={`border text-xs ${cfg.color}`}>{cfg.label}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{q.paymentTerms || "—"}</TableCell>
                  <TableCell className={isExpired ? "text-red-500 font-medium" : ""}>
                    {q.validUntil ? format(new Date(q.validUntil), "MMM d, yyyy") : "—"}
                    {isExpired && " (expired)"}
                  </TableCell>
                  <TableCell className="text-right">₹{subtotalAmt.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
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
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-10">No quotes found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── New Quote Dialog ── */}
      <Dialog open={dialog} onOpenChange={v => { setDialog(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Quote</DialogTitle></DialogHeader>
          <div className="space-y-4">

            {/* Basic Info */}
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Client *" /></SelectTrigger>
              <SelectContent position="popper" className="max-h-60">{clients?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>)}</SelectContent>
            </Select>

            <Input placeholder="Quote subject / title (optional)" value={subject} onChange={e => setSubject(e.target.value)} />

            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} placeholder="Valid until" />
              <Input type="number" placeholder="Discount %" min="0" max="100" value={discountPct} onChange={e => setDiscountPct(e.target.value)} />
            </div>

            <Select value={paymentTerms || "__none__"} onValueChange={v => setPaymentTerms(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Payment terms (optional)" /></SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="__none__">— No payment terms —</SelectItem>
                {PAYMENT_TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Line items */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Line Items</div>
              {items.map((item, i) => (
                <div key={i} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden border bg-muted flex items-center justify-center">
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt={item.description} className="w-full h-full object-cover" />
                        : <Package className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <Select
                      value={item.productId ? String(item.productId) : "__custom__"}
                      onValueChange={v => {
                        if (v === "__custom__") setItems(prev => prev.map((it, idx) => idx === i ? { ...it, productId: undefined, imageUrl: null } : it));
                        else pickProduct(i, v);
                      }}>
                      <SelectTrigger className="flex-1 text-sm"><SelectValue placeholder="Select product…" /></SelectTrigger>
                      <SelectContent position="popper" className="max-h-60">
                        <SelectItem value="__custom__">— Custom description —</SelectItem>
                        {(products ?? []).map(p => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            <div className="flex items-center gap-2">
                              {p.imageUrl
                                ? <img src={p.imageUrl} alt={p.name} className="w-5 h-5 rounded object-cover shrink-0" />
                                : <Package className="w-4 h-4 text-muted-foreground shrink-0" />}
                              <span>{p.name}</span>
                              <span className="text-muted-foreground ml-auto">₹{Number(p.sellingPrice).toLocaleString("en-IN")}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" className="shrink-0" onClick={() => setItems(items.filter((_, x) => x !== i))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <Input className="col-span-6 text-sm" placeholder="Description"
                      value={item.description} onChange={e => { const n = [...items]; n[i].description = e.target.value; setItems(n); }} />
                    <Input className="col-span-2 text-sm" type="number" placeholder="Qty" min="1"
                      value={item.quantity} onChange={e => { const n = [...items]; n[i].quantity = Number(e.target.value); setItems(n); }} />
                    <Input className="col-span-4 text-sm" type="number" placeholder="Unit price ₹"
                      value={item.unitPrice} onChange={e => { const n = [...items]; n[i].unitPrice = Number(e.target.value); setItems(n); }} />
                  </div>
                  {item.quantity > 0 && item.unitPrice > 0 && (
                    <div className="text-xs text-right text-muted-foreground">
                      Line total: ₹{(item.quantity * item.unitPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setItems([...items, { description: "", quantity: 1, unitPrice: 0 }])}>
                <Plus className="w-3 h-3 mr-1" />Add line
              </Button>
            </div>

            {/* Financial summary */}
            <div className="bg-muted/40 rounded-lg p-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
              {Number(discountPct) > 0 && <div className="flex justify-between text-amber-600"><span>Discount ({discountPct}%)</span><span>−₹{(subtotal - afterDisc).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>}
              <div className="flex justify-between text-muted-foreground"><span>GST 18%</span><span>₹{gst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between font-bold text-base pt-1 border-t border-border"><span>Total</span><span>₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
            </div>

            <Textarea placeholder="Internal notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            <Textarea placeholder="Terms & Conditions (optional)" value={termsAndConditions} onChange={e => setTermsAndConditions(e.target.value)} rows={2} />

            {!clientId && <p className="text-xs text-destructive text-center">Please select a client</p>}
            {clientId && filledItems.length === 0 && <p className="text-xs text-destructive text-center">Add at least one line item with a description</p>}
            <Button onClick={() => create.mutate()} disabled={!clientId || filledItems.length === 0 || create.isPending} className="w-full">
              {create.isPending ? "Creating…" : "Create Quote"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Quote Detail Drawer ── */}
      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (() => {
            const cfg = STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.draft;
            const detailItems = quoteDetail?.items ?? [];
            return (
              <>
                <SheetHeader className="mb-5">
                  <SheetTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
                    {selected.quoteNumber}
                  </SheetTitle>
                  {selected.subject && <p className="text-sm text-muted-foreground">{selected.subject}</p>}
                  <div className="flex items-center gap-2">
                    <Badge className={`border ${cfg.color}`}>{cfg.label}</Badge>
                    <span className="text-sm text-muted-foreground">{selected.clientName}</span>
                  </div>
                </SheetHeader>

                <div className="space-y-5">
                  {/* Financial */}
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="text-xs text-muted-foreground mb-0.5">Quote Total</div>
                    <div className="text-3xl font-bold text-primary">₹{Number(selected.totalAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between"><span>Subtotal</span><span>₹{(Number(selected.totalAmount ?? 0) - Number(selected.gstAmount ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                      {selected.discountPct > 0 && <div className="flex justify-between text-amber-500"><span>Discount</span><span>{selected.discountPct}%</span></div>}
                      <div className="flex justify-between"><span>GST 18%</span><span>₹{Number(selected.gstAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                    </div>
                  </div>

                  {/* Client Info */}
                  {quoteDetail && (
                    <div className="rounded-lg border p-3 space-y-1.5 text-sm">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1.5 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />Bill To</div>
                      <div className="font-semibold">{selected.clientName}</div>
                      {quoteDetail.contactPerson && <div className="text-muted-foreground">{quoteDetail.contactPerson}</div>}
                      {quoteDetail.clientEmail && <div className="flex items-center gap-1.5 text-muted-foreground text-xs"><Mail className="w-3.5 h-3.5" />{quoteDetail.clientEmail}</div>}
                      {quoteDetail.clientPhone && <div className="flex items-center gap-1.5 text-muted-foreground text-xs"><Phone className="w-3.5 h-3.5" />{quoteDetail.clientPhone}</div>}
                      {quoteDetail.clientGst && <div className="text-xs font-mono text-muted-foreground">GSTIN: {quoteDetail.clientGst}</div>}
                      {quoteDetail.billingAddress && <div className="text-xs text-muted-foreground pt-1 border-t border-border">{quoteDetail.billingAddress}</div>}
                    </div>
                  )}

                  {/* Quote meta */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selected.validUntil && (
                      <div>
                        <div className="text-xs text-muted-foreground">Valid Until</div>
                        <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-muted-foreground" />{format(new Date(selected.validUntil), "MMM d, yyyy")}</div>
                      </div>
                    )}
                    {selected.paymentTerms && (
                      <div>
                        <div className="text-xs text-muted-foreground">Payment Terms</div>
                        <div className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5 text-muted-foreground" />{selected.paymentTerms}</div>
                      </div>
                    )}
                  </div>

                  {/* Items */}
                  {detailItems.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Items</div>
                      <div className="space-y-2">
                        {detailItems.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 rounded-lg border bg-muted/20 p-2.5">
                            <div className="shrink-0 w-12 h-12 rounded-md overflow-hidden border bg-muted flex items-center justify-center">
                              {item.imageUrl
                                ? <img src={item.imageUrl} alt={item.description} className="w-full h-full object-cover" />
                                : <Package className="w-5 h-5 text-muted-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{item.description}</div>
                              <div className="text-xs text-muted-foreground">{item.quantity} × ₹{item.unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 0 })}</div>
                            </div>
                            <div className="text-sm font-bold shrink-0">₹{item.lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 0 })}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes & T&C */}
                  {selected.notes && (
                    <div className="rounded-lg border p-3 text-sm">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Notes</div>
                      <p className="text-muted-foreground">{selected.notes}</p>
                    </div>
                  )}
                  {quoteDetail?.termsAndConditions && (
                    <div className="rounded-lg border p-3 text-sm">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Terms & Conditions</div>
                      <p className="text-muted-foreground whitespace-pre-wrap">{quoteDetail.termsAndConditions}</p>
                    </div>
                  )}

                  <Separator />

                  {/* Status */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Update Status</label>
                    <Select value={selected.status} onValueChange={v => {
                      updateStatus.mutate({ id: selected.id, status: v });
                      setSelected({ ...selected, status: v });
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selected.status === "accepted" && (
                    <Button className="w-full" onClick={() => convertToOrder.mutate(selected.id)} disabled={convertToOrder.isPending}>
                      <ArrowRight className="w-4 h-4 mr-2" />Convert to Sales Order
                    </Button>
                  )}

                  <Button variant="outline" className="w-full" onClick={() => printQuote({
                    ...selected,
                    items: detailItems.map(it => ({ description: it.description, quantity: it.quantity, unitPrice: it.unitPrice, lineTotal: it.lineTotal, imageUrl: it.imageUrl })),
                  })}>
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
