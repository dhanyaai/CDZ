import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Gauge, Users, ShoppingCart, AlertTriangle, Search, Timer, History, BarChart3, Pencil, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StageCell { date: string | null; days: number | null; overdue: boolean }
interface FunnelRow {
  leadId: number; title: string; companyName: string | null; owner: string | null; status: string;
  leadCreatedAt: string;
  opportunity: StageCell; quote: StageCell; order: StageCell; invoice: StageCell; payment: StageCell;
  orderNumber: string | null; orderValue: number | null; totalCycleDays: number | null;
}
interface TeamKpi {
  owner: string; ownerId: number | null; leads: number; opportunities: number; quotes: number; orders: number;
  revenue: number; conversionPct: number; avgLeadToOrderDays: number | null; overdueStages: number;
}
interface PurchaseRow {
  poId: number; poNumber: string; vendor: string | null; status: string;
  createdAt: string; receivedAt: string | null; days: number | null; overdue: boolean;
}
interface ProcessingRow {
  salesOrderId: number; orderNumber: string; status: string; orderedAt: string; hasForm: boolean;
  procurement: StageCell; designStart: StageCell; mockupApproval: StageCell; preProduction: StageCell;
  productionStart: StageCell; qc: StageCell; stockUpdate: StageCell; dispatch: StageCell;
}
interface HistoryEntry {
  id: number; entityType: string; entityId: number;
  fromStatus: string | null; toStatus: string; changedAt: string; changedByName: string | null;
  reason: string | null; reasonNote: string | null;
}
interface LossReason { reason: string; count: number; revenueImpact: number }
interface LossDetail {
  id: number; entityType: string; entityId: number; title: string | null; owner: string | null;
  reason: string; reasonNote: string | null; toStatus: string; value: number;
  changedAt: string; changedByName: string | null;
}

interface LossByOwner { owner: string; count: number; revenueImpact: number; reasons: LossReason[] }

interface DelayReason { reason: string; count: number }
interface KpiResponse {
  deadlines: Record<string, number>;
  processingDeadlines: Record<string, number>;
  funnel: FunnelRow[];
  teamKpis: TeamKpi[];
  purchases: PurchaseRow[];
  processing: ProcessingRow[];
  lossReasons: LossReason[];
  lossDetails: LossDetail[];
  delayReasons: DelayReason[];
  delayDetails: DelayDetail[];
  lossByOwner: LossByOwner[];
  lossOwners: string[];
}

interface ScorecardMonth {
  month: string;
  actualLeads: number; actualQuotes: number; actualOrders: number; actualRevenue: number;
  targetLeads: number | null; targetQuotes: number | null; targetRevenue: number | null;
}
interface ScorecardResponse { user: { id: number; name: string }; months: ScorecardMonth[] }

const ENTITY_LABELS: Record<string, string> = {
  lead: "Lead", opportunity: "Opportunity", quote: "Quote", sales_order: "Sales Order",
  invoice: "Invoice", purchase_order: "Purchase Order", sample_order: "Sample Order", proforma_invoice: "Proforma Invoice",
};

const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
const d = (iso: string | null) => (iso ? format(new Date(iso), "dd MMM yy") : null);

