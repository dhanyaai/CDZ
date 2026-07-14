import { useState } from "react";
import { Link } from "wouter";
import { useListInvoices, useCreateInvoice, useListSalesOrders, getListInvoicesQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, FileText, CheckCircle2, Clock, AlertTriangle, IndianRupee, SendHorizontal, Printer, Package, Building2, CreditCard, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, isPast } from "date-fns";

const PAYMENT_TERMS = ["Immediate", "Net 7", "Net 15", "Net 30", "Net 45", "Net 60", "50% Advance", "100% Advance"];

const formSchema = z.object({
  salesOrderId: z.coerce.number().min(1, "Sales Order required"),
  dueDate: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  Draft:           { label: "Draft",          color: "bg-slate-500/10 text-slate-400 border-slate-500/20",   icon: FileText },
  Issued:          { label: "Issued",          color: "bg-blue-500/10 text-blue-400 border-blue-500/20",     icon: SendHorizontal },
  "Partially Paid":{ label: "Partially Paid", color: "bg-amber-500/10 text-amber-500 border-amber-500/20",  icon: Clock },
  Paid:            { label: "Paid",            color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  Cancelled:       { label: "Cancelled",       color: "bg-red-500/10 text-red-400 border-red-500/20",       icon: XCircle },
};

type InvoiceLine = {
  id: number; productId: number | null; description: string;
  hsnCode: string | null; uom: string;
  quantity: number; unitPrice: number; lineTotal: number;
  gstRate: number; cgst: number; sgst: number; igst: number;
  lineTaxTotal: number; lineGrandTotal: number;
};

type InvoiceDetail = {
  id: number; invoiceNumber: string; salesOrderId: number; orderNumber: string | null;
  clientId: number; clientName: string; clientGst: string | null; contactPerson: string | null; billingAddress: string | null;
  totalAmount: number; gstAmount: number; grandTotal: number;
  cgst: number; sgst: number; igst: number; placeOfSupplyStateCode: string | null;
  roundOff: number; amountInWords: string | null;
  status: string; validTransitions: string[];
  dueDate: string | null; notes: string | null; paymentTerms: string | null; createdAt: string;
  lines: InvoiceLine[];
  payments: { id: number; amount: number; type: string; paymentMode: string | null; referenceNo: string | null; paymentDate: string; notes: string | null }[];
};

const INR = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const INR0 = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

export function Invoices() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: invoices, isLoading } = useListInvoices({ status: statusFilter === "All" ? undefined : statusFilter as any });
  const { data: allInvoices } = useListInvoices();
  const { data: salesOrders } = useListSalesOrders();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: invoiceDetail } = useQuery<InvoiceDetail>({
    queryKey: ["invoice-detail", selectedId],
    queryFn: () => api<InvoiceDetail>(`/v1/invoices/${selectedId}`),
    enabled: !!selectedId,
  });

  const createInvoice = useCreateInvoice({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
        setDialogOpen(false); form.reset();
        toast({ title: "Invoice created" });
      },
      onError: (err: any) => {
        toast({ title: "Failed to create invoice", description: err?.message ?? "Unknown error", variant: "destructive" });
      },
    },
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/v1/invoices/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["invoice-detail", selectedId] });
      toast({ title: "Status updated" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update status", description: err?.message ?? "Unknown error", variant: "destructive" });
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { salesOrderId: 0, dueDate: "", paymentTerms: "", notes: "" },
  });

  const onSubmit = (data: FormValues) => createInvoice.mutate({
    data: {
      salesOrderId: data.salesOrderId,
      dueDate: data.dueDate || undefined,
      paymentTerms: data.paymentTerms || undefined,
      notes: data.notes || undefined,
    } as any,
  });

  const eligibleOrders = salesOrders?.filter(o => !["Draft", "Cancelled"].includes(o.status)) || [];
  const totalBilled = (allInvoices ?? []).reduce((s, i) => s + Number((i as any).grandTotal ?? i.totalAmount ?? 0), 0);
  const totalPaid = (allInvoices ?? []).filter(i => i.status === "Paid").reduce((s, i) => s + Number((i as any).grandTotal ?? i.totalAmount ?? 0), 0);
  const totalOutstanding = (allInvoices ?? []).filter(i => ["Issued", "Partially Paid"].includes(i.status)).reduce((s, i) => s + Number((i as any).grandTotal ?? i.totalAmount ?? 0), 0);
  const totalOverdue = (allInvoices ?? []).filter(i => i.dueDate && isPast(new Date(i.dueDate)) && !["Paid", "Cancelled"].includes(i.status)).reduce((s, i) => s + Number((i as any).grandTotal ?? i.totalAmount ?? 0), 0);

  const isIntraState = invoiceDetail && (invoiceDetail.cgst + invoiceDetail.sgst) > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">GST Invoices</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Accounts receivable and billing management</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />New Invoice</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Billed",  value: `₹${INR0(totalBilled)}`,      icon: IndianRupee,  color: "text-primary" },
          { label: "Collected",     value: `₹${INR0(totalPaid)}`,         icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Outstanding",   value: `₹${INR0(totalOutstanding)}`,  icon: Clock,        color: "text-amber-500" },
          { label: "Overdue",       value: `₹${INR0(totalOverdue)}`,      icon: AlertTriangle,color: "text-red-500" },
        ].map(s => (
          <Card key={s.label} className="elev-1">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 ${s.color}`}><s.icon className="w-5 h-5" /></div>
              <div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="All">All ({(allInvoices ?? []).length})</TabsTrigger>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <TabsTrigger key={k} value={k}>{v.label} ({(allInvoices ?? []).filter(i => i.status === k).length})</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>GSTIN</TableHead>
              <TableHead>Order #</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">GST</TableHead>
              <TableHead className="text-right font-bold">Grand Total</TableHead>
              <TableHead>Terms</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={11}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
              ))
            ) : invoices?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-12">
                  <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No invoices found</p>
                </TableCell>
              </TableRow>
            ) : (
              invoices?.map(invoice => {
                const cfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.Draft!;
                const inv = invoice as any;
                const isOverdue = invoice.dueDate && isPast(new Date(invoice.dueDate)) && !["Paid", "Cancelled"].includes(invoice.status);
                const subtotalAmt = Number(inv.totalAmount ?? 0);
                const gstAmt = Number(inv.gstAmount ?? 0);
                const grandTotal = Number(inv.grandTotal ?? subtotalAmt + gstAmt);
                const vt: string[] = inv.validTransitions ?? [];
                return (
                  <TableRow key={invoice.id} className={`cursor-pointer ${isOverdue ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-muted/30"}`}
                    onClick={() => setSelectedId(invoice.id)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" />{invoice.invoiceNumber}</div>
                    </TableCell>
                    <TableCell>{invoice.clientName}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{inv.clientGst || "—"}</TableCell>
                    <TableCell>
                      {invoice.salesOrderId ? (
                        <Link href={`/sales-orders/${invoice.salesOrderId}`} className="text-primary hover:underline" onClick={e => e.stopPropagation()}>
                          {invoice.orderNumber || `SO-${invoice.salesOrderId}`}
                        </Link>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right">₹{INR0(subtotalAmt)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">₹{INR0(gstAmt)}</TableCell>
                    <TableCell className="text-right font-bold">₹{INR0(grandTotal)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{inv.paymentTerms || "—"}</TableCell>
                    <TableCell><Badge className={`border text-xs ${cfg.color}`}>{cfg.label}</Badge></TableCell>
                    <TableCell className={isOverdue ? "text-red-500 font-medium" : ""}>
                      {invoice.dueDate ? format(new Date(invoice.dueDate), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        {vt.includes("Issued") && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => changeStatus.mutate({ id: invoice.id, status: "Issued" })}>
                            <SendHorizontal className="w-3 h-3 mr-1" />Issue
                          </Button>
                        )}
                        {vt.includes("Paid") && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600 border-emerald-600/30 hover:bg-emerald-500/10" onClick={() => changeStatus.mutate({ id: invoice.id, status: "Paid" })}>
                            <CheckCircle2 className="w-3 h-3 mr-1" />Paid
                          </Button>
                        )}
                        {vt.includes("Cancelled") && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => changeStatus.mutate({ id: invoice.id, status: "Cancelled" })}>
                            <XCircle className="w-3 h-3 mr-1" />Cancel
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">GST is auto-computed per product HSN rate (CGST+SGST intra-state, IGST inter-state).</p>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="salesOrderId" render={({ field }) => (
                <FormItem><FormLabel>Sales Order *</FormLabel>
                  <Select onValueChange={v => field.onChange(Number(v))} value={field.value ? field.value.toString() : ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select confirmed order" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {eligibleOrders.map(so => (
                        <SelectItem key={so.id} value={so.id.toString()}>
                          {so.orderNumber} — {so.clientName} · ₹{INR0(Number((so as any).grandTotal ?? so.totalAmount ?? 0))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="paymentTerms" render={({ field }) => (
                <FormItem><FormLabel>Payment Terms</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "__none__"}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select terms" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {PAYMENT_TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={2} placeholder="Payment instructions, bank details, etc." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={createInvoice.isPending}>Create Invoice</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Sheet */}
      <Sheet open={!!selectedId} onOpenChange={o => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {invoiceDetail ? (
            <>
              <SheetHeader className="mb-5">
                <SheetTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  {invoiceDetail.invoiceNumber}
                </SheetTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`border text-xs ${STATUS_CONFIG[invoiceDetail.status]?.color ?? ""}`}>{invoiceDetail.status}</Badge>
                  <span className="text-sm text-muted-foreground">{invoiceDetail.clientName}</span>
                  {invoiceDetail.orderNumber && (
                    <Link href={`/sales-orders/${invoiceDetail.salesOrderId}`} className="text-xs text-primary hover:underline">
                      {invoiceDetail.orderNumber}
                    </Link>
                  )}
                </div>
              </SheetHeader>

              <div className="space-y-5">
                {/* Financial Summary */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="text-xs text-muted-foreground mb-0.5">Grand Total</div>
                  <div className="text-3xl font-bold text-primary">₹{INR(invoiceDetail.grandTotal)}</div>
                  <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between"><span>Subtotal (excl. GST)</span><span>₹{INR(invoiceDetail.totalAmount)}</span></div>
                    {isIntraState ? (
                      <>
                        <div className="flex justify-between"><span>CGST</span><span>₹{INR(invoiceDetail.cgst)}</span></div>
                        <div className="flex justify-between"><span>SGST</span><span>₹{INR(invoiceDetail.sgst)}</span></div>
                      </>
                    ) : (
                      <div className="flex justify-between"><span>IGST</span><span>₹{INR(invoiceDetail.igst)}</span></div>
                    )}
                    {invoiceDetail.roundOff !== 0 && (
                      <div className="flex justify-between"><span>Round Off</span><span>₹{INR(invoiceDetail.roundOff)}</span></div>
                    )}
                  </div>
                  {invoiceDetail.placeOfSupplyStateCode && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Supply type: {isIntraState ? "Intra-state (CGST+SGST)" : "Inter-state (IGST)"} · Place: {invoiceDetail.placeOfSupplyStateCode}
                    </div>
                  )}
                  {invoiceDetail.amountInWords && (
                    <div className="mt-1.5 text-xs italic text-muted-foreground">{invoiceDetail.amountInWords}</div>
                  )}
                </div>

                {/* Client Info */}
                <div className="rounded-lg border p-3 space-y-1 text-sm">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Bill To</div>
                  <div className="font-semibold">{invoiceDetail.clientName}</div>
                  {invoiceDetail.contactPerson && <div className="text-muted-foreground">{invoiceDetail.contactPerson}</div>}
                  {invoiceDetail.clientGst && <div className="text-xs font-mono">GSTIN: {invoiceDetail.clientGst}</div>}
                  {invoiceDetail.billingAddress && <div className="text-xs text-muted-foreground">{invoiceDetail.billingAddress}</div>}
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Invoice Date</div>
                    <div>{format(new Date(invoiceDetail.createdAt), "MMM d, yyyy")}</div>
                  </div>
                  {invoiceDetail.dueDate && (
                    <div>
                      <div className="text-xs text-muted-foreground">Due Date</div>
                      <div className={isPast(new Date(invoiceDetail.dueDate)) && invoiceDetail.status !== "Paid" ? "text-red-500 font-medium" : ""}>
                        {format(new Date(invoiceDetail.dueDate), "MMM d, yyyy")}
                      </div>
                    </div>
                  )}
                  {invoiceDetail.paymentTerms && (
                    <div>
                      <div className="text-xs text-muted-foreground">Payment Terms</div>
                      <div className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5 text-muted-foreground" />{invoiceDetail.paymentTerms}</div>
                    </div>
                  )}
                </div>

                {/* Line Items with GST breakdown */}
                {invoiceDetail.lines.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Line Items</div>
                    <div className="border rounded-md overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="text-xs">
                            <TableHead>Description</TableHead>
                            <TableHead>HSN</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">Taxable</TableHead>
                            <TableHead className="text-right">GST%</TableHead>
                            {isIntraState ? (
                              <>
                                <TableHead className="text-right">CGST</TableHead>
                                <TableHead className="text-right">SGST</TableHead>
                              </>
                            ) : (
                              <TableHead className="text-right">IGST</TableHead>
                            )}
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoiceDetail.lines.map((line) => (
                            <TableRow key={line.id} className="text-xs">
                              <TableCell className="font-medium">{line.description}</TableCell>
                              <TableCell className="font-mono text-muted-foreground">{line.hsnCode || "—"}</TableCell>
                              <TableCell className="text-right">{line.quantity} {line.uom}</TableCell>
                              <TableCell className="text-right">₹{INR0(line.unitPrice)}</TableCell>
                              <TableCell className="text-right">₹{INR(line.lineTotal)}</TableCell>
                              <TableCell className="text-right">{line.gstRate}%</TableCell>
                              {isIntraState ? (
                                <>
                                  <TableCell className="text-right">₹{INR(line.cgst)}</TableCell>
                                  <TableCell className="text-right">₹{INR(line.sgst)}</TableCell>
                                </>
                              ) : (
                                <TableCell className="text-right">₹{INR(line.igst)}</TableCell>
                              )}
                              <TableCell className="text-right font-semibold">₹{INR(line.lineGrandTotal)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {invoiceDetail.notes && (
                  <div className="rounded-lg border p-3 text-sm">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Notes</div>
                    <p className="text-muted-foreground">{invoiceDetail.notes}</p>
                  </div>
                )}

                {/* Payments */}
                {invoiceDetail.payments.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Payment History</div>
                    <div className="space-y-1.5">
                      {invoiceDetail.payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between rounded-lg border bg-emerald-500/5 border-emerald-500/20 p-2.5 text-sm">
                          <div>
                            <div className="font-medium text-emerald-600">₹{INR(p.amount)}</div>
                            <div className="text-xs text-muted-foreground">
                              {p.type}{p.paymentMode ? ` · ${p.paymentMode}` : ""} · {format(new Date(p.paymentDate), "MMM d, yyyy")}
                              {p.referenceNo && <> · Ref: {p.referenceNo}</>}
                            </div>
                          </div>
                          {p.notes && <div className="text-xs text-muted-foreground">{p.notes}</div>}
                        </div>
                      ))}
                    </div>
                    <div className="text-sm font-medium text-emerald-600 text-right">
                      Paid: ₹{INR(invoiceDetail.payments.reduce((s, p) => s + p.amount, 0))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Actions based on validTransitions */}
                <div className="flex gap-2 flex-wrap">
                  {invoiceDetail.validTransitions.map(t => {
                    const colorMap: Record<string, string> = {
                      Issued: "default", Paid: "outline",
                      "Partially Paid": "outline", Cancelled: "destructive",
                    };
                    return (
                      <Button key={t} variant={colorMap[t] as any ?? "outline"} size="sm"
                        onClick={() => changeStatus.mutate({ id: invoiceDetail.id, status: t })}
                        disabled={changeStatus.isPending}>
                        {t === "Issued" && <SendHorizontal className="w-4 h-4 mr-2" />}
                        {t === "Paid" && <CheckCircle2 className="w-4 h-4 mr-2" />}
                        {t === "Cancelled" && <XCircle className="w-4 h-4 mr-2" />}
                        Mark as {t}
                      </Button>
                    );
                  })}
                  <Button variant="outline" size="sm" onClick={() => {
                    const d = invoiceDetail;
                    const lineRows = d.lines.map(l =>
                      `<tr><td>${l.description}</td><td>${l.hsnCode || ""}</td><td>${l.quantity} ${l.uom}</td><td>₹${INR(l.unitPrice)}</td><td>₹${INR(l.lineTotal)}</td><td>${l.gstRate}%</td>${isIntraState ? `<td>₹${INR(l.cgst)}</td><td>₹${INR(l.sgst)}</td>` : `<td>₹${INR(l.igst)}</td>`}<td>₹${INR(l.lineGrandTotal)}</td></tr>`
                    ).join("");
                    const gstHeaders = isIntraState ? "<th>CGST</th><th>SGST</th>" : "<th>IGST</th>";
                    const w = window.open("", "_blank");
                    if (!w) return;
                    w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${d.invoiceNumber}</title>
                      <style>body{font-family:Arial,sans-serif;margin:32px;color:#111}table{border-collapse:collapse;width:100%;margin-top:12px}th,td{border:1px solid #e5e7eb;padding:6px 10px;text-align:left}th{background:#f3f4f6}td:nth-child(n+3){text-align:right}.total{font-size:18px;font-weight:bold;margin-top:16px}</style>
                    </head><body>
                    <h2>Tax Invoice</h2>
                    <p>${d.invoiceNumber} &nbsp;|&nbsp; Order: ${d.orderNumber || d.salesOrderId} &nbsp;|&nbsp; Date: ${format(new Date(d.createdAt), "MMM d, yyyy")}</p>
                    <p><strong>Bill To:</strong> ${d.clientName}${d.clientGst ? ` &nbsp;|&nbsp; GSTIN: ${d.clientGst}` : ""}</p>
                    ${d.billingAddress ? `<p style="font-size:12px;color:#6b7280">${d.billingAddress}</p>` : ""}
                    <table><thead><tr><th>Description</th><th>HSN</th><th>Qty</th><th>Rate</th><th>Taxable</th><th>GST%</th>${gstHeaders}<th>Total</th></tr></thead>
                    <tbody>${lineRows}</tbody></table>
                    <p class="total">Subtotal: ₹${INR(d.totalAmount)} &nbsp;|&nbsp; ${isIntraState ? `CGST: ₹${INR(d.cgst)} + SGST: ₹${INR(d.sgst)}` : `IGST: ₹${INR(d.igst)}`} &nbsp;|&nbsp; <strong>Grand Total: ₹${INR(d.grandTotal)}</strong></p>
                    ${d.amountInWords ? `<p style="font-style:italic;font-size:12px">${d.amountInWords}</p>` : ""}
                    <script>window.onload=()=>window.print()</script></body></html>`);
                    w.document.close();
                  }}>
                    <Printer className="w-4 h-4 mr-2" />Print
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4 pt-4">
              {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
