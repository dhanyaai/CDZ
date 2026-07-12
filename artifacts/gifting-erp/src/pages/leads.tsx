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
import { useToast } from "@/hooks/use-toast";
import { Plus, ArrowRight, Trash2, Search, Mail, Phone, Building2, IndianRupee, TrendingUp, Users, Target, Zap, CalendarClock, CheckCircle2, UserCircle } from "lucide-react";

type Lead = {
  id: number; title: string; clientId: number | null; companyName: string | null;
  contactName: string | null; email: string | null; phone: string | null;
  source: string | null; status: string; estimatedValue: number | null;
  ownerId: number | null; ownerName: string | null; notes: string | null;
  createdAt: string;
};
type User = { id: number; name: string; role: string };

const STAGES = ["new", "qualified", "proposal", "negotiation", "won", "lost"];
const STAGE_LABELS: Record<string, string> = { new: "New", qualified: "Qualified", proposal: "Proposal", negotiation: "Negotiation", won: "Won", lost: "Lost" };
const STAGE_COLORS: Record<string, string> = {
  new: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  qualified: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  proposal: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  negotiation: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  won: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  lost: "bg-red-500/10 text-red-400 border-red-500/20",
};
const STAGE_HEADER: Record<string, string> = {
  new: "border-t-slate-400", qualified: "border-t-blue-400", proposal: "border-t-violet-400",
  negotiation: "border-t-amber-400", won: "border-t-emerald-400", lost: "border-t-red-400",
};
const SOURCE_COLORS: Record<string, string> = {
  Web: "bg-sky-500/10 text-sky-400", Referral: "bg-emerald-500/10 text-emerald-400",
  "Cold call": "bg-orange-500/10 text-orange-400", LinkedIn: "bg-blue-500/10 text-blue-400",
  Event: "bg-violet-500/10 text-violet-400",
};

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
}

const BLANK_FORM = { title: "", clientId: "", companyName: "", contactName: "", email: "", phone: "", source: "", estimatedValue: "", ownerId: "", notes: "" };

