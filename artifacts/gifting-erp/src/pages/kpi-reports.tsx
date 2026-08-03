import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Gauge, Users, ShoppingCart, AlertTriangle, Search, Timer, History } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface StageCell { date: string | null; days: number | null; overdue: boolean }
interface FunnelRow {
  leadId: number; title: string; companyName: string | null; owner: string | null; status: string;
  leadCreatedAt: string;
  opportunity: StageCell; quote: StageCell; order: StageCell; invoice: StageCell; payment: StageCell;
  orderNumber: string | null; orderValue: number | null; totalCycleDays: number | null;
}
interface TeamKpi {
  owner: string; leads: number; opportunities: number; quotes: number; orders: number;
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
  id: number; entityType: string; entityId: number; title: string | null;
  reason: string; reasonNote: string | null; toStatus: string; value: number;
  changedAt: string; changedByName: string | null;
}
interface KpiResponse {
  deadlines: Record<string, number>;
  processingDeadlines: Record<string, number>;
  funnel: FunnelRow[];
  teamKpis: TeamKpi[];
  purchases: PurchaseRow[];
  processing: ProcessingRow[];
  lossReasons: LossReason[];
  lossDetails: LossDetail[];
}

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

export function KpiReports() {
  const [search, setSearch] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [historyLead, setHistoryLead] = useState<FunnelRow | null>(null);

  const { data, isLoading } = useQuery<KpiResponse>({
    queryKey: ["kpi-report"],
    queryFn: () => api<KpiResponse>("/v1/reports/kpi"),
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
          <TabsTrigger value="losses">Loss Reasons</TabsTrigger>
        </TabsList>

        <TabsContent value="losses" className="space-y-4">
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
                        No losses recorded yet. When a lead or opportunity is marked lost, the reason captured will show up here.
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
                            {ENTITY_LABELS[l.entityType] ?? l.entityType} · {l.toStatus}{l.changedByName ? ` · by ${l.changedByName}` : ""}
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={9}><Skeleton className="h-6 w-full" /></TableCell></TableRow>}
                  {!isLoading && (data?.teamKpis ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No data yet.</TableCell></TableRow>
                  )}
                  {(data?.teamKpis ?? []).map((t) => (
                    <TableRow key={t.owner}>
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
