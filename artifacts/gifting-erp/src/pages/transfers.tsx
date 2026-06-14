import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowRightLeft, Plus, Search, Package, Warehouse, ArrowRight } from "lucide-react";

interface Transfer {
  batch: string | null;
  productId: number;
  productName: string;
  quantity: number;
  fromLocationId: number | null;
  fromLocationName: string;
  toLocationId: number | null;
  toLocationName: string;
  reference: string | null;
  createdAt: string;
}

interface InventoryItem { productId: number; productName: string; stockLevel: number }
interface Location { id: number; name: string; code: string }

export function Transfers() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    productId: "",
    fromLocationId: "0",
    toLocationId: "0",
    quantity: "1",
    reference: "",
  });

  const { data: transfers, isLoading } = useQuery<Transfer[]>({
    queryKey: ["transfers"],
    queryFn: () => api<Transfer[]>("/v1/inventory/transfers"),
  });

  const { data: inventory } = useQuery<InventoryItem[]>({
    queryKey: ["inventory-list"],
    queryFn: () => api<InventoryItem[]>("/v1/inventory"),
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: () => api<Location[]>("/v1/locations"),
  });

  const locationOptions = [{ id: 0, name: "Unassigned" }, ...(locations ?? [])];

  const createTransfer = useMutation({
    mutationFn: () => api("/v1/inventory/transfer", {
      method: "POST",
      body: JSON.stringify({
        productId: Number(form.productId),
        fromLocationId: form.fromLocationId === "0" ? undefined : Number(form.fromLocationId),
        toLocationId: form.toLocationId === "0" ? undefined : Number(form.toLocationId),
        quantity: Number(form.quantity),
        reference: form.reference || undefined,
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transfers"] });
      qc.invalidateQueries({ queryKey: ["inventory-list"] });
      qc.invalidateQueries({ queryKey: ["inventory", "by-location"] });
      setDialogOpen(false);
      setForm({ productId: "", fromLocationId: "0", toLocationId: "0", quantity: "1", reference: "" });
      toast({ title: "Stock transferred" });
    },
    onError: (e: Error) => toast({ title: "Transfer failed", description: e.message, variant: "destructive" }),
  });

  const filtered = (transfers ?? []).filter((t) =>
    !search ||
    t.productName.toLowerCase().includes(search.toLowerCase()) ||
    t.fromLocationName.toLowerCase().includes(search.toLowerCase()) ||
    t.toLocationName.toLowerCase().includes(search.toLowerCase()) ||
    (t.reference ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalTransfers = transfers?.length ?? 0;
  const totalUnits = transfers?.reduce((s, t) => s + t.quantity, 0) ?? 0;

  const canSubmit = form.productId && Number(form.quantity) > 0 && form.fromLocationId !== form.toLocationId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stock Transfers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Move inventory between warehouse locations</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />New Transfer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="elev-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalTransfers}</div>
              <div className="text-xs text-muted-foreground">Total Transfers</div>
            </div>
          </CardContent>
        </Card>
        <Card className="elev-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalUnits.toLocaleString("en-IN")}</div>
              <div className="text-xs text-muted-foreground">Units Transferred</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by product, location, reference..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Transfer History */}
      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>From → To</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <Warehouse className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="font-medium text-muted-foreground">No transfers yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Use "New Transfer" to move stock between locations</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t, i) => (
                <TableRow key={t.batch ?? i}>
                  <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                    {format(new Date(t.createdAt), "MMM d, yyyy")}
                    <div className="text-xs opacity-60">{format(new Date(t.createdAt), "HH:mm")}</div>
                  </TableCell>
                  <TableCell className="font-medium">{t.productName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-xs bg-red-500/5 border-red-500/20 text-red-500">
                        <Warehouse className="w-3 h-3 mr-1" />
                        {t.fromLocationName}
                      </Badge>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <Badge variant="outline" className="text-xs bg-emerald-500/5 border-emerald-500/20 text-emerald-500">
                        <Warehouse className="w-3 h-3 mr-1" />
                        {t.toLocationName}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{t.quantity}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{t.reference ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* New Transfer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Stock Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Product *</label>
              <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {(inventory ?? []).map((p) => (
                    <SelectItem key={p.productId} value={p.productId.toString()}>
                      {p.productName}
                      <span className="text-muted-foreground ml-2">({p.stockLevel} in stock)</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">From Location</label>
                <Select value={form.fromLocationId} onValueChange={(v) => setForm({ ...form, fromLocationId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {locationOptions.map((l) => (
                      <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">To Location</label>
                <Select value={form.toLocationId} onValueChange={(v) => setForm({ ...form, toLocationId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {locationOptions.map((l) => (
                      <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.fromLocationId === form.toLocationId && form.fromLocationId !== "" && (
              <p className="text-xs text-amber-500">Source and destination must be different locations.</p>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Quantity *</label>
              <Input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Reference / Notes</label>
              <Input
                placeholder="e.g. Seasonal rebalancing"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
              />
            </div>

            <Button
              className="w-full"
              onClick={() => createTransfer.mutate()}
              disabled={!canSubmit || createTransfer.isPending}
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Transfer Stock
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