export function Leads() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [followUpForm, setFollowUpForm] = useState({ subject: "", dueDate: "", description: "" });
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);

  const { data: leads, isLoading } = useQuery({ queryKey: ["leads"], queryFn: () => api<Lead[]>("/v1/leads") });
  const { data: clients } = useListClients();
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => api<User[]>("/v1/users") });

  const create = useMutation({
    mutationFn: () => api<Lead>("/v1/leads", {
      method: "POST", body: JSON.stringify({
        title: form.title,
        clientId: form.clientId ? Number(form.clientId) : null,
        companyName: form.companyName || null,
        contactName: form.contactName || null,
        email: form.email || null, phone: form.phone || null,
        source: form.source || null,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : null,
        ownerId: form.ownerId ? Number(form.ownerId) : null,
        notes: form.notes || null,
      }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); setDialog(false); setForm({ ...BLANK_FORM }); toast({ title: "Lead created" }); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Lead> }) =>
      api(`/v1/leads/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); toast({ title: "Lead updated" }); },
  });

  const convert = useMutation({
    mutationFn: (id: number) => api(`/v1/leads/${id}/convert`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); qc.invalidateQueries({ queryKey: ["opportunities"] }); toast({ title: "Converted to opportunity" }); setSelected(null); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/v1/leads/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); toast({ title: "Lead deleted" }); setSelected(null); },
  });

  const scheduleFollowUp = useMutation({
    mutationFn: (leadId: number) => api("/v1/activities", {
      method: "POST",
      body: JSON.stringify({ leadId, type: "follow-up", subject: followUpForm.subject, description: followUpForm.description || undefined, dueDate: followUpForm.dueDate || undefined }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["followups"] }); setFollowUpForm({ subject: "", dueDate: "", description: "" }); setShowFollowUpForm(false); toast({ title: "Follow-up scheduled" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
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
  const activeCount = (leads ?? []).filter(l => !["won", "lost"].includes(l.status)).length;
  const winRate = (leads ?? []).length ? Math.round(((leads ?? []).filter(l => l.status === "won").length / (leads ?? []).length) * 100) : 0;
  const sources = Array.from(new Set((leads ?? []).map(l => l.source).filter(Boolean))) as string[];

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-4 gap-4">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Pipeline", value: `₹${total.toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-primary" },
          { label: "Won Value", value: `₹${wonValue.toLocaleString("en-IN")}`, icon: TrendingUp, color: "text-emerald-500" },
          { label: "Active Leads", value: activeCount, icon: Target, color: "text-amber-500" },
          { label: "Win Rate", value: `${winRate}%`, icon: Zap, color: "text-violet-500" },
        ].map(s => (
          <Card key={s.label} className="elev-1">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 ${s.color}`}><s.icon className="w-5 h-5" /></div>
              <div><div className="text-2xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search leads…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Sources" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

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
                  <div key={lead.id} className="p-2.5 border rounded-lg bg-card text-xs space-y-1.5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
                    data-testid={`lead-${lead.id}`} onClick={() => { setSelected(lead); setEditForm({ ...lead }); }}>
                    <div className="font-medium leading-tight">{lead.title}</div>
                    {lead.companyName && <div className="flex items-center gap-1 text-muted-foreground"><Building2 className="w-3 h-3 shrink-0" />{lead.companyName}</div>}
                    {lead.estimatedValue != null && <div className="font-semibold text-primary">₹{lead.estimatedValue.toLocaleString("en-IN")}</div>}
                    <div className="flex items-center justify-between pt-0.5">
                      {lead.source && <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${SOURCE_COLORS[lead.source] ?? "bg-muted text-muted-foreground"}`}>{lead.source}</span>}
                      {lead.ownerName && <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold ml-auto" title={lead.ownerName}>{initials(lead.ownerName)}</span>}
                    </div>
                  </div>
                ))}
                {items.length === 0 && <div className="text-center text-muted-foreground/50 text-xs py-6">No leads</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* New lead dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Lead Title *</label>
              <Input placeholder="e.g. Diwali Gifting - Infosys 2025" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Link to Existing Client</label>
                <Select value={form.clientId} onValueChange={v => setForm({ ...form, clientId: v, companyName: clients?.find(c => String(c.id) === v)?.companyName ?? form.companyName })}>
                  <SelectTrigger><SelectValue placeholder="Select client…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— None / New prospect —</SelectItem>
                    {clients?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Company Name</label>
                <Input placeholder="If not in client list" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Contact Name</label>
                <Input placeholder="Primary contact" value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Assigned To</label>
                <Select value={form.ownerId} onValueChange={v => setForm({ ...form, ownerId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select salesperson…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Unassigned —</SelectItem>
                    {users?.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.role})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Email</label>
                <Input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Phone</label>
                <Input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Source</label>
                <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue placeholder="Lead source…" /></SelectTrigger>
                  <SelectContent>{["Web", "Referral", "Cold call", "LinkedIn", "Event", "Other"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Estimated Value (₹)</label>
                <Input placeholder="0" type="number" value={form.estimatedValue} onChange={e => setForm({ ...form, estimatedValue: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Notes</label>
              <Textarea placeholder="Additional notes or context…" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
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
                  {selected.source && <span className={`px-2 py-0.5 rounded text-xs font-medium ${SOURCE_COLORS[selected.source] ?? "bg-muted text-muted-foreground"}`}>{selected.source}</span>}
                </div>
              </SheetHeader>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selected.companyName && <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="w-4 h-4 shrink-0" /><span>{selected.companyName}</span></div>}
                  {selected.contactName && <div className="flex items-center gap-2 text-muted-foreground"><Users className="w-4 h-4 shrink-0" /><span>{selected.contactName}</span></div>}
                  {selected.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4 shrink-0" /><a href={`mailto:${selected.email}`} className="hover:underline text-primary">{selected.email}</a></div>}
                  {selected.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4 shrink-0" /><span>{selected.phone}</span></div>}
                  {selected.ownerName && <div className="flex items-center gap-2 text-muted-foreground col-span-2"><UserCircle className="w-4 h-4 shrink-0" /><span>Assigned to <strong>{selected.ownerName}</strong></span></div>}
                </div>
                {selected.estimatedValue != null && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-0.5">Estimated Value</div>
                    <div className="text-2xl font-bold text-primary">₹{selected.estimatedValue.toLocaleString("en-IN")}</div>
                  </div>
                )}
                {selected.notes && <div className="bg-muted/40 rounded-lg p-3"><div className="text-xs font-medium text-muted-foreground mb-1">Notes</div><p className="text-sm whitespace-pre-wrap">{selected.notes}</p></div>}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stage</label>
                  <Select value={editForm.status ?? selected.status} onValueChange={v => { setEditForm(f => ({ ...f, status: v })); update.mutate({ id: selected.id, data: { status: v } }); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setShowFollowUpForm(!showFollowUpForm)}>
                    <CalendarClock className="w-4 h-4 mr-2" />{showFollowUpForm ? "Cancel" : "Schedule Follow-up"}
                  </Button>
                  {showFollowUpForm && (
                    <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                      <Input placeholder="Subject *" value={followUpForm.subject} onChange={e => setFollowUpForm({ ...followUpForm, subject: e.target.value })} />
                      <Input type="date" value={followUpForm.dueDate} onChange={e => setFollowUpForm({ ...followUpForm, dueDate: e.target.value })} />
                      <Textarea placeholder="Notes (optional)" rows={2} value={followUpForm.description} onChange={e => setFollowUpForm({ ...followUpForm, description: e.target.value })} />
                      <Button size="sm" className="w-full" onClick={() => scheduleFollowUp.mutate(selected.id)} disabled={!followUpForm.subject.trim() || scheduleFollowUp.isPending}>
                        <CheckCircle2 className="w-4 h-4 mr-2" />Save Follow-up
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" onClick={() => convert.mutate(selected.id)} disabled={convert.isPending || selected.status === "converted"}>
                    <ArrowRight className="w-4 h-4 mr-2" />Convert to Opportunity
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => del.mutate(selected.id)} disabled={del.isPending}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
