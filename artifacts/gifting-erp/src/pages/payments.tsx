import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Card, CardContent } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, CreditCard, IndianRupee, Banknote, TrendingUp, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { api } from "@/lib/api";

const PAYMENT_MODES = ["UPI", "NEFT", "RTGS", "IMPS", "Cash", "Cheque", "Bank Transfer"] as const;

const formSchema = z.object({
  invoiceId: z.coerce.number().min(1, "Invoice is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  type: z.enum(["advance", "full", "partial"]),
  paymentMode: z.string().min(1, "Payment mode is required"),
  referenceNo: z.string().optional(),
  paymentDate: z.string().min(1, "Payment date is required"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type AdvanceReceipt = {
  id: number;
  opportunityId: number;
  opportunityTitle: string | null;
  clientName: string | null;
  amount: number;
  paymentMode: string | null;
  referenceNo: string | null;
  receiptDate: string;
  notes: string | null;
  createdAt: string;
};

type UnifiedEntry =
  | { kind: "invoice"; id: number; invoiceId: number; clientName: string | null; amount: number; type: string; paymentMode: string | null; referenceNo: string | null; paymentDate: string; notes: string | null; invoiceNumber: string | null }
  | { kind: "advance"; id: number; opportunityId: number; opportunityTitle: string | null; clientName: string | null; amount: number; paymentMode: string | null; referenceNo: string | null; receiptDate: string; notes: string | null };

export function Payments() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<"all" | "invoice" | "advance">("all");

  const { data: payments, isLoading: loadingPayments } = useListPayments();
  const { data: invoices } = useListInvoices();
  const { data: advanceReceipts, isLoading: loadingAdvance } = useQuery<AdvanceReceipt[]>({
    queryKey: ["advance-receipts-all"],
    queryFn: () => api<AdvanceReceipt[]>("/v1/advance-receipts"),
  });

  const isLoading = loadingPayments || loadingAdvance;

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createPayment = useCreatePayment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
        setDialogOpen(false);
        form.reset();
        toast({ title: "Payment recorded successfully" });
      },
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoiceId: 0, amount: 0, type: "full", paymentMode: "",
      referenceNo: "", paymentDate: new Date().toISOString().split("T")[0], notes: "",
    },
  });

  const onSubmit = (data: FormValues) => {
    createPayment.mutate({ data });
  };

  const getInvoiceInfo = (invoiceId: number) => invoices?.find((inv) => inv.id === invoiceId);

  // Build unified list
  const invoiceEntries: UnifiedEntry[] = (payments ?? []).map(p => ({
    kind: "invoice",
    id: p.id,
    invoiceId: p.invoiceId,
    clientName: getInvoiceInfo(p.invoiceId)?.clientName ?? null,
    amount: Number(p.amount ?? 0),
    type: p.type,
    paymentMode: p.paymentMode ?? null,
    referenceNo: p.referenceNo ?? null,
    paymentDate: p.paymentDate,
    notes: p.notes ?? null,
    invoiceNumber: getInvoiceInfo(p.invoiceId)?.invoiceNumber ?? null,
  }));

  const advanceEntries: UnifiedEntry[] = (advanceReceipts ?? []).map(r => ({
    kind: "advance",
    id: r.id,
    opportunityId: r.opportunityId,
    opportunityTitle: r.opportunityTitle,
    clientName: r.clientName,
    amount: r.amount,
    paymentMode: r.paymentMode,
    referenceNo: r.referenceNo,
    receiptDate: r.receiptDate,
    notes: r.notes,
  }));

  const allEntries: UnifiedEntry[] = [
    ...invoiceEntries,
    ...advanceEntries,
  ].sort((a, b) => {
    const aDate = a.kind === "invoice" ? a.paymentDate : a.receiptDate;
    const bDate = b.kind === "invoice" ? b.paymentDate : b.receiptDate;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  const filtered = allEntries.filter(e =>
    sourceFilter === "all" ? true :
    sourceFilter === "invoice" ? e.kind === "invoice" :
    e.kind === "advance"
  );

  const totalCollected = filtered.reduce((s, e) => s + e.amount, 0);
  const totalAdvance = advanceEntries.reduce((s, e) => s + e.amount, 0);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "advance": return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Advance</Badge>;
      case "full": return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Full Payment</Badge>;
      case "partial": return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Partial</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getModeBadge = (mode: string | null) => {
    if (!mode) return <span className="text-muted-foreground text-xs">—</span>;
    const colors: Record<string, string> = {
      UPI: "bg-violet-100 text-violet-800 border-violet-200",
      NEFT: "bg-blue-100 text-blue-800 border-blue-200",
      RTGS: "bg-indigo-100 text-indigo-800 border-indigo-200",
      IMPS: "bg-cyan-100 text-cyan-800 border-cyan-200",
      Cash: "bg-green-100 text-green-800 border-green-200",
      Cheque: "bg-amber-100 text-amber-800 border-amber-200",
      "Bank Transfer": "bg-slate-100 text-slate-800 border-slate-200",
    };
    return <Badge variant="outline" className={`text-xs ${colors[mode] ?? ""}`}>{mode}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Payments</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> Record Payment</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <IndianRupee className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Collected</p>
              <p className="text-xl font-bold text-green-700 dark:text-green-400">
                ₹{totalCollected.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="text-xl font-bold">{filtered.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Advance Collected</p>
              <p className="text-xl font-bold text-indigo-700 dark:text-indigo-400">
                ₹{totalAdvance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as typeof sourceFilter)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entries</SelectItem>
            <SelectItem value="invoice">Invoice Payments</SelectItem>
            <SelectItem value="advance">Advance Receipts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt #</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>UTR / Ref #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                <Banknote className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No payment entries found
              </TableCell></TableRow>
            ) : (
              filtered.map((entry) => {
                if (entry.kind === "invoice") {
                  return (
                    <TableRow key={`inv-${entry.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          REC-{entry.id.toString().padStart(4, "0")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <div className="font-medium text-muted-foreground">Invoice</div>
                          <div className="font-mono">{entry.invoiceNumber ?? `INV-${entry.invoiceId}`}</div>
                        </div>
                      </TableCell>
                      <TableCell>{entry.clientName ?? "—"}</TableCell>
                      <TableCell className="text-right font-bold text-green-700 dark:text-green-400">
                        +₹{entry.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>{getTypeBadge(entry.type)}</TableCell>
                      <TableCell>{getModeBadge(entry.paymentMode)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{entry.referenceNo ?? "—"}</TableCell>
                      <TableCell>{format(new Date(entry.paymentDate), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[160px] truncate" title={entry.notes ?? ""}>{entry.notes ?? "—"}</TableCell>
                    </TableRow>
                  );
                } else {
                  return (
                    <TableRow key={`adv-${entry.id}`} className="bg-indigo-50/40 dark:bg-indigo-950/20">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-indigo-500" />
                          ADV-{entry.id.toString().padStart(4, "0")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] mb-0.5">Advance</Badge>
                          <div className="text-muted-foreground truncate max-w-[140px]" title={entry.opportunityTitle ?? ""}>{entry.opportunityTitle ?? "—"}</div>
                        </div>
                      </TableCell>
                      <TableCell>{entry.clientName ?? "—"}</TableCell>
                      <TableCell className="text-right font-bold text-indigo-700 dark:text-indigo-400">
                        +₹{entry.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-200">Advance</Badge>
                      </TableCell>
                      <TableCell>{getModeBadge(entry.paymentMode)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{entry.referenceNo ?? "—"}</TableCell>
                      <TableCell>{format(new Date(entry.receiptDate), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[160px] truncate" title={entry.notes ?? ""}>{entry.notes ?? "—"}</TableCell>
                    </TableRow>
                  );
                }
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Invoice Payment</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="invoiceId" render={({ field }) => (
                <FormItem><FormLabel>Invoice *</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? field.value.toString() : ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {invoices?.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id.toString()}>
                          {inv.invoiceNumber} — ₹{Number(inv.totalAmount).toLocaleString("en-IN")}
                        </SelectItem>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="paymentMode" render={({ field }) => (
                  <FormItem><FormLabel>Payment Mode *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="referenceNo" render={({ field }) => (
                  <FormItem><FormLabel>UTR / Ref #</FormLabel>
                    <FormControl><Input {...field} placeholder="Transaction reference" /></FormControl>
                  <FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="paymentDate" render={({ field }) => (
                <FormItem><FormLabel>Payment Date *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel>
                  <FormControl><Textarea {...field} placeholder="Additional info..." /></FormControl>
                <FormMessage /></FormItem>
              )} />

              <Button type="submit" className="w-full" disabled={createPayment.isPending}>
                Record Payment
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
