import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { FilePlus2, Trash2, Printer, IndianRupee, FileCheck2, Clock, XCircle, Building2, Phone, Mail, CreditCard, PackageCheck, ArrowRight } from "lucide-react";
import { printProformaInvoice } from "@/lib/print-utils";
import { format } from "date-fns";

type PI = {
  id: number; piNumber: string; quoteId: number | null;
  clientId: number; clientName: string | null; subject: string | null;
  status: string; validUntil: string | null; paymentTerms: string | null;
  subtotal: number; discountPct: number; gstAmount: number; totalAmount: number;
  notes: string | null; termsAndConditions: string | null; createdAt: string;
};

type PIDetail = PI & {
  contactPerson: string | null; clientEmail: string | null;
  clientPhone: string | null; clientGst: string | null; billingAddress: string | null;
  items: { id: number; productId: number | null; description: string; quantity: number; unitPrice: number; lineTotal: number; imageUrl: string | null }[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  Draft:     { label: "Draft",     color: "bg-slate-100 text-slate-700 border-slate-300" },
  Sent:      { label: "Sent",      color: "bg-blue-100 text-blue-700 border-blue-300" },
  Accepted:  { label: "Accepted",  color: "bg-green-100 text-green-700 border-green-300" },
  Cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-300" },
};

function fmtINR(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}


export function ProformaInvoices() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<PI | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [createdSO, setCreatedSO] = useState<{ id: number; orderNumber: string } | null>(null);

  const { data: piList, isLoading } = useQuery<PI[]>({
    queryKey: ["proforma-invoices"],
    queryFn: () => api("/v1/proforma-invoices"),
  });

  const { data: detail } = useQuery<PIDetail>({
    queryKey: ["proforma-invoice-detail", selected?.id],
    queryFn: () => api(`/v1/proforma-invoices/${selected!.id}`),
    enabled: selected != null,
  });

  const convertToSO = useMutation({
    mutationFn: async (quoteId: number) => {
      await api(`/v1/quotes/${quoteId}`, { method: "PATCH", body: JSON.stringify({ status: "accepted" }) });
      return api<{ salesOrderId: number; orderNumber: string; message: string }>(`/v1/quotes/${quoteId}/convert`, { method: "POST" });
    },
    onSuccess: (data) => {
      setCreatedSO({ id: data.salesOrderId, orderNumber: data.orderNumber });
      toast({ title: "Sales Order Created", description: `${data.orderNumber} has been created from this PI.` });
      qc.invalidateQueries({ queryKey: ["sales-orders"] });
    },
    onError: (err: unknown) => {
      toast({ title: "Conversion failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/v1/proforma-invoices/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["proforma-invoices"] }); qc.invalidateQueries({ queryKey: ["proforma-invoice-detail", selected?.id] }); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/v1/proforma-invoices/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["proforma-invoices"] }); toast({ title: "Proforma Invoice deleted" }); setSelected(null); },
  });

  const filtered = (piList ?? []).filter(p => statusFilter === "all" || p.status === statusFilter);
  const totalValue = (piList ?? []).reduce((s, p) => s + p.totalAmount, 0);
  const acceptedValue = (piList ?? []).filter(p => p.status === "Accepted").reduce((s, p) => s + p.totalAmount, 0);
  const pendingCount = (piList ?? []).filter(p => ["Draft", "Sent"].includes(p.status)).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proforma Invoices</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Convert quotes into proforma invoices to share with clients</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center"><IndianRupee className="w-4 h-4 text-blue-600" /></div>
            <div><p className="text-xs text-muted-foreground">Total Value</p><p className="text-xl font-bold">{fmtINR(totalValue)}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center"><FileCheck2 className="w-4 h-4 text-green-600" /></div>
            <div><p className="text-xs text-muted-foreground">Accepted</p><p className="text-xl font-bold">{fmtINR(acceptedValue)}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center"><Clock className="w-4 h-4 text-amber-600" /></div>
            <div><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-bold">{pendingCount}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center"><FilePlus2 className="w-4 h-4 text-violet-600" /></div>
            <div><p className="text-xs text-muted-foreground">Total PIs</p><p className="text-xl font-bold">{(piList ?? []).length}</p></div>
          </div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <TabsTrigger key={k} value={k}>{v.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>PI #</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                No proforma invoices yet. Convert a quote to get started.
              </TableCell></TableRow>
            ) : filtered.map(pi => (
              <TableRow key={pi.id} className="cursor-pointer hover:bg-muted/40" onClick={() => { setSelected(pi); setCreatedSO(null); }}>
                <TableCell className="font-mono text-sm font-semibold">{pi.piNumber}</TableCell>
                <TableCell className="text-sm">{pi.subject ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-sm">{pi.clientName ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${STATUS_CONFIG[pi.status]?.color ?? ""}`}>{pi.status}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {pi.validUntil ? format(new Date(pi.validUntil), "dd MMM yyyy") : "—"}
                </TableCell>
                <TableCell className="text-right font-semibold">{fmtINR(pi.totalAmount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail Sheet */}
      <Sheet open={selected != null} onOpenChange={o => { if (!o) setSelected(null); }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <FilePlus2 className="w-5 h-5 text-blue-600" />
              {selected?.piNumber}
            </SheetTitle>
          </SheetHeader>
          {selected && (() => {
            const d = detail;
            return (
              <>
                {/* Summary */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Subtotal</p>
                    <p className="font-semibold">{fmtINR(selected.subtotal)}</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">GST (18%)</p>
                    <p className="font-semibold">{fmtINR(selected.gstAmount)}</p>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 col-span-2">
                    <p className="text-xs text-muted-foreground">Grand Total</p>
                    <p className="text-2xl font-bold text-primary">{fmtINR(selected.totalAmount)}</p>
                  </div>
                </div>

                {/* Client info */}
                {d && (
                  <div className="space-y-1 text-sm mb-4">
                    {d.clientName && <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="w-4 h-4" /><span>{d.clientName}</span></div>}
                    {d.contactPerson && <div className="flex items-center gap-2 text-muted-foreground"><span className="w-4" /><span>{d.contactPerson}</span></div>}
                    {d.clientPhone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4" /><span>{d.clientPhone}</span></div>}
                    {d.clientEmail && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4" /><span>{d.clientEmail}</span></div>}
                    {d.clientGst && <div className="flex items-center gap-2 text-muted-foreground"><CreditCard className="w-4 h-4" /><span>GSTIN: {d.clientGst}</span></div>}
                    {d.paymentTerms && <div className="flex items-center gap-2 text-muted-foreground"><Clock className="w-4 h-4" /><span>{d.paymentTerms}</span></div>}
                  </div>
                )}

                <Separator className="my-4" />

                {/* Line items */}
                {d && d.items.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Line Items</p>
                    <div className="border rounded-lg overflow-hidden text-sm">
                      <table className="w-full">
                        <thead className="bg-muted/50"><tr>
                          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Description</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-12">Qty</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-24">Rate</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-24">Total</th>
                        </tr></thead>
                        <tbody>
                          {d.items.map(i => (
                            <tr key={i.id} className="border-t">
                              <td className="px-3 py-2">{i.description}</td>
                              <td className="px-3 py-2 text-right">{i.quantity}</td>
                              <td className="px-3 py-2 text-right">{fmtINR(i.unitPrice)}</td>
                              <td className="px-3 py-2 text-right font-medium">{fmtINR(i.lineTotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {d?.notes && (
                  <div className="mb-4 p-3 bg-muted/40 rounded-lg text-sm">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                    <p>{d.notes}</p>
                  </div>
                )}

                <Separator className="my-4" />

                {/* Actions */}
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Update Status</label>
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

                  {/* Create Sales Order from this PI */}
                  {selected.quoteId && (
                    createdSO ? (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm">
                        <PackageCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-emerald-700 font-medium">Sales Order <span className="font-mono">{createdSO.orderNumber}</span> created</span>
                        <a href="/sales-orders" className="ml-auto text-xs text-emerald-600 underline hover:text-emerald-800 flex items-center gap-0.5">
                          View <ArrowRight className="w-3 h-3" />
                        </a>
                      </div>
                    ) : (
                      <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={convertToSO.isPending}
                        onClick={() => { setCreatedSO(null); convertToSO.mutate(selected.quoteId!); }}
                      >
                        <PackageCheck className="w-4 h-4 mr-2" />
                        {convertToSO.isPending ? "Creating Sales Order…" : "Create Sales Order"}
                      </Button>
                    )
                  )}

                  {d && (
                    <Button variant="outline" className="w-full" onClick={() => printProformaInvoice(d)}>
                      <Printer className="w-4 h-4 mr-2" />Print / Download PDF
                    </Button>
                  )}

                  <Button variant="destructive" className="w-full" onClick={() => del.mutate(selected.id)} disabled={del.isPending}>
                    <Trash2 className="w-4 h-4 mr-2" />Delete
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
