import { useState } from "react";
import { Link } from "wouter";
import { useListInvoices, useCreateInvoice, useListSalesOrders, getListInvoicesQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, FileText, CheckCircle2, Clock, AlertTriangle, IndianRupee, TrendingDown, SendHorizontal, Printer } from "lucide-react";
import { printInvoice } from "@/lib/print-utils";
import { useToast } from "@/hooks/use-toast";
import { format, isPast } from "date-fns";

const formSchema = z.object({
  salesOrderId: z.coerce.number().min(1, "Sales Order is required"),
  gstPercent: z.coerce.number().min(0).default(18),
  dueDate: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  Draft: { label: "Draft", color: "bg-slate-500/10 text-slate-400 border-slate-500/20", icon: FileText },
  Sent: { label: "Sent", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: SendHorizontal },
  Paid: { label: "Paid", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  Overdue: { label: "Overdue", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: AlertTriangle },
};

export function Invoices() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: invoices, isLoading } = useListInvoices({ status: statusFilter === "All" ? undefined : statusFilter as any });
  const { data: allInvoices } = useListInvoices();
  const { data: salesOrders } = useListSalesOrders();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() }); toast({ title: "Marked as paid" }); },
  });

  const markSent = useMutation({
    mutationFn: (id: number) => api(`/v1/invoices/${id}`, { method: "PATCH", body: JSON.stringify({ status: "Sent" }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() }); toast({ title: "Marked as sent" }); },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { salesOrderId: 0, gstPercent: 18, dueDate: "" },
  });

  const onSubmit = (data: FormValues) => createInvoice.mutate({ data: { ...data, dueDate: data.dueDate || undefined } });
  const eligibleOrders = salesOrders?.filter(o => o.status !== "Draft") || [];

  const totalBilled = (allInvoices ?? []).reduce((s, i) => s + Number(i.totalAmount ?? 0), 0);
  const totalPaid = (allInvoices ?? []).filter(i => i.status === "Paid").reduce((s, i) => s + Number(i.totalAmount ?? 0), 0);
  const totalOutstanding = (allInvoices ?? []).filter(i => ["Sent","Overdue"].includes(i.status)).reduce((s, i) => s + Number(i.totalAmount ?? 0), 0);
  const totalOverdue = (allInvoices ?? []).filter(i => i.status === "Overdue").reduce((s, i) => s + Number(i.totalAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">GST Invoices</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Accounts receivable and billing management</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />New Invoice</Button>
      </div>

      {/* AR Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Billed", value: `₹${totalBilled.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: IndianRupee, color: "text-primary" },
          { label: "Collected", value: `₹${totalPaid.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Outstanding", value: `₹${totalOutstanding.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: Clock, color: "text-amber-500" },
          { label: "Overdue", value: `₹${totalOverdue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: AlertTriangle, color: "text-red-500" },
        ].map(s => (
          <Card key={s.label} className="elev-1">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
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
              <TableHead>Order #</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">GST</TableHead>
              <TableHead className="text-right font-bold">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
              ))
            ) : invoices?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No invoices found</p>
                </TableCell>
              </TableRow>
            ) : (
              invoices?.map(invoice => {
                const cfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.Draft;
                const isOverdue = invoice.dueDate && isPast(new Date(invoice.dueDate)) && invoice.status !== "Paid";
                const subtotalAmt = Number(invoice.totalAmount ?? 0) - Number(invoice.gstAmount ?? 0);
                return (
                  <TableRow key={invoice.id} className={isOverdue ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-muted/30"}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        {invoice.invoiceNumber}
                      </div>
                    </TableCell>
                    <TableCell>{invoice.clientName}</TableCell>
                    <TableCell>
                      {invoice.salesOrderId ? (
                        <Link href={`/sales-orders/${invoice.salesOrderId}`} className="text-primary hover:underline" onClick={e => e.stopPropagation()}>
                          {invoice.orderNumber || `SO-${invoice.salesOrderId}`}
                        </Link>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right">₹{subtotalAmt.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-right text-muted-foreground">₹{Number(invoice.gstAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-right font-bold">₹{Number(invoice.totalAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                    <TableCell>
                      <Badge className={`border text-xs ${cfg.color}`}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className={isOverdue ? "text-red-500 font-medium" : ""}>
                      {invoice.dueDate ? format(new Date(invoice.dueDate), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" title="Print invoice"
                          onClick={() => printInvoice({ invoiceNumber: invoice.invoiceNumber, clientName: invoice.clientName, orderNumber: invoice.orderNumber, subtotal: subtotalAmt, gstAmount: Number(invoice.gstAmount ?? 0), totalAmount: Number(invoice.totalAmount ?? 0), status: invoice.status, dueDate: invoice.dueDate })}>
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                        {invoice.status === "Draft" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markSent.mutate(invoice.id)}>
                            <SendHorizontal className="w-3 h-3 mr-1" />Send
                          </Button>
                        )}
                        {["Sent","Overdue"].includes(invoice.status) && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600 border-emerald-600/30 hover:bg-emerald-500/10" onClick={() => markPaid.mutate(invoice.id)}>
                            <CheckCircle2 className="w-3 h-3 mr-1" />Mark Paid
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
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
                          {so.orderNumber} — {so.clientName} · ₹{Number(so.totalAmount ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
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
              <Button type="submit" className="w-full" disabled={createInvoice.isPending}>Create Invoice</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
