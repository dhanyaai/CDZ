import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useListPurchaseOrders, useListProducts } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Printer } from "lucide-react";
import { printGrn } from "@/lib/print-utils";

type Grn = {
  id: number; grnNumber: string; purchaseOrderId: number;
  receivedDate: string; status: string; notes: string | null;
};

type Line = { productId: number; quantityReceived: number; quantityRejected: number; remarks: string };

export function Grn() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [poId, setPoId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);

  const { data, isLoading } = useQuery({ queryKey: ["grn"], queryFn: () => api<Grn[]>("/v1/grn") });
  const { data: pos } = useListPurchaseOrders();
  const { data: products } = useListProducts();

  const create = useMutation({
    mutationFn: () => api("/v1/grn", { method: "POST", body: JSON.stringify({
      purchaseOrderId: Number(poId), notes,
      items: lines.filter((l) => l.productId && l.quantityReceived > 0),
    })}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grn"] }); setDialog(false);
      setPoId(""); setNotes(""); setLines([]); toast({ title: "GRN created" }); },
    onError: (e) => toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6" data-testid="page-grn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Goods Receipts (GRN)</h1>
          <p className="text-sm text-muted-foreground">Receive items against purchase orders</p>
        </div>
        <Button onClick={() => { setDialog(true); setLines([{ productId: 0, quantityReceived: 0, quantityRejected: 0, remarks: "" }]); }}>
          <Plus className="w-4 h-4 mr-2" />New GRN
        </Button>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader><TableRow>
            <TableHead>GRN #</TableHead><TableHead>PO</TableHead>
            <TableHead>Received</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead><TableHead className="w-14"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data?.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">{g.grnNumber}</TableCell>
                <TableCell>{(pos?.find(p => p.id === g.purchaseOrderId) as any)?.poNumber ?? `PO-${g.purchaseOrderId}`}</TableCell>
                <TableCell>{new Date(g.receivedDate).toLocaleDateString()}</TableCell>
                <TableCell><Badge>{g.status}</Badge></TableCell>
                <TableCell className="text-muted-foreground text-sm">{g.notes ?? "—"}</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" title="Print GRN" onClick={async () => {
                    try {
                      const detail = await api<{ id: number; grnNumber: string; purchaseOrderId: number; receivedDate: string; status: string; notes: string | null; items: { productId: number; quantityReceived: number; quantityRejected: number; remarks: string | null }[] }>(`/v1/grn/${g.id}`);
                      const po = pos?.find((p) => p.id === g.purchaseOrderId);
                      const resolvedItems = detail.items.map((item) => ({
                        productName: products?.find((p) => p.id === item.productId)?.name ?? `Product #${item.productId}`,
                        quantityReceived: item.quantityReceived,
                        quantityRejected: item.quantityRejected,
                        remarks: item.remarks,
                      }));
                      printGrn({
                        grnNumber: g.grnNumber, purchaseOrderId: g.purchaseOrderId,
                        poNumber: (po as any)?.poNumber ?? null,
                        vendorName: po?.vendorName ?? null,
                        receivedDate: g.receivedDate, status: g.status, notes: g.notes,
                        items: resolvedItems,
                      });
                    } catch {
                      toast({ title: "Failed to load GRN detail", variant: "destructive" });
                    }
                  }}>
                    <Printer className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!data?.length && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No receipts yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>New Goods Receipt</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={poId} onValueChange={setPoId}>
              <SelectTrigger><SelectValue placeholder="Purchase Order *" /></SelectTrigger>
              <SelectContent position="popper" className="max-h-60">{pos?.map((p) => <SelectItem key={p.id} value={String(p.id)}>{(p as any).poNumber ?? `PO-${p.id}`} · {p.vendorName}</SelectItem>)}</SelectContent>
            </Select>
            <div className="space-y-2">
              <div className="text-sm font-medium">Items received</div>
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <Select value={l.productId ? String(l.productId) : ""} onValueChange={(v) => { const n = [...lines]; n[i].productId = Number(v); setLines(n); }}>
                      <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
                      <SelectContent position="popper" className="max-h-60">{products?.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Input className="col-span-2" type="number" placeholder="Received" value={l.quantityReceived || ""} onChange={(e) => { const n = [...lines]; n[i].quantityReceived = Number(e.target.value); setLines(n); }} />
                  <Input className="col-span-2" type="number" placeholder="Rejected" value={l.quantityRejected || ""} onChange={(e) => { const n = [...lines]; n[i].quantityRejected = Number(e.target.value); setLines(n); }} />
                  <Input className="col-span-2" placeholder="Remarks" value={l.remarks} onChange={(e) => { const n = [...lines]; n[i].remarks = e.target.value; setLines(n); }} />
                  <Button className="col-span-1" size="icon" variant="ghost" onClick={() => setLines(lines.filter((_, x) => x !== i))}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setLines([...lines, { productId: 0, quantityReceived: 0, quantityRejected: 0, remarks: "" }])}>Add line</Button>
            </div>
            <Input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <Button onClick={() => create.mutate()} disabled={!poId || create.isPending} className="w-full">Receive</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
