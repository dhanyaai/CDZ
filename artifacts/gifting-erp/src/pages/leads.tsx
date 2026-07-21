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
import { Plus, ArrowRight, Trash2, Search, Mail, Phone, Building2, TrendingUp, Users, Target, Zap, CalendarClock, CheckCircle2, UserCircle, UserPlus, FileSpreadsheet, X, History, Briefcase, FileText, ShoppingCart, Truck, Receipt, Activity } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LeadItem = {
  id: number; leadId: number; slNo: number;
  productName: string | null; customProduct: string | null;
  qty: number | null; budget: number | null; margin: number | null;
  createdAt: string;
};
type FormItem = { tempId: string; productName: string; customProduct: string; qty: string; budget: string; margin: string; };
const blankItem = (): FormItem => ({ tempId: Math.random().toString(36).slice(2), productName: "", customProduct: "", qty: "", budget: "", margin: "" });

type LeadHistory = {
  opportunities: { id: number; title: string; stage: string; value: number | null; createdAt: string }[];
  quotes: { id: number; quoteNumber: string; subject: string | null; status: string; totalAmount: number; opportunityId: number | null; createdAt: string }[];
  salesOrders: { id: number; orderNumber: string; status: string; grandTotal: number; quoteId: number | null; createdAt: string }[];
  shipments: { id: number; shipmentNumber: string; status: string; courierPartner: string; dispatchDate: string | null; salesOrderId: number; createdAt: string }[];
  invoices: { id: number; invoiceNumber: string; status: string; grandTotal: number; salesOrderId: number; createdAt: string }[];
  activities: { id: number; type: string; subject: string; dueDate: string | null; completedAt: string | null; createdAt: string }[];
};

type Lead = {
  id: number; title: string; clientId: number | null; companyName: string | null;
  contactName: string | null; email: string | null; phone: string | null;
  source: string | null; status: string; estimatedValue: number | null;
  qty: number | null; budget: number | null; products: string | null;
  customProducts: string | null;
  leadDate: string | null;
  deliveryTime: string | null; deliveryDate: string | null;
  cityOfDelivery: string | null;
  branding: boolean | null;
  percentage: number | null; totalValue: number | null;
  ownerId: number | null; ownerName: string | null; notes: string | null;
  createdAt: string;
};
type User = { id: number; name: string; role: string };

const SOURCE_COLORS: Record<string, string> = {
  "Inbound Call": "bg-sky-500/10 text-sky-400", "Outbound Call": "bg-orange-500/10 text-orange-400",
  Instagram: "bg-pink-500/10 text-pink-400", LinkedIn: "bg-blue-500/10 text-blue-400",
  WhatsApp: "bg-green-500/10 text-green-400", BNI: "bg-red-500/10 text-red-400",
  JCI: "bg-cyan-500/10 text-cyan-400", "Lions Club": "bg-amber-500/10 text-amber-400",
  FTCCI: "bg-indigo-500/10 text-indigo-400", Refference: "bg-emerald-500/10 text-emerald-400",
  Others: "bg-slate-500/10 text-slate-400",
};

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
}

const BLANK_FORM = {
  title: "", clientId: "", companyName: "", contactName: "", email: "", phone: "", source: "",
  leadDate: "", deliveryTime: "", deliveryDate: "", cityOfDelivery: "",
  totalQty: "", totalBudgetPerPiece: "", margin: "",
  branding: "", ownerId: "", notes: "",
};

