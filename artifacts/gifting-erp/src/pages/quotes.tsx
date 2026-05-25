import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useListClients } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

type Quote = {
  id: number; quoteNumber: string; clientId: number; clientName: string | null;
  status: string; validUntil: string | null; subtotal: number; discountPct: number;
  gstAmount: number; totalAmount: number; createdAt: string;
};

type LineItem = { description: string; quantity: number; unitPrice: number };

export function Quotes() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [clientId, setClientId] = useState("");
  const [discountPct, setDiscountPct] = useState("0");
  const [validUntil, setValidUntil] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unitPrice: 0 }]);

  const { data: quotes, isLoading } = useQuery({ queryKey: ["quotes"], queryFn: () => api<Quote[]>("/v1/quotes") });
  const { data: clients } = useListClients();

  const create = useMutation({
    mutationFn: () => api("/v1/quotes", { method: "POST", body: JSON.stringify({
      clientId: Number(clientId), discountPct: Number(discountPct), validUntil: validUntil || null,
      items: items.filter((i) => i.description),
    })}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); setDialog(false);
      setItems([{ description: "", quantity: 1, unitPrice: 0 }]); setDiscountPct("0"); setValidUntil(""); setClientId("");
      toast({ title: "Quote created" }); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/v1/quotes/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/v1/quotes/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const afterDisc = subtotal * (1 - Number(discountPct || 0) / 100);
  const gst = afterDisc * 0.18;
  const total = afterDisc + gst;

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6" data-testid="page-quotes">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Quotes</h1>
        <Button onClick={() => setDialog(true)}><Plus className="w-4 h-4 mr-2" />New Quote</Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote #</TableHead><TableHead>Client</TableHead>
              <TableHead>Status</TableHead><TableHead>Valid Until</TableHead>
              <TableHead className="text-right">Total</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes?.map((q) => (
              <TableRow key={q.id}>
                <TableCell className="font-medium">{q.quoteNumber}</TableCell>
                <TableCell>{q.clientName}</TableCell>
                <TableCell>
                  <Select value={q.status} onValueChange={(v) => updateStatus.mutate({ id: q.id, status: v })}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{q.validUntil ? new Date(q.validUntil).toLocaleDateString() : "—"}</TableCell>
                <TableCell className="text-right font-semibold">₹{q.totalAmount.toLocaleString()}</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(q.id)}><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {!quotes?.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No quotes yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Quote</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Client *" /></SelectTrigger>
              <SelectContent>{clients?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} placeholder="Valid until" />
              <Input type="number" placeholder="Discount %" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Line Items</div>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <Input className="col-span-6" placeholder="Description" value={item.description} onChange={(e) => { const n = [...items]; n[i].description = e.target.value; setItems(n); }} />
                  <Input className="col-span-2" type="number" placeholder="Qty" value={item.quantity} onChange={(e) => { const n = [...items]; n[i].quantity = Number(e.target.value); setItems(n); }} />
                  <Input className="col-span-3" type="number" placeholder="Unit price" value={item.unitPrice} onChange={(e) => { const n = [...items]; n[i].unitPrice = Number(e.target.value); setItems(n); }} />
                  <Button className="col-span-1" size="icon" variant="ghost" onClick={() => setItems(items.filter((_, x) => x !== i))}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setItems([...items, { description: "", quantity: 1, unitPrice: 0 }])}>Add line</Button>
            </div>
            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>GST (18%)</span><span>₹{gst.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
            </div>
            <Button onClick={() => create.mutate()} disabled={!clientId || create.isPending} className="w-full">Create Quote</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
