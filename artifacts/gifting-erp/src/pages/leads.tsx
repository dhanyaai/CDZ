import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, ArrowRight, Trash2, Search, Mail, Phone, Building2, IndianRupee, TrendingUp, Users, Target, Zap } from "lucide-react";

type Lead = {
  id: number; title: string; clientId: number | null; companyName: string | null;
  contactName: string | null; email: string | null; phone: string | null;
  source: string | null; status: string; estimatedValue: number | null;
  ownerId: number | null; ownerName: string | null; notes: string | null;
  createdAt: string;
};

const STAGES = ["new", "qualified", "proposal", "negotiation", "won", "lost"];
const STAGE_LABELS: Record<string, string> = {
  new: "New", qualified: "Qualified", proposal: "Proposal",
  negotiation: "Negotiation", won: "Won", lost: "Lost",
};
const STAGE_COLORS: Record<string, string> = {
  new: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  qualified: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  proposal: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  negotiation: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  won: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  lost: "bg-red-500/10 text-red-400 border-red-500/20",
};
const STAGE_HEADER: Record<string, string> = {
  new: "border-t-slate-400",
  qualified: "border-t-blue-400",
  proposal: "border-t-violet-400",
  negotiation: "border-t-amber-400",
  won: "border-t-emerald-400",
  lost: "border-t-red-400",
};
const SOURCE_COLORS: Record<string, string> = {
  Web: "bg-sky-500/10 text-sky-400",
  Referral: "bg-emerald-500/10 text-emerald-400",
  "Cold call": "bg-orange-500/10 text-orange-400",
  LinkedIn: "bg-blue-500/10 text-blue-400",
  Event: "bg-violet-500/10 text-violet-400",
};

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
}

