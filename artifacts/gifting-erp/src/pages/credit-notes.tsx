import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useListClients, useListInvoices } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Printer, CheckCircle, XCircle, FileX } from "lucide-react";
import { printCreditNote } from "@/lib/print-utils";

type CN = {
  id: number; creditNoteNumber: string; clientId: number; clientName: string | null;
  invoiceId: number | null; invoiceNumber: string | null; amount: number;
  reason: string; status: string; issuedDate: string;
};

const statusStyle: Record<string, string> = {
  Issued: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  Applied: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  Void: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const INR = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function CreditNotes() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [voidId, setVoidId] = useState<number | null>(null);
  const [delId, setDelId] = useState<number | null>(null);
  const [form, setForm] = useState({ clientId: "", invoiceId: "__none__", amount: "", reason: "" });

  const { data, isLoading } = useQuery({ queryKey: ["credit-notes"], queryFn: () => api<CN[]>("/v1/credit-notes") });
  const { data: clients } = useListClients();
  const { data: invoices } = useListInvoices();

  const create = useMutation({
    mutationFn: () => api("/v1/credit-notes", {
      method: "POST",
      body: JSON.stringify({
        clientId: Number(form.clientId),
        invoiceId: form.invoiceId !== "__none__" ? Number(form.invoiceId) : null,
        amount: Number(form.amount),
        reason: form.reason,
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-notes"] });
      setDialog(false);
      setForm({ clientId: "", invoiceId: "__none__", amount: "", reason: "" });
      toast({ title: "Credit note issued" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const apply = useMutation({
    mutationFn: (id: number) => api(`/v1/credit-notes/${id}/apply`, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-notes"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Credit note applied to invoice" });
    },
    onError: (e: Error) => toast({ title: "Cannot apply", description: e.message, variant: "destructive" }),
  });

  const voidCn = useMutation({
    mutationFn: (id: number) => api(`/v1/credit-notes/${id}/void`, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-notes"] });
      setVoidId(null);
      toast({ title: "Credit note voided" });
    },
    onError: (e: Error) => toast({ title: "Cannot void", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/v1/credit-notes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-notes"] });
      setDelId(null);
    },
    onError: (e: Error) => toast({ title: "Cannot delete", description: e.message, variant: "destructive" }),
  });

  const summary = {
    issued: data?.filter((c) => c.status === "Issued").reduce((s, c) => s + c.amount, 0) ?? 0,
    applied: data?.filter((c) => c.status === "Applied").reduce((s, c) => s + c.amount, 0) ?? 0,
    total: data?.length ?? 0,
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6" data-testid="page-credit-notes">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Credit Notes</h1>
          <p className="text-sm text-muted-foreground mt-1">Issue, apply, and track credit notes against invoices</p>
        </div>
        <Button onClick={() => setDialog(true)}><Plus className="w-4 h-4 mr-2" />Issue Credit Note</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <div className="text-xs text-muted-foreground mb-1">Total Issued</div>
          <div className="text-2xl font-bold text-blue-600">{INR(summary.issued)}</div>
          <div className="text-xs text-muted-foreground mt-1">Pending application</div>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <div className="text-xs text-muted-foreground mb-1">Total Applied</div>
          <div className="text-2xl font-bold text-green-600">{INR(summary.applied)}</div>
          <div className="text-xs text-muted-foreground mt-1">Settled against invoices</div>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <div className="text-xs text-muted-foreground mb-1">Notes Raised</div>
          <div className="text-2xl font-bold">{summary.total}</div>
          <div className="text-xs text-muted-foreground mt-1">All time</div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CN #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Against Invoice</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-36 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((cn) => (
              <TableRow key={cn.id}>
                <TableCell className="font-medium font-mono text-sm">{cn.creditNoteNumber}</TableCell>
                <TableCell className="font-medium">{cn.clientName}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{cn.invoiceNumber ?? "—"}</TableCell>
                <TableCell className="text-right font-semibold text-red-600">−{INR(cn.amount)}</TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{cn.reason}</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[cn.status] ?? "bg-muted text-muted-foreground"}`}>
                    {cn.status}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    {cn.status === "Issued" && cn.invoiceId && (
                      <Button
                        size="icon" variant="ghost"
                        title="Apply to invoice"
                        disabled={apply.isPending}
                        onClick={() => apply.mutate(cn.id)}
                      >
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </Button>
                    )}
                    {cn.status === "Issued" && (
                      <Button
                        size="icon" variant="ghost"
                        title="Void credit note"
                        onClick={() => setVoidId(cn.id)}
                      >
                        <FileX className="w-4 h-4 text-amber-600" />
                      </Button>
                    )}
                    <Button
                      size="icon" variant="ghost"
                      title="Print credit note"
                      onClick={() => printCreditNote({
                        creditNoteNumber: cn.creditNoteNumber,
                        clientName: cn.clientName,
                        invoiceNumber: cn.invoiceNumber,
                        amount: cn.amount,
                        reason: cn.reason,
                        status: cn.status,
                        issuedDate: cn.issuedDate,
                      })}
                    >
                      <Printer className="w-4 h-4" />
                    </Button>
                    {cn.status !== "Applied" && (
                      <Button size="icon" variant="ghost" title="Delete" onClick={() => setDelId(cn.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!data?.length && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No credit notes yet — issue one to get started
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Issue dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Issue Credit Note</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v, invoiceId: "__none__" })}>
              <SelectTrigger><SelectValue placeholder="Client *" /></SelectTrigger>
              <SelectContent>
                {clients?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.invoiceId} onValueChange={(v) => setForm({ ...form, invoiceId: v })}>
              <SelectTrigger><SelectValue placeholder="Invoice (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— No invoice —</SelectItem>
                {invoices
                  ?.filter((i) => !form.clientId || String(i.clientId) === form.clientId)
                  .map((i) => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      {i.invoiceNumber} — ₹{Number(i.grandTotal).toLocaleString("en-IN")}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Amount (₹) *"
              type="number"
              min={1}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <Select value={form.reason} onValueChange={(v) => setForm({ ...form, reason: v })}>
              <SelectTrigger><SelectValue placeholder="Reason *" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Product Return">Product Return</SelectItem>
                <SelectItem value="Price Dispute">Price Dispute</SelectItem>
                <SelectItem value="Defective / Damaged">Defective / Damaged</SelectItem>
                <SelectItem value="Short Supply">Short Supply</SelectItem>
                <SelectItem value="Wrong Product">Wrong Product</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => create.mutate()}
              disabled={!form.clientId || !form.amount || !form.reason || create.isPending}
              className="w-full"
            >
              {create.isPending ? "Issuing…" : "Issue Credit Note"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Void confirm */}
      <AlertDialog open={voidId !== null} onOpenChange={(o) => !o && setVoidId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Credit Note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the credit note as void. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => voidId !== null && voidCn.mutate(voidId)}
            >
              Void
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={delId !== null} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Credit Note?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => delId !== null && del.mutate(delId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
