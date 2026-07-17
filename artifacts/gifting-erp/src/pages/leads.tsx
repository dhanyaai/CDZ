import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useListClients, useListProducts } from "@workspace/api-client-react";
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
import { useLocation } from "wouter";
import { Plus, ArrowRight, Trash2, Search, Mail, Phone, Building2, TrendingUp, Users, Target, Zap, CalendarClock, CheckCircle2, UserCircle, LayoutList, Columns3, UserPlus, FileSpreadsheet, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Lead = {
  id: number; title: string; clientId: number | null; companyName: string | null;
  contactName: string | null; email: string | null; phone: string | null;
  source: string | null; status: string; estimatedValue: number | null;
  qty: number | null; budget: number | null; products: string | null;
  deliveryTime: string | null; deliveryDate: string | null; branding: boolean | null;
  percentage: number | null; totalValue: number | null;
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
  Inbound: "bg-sky-500/10 text-sky-400", Outbound: "bg-orange-500/10 text-orange-400",
  Instagram: "bg-pink-500/10 text-pink-400", LinkedIn: "bg-blue-500/10 text-blue-400",
  WhatsApp: "bg-green-500/10 text-green-400", BNI: "bg-red-500/10 text-red-400",
  JCI: "bg-cyan-500/10 text-cyan-400", "Lions Club": "bg-amber-500/10 text-amber-400",
  FTCCI: "bg-indigo-500/10 text-indigo-400", Referral: "bg-emerald-500/10 text-emerald-400",
  Others: "bg-slate-500/10 text-slate-400",
};

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
}

const BLANK_FORM = {
  title: "", clientId: "", companyName: "", contactName: "", email: "", phone: "", source: "",
  qty: "", budget: "", products: [] as string[], deliveryTime: "", deliveryDate: "", branding: "", percentage: "",
  ownerId: "", notes: "",
};

