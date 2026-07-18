import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useListClients } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Calendar, Building2, IndianRupee, TrendingUp, Target, BarChart3, UserCircle, FlaskConical, Printer, Package } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { printSampleOrder, printReturnNote } from "@/lib/print-utils";

type Opportunity = {
  id: number; title: string; clientId: number | null; clientName: string | null;
  leadId: number | null; stage: string; value: number | null; probability: number;
  expectedCloseDate: string | null; ownerId: number | null; ownerName: string | null;
  notes: string | null; createdAt: string;
};
type Lead = { id: number; title: string; companyName: string | null };
type User = { id: number; name: string; role: string };
type Product = { id: number; name: string; stockLevel: number };
type SampleOrderItem = { id: number; productId: number; productName: string; quantity: number; returnedQty: number; disposition: "gift" | "invoice" | null; notes: string | null };
type SampleOrderSummary = { id: number; sampleNumber: string; status: string; notes: string | null; createdAt: string; items: SampleOrderItem[] };
type SampleOrderDetail = SampleOrderSummary & {
  clientName: string | null; customerName: string | null;
  customerPhone: string | null; customerEmail: string | null;
  items: { id: number; productId: number; productName: string; quantity: number; returnedQty: number; disposition: "gift" | "invoice" | null; notes: string | null }[];
};
type SampleLine = { productId: string; quantity: string };

const SAMPLE_STATUS_COLOR: Record<string, string> = {
  Requested: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Dispatched: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Received: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Converted: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Rejected: "bg-red-500/10 text-red-500 border-red-500/20",
};

const STAGES = ["enquiry", "sent_catalogue", "samples", "shortlisted", "quotation_sent"];
const LABELS: Record<string, string> = {
  enquiry: "Enquiry", sent_catalogue: "Sent Catalogue", samples: "Samples",
  shortlisted: "Shortlisted Products", quotation_sent: "Quotation Sent",
};
const STAGE_HEADER: Record<string, string> = {
  enquiry: "border-t-slate-400", sent_catalogue: "border-t-blue-400", samples: "border-t-violet-400",
  shortlisted: "border-t-amber-400", quotation_sent: "border-t-emerald-400",
};
const PROB_COLOR = (p: number) => { if (p >= 75) return "bg-emerald-500"; if (p >= 50) return "bg-amber-500"; if (p >= 25) return "bg-blue-500"; return "bg-slate-500"; };

const BLANK_FORM = { title: "", clientId: "", leadId: "", value: "", probability: "50", expectedCloseDate: "", ownerId: "", notes: "" };

