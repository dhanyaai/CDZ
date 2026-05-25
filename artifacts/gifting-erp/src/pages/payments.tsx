import { useState } from "react";
import { useListPayments, useCreatePayment, useListInvoices, getListPaymentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const formSchema = z.object({
  invoiceId: z.coerce.number().min(1, "Invoice is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  type: z.enum(["advance", "full", "partial"]),
  paymentDate: z.string().min(1, "Payment date is required"),
  notes: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

export function Payments() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [invoiceFilter, setInvoiceFilter] = useState<string>("all");

  const { data: payments, isLoading } = useListPayments({ invoiceId: invoiceFilter === "all" ? undefined : Number(invoiceFilter) });
  const { data: invoices } = useListInvoices();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createPayment = useCreatePayment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
        setDialogOpen(false);
        form.reset();
        toast({ title: "Payment recorded successfully" });
      }
    }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { invoiceId: 0, amount: 0, type: "full", paymentDate: new Date().toISOString().split('T')[0], notes: "" }
  });

  const onSubmit = (data: FormValues) => {
    createPayment.mutate({ data });
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "advance": return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Advance</Badge>;
      case "full": return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Full Payment</Badge>;
      case "partial": return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Partial</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getInvoiceInfo = (invoiceId: number) => {
    return invoices?.find(inv => inv.id === invoiceId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Payments</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> Record Payment</Button>
      </div>

      <div className="flex gap-4">
        <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Filter by invoice" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Invoices</SelectItem>
            {invoices?.map(inv => (
              <SelectItem key={inv.id} value={inv.id.toString()}>{inv.invoiceNumber} - {inv.clientName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt #</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
            ) : payments?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">No payments recorded</TableCell></TableRow>
            ) : (
              payments?.map(payment => {
                const invoice = getInvoiceInfo(payment.invoiceId);
                return (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      REC-{payment.id.toString().padStart(4, '0')}
                    </TableCell>
                    <TableCell>{invoice?.invoiceNumber || `INV-${payment.invoiceId}`}</TableCell>
                    <TableCell>{invoice?.clientName || "-"}</TableCell>
                    <TableCell className="text-right font-bold text-green-700 dark:text-green-400">+₹{payment.amount.toFixed(2)}</TableCell>
                    <TableCell>{getTypeBadge(payment.type)}</TableCell>
                    <TableCell>{format(new Date(payment.paymentDate), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate" title={payment.notes ?? ""}>{payment.notes || "-"}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="invoiceId" render={({ field }) => (
                <FormItem><FormLabel>Invoice *</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? field.value.toString() : ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {invoices?.map(inv => (
                        <SelectItem key={inv.id} value={inv.id.toString()}>{inv.invoiceNumber} - Total: ₹{Number(inv.totalAmount).toLocaleString("en-IN")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem><FormLabel>Amount Received *</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>Payment Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="advance">Advance</SelectItem>
                        <SelectItem value="full">Full Payment</SelectItem>
                        <SelectItem value="partial">Partial Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="paymentDate" render={({ field }) => (
                <FormItem><FormLabel>Payment Date *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes (Optional)</FormLabel>
                  <FormControl><Textarea {...field} placeholder="Reference number, bank details, etc."/></FormControl>
                <FormMessage /></FormItem>
              )} />

              <Button type="submit" className="w-full" disabled={createPayment.isPending}>Record Payment</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
