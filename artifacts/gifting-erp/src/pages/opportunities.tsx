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
import { Plus, Trash2, Calendar, Building2, IndianRupee, TrendingUp, Target, BarChart3, UserCircle } from "lucide-react";
import { differenceInDays, format } from "date-fns";

type Opportunity = {
  id: number; title: string; clientId: number | null; clientName: string | null;
  leadId: number | null; stage: string; value: number | null; probability: number;
  expectedCloseDate: string | null; ownerId: number | null; ownerName: string | null;
  notes: string | null; createdAt: string;
};
type Lead = { id: number; title: string; companyName: string | null };
type User = { id: number; name: string; role: string };

const STAGES = ["prospect", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"];
const LABELS: Record<string, string> = {
  prospect: "Prospect", qualified: "Qualified", proposal: "Proposal",
  negotiation: "Negotiation", closed_won: "Won", closed_lost: "Lost",
};
const STAGE_HEADER: Record<string, string> = {
  prospect: "border-t-slate-400", qualified: "border-t-blue-400", proposal: "border-t-violet-400",
  negotiation: "border-t-amber-400", closed_won: "border-t-emerald-400", closed_lost: "border-t-red-400",
};
const PROB_COLOR = (p: number) => { if (p >= 75) return "bg-emerald-500"; if (p >= 50) return "bg-amber-500"; if (p >= 25) return "bg-blue-500"; return "bg-slate-500"; };

const BLANK_FORM = { title: "", clientId: "", leadId: "", value: "", probability: "50", expectedCloseDate: "", ownerId: "", notes: "" };

export function Opportunities() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });

  const { data: opps, isLoading } = useQuery({ queryKey: ["opportunities"], queryFn: () => api<Opportunity[]>("/v1/opportunities") });
  const { data: clients } = useListClients();
  const { data: leads } = useQuery({ queryKey: ["leads"], queryFn: () => api<Lead[]>("/v1/leads") });
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => api<User[]>("/v1/users") });

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

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  const totalPipeline = (opps ?? []).filter(o => !["closed_won", "closed_lost"].includes(o.stage)).reduce((s, o) => s + (o.value ?? 0), 0);
  const totalWeighted = (opps ?? []).filter(o => !["closed_won", "closed_lost"].includes(o.stage)).reduce((s, o) => s + ((o.value ?? 0) * o.probability) / 100, 0);
  const wonValue = (opps ?? []).filter(o => o.stage === "closed_won").reduce((s, o) => s + (o.value ?? 0), 0);
  const winRate = (opps ?? []).length ? Math.round(((opps ?? []).filter(o => o.stage === "closed_won").length / (opps ?? []).length) * 100) : 0;

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
          { label: "Closed Won", value: `₹${wonValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: "text-emerald-500" },
          { label: "Win Rate", value: `${winRate}%`, icon: Target, color: "text-amber-500" },
        ].map(s => (
          <Card key={s.label} className="elev-1">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 ${s.color}`}><s.icon className="w-5 h-5" /></div>
              <div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
                <Button variant="destructive" className="w-full" onClick={() => del.mutate(selected.id)} disabled={del.isPending}>
                  <Trash2 className="w-4 h-4 mr-2" />Delete Opportunity
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
