import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useListClients, useListInvoices } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Printer } from "lucide-react";
import { printCreditNote } from "@/lib/print-utils";

type CN = {
  id: number; creditNoteNumber: string; clientId: number; clientName: string | null;
  invoiceNumber: string | null; amount: number; reason: string; status: string; issuedDate: string;
};

export function CreditNotes() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ clientId: "", invoiceId: "", amount: "", reason: "" });

  const { data, isLoading } = useQuery({ queryKey: ["credit-notes"], queryFn: () => api<CN[]>("/v1/credit-notes") });
  const { data: clients } = useListClients();
  const { data: invoices } = useListInvoices();

  const create = useMutation({
    mutationFn: () => api("/v1/credit-notes", { method: "POST", body: JSON.stringify({
      clientId: Number(form.clientId), invoiceId: form.invoiceId ? Number(form.invoiceId) : null,
      amount: Number(form.amount), reason: form.reason,
    })}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["credit-notes"] }); setDialog(false);
      setForm({ clientId: "", invoiceId: "", amount: "", reason: "" }); toast({ title: "Credit note issued" }); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/v1/credit-notes/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credit-notes"] }),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6" data-testid="page-credit-notes">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Credit Notes</h1>
        <Button onClick={() => setDialog(true)}><Plus className="w-4 h-4 mr-2" />Issue Credit Note</Button>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader><TableRow>
            <TableHead>CN #</TableHead><TableHead>Client</TableHead><TableHead>Against Invoice</TableHead>
            <TableHead className="text-right">Amount</TableHead><TableHead>Reason</TableHead><TableHead className="w-20"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data?.map((cn) => (
              <TableRow key={cn.id}>
                <TableCell className="font-medium">{cn.creditNoteNumber}</TableCell>
                <TableCell>{cn.clientName}</TableCell>
                <TableCell>{cn.invoiceNumber ?? "—"}</TableCell>
                <TableCell className="text-right font-semibold text-red-600">−₹{cn.amount.toLocaleString()}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{cn.reason}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" title="Print credit note" onClick={() => printCreditNote({ creditNoteNumber: cn.creditNoteNumber, clientName: cn.clientName, invoiceNumber: cn.invoiceNumber, amount: Number(cn.amount), reason: cn.reason, status: cn.status, issuedDate: cn.issuedDate })}>
                      <Printer className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => del.mutate(cn.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!data?.length && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No credit notes yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Issue Credit Note</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
              <SelectTrigger><SelectValue placeholder="Client *" /></SelectTrigger>
              <SelectContent>{clients?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.invoiceId} onValueChange={(v) => setForm({ ...form, invoiceId: v })}>
              <SelectTrigger><SelectValue placeholder="Invoice (optional)" /></SelectTrigger>
              <SelectContent>{invoices?.map((i) => <SelectItem key={i.id} value={String(i.id)}>{i.invoiceNumber}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Amount *" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Input placeholder="Reason *" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            <Button onClick={() => create.mutate()} disabled={!form.clientId || !form.amount || !form.reason || create.isPending} className="w-full">Issue</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