export function Leads() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [formItems, setFormItems] = useState<FormItem[]>([blankItem()]);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [editItems, setEditItems] = useState<FormItem[]>([]);
  const [followUpForm, setFollowUpForm] = useState({ subject: "", dueDate: "", description: "" });
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [detailTab, setDetailTab] = useState<"details" | "history">("details");

  const [, navigate] = useLocation();
  const { data: leads, isLoading } = useQuery({ queryKey: ["leads"], queryFn: () => api<Lead[]>("/v1/leads") });
  const { data: clients } = useListClients();
  const { data: productList } = useListProducts();
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => api<User[]>("/v1/users") });

  const selectedId = selected?.id ?? null;
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["lead-history", selectedId],
    queryFn: () => api<LeadHistory>(`/v1/leads/${selectedId}/history`),
    enabled: selectedId != null && detailTab === "history",
  });
  const { data: leadItems, isLoading: itemsLoading } = useQuery({
    queryKey: ["lead-items", selectedId],
    queryFn: () => api<LeadItem[]>(`/v1/leads/${selectedId}/items`),
    enabled: selectedId != null,
  });

  const formTotal = formItems.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.budget) || 0), 0);

  const create = useMutation({
    mutationFn: async () => {
      const lead = await api<Lead>("/v1/leads", {
        method: "POST", body: JSON.stringify({
          title: form.title,
          clientId: form.clientId ? Number(form.clientId) : null,
          companyName: form.companyName || null,
          contactName: form.contactName || null,
          email: form.email || null, phone: form.phone || null,
          source: form.source || null,
          leadDate: form.leadDate ? new Date(form.leadDate).toISOString() : null,
          deliveryTime: form.deliveryTime || null,
          deliveryDate: form.deliveryDate ? new Date(form.deliveryDate).toISOString() : null,
          cityOfDelivery: form.cityOfDelivery || null,
          branding: form.branding === "yes" ? true : form.branding === "no" ? false : null,
          qty: form.totalQty ? Number(form.totalQty) : null,
          budget: form.totalBudgetPerPiece ? Number(form.totalBudgetPerPiece) : null,
          percentage: form.margin ? Number(form.margin) : null,
          totalValue: formTotal || null,
          ownerId: form.ownerId ? Number(form.ownerId) : null,
          notes: form.notes || null,
        }),
      });
      const validItems = formItems.filter(i => i.productName || i.customProduct || i.qty || i.budget || i.margin);
      for (let idx = 0; idx < validItems.length; idx++) {
        const item = validItems[idx];
        await api(`/v1/leads/${lead.id}/items`, {
          method: "POST", body: JSON.stringify({
            slNo: idx + 1,
            productName: item.productName || null,
            customProduct: item.customProduct || null,
            qty: item.qty ? Number(item.qty) : null,
            budget: item.budget ? Number(item.budget) : null,
            margin: item.margin ? Number(item.margin) : null,
          }),
        });
      }
      return lead;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); setDialog(false); setForm({ ...BLANK_FORM }); setFormItems([blankItem()]); toast({ title: "Lead created" }); },
    onError: (e: Error) => toast({ title: "Failed to create lead", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, data, items }: { id: number; data: Partial<Lead>; items: FormItem[] }) => {
      const lead = await api<Lead>(`/v1/leads/${id}`, { method: "PATCH", body: JSON.stringify(data) });
      await api(`/v1/leads/${id}/items`, { method: "DELETE" });
      const validItems = items.filter(i => i.productName || i.customProduct || i.qty || i.budget || i.margin);
      for (let idx = 0; idx < validItems.length; idx++) {
        const item = validItems[idx];
        await api(`/v1/leads/${id}/items`, {
          method: "POST", body: JSON.stringify({
            slNo: idx + 1,
            productName: item.productName || null,
            customProduct: item.customProduct || null,
            qty: item.qty ? Number(item.qty) : null,
            budget: item.budget ? Number(item.budget) : null,
            margin: item.margin ? Number(item.margin) : null,
          }),
        });
      }
      return lead;
    },
    onSuccess: (updatedLead) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead-items", updatedLead.id] });
      setSelected(updatedLead);
      setEditMode(false);
      toast({ title: "Lead updated" });
    },
    onError: (e: Error) => toast({ title: "Failed to update", description: e.message, variant: "destructive" }),
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
        <Button onClick={() => { setDialog(true); setForm(f => ({ ...f, leadDate: new Date().toISOString().split("T")[0] })); }} data-testid="button-new-lead">
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
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[260px]">Lead</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>POC Contact</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Owner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No leads match your filters.</TableCell>
              </TableRow>
            )}
            {filtered.map(lead => (
              <TableRow
                key={lead.id}
                className="cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => { setSelected(lead); setEditForm({ ...lead }); setDetailTab("details"); }}
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


      {/* New lead dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-5xl w-[97vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
          <div className="space-y-4">

            {/* Row 1: Lead Title | Assigned To | Lead Date */}
            <div className="grid grid-cols-[2fr_1.5fr_1fr] gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Lead Title *</label>
                <Input placeholder="e.g. Diwali Gifting - Infosys 2025" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
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
              <div className="space-y-1">
                <label className="text-sm font-medium">Lead Date</label>
                <Input type="date" value={form.leadDate} readOnly className="bg-muted/50 cursor-not-allowed" />
              </div>
            </div>

            {/* Row 2: Link to Client | Company Name | POC Name | POC Phone | POC Email */}
            <div className="grid grid-cols-5 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Link to Existing Client</label>
                <Select value={form.clientId || "__none__"} onValueChange={v => setForm({ ...form, clientId: v === "__none__" ? "" : v, companyName: v !== "__none__" ? (clients?.find(c => String(c.id) === v)?.companyName ?? form.companyName) : form.companyName })}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select client…" /></SelectTrigger>
                  <SelectContent position="popper" className="max-h-60">
                    <SelectItem value="__none__">— None / New prospect —</SelectItem>
                    {clients?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Company Name</label>
                <Input placeholder="If not in list" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">POC Name</label>
                <Input placeholder="Contact name" value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">POC Phone</label>
                <Input placeholder="Phone number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">POC Email</label>
                <Input placeholder="Email address" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>

            {/* Total QTY / Budget per Piece / Total Budget / Margin */}
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Total QTY</label>
                <Input type="number" placeholder="0" value={form.totalQty} onChange={e => setForm({ ...form, totalQty: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Budget per Piece (₹)</label>
                <Input type="number" placeholder="0" value={form.totalBudgetPerPiece} onChange={e => setForm({ ...form, totalBudgetPerPiece: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Total Budget (₹)</label>
                <Input
                  readOnly
                  value={
                    form.totalQty && form.totalBudgetPerPiece
                      ? (Number(form.totalQty) * Number(form.totalBudgetPerPiece)).toLocaleString("en-IN")
                      : ""
                  }
                  placeholder="Auto-calculated"
                  className="bg-muted text-muted-foreground cursor-default"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Margin (%)</label>
                <Input type="number" placeholder="0" value={form.margin} onChange={e => setForm({ ...form, margin: e.target.value })} />
              </div>
            </div>

            {/* Row 3: Source + Branding */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Source</label>
                <Select value={form.source || "__none__"} onValueChange={v => setForm({ ...form, source: v === "__none__" ? "" : v })}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Source…" /></SelectTrigger>
                  <SelectContent position="popper">{["__none__", "Inbound Call", "Outbound Call", "Instagram", "LinkedIn", "WhatsApp", "BNI", "JCI", "Lions Club", "FTCCI", "Refference", "Others"].map(s => <SelectItem key={s} value={s}>{s === "__none__" ? "— None —" : s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Branding</label>
                <Select value={form.branding || "__none__"} onValueChange={v => setForm({ ...form, branding: v === "__none__" ? "" : v })}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Yes / No" /></SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="__none__">— Not set —</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Products table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Products</label>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2"
                  onClick={() => setFormItems(prev => [...prev, blankItem()])}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Add Row
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-10">Sl No</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Products</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Custom Products</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-20">Qty</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-28">Budget (₹)</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-24">Margin (%)</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formItems.map((item, idx) => (
                      <tr key={item.tempId} className="border-t">
                        <td className="px-3 py-1.5 text-xs text-muted-foreground">{idx + 1}</td>
                        <td className="px-2 py-1.5">
                          <Select value={item.productName || "__none__"} onValueChange={v => setFormItems(prev => prev.map(i => i.tempId === item.tempId ? { ...i, productName: v === "__none__" ? "" : v } : i))}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
                            <SelectContent position="popper" className="max-h-60">
                              <SelectItem value="__none__">— None —</SelectItem>
                              {productList?.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs" placeholder="Custom product" value={item.customProduct}
                            onChange={e => setFormItems(prev => prev.map(i => i.tempId === item.tempId ? { ...i, customProduct: e.target.value } : i))} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs" type="number" placeholder="0" value={item.qty}
                            onChange={e => setFormItems(prev => prev.map(i => i.tempId === item.tempId ? { ...i, qty: e.target.value } : i))} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs" type="number" placeholder="0" value={item.budget}
                            onChange={e => setFormItems(prev => prev.map(i => i.tempId === item.tempId ? { ...i, budget: e.target.value } : i))} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs" type="number" placeholder="0" value={item.margin}
                            onChange={e => setFormItems(prev => prev.map(i => i.tempId === item.tempId ? { ...i, margin: e.target.value } : i))} />
                        </td>
                        <td className="px-2 py-1.5">
                          <button type="button" onClick={() => setFormItems(prev => prev.filter(i => i.tempId !== item.tempId))}
                            className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {formItems.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-4 text-xs text-muted-foreground">No products yet — click "Add Row"</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {formTotal > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-sm flex items-center justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-primary">₹{formTotal.toLocaleString("en-IN")}</span>
                </div>
              )}
            </div>

            {/* Row 5: Delivery Date | Delivery Time | City Of Delivery */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Delivery Date</label>
                <Input type="date" value={form.deliveryDate} onChange={e => setForm({ ...form, deliveryDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Delivery Time</label>
                <Input placeholder="e.g. 10 days" value={form.deliveryTime} onChange={e => setForm({ ...form, deliveryTime: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">City Of Delivery</label>
                <Input placeholder="e.g. Hyderabad" value={form.cityOfDelivery} onChange={e => setForm({ ...form, cityOfDelivery: e.target.value })} />
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
      <Sheet open={!!selected} onOpenChange={o => { if (!o) { setSelected(null); setEditMode(false); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-start justify-between gap-2">
                  <SheetTitle className="text-xl leading-snug">{editMode ? "Edit Lead" : selected.title}</SheetTitle>
                  {!editMode ? (
                    <Button size="sm" variant="outline" className="shrink-0 h-8 text-xs px-3 mt-0.5"
                      onClick={() => {
                        setEditForm({ ...selected });
                        setEditItems((leadItems ?? []).map(item => ({
                          tempId: String(item.id),
                          productName: item.productName ?? "",
                          customProduct: item.customProduct ?? "",
                          qty: item.qty != null ? String(item.qty) : "",
                          budget: item.budget != null ? String(item.budget) : "",
                          margin: item.margin != null ? String(item.margin) : "",
                        })));
                        setEditMode(true);
                      }}>
                      Edit Lead
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" className="shrink-0 h-8 text-xs px-3 mt-0.5" onClick={() => setEditMode(false)}>
                      Cancel
                    </Button>
                  )}
                </div>
                {!editMode && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {selected.source && <span className={`px-2 py-0.5 rounded text-xs font-medium ${SOURCE_COLORS[selected.source] ?? "bg-muted text-muted-foreground"}`}>{selected.source}</span>}
                  </div>
                )}
              </SheetHeader>

              {/* ── EDIT MODE ── */}
              {editMode && (() => {
                const editTotal = editItems.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.budget) || 0), 0);
                const saveEdit = () => {
                  update.mutate({
                    id: selected.id,
                    data: {
                      title: editForm.title ?? selected.title,
                      companyName: editForm.companyName ?? null,
                      contactName: editForm.contactName ?? null,
                      email: editForm.email ?? null,
                      phone: editForm.phone ?? null,
                      source: editForm.source ?? null,
                      status: editForm.status ?? selected.status,
                      ownerId: editForm.ownerId ?? null,
                      clientId: editForm.clientId ?? null,
                      totalValue: editTotal || null,
                      branding: editForm.branding ?? null,
                      deliveryDate: editForm.deliveryDate ?? null,
                      deliveryTime: editForm.deliveryTime ?? null,
                      cityOfDelivery: editForm.cityOfDelivery ?? null,
                      notes: editForm.notes ?? null,
                    },
                    items: editItems,
                  });
                };
                return (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lead Title *</label>
                      <Input value={editForm.title ?? ""} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} placeholder="Lead title" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Source</label>
                      <Select value={editForm.source ?? "__none__"} onValueChange={v => setEditForm(f => ({ ...f, source: v === "__none__" ? null : v }))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Source…" /></SelectTrigger>
                        <SelectContent position="popper">{["__none__", "Inbound Call", "Outbound Call", "Instagram", "LinkedIn", "WhatsApp", "BNI", "JCI", "Lions Club", "FTCCI", "Refference", "Others"].map(s => <SelectItem key={s} value={s}>{s === "__none__" ? "— None —" : s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assigned To</label>
                        <Select value={editForm.ownerId != null ? String(editForm.ownerId) : "__none__"} onValueChange={v => setEditForm(f => ({ ...f, ownerId: v === "__none__" ? null : Number(v) }))}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Assign…" /></SelectTrigger>
                          <SelectContent position="popper" className="max-h-60">
                            <SelectItem value="__none__">— Unassigned —</SelectItem>
                            {users?.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Link to Client</label>
                        <Select value={editForm.clientId != null ? String(editForm.clientId) : "__none__"} onValueChange={v => setEditForm(f => ({ ...f, clientId: v === "__none__" ? null : Number(v) }))}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Client…" /></SelectTrigger>
                          <SelectContent position="popper" className="max-h-60">
                            <SelectItem value="__none__">— None —</SelectItem>
                            {clients?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company Name</label>
                        <Input className="h-8 text-sm" value={editForm.companyName ?? ""} onChange={e => setEditForm(f => ({ ...f, companyName: e.target.value || null }))} placeholder="Company" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact Name</label>
                        <Input className="h-8 text-sm" value={editForm.contactName ?? ""} onChange={e => setEditForm(f => ({ ...f, contactName: e.target.value || null }))} placeholder="POC name" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</label>
                        <Input className="h-8 text-sm" value={editForm.phone ?? ""} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value || null }))} placeholder="Phone" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</label>
                        <Input className="h-8 text-sm" type="email" value={editForm.email ?? ""} onChange={e => setEditForm(f => ({ ...f, email: e.target.value || null }))} placeholder="Email" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Branding</label>
                      <Select value={editForm.branding === true ? "yes" : editForm.branding === false ? "no" : "__none__"} onValueChange={v => setEditForm(f => ({ ...f, branding: v === "__none__" ? null : v === "yes" }))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Yes / No" /></SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value="__none__">— Not set —</SelectItem>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Delivery Date</label>
                        <Input className="h-8 text-sm" type="date" value={editForm.deliveryDate ? editForm.deliveryDate.split("T")[0] : ""} onChange={e => setEditForm(f => ({ ...f, deliveryDate: e.target.value || null }))} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Delivery Time</label>
                        <Input className="h-8 text-sm" value={editForm.deliveryTime ?? ""} onChange={e => setEditForm(f => ({ ...f, deliveryTime: e.target.value || null }))} placeholder="e.g. 10 days" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">City</label>
                        <Input className="h-8 text-sm" value={editForm.cityOfDelivery ?? ""} onChange={e => setEditForm(f => ({ ...f, cityOfDelivery: e.target.value || null }))} placeholder="Hyderabad" />
                      </div>
                    </div>

                    {/* Products table */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Products</label>
                        <Button type="button" variant="outline" size="sm" className="h-6 text-xs px-2"
                          onClick={() => setEditItems(prev => [...prev, blankItem()])}>
                          <Plus className="w-3 h-3 mr-1" />Add Row
                        </Button>
                      </div>
                      <div className="border rounded-lg overflow-auto">
                        <table className="w-full text-xs min-w-[460px]">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left px-2 py-1.5 font-medium text-muted-foreground w-8">#</th>
                              <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Product</th>
                              <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Custom</th>
                              <th className="text-left px-2 py-1.5 font-medium text-muted-foreground w-14">Qty</th>
                              <th className="text-left px-2 py-1.5 font-medium text-muted-foreground w-20">Budget</th>
                              <th className="text-left px-2 py-1.5 font-medium text-muted-foreground w-16">Margin%</th>
                              <th className="w-6"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {editItems.map((item, idx) => (
                              <tr key={item.tempId} className="border-t">
                                <td className="px-2 py-1 text-muted-foreground">{idx + 1}</td>
                                <td className="px-1 py-1">
                                  <Select value={item.productName || "__none__"} onValueChange={v => setEditItems(prev => prev.map(i => i.tempId === item.tempId ? { ...i, productName: v === "__none__" ? "" : v } : i))}>
                                    <SelectTrigger className="h-6 text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
                                    <SelectContent position="popper" className="max-h-52">
                                      <SelectItem value="__none__">— None —</SelectItem>
                                      {productList?.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="px-1 py-1">
                                  <Input className="h-6 text-xs" placeholder="Custom…" value={item.customProduct}
                                    onChange={e => setEditItems(prev => prev.map(i => i.tempId === item.tempId ? { ...i, customProduct: e.target.value } : i))} />
                                </td>
                                <td className="px-1 py-1">
                                  <Input className="h-6 text-xs" type="number" placeholder="0" value={item.qty}
                                    onChange={e => setEditItems(prev => prev.map(i => i.tempId === item.tempId ? { ...i, qty: e.target.value } : i))} />
                                </td>
                                <td className="px-1 py-1">
                                  <Input className="h-6 text-xs" type="number" placeholder="0" value={item.budget}
                                    onChange={e => setEditItems(prev => prev.map(i => i.tempId === item.tempId ? { ...i, budget: e.target.value } : i))} />
                                </td>
                                <td className="px-1 py-1">
                                  <Input className="h-6 text-xs" type="number" placeholder="0" value={item.margin}
                                    onChange={e => setEditItems(prev => prev.map(i => i.tempId === item.tempId ? { ...i, margin: e.target.value } : i))} />
                                </td>
                                <td className="px-1 py-1">
                                  <button type="button" onClick={() => setEditItems(prev => prev.filter(i => i.tempId !== item.tempId))}
                                    className="text-muted-foreground hover:text-destructive transition-colors">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {editItems.length === 0 && (
                              <tr><td colSpan={7} className="text-center py-3 text-xs text-muted-foreground">No products — click "Add Row"</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      {editTotal > 0 && (
                        <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-1.5 text-xs flex items-center justify-between">
                          <span className="text-muted-foreground">Total</span>
                          <span className="font-bold text-primary">₹{editTotal.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</label>
                      <Textarea rows={3} value={editForm.notes ?? ""} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value || null }))} placeholder="Additional notes…" />
                    </div>

                    <Button onClick={saveEdit} disabled={!editForm.title?.trim() || update.isPending} className="w-full">
                      {update.isPending ? "Saving…" : "Save Changes"}
                    </Button>
                  </div>
                );
              })()}

              {/* ── READ-ONLY VIEW MODE ── */}
              {!editMode && <div className="space-y-5">
                {/* Tab strip */}
                <div className="flex border-b">
                  <button
                    onClick={() => setDetailTab("details")}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${detailTab === "details" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  >
                    <FileText className="w-3.5 h-3.5" />Details
                  </button>
                  <button
                    onClick={() => setDetailTab("history")}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${detailTab === "history" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  >
                    <History className="w-3.5 h-3.5" />History
                  </button>
                </div>

                {/* ── HISTORY TAB ── */}
                {detailTab === "history" && (
                  <div className="space-y-4">
                    {historyLoading && <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>}
                    {!historyLoading && history && (() => {
                      const totalCount = history.opportunities.length + history.quotes.length + history.salesOrders.length + history.shipments.length + history.invoices.length + history.activities.length;
                      if (totalCount === 0) return (
                        <div className="text-center py-10 text-muted-foreground">
                          <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No linked records yet</p>
                        </div>
                      );
                      const statusColor = (s: string) => {
                        const sl = s.toLowerCase();
                        if (["won", "confirmed", "delivered", "paid", "sent"].includes(sl)) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                        if (["lost", "cancelled", "overdue"].includes(sl)) return "bg-red-500/10 text-red-400 border-red-500/20";
                        if (["draft", "preparing"].includes(sl)) return "bg-slate-500/10 text-slate-400 border-slate-500/20";
                        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
                      };
                      return (
                        <div className="space-y-4">
                          {/* Opportunities */}
                          {history.opportunities.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                <Briefcase className="w-3.5 h-3.5" />Opportunities ({history.opportunities.length})
                              </div>
                              <div className="space-y-1.5">
                                {history.opportunities.map(o => (
                                  <div key={o.id} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
                                    <div>
                                      <div className="font-medium">{o.title}</div>
                                      <div className="text-xs text-muted-foreground capitalize">{o.stage} · {new Date(o.createdAt).toLocaleDateString("en-IN")}</div>
                                    </div>
                                    {o.value != null && <div className="text-xs font-semibold text-primary shrink-0">₹{o.value.toLocaleString("en-IN")}</div>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Quotes */}
                          {history.quotes.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                <FileText className="w-3.5 h-3.5" />Sales Quotes ({history.quotes.length})
                              </div>
                              <div className="space-y-1.5">
                                {history.quotes.map(q => (
                                  <div key={q.id} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
                                    <div>
                                      <div className="font-medium">{q.quoteNumber}{q.subject ? ` — ${q.subject}` : ""}</div>
                                      <div className="text-xs text-muted-foreground">{new Date(q.createdAt).toLocaleDateString("en-IN")}</div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={`px-1.5 py-0.5 rounded text-xs border ${statusColor(q.status)}`}>{q.status}</span>
                                      <span className="text-xs font-semibold text-primary">₹{q.totalAmount.toLocaleString("en-IN")}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Sales Orders */}
                          {history.salesOrders.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                <ShoppingCart className="w-3.5 h-3.5" />Sales Orders ({history.salesOrders.length})
                              </div>
                              <div className="space-y-1.5">
                                {history.salesOrders.map(so => (
                                  <div key={so.id} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
                                    <div>
                                      <div className="font-medium">{so.orderNumber}</div>
                                      <div className="text-xs text-muted-foreground">{new Date(so.createdAt).toLocaleDateString("en-IN")}</div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={`px-1.5 py-0.5 rounded text-xs border ${statusColor(so.status)}`}>{so.status}</span>
                                      <span className="text-xs font-semibold text-primary">₹{so.grandTotal.toLocaleString("en-IN")}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Invoices */}
                          {history.invoices.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                <Receipt className="w-3.5 h-3.5" />Invoices ({history.invoices.length})
                              </div>
                              <div className="space-y-1.5">
                                {history.invoices.map(inv => (
                                  <div key={inv.id} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
                                    <div>
                                      <div className="font-medium">{inv.invoiceNumber}</div>
                                      <div className="text-xs text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString("en-IN")}</div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={`px-1.5 py-0.5 rounded text-xs border ${statusColor(inv.status)}`}>{inv.status}</span>
                                      <span className="text-xs font-semibold text-primary">₹{inv.grandTotal.toLocaleString("en-IN")}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Shipments */}
                          {history.shipments.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                <Truck className="w-3.5 h-3.5" />Dispatches ({history.shipments.length})
                              </div>
                              <div className="space-y-1.5">
                                {history.shipments.map(sh => (
                                  <div key={sh.id} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
                                    <div>
                                      <div className="font-medium">{sh.shipmentNumber}</div>
                                      <div className="text-xs text-muted-foreground">{sh.courierPartner}{sh.dispatchDate ? ` · ${new Date(sh.dispatchDate).toLocaleDateString("en-IN")}` : ""}</div>
                                    </div>
                                    <span className={`px-1.5 py-0.5 rounded text-xs border shrink-0 ${statusColor(sh.status)}`}>{sh.status}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Activities */}
                          {history.activities.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                <Activity className="w-3.5 h-3.5" />Activities ({history.activities.length})
                              </div>
                              <div className="space-y-1.5">
                                {history.activities.map(act => (
                                  <div key={act.id} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
                                    <div>
                                      <div className="font-medium">{act.subject}</div>
                                      <div className="text-xs text-muted-foreground capitalize">{act.type}{act.dueDate ? ` · Due ${new Date(act.dueDate).toLocaleDateString("en-IN")}` : ""}</div>
                                    </div>
                                    <span className={`px-1.5 py-0.5 rounded text-xs border shrink-0 ${act.completedAt ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}>{act.completedAt ? "Done" : "Pending"}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ── DETAILS TAB ── */}
                {detailTab === "details" && <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selected.companyName && <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="w-4 h-4 shrink-0" /><span>{selected.companyName}</span></div>}
                  {selected.contactName && <div className="flex items-center gap-2 text-muted-foreground"><Users className="w-4 h-4 shrink-0" /><span>{selected.contactName}</span></div>}
                  {selected.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4 shrink-0" /><a href={`mailto:${selected.email}`} className="hover:underline text-primary">{selected.email}</a></div>}
                  {selected.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4 shrink-0" /><span>{selected.phone}</span></div>}
                  {selected.ownerName && <div className="flex items-center gap-2 text-muted-foreground col-span-2"><UserCircle className="w-4 h-4 shrink-0" /><span>Assigned to <strong>{selected.ownerName}</strong></span></div>}
                </div>
                {(selected.deliveryTime || selected.deliveryDate || selected.branding != null) && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-muted/40 rounded-lg p-3">
                    {selected.branding != null && <div><span className="text-xs text-muted-foreground block">Branding</span>{selected.branding ? "Yes" : "No"}</div>}
                    {selected.deliveryTime && <div><span className="text-xs text-muted-foreground block">Delivery Time</span>{selected.deliveryTime}</div>}
                    {selected.deliveryDate && <div><span className="text-xs text-muted-foreground block">Delivery Date</span>{new Date(selected.deliveryDate).toLocaleDateString("en-IN")}</div>}
                  </div>
                )}

                {/* Products items table */}
                {!itemsLoading && (leadItems ?? []).length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Products</div>
                    <div className="border rounded-lg overflow-auto">
                      <table className="w-full text-xs min-w-[400px]">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left px-2 py-1.5 font-medium text-muted-foreground w-8">#</th>
                            <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Product</th>
                            <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Custom</th>
                            <th className="text-right px-2 py-1.5 font-medium text-muted-foreground w-14">Qty</th>
                            <th className="text-right px-2 py-1.5 font-medium text-muted-foreground w-20">Budget</th>
                            <th className="text-right px-2 py-1.5 font-medium text-muted-foreground w-16">Margin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(leadItems ?? []).map((item, idx) => (
                            <tr key={item.id} className="border-t">
                              <td className="px-2 py-1.5 text-muted-foreground">{idx + 1}</td>
                              <td className="px-2 py-1.5">{item.productName ?? <span className="text-muted-foreground/50">—</span>}</td>
                              <td className="px-2 py-1.5">{item.customProduct ?? <span className="text-muted-foreground/50">—</span>}</td>
                              <td className="px-2 py-1.5 text-right">{item.qty ?? "—"}</td>
                              <td className="px-2 py-1.5 text-right">{item.budget != null ? `₹${item.budget.toLocaleString("en-IN")}` : "—"}</td>
                              <td className="px-2 py-1.5 text-right">{item.margin != null ? `${item.margin}%` : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selected.totalValue != null && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-0.5">Total Value</div>
                    <div className="text-2xl font-bold text-primary">₹{selected.totalValue.toLocaleString("en-IN")}</div>
                  </div>
                )}
                {selected.notes && <div className="bg-muted/40 rounded-lg p-3"><div className="text-xs font-medium text-muted-foreground mb-1">Notes</div><p className="text-sm whitespace-pre-wrap">{selected.notes}</p></div>}
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
                </>}
              </div>}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