function StageBadge({ cell, notReachedLabel }: { cell: StageCell; notReachedLabel?: string }) {
  if (!cell.date) {
    return cell.overdue
      ? <Badge variant="destructive" className="font-normal">Overdue</Badge>
      : <span className="text-muted-foreground text-xs">{notReachedLabel ?? "—"}</span>;
  }
  return (
    <div className="leading-tight">
      <div className="text-xs">{d(cell.date)}</div>
      {cell.days != null && (
        <span className={`text-[11px] ${cell.overdue ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
          {cell.days}d{cell.overdue ? " ⚠" : ""}
        </span>
      )}
    </div>
  );
}

const monthLabel = (ym: string) => format(new Date(`${ym}-01T00:00:00`), "MMM yyyy");

function TargetVsActual({ actual, target, money }: { actual: number; target: number | null; money?: boolean }) {
  const fmt = (n: number) => (money ? inr(n) : String(n));
  if (target == null || target === 0) {
    return <span className="text-sm">{fmt(actual)} <span className="text-muted-foreground text-xs">/ —</span></span>;
  }
  const met = actual >= target;
  return (
    <span className={`text-sm font-medium ${met ? "text-green-600" : "text-red-600"}`}>
      {fmt(actual)} <span className="font-normal text-muted-foreground text-xs">/ {fmt(target)}</span>
    </span>
  );
}

function ScorecardDialog({ person, onClose }: { person: TeamKpi; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [draft, setDraft] = useState({ leads: "", quotes: "", revenue: "" });

  const { data, isLoading } = useQuery<ScorecardResponse>({
    queryKey: ["kpi-scorecard", person.ownerId],
    queryFn: () => api<ScorecardResponse>(`/v1/reports/kpi/scorecard?userId=${person.ownerId}`),
    enabled: person.ownerId != null,
  });

  const saveTarget = useMutation({
    mutationFn: (body: { userId: number; month: string; targetLeads: number; targetQuotes: number; targetRevenue: number }) =>
      api("/v1/kpi/targets", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-scorecard", person.ownerId] });
      setEditingMonth(null);
      toast({ title: "Target saved" });
    },
    onError: (e: Error) => toast({ title: "Failed to save target", description: e.message, variant: "destructive" }),
  });

  const startEdit = (m: ScorecardMonth) => {
    setEditingMonth(m.month);
    setDraft({
      leads: String(m.targetLeads ?? ""),
      quotes: String(m.targetQuotes ?? ""),
      revenue: String(m.targetRevenue ?? ""),
    });
  };
  const submitEdit = (month: string) => {
    saveTarget.mutate({
      userId: person.ownerId!,
      month,
      targetLeads: parseInt(draft.leads, 10) || 0,
      targetQuotes: parseInt(draft.quotes, 10) || 0,
      targetRevenue: Number(draft.revenue) || 0,
    });
  };

  const months = data?.months ?? [];
  const chartData = months.map((m) => ({
    name: monthLabel(m.month),
    Revenue: m.actualRevenue,
    "Revenue Target": m.targetRevenue ?? 0,
    Leads: m.actualLeads,
    Quotes: m.actualQuotes,
  }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Monthly scorecard — {person.owner}
          </DialogTitle>
        </DialogHeader>

        {isLoading && <Skeleton className="h-48 w-full" />}

        {!isLoading && months.length > 0 && (
          <>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="rev" tick={{ fontSize: 11 }} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                  <YAxis yAxisId="cnt" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(value: number, name: string) => (name.startsWith("Revenue") ? inr(value) : value)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="rev" dataKey="Revenue" fill="#16a34a" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="rev" dataKey="Revenue Target" stroke="#dc2626" strokeDasharray="5 3" dot={false} type="monotone" />
                  <Line yAxisId="cnt" dataKey="Leads" stroke="#2563eb" dot={{ r: 2 }} type="monotone" />
                  <Line yAxisId="cnt" dataKey="Quotes" stroke="#9333ea" dot={{ r: 2 }} type="monotone" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Leads (actual / target)</TableHead>
                  <TableHead>Quotes (actual / target)</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Revenue (actual / target)</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...months].reverse().map((m) => (
                  <TableRow key={m.month}>
                    <TableCell className="font-medium text-sm">{monthLabel(m.month)}</TableCell>
                    {editingMonth === m.month ? (
                      <>
                        <TableCell>
                          <Input type="number" min={0} className="h-8 w-20" value={draft.leads}
                            onChange={(e) => setDraft((d0) => ({ ...d0, leads: e.target.value }))} placeholder="Leads" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" min={0} className="h-8 w-20" value={draft.quotes}
                            onChange={(e) => setDraft((d0) => ({ ...d0, quotes: e.target.value }))} placeholder="Quotes" />
                        </TableCell>
                        <TableCell className="text-right text-sm">{m.actualOrders}</TableCell>
                        <TableCell className="text-right">
                          <Input type="number" min={0} className="h-8 w-32 ml-auto" value={draft.revenue}
                            onChange={(e) => setDraft((d0) => ({ ...d0, revenue: e.target.value }))} placeholder="Revenue ₹" />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saveTarget.isPending}
                              onClick={() => submitEdit(m.month)} title="Save targets">
                              <Check className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingMonth(null)} title="Cancel">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell><TargetVsActual actual={m.actualLeads} target={m.targetLeads} /></TableCell>
                        <TableCell><TargetVsActual actual={m.actualQuotes} target={m.targetQuotes} /></TableCell>
                        <TableCell className="text-right text-sm">{m.actualOrders}</TableCell>
                        <TableCell className="text-right"><TargetVsActual actual={m.actualRevenue} target={m.targetRevenue} money /></TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(m)} title="Set monthly targets">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground">
              Green = target met, red = below target. Leads count by lead creation month; quotes and revenue by the month
              the quote/order was created, following the same lead → order chain as the funnel report. Click the pencil to set targets.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function KpiReports() {
  const [search, setSearch] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [historyLead, setHistoryLead] = useState<FunnelRow | null>(null);
  const [scorecardPerson, setScorecardPerson] = useState<TeamKpi | null>(null);
  const [lossOwner, setLossOwner] = useState<string>("__all__");
  const [lossFrom, setLossFrom] = useState("");
  const [lossTo, setLossTo] = useState("");

  const lossParams = new URLSearchParams();
  if (lossOwner !== "__all__") lossParams.set("lossOwner", lossOwner);
  if (lossFrom) lossParams.set("lossFrom", lossFrom);
  if (lossTo) lossParams.set("lossTo", lossTo);
  const lossQs = lossParams.toString();

  const { data, isLoading } = useQuery<KpiResponse>({
    queryKey: ["kpi-report", lossQs],
    queryFn: () => api<KpiResponse>(`/v1/reports/kpi${lossQs ? `?${lossQs}` : ""}`),
    placeholderData: (prev) => prev,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery<{ history: HistoryEntry[] }>({
    queryKey: ["kpi-history", historyLead?.leadId],
    queryFn: () => api<{ history: HistoryEntry[] }>(`/v1/reports/kpi/history?leadId=${historyLead!.leadId}`),
    enabled: historyLead != null,
  });

  const dl = data?.deadlines ?? {};

  const rowOverdue = (r: FunnelRow) =>
    r.opportunity.overdue || r.quote.overdue || r.order.overdue || r.invoice.overdue || r.payment.overdue;

  const funnel = (data?.funnel ?? []).filter((r) => {
    if (overdueOnly && !rowOverdue(r)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      (r.companyName ?? "").toLowerCase().includes(q) ||
      (r.owner ?? "").toLowerCase().includes(q) ||
      (r.orderNumber ?? "").toLowerCase().includes(q)
    );
  });

  const totals = data ? {
    leads: data.funnel.length,
    orders: data.funnel.filter((r) => r.order.date).length,
    overdue: data.funnel.filter(rowOverdue).length,
    avgCycle: (() => {
      const done = data.funnel.filter((r) => r.totalCycleDays != null);
      return done.length ? Math.round(done.reduce((a, r) => a + (r.totalCycleDays ?? 0), 0) / done.length) : null;
    })(),
  } : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Gauge className="w-6 h-6" /> KPI &amp; KRA Report</h1>
        <p className="text-muted-foreground mt-1">
          Stage-wise timelines from lead to payment, with deadline tracking. Targets: opportunity {dl.leadToOpportunity ?? 1}d ·
          quote {dl.opportunityToQuote ?? 2}d · order {dl.quoteToOrder ?? 3}d · invoice {dl.orderToInvoice ?? 7}d ·
          payment {dl.invoiceToPayment ?? 30}d · goods receipt {dl.poToGrn ?? 7}d
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Leads", value: totals?.leads, icon: Users },
          { label: "Converted to Orders", value: totals?.orders, icon: ShoppingCart },
          { label: "With Overdue Stages", value: totals?.overdue, icon: AlertTriangle, warn: true },
          { label: "Avg Lead → Payment", value: totals?.avgCycle != null ? `${totals.avgCycle} days` : "—", icon: Timer },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${c.warn && Number(c.value) > 0 ? "text-red-600" : ""}`}>
                    {isLoading ? <Skeleton className="h-7 w-12" /> : c.value ?? 0}
                  </p>
                </div>
                <c.icon className="w-6 h-6 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="funnel">
        <TabsList>
          <TabsTrigger value="funnel">Lead Funnel &amp; Timelines</TabsTrigger>
          <TabsTrigger value="team">Team KPIs</TabsTrigger>
          <TabsTrigger value="processing">Order Processing</TabsTrigger>
          <TabsTrigger value="purchases">Purchasing</TabsTrigger>
          <TabsTrigger value="losses">Losses &amp; Delays</TabsTrigger>
        </TabsList>

        <TabsContent value="losses" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Salesperson</Label>
              <Select value={lossOwner} onValueChange={setLossOwner}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All salespeople</SelectItem>
                  {(data?.lossOwners ?? []).map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" value={lossFrom} onChange={(e) => setLossFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" value={lossTo} onChange={(e) => setLossTo(e.target.value)} className="w-40" />
            </div>
            {(lossOwner !== "__all__" || lossFrom || lossTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setLossOwner("__all__"); setLossFrom(""); setLossTo(""); }}>
                Clear filters
              </Button>
            )}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Losses by salesperson</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salesperson</TableHead>
                    <TableHead className="text-right">Losses</TableHead>
                    <TableHead className="text-right">Revenue Impact</TableHead>
                    <TableHead>Top Reasons</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={4}><Skeleton className="h-6 w-full" /></TableCell></TableRow>}
                  {!isLoading && (data?.lossByOwner ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No losses match the current filters.
                    </TableCell></TableRow>
                  )}
                  {(data?.lossByOwner ?? []).map((o) => (
                    <TableRow key={o.owner}>
                      <TableCell className="font-medium">{o.owner}</TableCell>
                      <TableCell className="text-right">{o.count}</TableCell>
                      <TableCell className="text-right">{inr(o.revenueImpact)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {o.reasons.slice(0, 4).map((r) => (
                            <Badge key={r.reason} variant="outline" className="font-normal">
                              {r.reason} × {r.count}
                            </Badge>
                          ))}
                          {o.reasons.length > 4 && (
                            <span className="text-xs text-muted-foreground">+{o.reasons.length - 4} more</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Top loss reasons</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Revenue Impact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && <TableRow><TableCell colSpan={3}><Skeleton className="h-6 w-full" /></TableCell></TableRow>}
                    {!isLoading && (data?.lossReasons ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        {lossOwner !== "__all__" || lossFrom || lossTo
                          ? "No losses match the current filters."
                          : "No losses recorded yet. When a lead or opportunity is marked lost, the reason captured will show up here."}
                      </TableCell></TableRow>
                    )}
                    {(data?.lossReasons ?? []).map((r) => (
                      <TableRow key={r.reason}>
                        <TableCell className="font-medium">{r.reason}</TableCell>
                        <TableCell className="text-right">{r.count}</TableCell>
                        <TableCell className="text-right">{inr(r.revenueImpact)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Recent losses</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Record</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>When</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && <TableRow><TableCell colSpan={4}><Skeleton className="h-6 w-full" /></TableCell></TableRow>}
                    {!isLoading && (data?.lossDetails ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No losses recorded yet.</TableCell></TableRow>
                    )}
                    {(data?.lossDetails ?? []).map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{l.title ?? `#${l.entityId}`}</div>
                          <div className="text-xs text-muted-foreground">
                            {ENTITY_LABELS[l.entityType] ?? l.entityType} · {l.toStatus} · {l.owner ?? "Unassigned"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{l.reason}</div>
                          {l.reasonNote && <div className="text-xs text-muted-foreground max-w-[220px] truncate" title={l.reasonNote}>{l.reasonNote}</div>}
                        </TableCell>
                        <TableCell className="text-xs">{d(l.changedAt)}</TableCell>
                        <TableCell className="text-right text-sm">{l.value ? inr(l.value) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          <p className="text-xs text-muted-foreground">
            Reasons are captured when a lead or opportunity is marked lost. Revenue impact uses the record's estimated value.
            Only the most recent loss per record is counted.
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Delay reasons</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && <TableRow><TableCell colSpan={2}><Skeleton className="h-6 w-full" /></TableCell></TableRow>}
                    {!isLoading && (data?.delayReasons ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                        No delays recorded yet. When an overdue stage is completed, the slip reason captured will show up here.
                      </TableCell></TableRow>
                    )}
                    {(data?.delayReasons ?? []).map((r) => (
                      <TableRow key={r.reason}>
                        <TableCell className="font-medium">{r.reason}</TableCell>
                        <TableCell className="text-right">{r.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Recent delayed completions</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Record</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && <TableRow><TableCell colSpan={3}><Skeleton className="h-6 w-full" /></TableCell></TableRow>}
                    {!isLoading && (data?.delayDetails ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No delays recorded yet.</TableCell></TableRow>
                    )}
                    {(data?.delayDetails ?? []).map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{l.title ?? `#${l.entityId}`}</div>
                          <div className="text-xs text-muted-foreground">
                            {ENTITY_LABELS[l.entityType] ?? l.entityType} · {l.fromStatus ? `${l.fromStatus} → ` : ""}{l.toStatus}
                            {l.changedByName ? ` · by ${l.changedByName}` : ""}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{l.reason}</div>
                          {l.reasonNote && <div className="text-xs text-muted-foreground max-w-[220px] truncate" title={l.reasonNote}>{l.reasonNote}</div>}
                        </TableCell>
                        <TableCell className="text-xs">{d(l.changedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          <p className="text-xs text-muted-foreground">
            Delay reasons are captured when a stage that went past its KPI deadline is finally completed
            (e.g. converting a lead after the follow-up target, or advancing an overdue opportunity).
          </p>
        </TabsContent>

        <TabsContent value="processing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Internal processing steps per order</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead>Procurement</TableHead>
                    <TableHead>Design Start</TableHead>
                    <TableHead>Mockup OK</TableHead>
                    <TableHead>Pre-Prod OK</TableHead>
                    <TableHead>Production</TableHead>
                    <TableHead>QC</TableHead>
                    <TableHead>Stock Update</TableHead>
                    <TableHead>Dispatch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={10}><Skeleton className="h-6 w-full" /></TableCell></TableRow>}
                  {!isLoading && (data?.processing ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No sales orders yet.</TableCell></TableRow>
                  )}
                  {(data?.processing ?? []).map((p) => {
                    const cells = [p.procurement, p.designStart, p.mockupApproval, p.preProduction, p.productionStart, p.qc, p.stockUpdate, p.dispatch];
                    const anyOverdue = cells.some((c) => c.overdue);
                    return (
                      <TableRow key={p.salesOrderId} className={anyOverdue ? "bg-red-50/50 dark:bg-red-950/10" : ""}>
                        <TableCell>
                          <div className="font-medium text-sm">{p.orderNumber}</div>
                          <div className="text-xs text-muted-foreground">{p.status}{!p.hasForm ? " · no processing form" : ""}</div>
                        </TableCell>
                        <TableCell className="text-xs">{d(p.orderedAt)}</TableCell>
                        {cells.map((c, i) => (
                          <TableCell key={i}><StageBadge cell={c} notReachedLabel="Pending" /></TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            Step dates come from each order's processing form. Days count from the order date; targets:
            procurement {data?.processingDeadlines?.procurement ?? 2}d · design {data?.processingDeadlines?.designStart ?? 2}d ·
            mockup {data?.processingDeadlines?.mockupApproval ?? 4}d · pre-production {data?.processingDeadlines?.preProduction ?? 6}d ·
            production {data?.processingDeadlines?.productionStart ?? 7}d · QC {data?.processingDeadlines?.qc ?? 10}d ·
            stock {data?.processingDeadlines?.stockUpdate ?? 12}d · dispatch {data?.processingDeadlines?.dispatch ?? 14}d.
            Red = later than target (or still pending past it).
          </p>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search lead, client, owner, order no…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="overdue-only" checked={overdueOnly} onCheckedChange={setOverdueOnly} />
              <Label htmlFor="overdue-only" className="cursor-pointer">Overdue only</Label>
            </div>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Lead Created</TableHead>
                    <TableHead>Opportunity</TableHead>
                    <TableHead>Quote</TableHead>
                    <TableHead>Sales Order</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Order Value</TableHead>
                    <TableHead className="text-right">Full Cycle</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={11}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                  ))}
                  {!isLoading && funnel.length === 0 && (
                    <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                      {overdueOnly ? "Nothing overdue — all stages are on track." : "No leads yet."}
                    </TableCell></TableRow>
                  )}
                  {funnel.map((r) => (
                    <TableRow key={r.leadId} className={rowOverdue(r) ? "bg-red-50/50 dark:bg-red-950/10" : ""}>
                      <TableCell>
                        <div className="font-medium text-sm">{r.title}</div>
                        <div className="text-xs text-muted-foreground">{r.companyName ?? ""}{r.orderNumber ? ` · ${r.orderNumber}` : ""}</div>
                      </TableCell>
                      <TableCell className="text-sm">{r.owner ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-xs">{d(r.leadCreatedAt)}</TableCell>
                      <TableCell><StageBadge cell={r.opportunity} /></TableCell>
                      <TableCell><StageBadge cell={r.quote} /></TableCell>
                      <TableCell><StageBadge cell={r.order} /></TableCell>
                      <TableCell><StageBadge cell={r.invoice} /></TableCell>
                      <TableCell><StageBadge cell={r.payment} /></TableCell>
                      <TableCell className="text-right text-sm">{r.orderValue != null ? inr(r.orderValue) : "—"}</TableCell>
                      <TableCell className="text-right text-sm">{r.totalCycleDays != null ? `${r.totalCycleDays}d` : "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Status change history" onClick={() => setHistoryLead(r)}>
                          <History className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            Each stage column shows the date it was reached and days taken from the previous stage. Red = took longer than the target
            (or is still pending past the target).
          </p>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader><CardTitle className="text-base">Team performance (KRA view)</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sales Person</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Opportunities</TableHead>
                    <TableHead className="text-right">Quotes</TableHead>
                    <TableHead className="text-right">Orders Won</TableHead>
                    <TableHead className="text-right">Conversion</TableHead>
                    <TableHead className="text-right">Avg Lead → Order</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Overdue Stages</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={10}><Skeleton className="h-6 w-full" /></TableCell></TableRow>}
                  {!isLoading && (data?.teamKpis ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No data yet.</TableCell></TableRow>
                  )}
                  {(data?.teamKpis ?? []).map((t) => (
                    <TableRow key={t.ownerId ?? "unassigned"}>
                      <TableCell className="font-medium">{t.owner}</TableCell>
                      <TableCell className="text-right">{t.leads}</TableCell>
                      <TableCell className="text-right">{t.opportunities}</TableCell>
                      <TableCell className="text-right">{t.quotes}</TableCell>
                      <TableCell className="text-right">{t.orders}</TableCell>
                      <TableCell className="text-right">{t.conversionPct}%</TableCell>
                      <TableCell className="text-right">{t.avgLeadToOrderDays != null ? `${t.avgLeadToOrderDays}d` : "—"}</TableCell>
                      <TableCell className="text-right">{inr(t.revenue)}</TableCell>
                      <TableCell className="text-right">
                        {t.overdueStages > 0
                          ? <Badge variant="destructive" className="font-normal">{t.overdueStages}</Badge>
                          : <span className="text-muted-foreground">0</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {t.ownerId != null && (
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setScorecardPerson(t)}>
                            <BarChart3 className="w-3.5 h-3.5 mr-1" /> Scorecard
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases">
          <Card>
            <CardHeader><CardTitle className="text-base">Purchase order → goods receipt timing</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell></TableRow>}
                  {!isLoading && (data?.purchases ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No purchase orders yet.</TableCell></TableRow>
                  )}
                  {(data?.purchases ?? []).map((p) => (
                    <TableRow key={p.poId} className={p.overdue ? "bg-red-50/50 dark:bg-red-950/10" : ""}>
                      <TableCell className="font-medium">{p.poNumber}</TableCell>
                      <TableCell>{p.vendor ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="font-normal">{p.status}</Badge></TableCell>
                      <TableCell className="text-xs">{d(p.createdAt)}</TableCell>
                      <TableCell className="text-xs">
                        {p.receivedAt ? d(p.receivedAt) : p.overdue
                          ? <Badge variant="destructive" className="font-normal">Overdue</Badge>
                          : <span className="text-muted-foreground">Pending</span>}
                      </TableCell>
                      <TableCell className={`text-right text-sm ${p.overdue && p.days != null ? "text-red-600 font-semibold" : ""}`}>
                        {p.days != null ? `${p.days}d` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {scorecardPerson && <ScorecardDialog person={scorecardPerson} onClose={() => setScorecardPerson(null)} />}

      {/* Status change history dialog */}
      <Dialog open={historyLead != null} onOpenChange={(o) => !o && setHistoryLead(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-4 h-4" /> Status history — {historyLead?.title}
            </DialogTitle>
          </DialogHeader>
          {historyLoading && <Skeleton className="h-24 w-full" />}
          {!historyLoading && (historyData?.history ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground py-4">
              No status changes recorded yet for this lead's chain. Tracking started on 3 Aug 2026 — changes made from now on will appear here.
            </p>
          )}
          {!historyLoading && (historyData?.history ?? []).length > 0 && (
            <div className="space-y-3">
              {(historyData?.history ?? []).map((h) => (
                <div key={h.id} className="flex gap-3 text-sm">
                  <div className="w-28 shrink-0 text-xs text-muted-foreground pt-0.5">
                    {format(new Date(h.changedAt), "dd MMM yy, HH:mm")}
                  </div>
                  <div>
                    <div>
                      <span className="font-medium">{ENTITY_LABELS[h.entityType] ?? h.entityType}</span>{" "}
                      {h.fromStatus ? <>moved from <Badge variant="outline" className="font-normal">{h.fromStatus}</Badge> to</> : <>set to</>}{" "}
                      <Badge variant="outline" className="font-normal">{h.toStatus}</Badge>
                    </div>
                    {h.reason && (
                      <div className="text-xs mt-0.5">
                        <span className="text-muted-foreground">Reason:</span> {h.reason}
                        {h.reasonNote && <span className="text-muted-foreground"> — {h.reasonNote}</span>}
                      </div>
                    )}
                    {h.changedByName && <div className="text-xs text-muted-foreground">by {h.changedByName}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default KpiReports;

interface DelayDetail {
  id: number; entityType: string; entityId: number; title: string | null;
  fromStatus: string | null; toStatus: string; reason: string; reasonNote: string | null;
  changedAt: string; changedByName: string | null;
}