export function Opportunities() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [sampleDialog, setSampleDialog] = useState(false);
  const [sampleLines, setSampleLines] = useState<SampleLine[]>([{ productId: "", quantity: "1" }]);
  const [sampleNotes, setSampleNotes] = useState("");
  const [sampleCustomer, setSampleCustomer] = useState("");
  const [returnDialog, setReturnDialog] = useState(false);
  const [returningOrder, setReturningOrder] = useState<SampleOrderDetail | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<number, number>>({});
  const [dispositions, setDispositions] = useState<Record<number, "gift" | "invoice" | null>>({});

  const { data: opps, isLoading } = useQuery({ queryKey: ["opportunities"], queryFn: () => api<Opportunity[]>("/v1/opportunities") });
  const { data: clients } = useListClients();
  const { data: leads } = useQuery({ queryKey: ["leads"], queryFn: () => api<Lead[]>("/v1/leads") });
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => api<User[]>("/v1/users") });
  const { data: sampleOrders } = useQuery({
    queryKey: ["opp-sample-orders", selected?.id],
    queryFn: () => api<SampleOrderSummary[]>(`/v1/sample-orders?opportunityId=${selected!.id}`),
    enabled: !!selected && selected.stage === "samples",
  });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => api<Product[]>("/v1/products"), enabled: sampleDialog });

  const create = useMutation({
    mutationFn: () => api("/v1/opportunities", {
      method: "POST", body: JSON.stringify({
        title: form.title,
        clientId: form.clientId ? Number(form.clientId) : null,
        leadId: form.leadId ? Number(form.leadId) : null,
        value: form.value ? Number(form.value) : null,
        probability: Number(form.probability),
        expectedCloseDate: form.expectedCloseDate || null,
        ownerId: form.ownerId ? Number(form.ownerId) : null,
        notes: form.notes || null,
      }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["opportunities"] }); setDialog(false); setForm({ ...BLANK_FORM }); toast({ title: "Opportunity created" }); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Opportunity> }) =>
      api(`/v1/opportunities/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["opportunities"] }); toast({ title: "Updated" }); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/v1/opportunities/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["opportunities"] }); setSelected(null); },
  });

  const resetSampleForm = () => { setSampleLines([{ productId: "", quantity: "1" }]); setSampleNotes(""); setSampleCustomer(""); };

  const createSample = useMutation({
    mutationFn: () => api("/v1/sample-orders", {
      method: "POST",
      body: JSON.stringify({
        opportunityId: selected!.id,
        clientId: selected!.clientId ?? undefined,
        customerName: !selected!.clientId ? sampleCustomer.trim() : undefined,
        notes: sampleNotes.trim() || undefined,
        items: sampleLines.map(l => ({ productId: Number(l.productId), quantity: Number(l.quantity) })),
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opp-sample-orders"] });
      qc.invalidateQueries({ queryKey: ["sample-orders"] });
      setSampleDialog(false); resetSampleForm();
      toast({ title: "Sample order created" });
    },
    onError: (e: Error) => toast({ title: "Failed to create sample order", description: e.message, variant: "destructive" }),
  });

  const canCreateSample = sampleLines.length > 0
    && sampleLines.every(l => l.productId && Number(l.quantity) > 0)
    && (!!selected?.clientId || sampleCustomer.trim().length > 0);

  const handlePrintSample = async (id: number) => {
    try {
      const d = await api<SampleOrderDetail>(`/v1/sample-orders/${id}`);
      printSampleOrder({ ...d, opportunityTitle: selected?.title ?? null });
    } catch {
      toast({ title: "Could not load sample order for printing", variant: "destructive" });
    }
  };

  const updateSampleStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/v1/sample-orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opp-sample-orders"] });
      qc.invalidateQueries({ queryKey: ["sample-orders"] });
      toast({ title: "Status updated" });
    },
    onError: (e: Error) => toast({ title: "Failed to update status", description: e.message, variant: "destructive" }),
  });

  const openReturnDialog = async (id: number) => {
    try {
      const d = await api<SampleOrderDetail>(`/v1/sample-orders/${id}`);
      setReturningOrder(d);
      // For already-Returned orders: lock qty at existing returnedQty; for Received: default to full qty
      setReturnQtys(Object.fromEntries(d.items.map(i => [i.id, d.status === "Returned" ? i.returnedQty : i.quantity])));
      setDispositions(Object.fromEntries(d.items.map(i => [i.id, i.disposition])));
      setReturnDialog(true);
    } catch {
      toast({ title: "Could not load sample order", variant: "destructive" });
    }
  };

  const submitReturn = useMutation({
    mutationFn: () => api(`/v1/sample-orders/${returningOrder!.id}/return`, {
      method: "PATCH",
      body: JSON.stringify({
        items: returningOrder!.items.map(i => ({
          itemId: i.id,
          returnedQty: returnQtys[i.id] ?? 0,
          disposition: (returnQtys[i.id] ?? 0) < i.quantity ? (dispositions[i.id] ?? null) : null,
        })),
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opp-sample-orders"] });
      qc.invalidateQueries({ queryKey: ["sample-orders"] });
      const wasReturned = returningOrder?.status === "Returned";
      setReturnDialog(false); setReturningOrder(null);
      toast({ title: wasReturned ? "Disposition saved" : "Return recorded — status set to Returned" });
    },
    onError: (e: Error) => toast({ title: "Failed to record return", description: e.message, variant: "destructive" }),
  });

  function oppNextStatuses(status: string) {
    if (status === "Requested") return ["Dispatched", "Rejected"];
    if (status === "Dispatched") return ["Received", "Rejected"];
    return [];
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  const totalPipeline = (opps ?? []).reduce((s, o) => s + (o.value ?? 0), 0);
  const totalWeighted = (opps ?? []).reduce((s, o) => s + ((o.value ?? 0) * o.probability) / 100, 0);
  const quotationValue = (opps ?? []).filter(o => o.stage === "quotation_sent").reduce((s, o) => s + (o.value ?? 0), 0);
  const totalDeals = (opps ?? []).length;

  return (
    <div className="space-y-6" data-testid="page-opportunities">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Opportunities</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Sales pipeline with probability-weighted forecast</p>
        </div>
        <Button onClick={() => setDialog(true)}><Plus className="w-4 h-4 mr-2" />New Opportunity</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Pipeline", value: `₹${totalPipeline.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: IndianRupee, color: "text-primary" },
          { label: "Weighted Forecast", value: `₹${totalWeighted.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: BarChart3, color: "text-violet-500" },
          { label: "Quotation Sent", value: `₹${quotationValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: "text-emerald-500" },
          { label: "Total Deals", value: `${totalDeals}`, icon: Target, color: "text-amber-500" },
        ].map(s => (
          <Card key={s.label} className="elev-1">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 ${s.color}`}><s.icon className="w-5 h-5" /></div>
              <div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {STAGES.map(stage => {
          const items = (opps ?? []).filter(o => o.stage === stage);
          const stageVal = items.reduce((s, o) => s + (o.value ?? 0), 0);
          return (
            <div key={stage} className={`flex flex-col min-h-[280px] rounded-xl border border-t-2 bg-card/50 ${STAGE_HEADER[stage]}`}>
              <div className="p-3 border-b border-border/50">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-semibold">{LABELS[stage]}</span>
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">₹{stageVal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {items.map(o => {
                  const daysLeft = o.expectedCloseDate ? differenceInDays(new Date(o.expectedCloseDate), new Date()) : null;
                  return (
                    <div key={o.id} className="p-2.5 border rounded-lg bg-card text-xs space-y-2 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all" onClick={() => setSelected(o)}>
                      <div className="font-medium leading-tight">{o.title}</div>
                      {o.clientName && <div className="flex items-center gap-1 text-muted-foreground"><Building2 className="w-3 h-3 shrink-0" />{o.clientName}</div>}
                      {o.value != null && <div className="font-semibold text-primary">₹{o.value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>}
                      <div className="space-y-1">
                        <div className="flex justify-between text-muted-foreground">
                          <span>{o.probability}%</span>
                          {daysLeft !== null && <span className={daysLeft < 0 ? "text-red-400" : daysLeft < 7 ? "text-amber-400" : ""}>{daysLeft < 0 ? `${Math.abs(daysLeft)}d late` : `${daysLeft}d`}</span>}
                        </div>
                        <Progress value={o.probability} className="h-1" indicatorClassName={PROB_COLOR(o.probability)} />
                      </div>
                      {o.ownerName && <div className="flex items-center gap-1 text-muted-foreground pt-0.5"><UserCircle className="w-3 h-3 shrink-0" />{o.ownerName}</div>}
                    </div>
                  );
                })}
                {items.length === 0 && <div className="text-center text-muted-foreground/50 text-xs py-6">No opportunities</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* New dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Opportunity</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Title *</label>
              <Input placeholder="e.g. Diwali Campaign — TCS" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Client</label>
                <Select value={form.clientId || "__none__"} onValueChange={v => setForm({ ...form, clientId: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select client…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {clients?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Source Lead</label>
                <Select value={form.leadId || "__none__"} onValueChange={v => setForm({ ...form, leadId: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Link to lead…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {leads?.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Value (₹)</label>
                <Input placeholder="Deal value" type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Probability %</label>
                <Input placeholder="0–100" type="number" min="0" max="100" value={form.probability} onChange={e => setForm({ ...form, probability: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Expected Close Date</label>
                <Input type="date" value={form.expectedCloseDate} onChange={e => setForm({ ...form, expectedCloseDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Assigned To</label>
                <Select value={form.ownerId || "__none__"} onValueChange={v => setForm({ ...form, ownerId: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Assign owner…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Unassigned —</SelectItem>
                    {users?.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Notes</label>
              <Textarea placeholder="Context, requirements, key decision makers…" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <Button onClick={() => create.mutate()} disabled={!form.title || create.isPending} className="w-full">Create Opportunity</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle className="text-xl">{selected.title}</SheetTitle>
                {selected.clientName && <p className="text-sm text-muted-foreground flex items-center gap-1"><Building2 className="w-4 h-4" />{selected.clientName}</p>}
              </SheetHeader>
              <div className="space-y-5">
                {selected.ownerName && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UserCircle className="w-4 h-4" /><span>Assigned to <strong>{selected.ownerName}</strong></span>
                  </div>
                )}
                {selected.value != null && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="text-xs text-muted-foreground mb-0.5">Deal Value</div>
                    <div className="text-3xl font-bold text-primary">₹{selected.value.toLocaleString("en-IN")}</div>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Probability: {selected.probability}%</span>
                        <span>Weighted: ₹{Math.round((selected.value * selected.probability) / 100).toLocaleString("en-IN")}</span>
                      </div>
                      <Progress value={selected.probability} className="h-2" indicatorClassName={PROB_COLOR(selected.probability)} />
                    </div>
                  </div>
                )}
                {selected.expectedCloseDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Expected close: <strong>{format(new Date(selected.expectedCloseDate), "MMM d, yyyy")}</strong></span>
                  </div>
                )}
                {selected.notes && <div className="bg-muted/40 rounded-lg p-3"><div className="text-xs font-medium text-muted-foreground mb-1">Notes</div><p className="text-sm whitespace-pre-wrap">{selected.notes}</p></div>}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stage</label>
                  <Select value={selected.stage} onValueChange={v => { update.mutate({ id: selected.id, data: { stage: v } }); setSelected({ ...selected, stage: v }); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{LABELS[s]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {selected.stage === "samples" && (
                  <div className="space-y-2" data-testid="section-sample-orders">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium flex items-center gap-1.5">
                        <FlaskConical className="w-4 h-4 text-violet-500" />Sample Orders
                      </label>
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                        onClick={() => { resetSampleForm(); if (!selected?.clientId) setSampleCustomer(selected?.title ?? ""); setSampleDialog(true); }}>
                        <Plus className="w-3 h-3 mr-1" />New Sample Order
                      </Button>
                    </div>
                    {(sampleOrders ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground border rounded-lg p-3 bg-muted/20">
                        No sample orders yet. Create one to record the samples you're sending, then print or save it as a PDF for the client.
                      </p>
                    ) : (
                      <div className="border rounded-lg divide-y">
                        {(sampleOrders ?? []).map(so => (
                          <div key={so.id} className="px-3 py-2.5 space-y-2">
                            {/* Row 1: number + badge + date */}
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold">{so.sampleNumber}</span>
                              <Badge variant="outline" className={`text-xs ${SAMPLE_STATUS_COLOR[so.status] ?? ""}`}>{so.status}</Badge>
                              <span className="text-xs text-muted-foreground ml-auto">{format(new Date(so.createdAt), "MMM d")}</span>
                            </div>
                            {/* Item-wise details */}
                            {(so.items ?? []).length > 0 && (
                              <div className="rounded-md bg-muted/30 divide-y divide-border/50 border border-border/50 text-xs">
                                {(so.items ?? []).map(item => {
                                  const keptQty = item.quantity - item.returnedQty;
                                  const isReturned = so.status === "Returned" || item.returnedQty > 0;
                                  return (
                                    <div key={item.id} className="flex flex-col gap-1 px-2.5 py-1.5">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium truncate">{item.productName}</span>
                                        <span className="text-muted-foreground shrink-0">×{item.quantity}</span>
                                      </div>
                                      {isReturned && (
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {item.returnedQty > 0 && (
                                            <span className="text-orange-600 font-medium">↩ {item.returnedQty} returned</span>
                                          )}
                                          {keptQty > 0 && item.disposition === "gift" && (
                                            <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">🎁 {keptQty} gifted</span>
                                          )}
                                          {keptQty > 0 && item.disposition === "invoice" && (
                                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">🧾 {keptQty} to invoice</span>
                                          )}
                                          {keptQty > 0 && !item.disposition && (
                                            <span className="text-amber-600 font-medium">{keptQty} kept — disposition pending</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {/* Row 2: action buttons */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {oppNextStatuses(so.status).map(ns => (
                                <Button key={ns} size="sm"
                                  variant={ns === "Rejected" ? "destructive" : "outline"}
                                  className="h-6 text-xs px-2"
                                  disabled={updateSampleStatus.isPending}
                                  onClick={() => updateSampleStatus.mutate({ id: so.id, status: ns })}>
                                  {ns}
                                </Button>
                              ))}
                              {so.status === "Received" && (
                                <Button size="sm" variant="outline"
                                  className="h-6 text-xs px-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                                  onClick={() => openReturnDialog(so.id)}>
                                  Return
                                </Button>
                              )}
                              {so.status === "Returned" && (so.items ?? []).some(i => i.quantity - i.returnedQty > 0 && !i.disposition) && (
                                <Button size="sm" variant="outline"
                                  className="h-6 text-xs px-2 text-amber-600 border-amber-300 hover:bg-amber-50"
                                  onClick={() => openReturnDialog(so.id)}>
                                  Set Disposition
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs ml-auto"
                                onClick={() => handlePrintSample(so.id)}>
                                <Printer className="w-3 h-3 mr-1" />Print
                              </Button>
                              {so.status === "Returned" && (
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-orange-600"
                                  onClick={() => printReturnNote({ ...so, opportunityTitle: selected?.title ?? null })}>
                                  <Printer className="w-3 h-3 mr-1" />Return Note
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <Button variant="destructive" className="w-full" onClick={() => del.mutate(selected.id)} disabled={del.isPending}>
                  <Trash2 className="w-4 h-4 mr-2" />Delete Opportunity
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Return Dialog ── */}
      <Dialog open={returnDialog} onOpenChange={(o) => { setReturnDialog(o); if (!o) setReturningOrder(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Package className="w-4 h-4" />{returningOrder?.status === "Returned" ? "Set Disposition" : "Record Return"} — {returningOrder?.sampleNumber}
            </DialogTitle>
          </DialogHeader>
          {returningOrder && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {returningOrder.status === "Returned"
                    ? "Assign Gift or Invoice for kept items."
                    : "Set returned qty. For any units kept, choose Gift or Invoice."}
                </p>
                {returningOrder.status !== "Returned" && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-orange-600 shrink-0"
                    onClick={() => setReturnQtys(Object.fromEntries(returningOrder.items.map(i => [i.id, i.quantity])))}>
                    Return All
                  </Button>
                )}
              </div>
              <div className="divide-y border rounded-lg overflow-hidden">
                {returningOrder.items.map(item => {
                  const rQty = returnQtys[item.id] ?? item.quantity;
                  const keptQty = item.quantity - rQty;
                  const disp = dispositions[item.id] ?? null;
                  return (
                    <div key={item.id} className="px-3 py-2.5 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium flex-1 min-w-0 truncate">{item.productName}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">sent {item.quantity}</span>
                        {returningOrder.status === "Returned" ? (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {rQty > 0 ? `${rQty} returned` : "none returned"}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                            <span>return</span>
                            <Input
                              type="number" min={0} max={item.quantity}
                              className="w-14 h-7 text-sm text-center px-1"
                              value={rQty}
                              onChange={e => setReturnQtys(q => ({ ...q, [item.id]: Math.min(item.quantity, Math.max(0, Number(e.target.value))) }))}
                            />
                          </div>
                        )}
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
                  onClick={() => submitReturn.mutate()}
                  disabled={submitReturn.isPending}>
                  {submitReturn.isPending ? "Saving…" : returningOrder.status === "Returned" ? "Save Disposition" : "Confirm Return"}
                </Button>
                <Button variant="outline" className="shrink-0"
                  title={returningOrder.status === "Returned" ? "Print Return Note" : "Print Sample Order"}
                  onClick={() => returningOrder.status === "Returned"
                    ? printReturnNote({ ...returningOrder, opportunityTitle: selected?.title ?? null })
                    : printSampleOrder({ ...returningOrder, opportunityTitle: selected?.title ?? null })}>
                  <Printer className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── New Sample Order Dialog ── */}
      <Dialog open={sampleDialog} onOpenChange={(o) => { setSampleDialog(o); if (!o) resetSampleForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-violet-500" />New Sample Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selected && (
              <p className="text-sm text-muted-foreground">
                For <strong className="text-foreground">{selected.title}</strong>
                {selected.clientName ? <> · {selected.clientName}</> : null}
              </p>
            )}
            {selected && !selected.clientId && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Customer Name *</label>
                <Input value={sampleCustomer} onChange={e => setSampleCustomer(e.target.value)} placeholder="Customer / company name" data-testid="input-sample-customer" />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sample Products *</label>
              {sampleLines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Select value={line.productId} onValueChange={v => setSampleLines(ls => ls.map((l, i) => i === idx ? { ...l, productId: v } : l))}>
                    <SelectTrigger className="flex-1" data-testid={`select-sample-product-${idx}`}>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {(products ?? []).map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" min={1} className="w-20" value={line.quantity}
                    onChange={e => setSampleLines(ls => ls.map((l, i) => i === idx ? { ...l, quantity: e.target.value } : l))}
                    data-testid={`input-sample-qty-${idx}`} />
                  {sampleLines.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0"
                      onClick={() => setSampleLines(ls => ls.filter((_, i) => i !== idx))}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <Button size="sm" variant="outline" className="text-xs"
                onClick={() => setSampleLines(ls => [...ls, { productId: "", quantity: "1" }])}>
                <Plus className="w-3 h-3 mr-1" />Add Product
              </Button>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={sampleNotes} onChange={e => setSampleNotes(e.target.value)} rows={2}
                placeholder="Courier details, customization notes…" data-testid="input-sample-notes" />
            </div>
            <Button className="w-full" onClick={() => createSample.mutate()}
              disabled={!canCreateSample || createSample.isPending} data-testid="button-create-sample-order">
              <FlaskConical className="w-4 h-4 mr-2" />
              {createSample.isPending ? "Creating…" : "Create Sample Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