export function Leads() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [followUpForm, setFollowUpForm] = useState({ subject: "", dueDate: "", description: "" });
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);

  const [, navigate] = useLocation();
  const { data: leads, isLoading } = useQuery({ queryKey: ["leads"], queryFn: () => api<Lead[]>("/v1/leads") });
  const { data: clients } = useListClients();
  const { data: productList } = useListProducts();
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => api<User[]>("/v1/users") });

  const budgetNum = Number(form.budget) || 0;
  const pctNum = Number(form.percentage) || 0;
  const computedTotal = budgetNum + (budgetNum * pctNum) / 100;

  const create = useMutation({
    mutationFn: () => api<Lead>("/v1/leads", {
      method: "POST", body: JSON.stringify({
        title: form.title,
        clientId: form.clientId ? Number(form.clientId) : null,
        companyName: form.companyName || null,
        contactName: form.contactName || null,
        email: form.email || null, phone: form.phone || null,
        source: form.source || null,
        qty: form.qty ? Number(form.qty) : null,
        budget: form.budget ? Number(form.budget) : null,
        products: form.products.length ? form.products.join(",") : null,
        deliveryTime: form.deliveryTime || null,
        deliveryDate: form.deliveryDate ? new Date(form.deliveryDate).toISOString() : null,
        branding: form.branding === "yes" ? true : form.branding === "no" ? false : null,
        percentage: form.percentage ? Number(form.percentage) : null,
        totalValue: form.budget ? computedTotal : null,
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

  const convertToClient = useMutation({
    mutationFn: (id: number) => api<{ id: number; companyName: string; alreadyExisted?: boolean }>(`/v1/leads/${id}/convert-to-client`, { method: "POST" }),
    onSuccess: (client, id) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      const msg = client.alreadyExisted ? `Already linked to client "${client.companyName}"` : `Client "${client.companyName}" created`;
      toast({ title: msg, description: "You can now create a quote for this client." });
      setSelected(prev => prev?.id === id ? { ...prev, clientId: client.id } : prev);
    },
    onError: (e: Error) => toast({ title: "Cannot convert to client", description: e.message, variant: "destructive" }),
  });

  const filtered = (leads ?? []).filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.title.toLowerCase().includes(q) || (l.companyName ?? "").toLowerCase().includes(q) || (l.contactName ?? "").toLowerCase().includes(q);
    const matchSource = sourceFilter === "all" || l.source === sourceFilter;
    return matchSearch && matchSource;
  });

  const byStatus = (status: string) => filtered.filter(l => l.status === status);
  const totalLeads = (leads ?? []).length;
  const wonCount = (leads ?? []).filter(l => l.status === "won").length;
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
          { label: "Total Leads", value: totalLeads, icon: Users, color: "text-primary" },
          { label: "Won Leads", value: wonCount, icon: TrendingUp, color: "text-emerald-500" },
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

      <div className="flex flex-wrap gap-3 items-center">
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
        <div className="flex items-center border rounded-lg overflow-hidden shrink-0">
          <button
            className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${viewMode === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            onClick={() => setViewMode("kanban")}
            title="Kanban view"
          >
            <Columns3 className="w-4 h-4" />
            <span className="hidden sm:inline">Kanban</span>
          </button>
          <button
            className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            onClick={() => setViewMode("list")}
            title="List view"
          >
            <LayoutList className="w-4 h-4" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

      {viewMode === "list" && (
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[260px]">Lead</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>POC Contact</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No leads match your filters.</TableCell>
                </TableRow>
              )}
              {filtered.map(lead => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => { setSelected(lead); setEditForm({ ...lead }); }}
                >
                  <TableCell className="font-medium max-w-[260px]">
                    <div className="truncate">{lead.title}</div>
                    {lead.email && <div className="text-xs text-muted-foreground truncate">{lead.email}</div>}
                  </TableCell>
                  <TableCell>
                    {lead.companyName ? (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {lead.companyName}
                      </div>
                    ) : <span className="text-muted-foreground/50 text-xs">—</span>}
                  </TableCell>
                  <TableCell>
                    {lead.contactName ? (
                      <div className="text-sm">
                        <div>{lead.contactName}</div>
                        {lead.phone && <div className="text-xs text-muted-foreground">{lead.phone}</div>}
                      </div>
                    ) : <span className="text-muted-foreground/50 text-xs">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge className={`border text-xs ${STAGE_COLORS[lead.status] ?? ""}`}>{STAGE_LABELS[lead.status] ?? lead.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {lead.source
                      ? <span className={`px-2 py-0.5 rounded text-xs font-medium ${SOURCE_COLORS[lead.source] ?? "bg-muted text-muted-foreground"}`}>{lead.source}</span>
                      : <span className="text-muted-foreground/50 text-xs">—</span>}
                  </TableCell>
                  <TableCell>
                    {lead.ownerName
                      ? <div className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">{initials(lead.ownerName)}</span><span className="text-sm truncate max-w-[80px]">{lead.ownerName}</span></div>
                      : <span className="text-muted-foreground/50 text-xs">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {viewMode === "kanban" && <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAGES.map(stage => {
          const items = byStatus(stage);
          return (
            <div key={stage} className={`flex flex-col min-h-[300px] rounded-xl border border-t-2 bg-card/50 ${STAGE_HEADER[stage]}`}>
              <div className="p-3 border-b border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{STAGE_LABELS[stage]}</span>
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                </div>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {items.map(lead => (
                  <div key={lead.id} className="p-2.5 border rounded-lg bg-card text-xs space-y-1.5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
                    data-testid={`lead-${lead.id}`} onClick={() => { setSelected(lead); setEditForm({ ...lead }); }}>
                    <div className="font-medium leading-tight">{lead.title}</div>
                    {lead.companyName && <div className="flex items-center gap-1 text-muted-foreground"><Building2 className="w-3 h-3 shrink-0" />{lead.companyName}</div>}
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
      </div>}

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
                <Select value={form.clientId || "__none__"} onValueChange={v => setForm({ ...form, clientId: v === "__none__" ? "" : v, companyName: v !== "__none__" ? (clients?.find(c => String(c.id) === v)?.companyName ?? form.companyName) : form.companyName })}>
                  <SelectTrigger><SelectValue placeholder="Select client…" /></SelectTrigger>
                  <SelectContent position="popper" className="max-h-60">
                    <SelectItem value="__none__">— None / New prospect —</SelectItem>
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
                <label className="text-sm font-medium">POC Contact</label>
                <Input placeholder="Point of contact" value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Assigned To</label>
                <Select value={form.ownerId || "__none__"} onValueChange={v => setForm({ ...form, ownerId: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select salesperson…" /></SelectTrigger>
                  <SelectContent position="popper" className="max-h-60">
                    <SelectItem value="__none__">— Unassigned —</SelectItem>
                    {users?.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.role})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">POC Email</label>
                <Input placeholder="POC email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">POC Phone</label>
                <Input placeholder="POC phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Source</label>
                <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue placeholder="Lead source…" /></SelectTrigger>
                  <SelectContent position="popper">{["Inbound", "Outbound", "Instagram", "LinkedIn", "WhatsApp", "BNI", "JCI", "Lions Club", "FTCCI", "Referral", "Others"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Qty</label>
                <Input placeholder="0" type="number" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Budget (₹)</label>
                <Input placeholder="0" type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Branding</label>
                <Select value={form.branding || "__none__"} onValueChange={v => setForm({ ...form, branding: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Yes / No" /></SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="__none__">— Not set —</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Products</label>
              <Select value="" onValueChange={p => { if (p && !form.products.includes(p)) setForm({ ...form, products: [...form.products, p] }); }}>
                <SelectTrigger><SelectValue placeholder="Add product…" /></SelectTrigger>
                <SelectContent position="popper" className="max-h-60">
                  {productList?.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.products.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {form.products.map(p => (
                    <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      #{p}
                      <button type="button" className="hover:text-destructive" onClick={() => setForm({ ...form, products: form.products.filter(x => x !== p) })}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Delivery Time</label>
                <Input placeholder="e.g. 10 days" value={form.deliveryTime} onChange={e => setForm({ ...form, deliveryTime: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Delivery Date</label>
                <Input type="date" value={form.deliveryDate} onChange={e => setForm({ ...form, deliveryDate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Percentage (%)</label>
                <Input placeholder="0" type="number" value={form.percentage} onChange={e => setForm({ ...form, percentage: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Total Value (₹)</label>
                <Input readOnly value={form.budget ? computedTotal.toLocaleString("en-IN") : ""} placeholder="Budget + %" className="bg-muted/50" />
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
                {(selected.qty != null || selected.budget != null || selected.deliveryTime || selected.deliveryDate || selected.branding != null || selected.percentage != null) && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-muted/40 rounded-lg p-3">
                    {selected.qty != null && <div><span className="text-xs text-muted-foreground block">Qty</span>{selected.qty.toLocaleString("en-IN")}</div>}
                    {selected.budget != null && <div><span className="text-xs text-muted-foreground block">Budget</span>₹{selected.budget.toLocaleString("en-IN")}</div>}
                    {selected.branding != null && <div><span className="text-xs text-muted-foreground block">Branding</span>{selected.branding ? "Yes" : "No"}</div>}
                    {selected.percentage != null && <div><span className="text-xs text-muted-foreground block">Percentage</span>{selected.percentage}%</div>}
                    {selected.deliveryTime && <div><span className="text-xs text-muted-foreground block">Delivery Time</span>{selected.deliveryTime}</div>}
                    {selected.deliveryDate && <div><span className="text-xs text-muted-foreground block">Delivery Date</span>{new Date(selected.deliveryDate).toLocaleDateString("en-IN")}</div>}
                  </div>
                )}
                {selected.products && (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.products.split(",").map(p => <span key={p} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">#{p.trim()}</span>)}
                  </div>
                )}
                {selected.totalValue != null && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-0.5">Total Value (Budget + {selected.percentage ?? 0}%)</div>
                    <div className="text-2xl font-bold text-primary">₹{selected.totalValue.toLocaleString("en-IN")}</div>
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
                {/* Convert to Client */}
                <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quote Readiness</div>
                  {selected.clientId ? (
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-500 flex-1">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        Linked to a client — ready to quote
                      </div>
                      <Button size="sm" variant="outline" className="shrink-0" onClick={() => { setSelected(null); navigate("/quotes"); }}>
                        <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />Create Quote
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">
                        This lead is not yet a client. Convert it first, then create a quote.
                        {!selected.email && <span className="text-amber-500 block mt-0.5">⚠ Add an email to this lead first.</span>}
                      </p>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => convertToClient.mutate(selected.id)}
                        disabled={convertToClient.isPending || !selected.email}>
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                        {convertToClient.isPending ? "Converting…" : "Convert to Client"}
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