export function Leads() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [form, setForm] = useState({
    title: "", companyName: "", contactName: "", email: "", phone: "",
    source: "", estimatedValue: "", notes: "",
  });
  const [editForm, setEditForm] = useState<Partial<Lead>>({});

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads"], queryFn: () => api<Lead[]>("/v1/leads"),
  });

  const create = useMutation({
    mutationFn: () => api<Lead>("/v1/leads", { method: "POST", body: JSON.stringify({
      ...form, estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : null,
    })}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] }); setDialog(false);
      setForm({ title: "", companyName: "", contactName: "", email: "", phone: "", source: "", estimatedValue: "", notes: "" });
      toast({ title: "Lead created" });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Lead> }) =>
      api(`/v1/leads/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); toast({ title: "Lead updated" }); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/v1/leads/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  const convert = useMutation({
    mutationFn: (id: number) => api(`/v1/leads/${id}/convert`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] }); qc.invalidateQueries({ queryKey: ["opportunities"] });
      toast({ title: "Converted to opportunity" }); setSelected(null);
    },
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/v1/leads/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); toast({ title: "Lead deleted" }); setSelected(null); },
  });

  const filtered = (leads ?? []).filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.title.toLowerCase().includes(q) || (l.companyName ?? "").toLowerCase().includes(q) || (l.contactName ?? "").toLowerCase().includes(q);
    const matchSource = sourceFilter === "all" || l.source === sourceFilter;
    return matchSearch && matchSource;
  });

  const byStatus = (status: string) => filtered.filter(l => l.status === status);
  const total = (leads ?? []).reduce((s, l) => s + (l.estimatedValue ?? 0), 0);
  const wonValue = (leads ?? []).filter(l => l.status === "won").reduce((s, l) => s + (l.estimatedValue ?? 0), 0);
  const activeCount = (leads ?? []).filter(l => !["won","lost"].includes(l.status)).length;
  const winRate = (leads ?? []).length ? Math.round(((leads ?? []).filter(l => l.status === "won").length / (leads ?? []).length) * 100) : 0;
  const sources = Array.from(new Set((leads ?? []).map(l => l.source).filter(Boolean))) as string[];

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-4 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      <Skeleton className="h-96 w-full" />
    </div>
  );

  return (
    <div className="space-y-6" data-testid="page-leads">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track and convert your incoming leads</p>
        </div>
        <Button onClick={() => setDialog(true)} data-testid="button-new-lead">
          <Plus className="w-4 h-4 mr-2" />New Lead
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Pipeline", value: `₹${total.toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-primary" },
          { label: "Won Value", value: `₹${wonValue.toLocaleString("en-IN")}`, icon: TrendingUp, color: "text-emerald-500" },
          { label: "Active Leads", value: activeCount, icon: Target, color: "text-amber-500" },
          { label: "Win Rate", value: `${winRate}%`, icon: Zap, color: "text-violet-500" },
        ].map(s => (
          <Card key={s.label} className="elev-1">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Sources" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAGES.map(stage => {
          const items = byStatus(stage);
          const stageValue = items.reduce((s, l) => s + (l.estimatedValue ?? 0), 0);
          return (
            <div key={stage} className={`flex flex-col min-h-[300px] rounded-xl border border-t-2 bg-card/50 ${STAGE_HEADER[stage]}`}>
              <div className="p-3 border-b border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{STAGE_LABELS[stage]}</span>
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">₹{stageValue.toLocaleString("en-IN")}</p>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {items.map(lead => (
                  <div
                    key={lead.id}
                    className="p-2.5 border rounded-lg bg-card text-xs space-y-1.5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
                    data-testid={`lead-${lead.id}`}
                    onClick={() => { setSelected(lead); setEditForm({ ...lead }); }}
                  >
                    <div className="font-medium leading-tight">{lead.title}</div>
                    {lead.companyName && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Building2 className="w-3 h-3 shrink-0" />{lead.companyName}
                      </div>
                    )}
                    {lead.estimatedValue != null && (
                      <div className="font-semibold text-primary">₹{lead.estimatedValue.toLocaleString("en-IN")}</div>
                    )}
                    <div className="flex items-center justify-between pt-0.5">
                      {lead.source && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${SOURCE_COLORS[lead.source] ?? "bg-muted text-muted-foreground"}`}>
                          {lead.source}
                        </span>
                      )}
                      {lead.ownerName && (
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold ml-auto">
                          {initials(lead.ownerName)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-center text-muted-foreground/50 text-xs py-6">No leads</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New lead dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Company" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} />
              <Input placeholder="Contact name" value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              <Input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  {["Web","Referral","Cold call","LinkedIn","Event","Other"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Est. value (₹)" type="number" value={form.estimatedValue} onChange={e => setForm({ ...form, estimatedValue: e.target.value })} />
            </div>
            <Textarea placeholder="Notes" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            <Button onClick={() => create.mutate()} disabled={!form.title || create.isPending} className="w-full">Create Lead</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead detail drawer */}
      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle className="text-xl">{selected.title}</SheetTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`border ${STAGE_COLORS[selected.status]}`}>{STAGE_LABELS[selected.status]}</Badge>
                  {selected.source && (
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${SOURCE_COLORS[selected.source] ?? "bg-muted text-muted-foreground"}`}>
                      {selected.source}
                    </span>
                  )}
                </div>
              </SheetHeader>

              <div className="space-y-5">
                {/* Contact info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selected.companyName && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="w-4 h-4 shrink-0" /><span>{selected.companyName}</span>
                    </div>
                  )}
                  {selected.contactName && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4 shrink-0" /><span>{selected.contactName}</span>
                    </div>
                  )}
                  {selected.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4 shrink-0" /><a href={`mailto:${selected.email}`} className="hover:underline text-primary">{selected.email}</a>
                    </div>
                  )}
                  {selected.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4 shrink-0" /><span>{selected.phone}</span>
                    </div>
                  )}
                </div>

                {selected.estimatedValue != null && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-0.5">Estimated Value</div>
                    <div className="text-2xl font-bold text-primary">₹{selected.estimatedValue.toLocaleString("en-IN")}</div>
                  </div>
                )}

                {selected.notes && (
                  <div className="bg-muted/40 rounded-lg p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Notes</div>
                    <p className="text-sm whitespace-pre-wrap">{selected.notes}</p>
                  </div>
                )}

                {/* Stage update */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stage</label>
                  <Select value={editForm.status ?? selected.status} onValueChange={v => {
                    setEditForm(f => ({ ...f, status: v }));
                    update.mutate({ id: selected.id, data: { status: v } });
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map(s => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    onClick={() => convert.mutate(selected.id)}
                    disabled={convert.isPending || selected.status === "converted"}
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />Convert to Opportunity
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => del.mutate(selected.id)}
                    disabled={del.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
