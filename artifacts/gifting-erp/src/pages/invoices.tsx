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
import { Plus, FileText, CheckCircle2, Clock, AlertTriangle, IndianRupee, SendHorizontal, Printer, Package, Building2, CreditCard } from "lucide-react";
import { printInvoice } from "@/lib/print-utils";
import { useToast } from "@/hooks/use-toast";
import { format, isPast } from "date-fns";

const PAYMENT_TERMS = ["Immediate", "Net 7", "Net 15", "Net 30", "Net 45", "Net 60", "50% Advance", "100% Advance"];

const formSchema = z.object({
  salesOrderId: z.coerce.number().min(1, "Sales Order required"),
  gstPercent: z.coerce.number().min(0).default(18),
  dueDate: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  Draft: { label: "Draft", color: "bg-slate-500/10 text-slate-400 border-slate-500/20", icon: FileText },
  Sent: { label: "Sent", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: SendHorizontal },
  Paid: { label: "Paid", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  Overdue: { label: "Overdue", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: AlertTriangle },
};

type InvoiceDetail = {
  id: number; invoiceNumber: string; salesOrderId: number; orderNumber: string | null;
  clientId: number; clientName: string; clientGst: string | null; contactPerson: string | null; billingAddress: string | null;
  totalAmount: number; gstAmount: number; grandTotal: number;
  status: string; dueDate: string | null; notes: string | null; paymentTerms: string | null; createdAt: string;
  items: { id: number; productName: string; productImage: string | null; quantity: number; unitPrice: number; totalPrice: number }[];
  payments: { id: number; amount: number; type: string; paymentDate: string; notes: string | null }[];
};

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
    },
  });

  const markPaid = useMutation({
    mutationFn: (id: number) => api(`/v1/invoices/${id}`, { method: "PATCH", body: JSON.stringify({ status: "Paid" }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() }); queryClient.invalidateQueries({ queryKey: ["invoice-detail", selectedId] }); toast({ title: "Marked as paid" }); },
  });

  const markSent = useMutation({
    mutationFn: (id: number) => api(`/v1/invoices/${id}`, { method: "PATCH", body: JSON.stringify({ status: "Sent" }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() }); queryClient.invalidateQueries({ queryKey: ["invoice-detail", selectedId] }); toast({ title: "Marked as sent" }); },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { salesOrderId: 0, gstPercent: 18, dueDate: "", paymentTerms: "", notes: "" },
  });

  const onSubmit = (data: FormValues) => createInvoice.mutate({
    data: {
      salesOrderId: data.salesOrderId,
      gstPercent: data.gstPercent,
      dueDate: data.dueDate || undefined,
      paymentTerms: data.paymentTerms || undefined,
      notes: data.notes || undefined,
    } as any,
  });

  const eligibleOrders = salesOrders?.filter(o => o.status !== "Draft") || [];
  const totalBilled = (allInvoices ?? []).reduce((s, i) => s + Number((i as any).grandTotal ?? i.totalAmount ?? 0), 0);
  const totalPaid = (allInvoices ?? []).filter(i => i.status === "Paid").reduce((s, i) => s + Number((i as any).grandTotal ?? i.totalAmount ?? 0), 0);
  const totalOutstanding = (allInvoices ?? []).filter(i => ["Sent", "Overdue"].includes(i.status)).reduce((s, i) => s + Number((i as any).grandTotal ?? i.totalAmount ?? 0), 0);
  const totalOverdue = (allInvoices ?? []).filter(i => i.status === "Overdue").reduce((s, i) => s + Number((i as any).grandTotal ?? i.totalAmount ?? 0), 0);

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
          { label: "Total Billed", value: `₹${totalBilled.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: IndianRupee, color: "text-primary" },
          { label: "Collected", value: `₹${totalPaid.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Outstanding", value: `₹${totalOutstanding.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: Clock, color: "text-amber-500" },
          { label: "Overdue", value: `₹${totalOverdue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: AlertTriangle, color: "text-red-500" },
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
              <TableHead>Payment Terms</TableHead>
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
                const cfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.Draft;
                const inv = invoice as any;
                const isOverdue = invoice.dueDate && isPast(new Date(invoice.dueDate)) && invoice.status !== "Paid";
                const subtotalAmt = Number(inv.totalAmount ?? 0);
                const gstAmt = Number(inv.gstAmount ?? 0);
                const grandTotal = Number(inv.grandTotal ?? subtotalAmt + gstAmt);
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
                    <TableCell className="text-right">₹{subtotalAmt.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-right text-muted-foreground">₹{gstAmt.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-right font-bold">₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{inv.paymentTerms || "—"}</TableCell>
                    <TableCell><Badge className={`border text-xs ${cfg.color}`}>{cfg.label}</Badge></TableCell>
                    <TableCell className={isOverdue ? "text-red-500 font-medium" : ""}>
                      {invoice.dueDate ? format(new Date(invoice.dueDate), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" title="Print invoice"
                          onClick={() => printInvoice({ invoiceNumber: invoice.invoiceNumber, clientName: invoice.clientName, orderNumber: invoice.orderNumber, subtotal: subtotalAmt, gstAmount: gstAmt, totalAmount: grandTotal, status: invoice.status, dueDate: invoice.dueDate })}>
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                        {invoice.status === "Draft" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markSent.mutate(invoice.id)}>
                            <SendHorizontal className="w-3 h-3 mr-1" />Send
                          </Button>
                        )}
                        {["Sent", "Overdue"].includes(invoice.status) && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600 border-emerald-600/30 hover:bg-emerald-500/10" onClick={() => markPaid.mutate(invoice.id)}>
                            <CheckCircle2 className="w-3 h-3 mr-1" />Paid
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="salesOrderId" render={({ field }) => (
                <FormItem><FormLabel>Sales Order *</FormLabel>
                  <Select onValueChange={v => field.onChange(Number(v))} value={field.value ? field.value.toString() : ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select confirmed order" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {eligibleOrders.map(so => (
                        <SelectItem key={so.id} value={so.id.toString()}>
                          {so.orderNumber} — {so.clientName} · ₹{Number((so as any).grandTotal ?? so.totalAmount ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="gstPercent" render={({ field }) => (
                  <FormItem><FormLabel>GST %</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
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
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
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
                  <div className="text-3xl font-bold text-primary">₹{invoiceDetail.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                  <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between"><span>Subtotal (excl. GST)</span><span>₹{invoiceDetail.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between"><span>GST</span><span>₹{invoiceDetail.gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                  </div>
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

                {/* Line Items */}
                {invoiceDetail.items.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Line Items</div>
                    <div className="space-y-1.5">
                      {invoiceDetail.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 rounded-lg border bg-muted/20 p-2.5">
                          <div className="shrink-0 w-9 h-9 rounded bg-muted border flex items-center justify-center">
                            {item.productImage
                              ? <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover rounded" />
                              : <Package className="w-4 h-4 text-muted-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{item.productName}</div>
                            <div className="text-xs text-muted-foreground">{item.quantity} × ₹{item.unitPrice.toLocaleString("en-IN")}</div>
                          </div>
                          <div className="text-sm font-bold shrink-0">₹{item.totalPrice.toLocaleString("en-IN")}</div>
                        </div>
                      ))}
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
                            <div className="font-medium text-emerald-600">₹{p.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                            <div className="text-xs text-muted-foreground">{p.type} · {format(new Date(p.paymentDate), "MMM d, yyyy")}</div>
                          </div>
                          {p.notes && <div className="text-xs text-muted-foreground">{p.notes}</div>}
                        </div>
                      ))}
                    </div>
                    <div className="text-sm font-medium text-emerald-600 text-right">
                      Paid: ₹{invoiceDetail.payments.reduce((s, p) => s + p.amount, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => printInvoice({
                    invoiceNumber: invoiceDetail.invoiceNumber, clientName: invoiceDetail.clientName,
                    orderNumber: invoiceDetail.orderNumber, subtotal: invoiceDetail.totalAmount,
                    gstAmount: invoiceDetail.gstAmount, totalAmount: invoiceDetail.grandTotal,
                    status: invoiceDetail.status, dueDate: invoiceDetail.dueDate,
                  })}>
                    <Printer className="w-4 h-4 mr-2" />Print
                  </Button>
                  {invoiceDetail.status === "Draft" && (
                    <Button size="sm" variant="outline" onClick={() => markSent.mutate(invoiceDetail.id)}>
                      <SendHorizontal className="w-4 h-4 mr-2" />Mark Sent
                    </Button>
                  )}
                  {["Sent", "Overdue"].includes(invoiceDetail.status) && (
                    <Button size="sm" className="text-emerald-600 border-emerald-600/30 bg-emerald-500/10 hover:bg-emerald-500/20" variant="outline"
                      onClick={() => markPaid.mutate(invoiceDetail.id)}>
                      <CheckCircle2 className="w-4 h-4 mr-2" />Mark Paid
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4 pt-8"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-24 w-full" /><Skeleton className="h-32 w-full" /></div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
