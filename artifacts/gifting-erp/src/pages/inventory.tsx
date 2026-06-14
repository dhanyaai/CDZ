import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useListInventory, useListInventoryMovements, useCreateInventoryMovement, getListInventoryQueryKey, getListInventoryMovementsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, Package, AlertTriangle, XCircle, CheckCircle2, ArrowUp, ArrowDown, TrendingDown, ArrowRightLeft, Warehouse } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { format } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────────
interface LocationItem { productId: number; productName: string; qty: number }
interface LocationBucket { locationId: number; locationName: string; locationCode: string; items: LocationItem[] }
interface Location { id: number; name: string; code: string }

// ── Schemas ───────────────────────────────────────────────────────────────────
const movementSchema = z.object({
  productId: z.coerce.number().min(1, "Product is required"),
  type: z.enum(["inward", "outward"]),
  quantity: z.coerce.number().min(1, "Quantity must be greater than 0"),
  batch: z.string().optional(),
  reference: z.string().optional(),
});

const transferSchema = z.object({
  productId: z.coerce.number().min(1, "Product is required"),
  fromLocationId: z.coerce.number().optional(),
  toLocationId: z.coerce.number().optional(),
  quantity: z.coerce.number().min(1, "Quantity must be greater than 0"),
  reference: z.string().optional(),
});

type MovementFormValues = z.infer<typeof movementSchema>;
type TransferFormValues = z.infer<typeof transferSchema>;

// ── Component ─────────────────────────────────────────────────────────────────
export function Inventory() {
  const [tab, setTab] = useState("stock");
  const [searchStock, setSearchStock] = useState("");
  const [searchMovements, setSearchMovements] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const { data: inventory, isLoading: isLoadingInventory } = useListInventory({ lowStock: lowStockOnly || undefined });
  const { data: movements, isLoading: isLoadingMovements } = useListInventoryMovements();

  const { data: byLocation, isLoading: isLoadingByLocation } = useQuery<LocationBucket[]>({
    queryKey: ["inventory", "by-location"],
    queryFn: () => api<LocationBucket[]>("/v1/inventory/by-location"),
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: () => api<Location[]>("/v1/locations"),
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMovement = useCreateInventoryMovement({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListInventoryMovementsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["inventory", "by-location"] });
        setDialogOpen(false); movementForm.reset();
        toast({ title: "Movement recorded" });
      },
    },
  });

  const transferMutation = useMutation({
    mutationFn: (data: TransferFormValues) =>
      api("/v1/inventory/transfer", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", "by-location"] });
      queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
      setTransferOpen(false); transferForm.reset();
      toast({ title: "Stock transferred successfully" });
    },
    onError: (e: Error) => toast({ title: "Transfer failed", description: e.message, variant: "destructive" }),
  });

  const movementForm = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: { productId: 0, type: "inward", quantity: 1, batch: "", reference: "" },
  });

  const transferForm = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: { productId: 0, quantity: 1, reference: "" },
  });

  const filteredInventory = (inventory ?? []).filter(item =>
    !searchStock || item.productName.toLowerCase().includes(searchStock.toLowerCase()) || (item.category ?? "").toLowerCase().includes(searchStock.toLowerCase())
  );
  const filteredMovements = (movements ?? []).filter(mov =>
    !searchMovements || mov.productName.toLowerCase().includes(searchMovements.toLowerCase())
  );

  const totalSKUs = (inventory ?? []).length;
  const totalUnits = (inventory ?? []).reduce((s, i) => s + i.stockLevel, 0);
  const lowStockCount = (inventory ?? []).filter(i => i.isLowStock && i.stockLevel > 0).length;
  const outOfStockCount = (inventory ?? []).filter(i => i.stockLevel === 0).length;

  const locationOptions = [{ id: 0, name: "Unassigned", code: "—" }, ...(locations ?? [])];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time stock levels and movement tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTransferOpen(true)}>
            <ArrowRightLeft className="w-4 h-4 mr-2" />Transfer Stock
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Record Movement
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total SKUs", value: totalSKUs, icon: Package, color: "text-primary" },
          { label: "Total Units", value: totalUnits.toLocaleString("en-IN"), icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Low Stock", value: lowStockCount, icon: AlertTriangle, color: "text-amber-500" },
          { label: "Out of Stock", value: outOfStockCount, icon: XCircle, color: "text-red-500" },
        ].map(s => (
          <Card key={s.label} className="elev-1">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="stock">Stock Levels</TabsTrigger>
          <TabsTrigger value="locations">By Location</TabsTrigger>
          <TabsTrigger value="movements">Movement Log</TabsTrigger>
        </TabsList>

        {/* ── Stock Levels ── */}
        <TabsContent value="stock" className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search products..." value={searchStock} onChange={e => setSearchStock(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="low-stock" checked={lowStockOnly} onCheckedChange={setLowStockOnly} />
              <Label htmlFor="low-stock" className="cursor-pointer">Low Stock Only</Label>
            </div>
          </div>

          <div className="border rounded-md bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Threshold</TableHead>
                  <TableHead className="w-36">Fill Level</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingInventory ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                  ))
                ) : filteredInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">No inventory items found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInventory.map(item => {
                    const pct = item.lowStockThreshold > 0 ? Math.min(100, Math.round((item.stockLevel / (item.lowStockThreshold * 3)) * 100)) : 100;
                    const status = item.stockLevel === 0 ? "out" : item.isLowStock ? "low" : "ok";
                    return (
                      <TableRow key={item.productId} className={status === "out" ? "bg-red-500/5" : status === "low" ? "bg-amber-500/5" : ""}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-muted-foreground">{item.category ?? "—"}</TableCell>
                        <TableCell className={`text-right font-bold ${status === "out" ? "text-red-500" : status === "low" ? "text-amber-500" : ""}`}>
                          {item.stockLevel}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{item.lowStockThreshold}</TableCell>
                        <TableCell>
                          <Progress value={pct} className="h-2"
                            indicatorClassName={status === "out" ? "bg-red-500" : status === "low" ? "bg-amber-500" : "bg-emerald-500"}
                          />
                        </TableCell>
                        <TableCell>
                          {status === "out" ? (
                            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">Out of Stock</Badge>
                          ) : status === "low" ? (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">Low Stock</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">In Stock</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── By Location ── */}
        <TabsContent value="locations" className="space-y-4">
          {isLoadingByLocation ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array(3).fill(0).map((_, i) => <Card key={i} className="elev-1"><CardContent className="p-5"><Skeleton className="h-32 w-full" /></CardContent></Card>)}
            </div>
          ) : !byLocation || byLocation.length === 0 ? (
            <div className="text-center py-20">
              <Warehouse className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No location-based inventory</p>
              <p className="text-sm text-muted-foreground mt-1">Record movements with a location to see stock here</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {byLocation.map(loc => (
                <Card key={loc.locationId} className="elev-1">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Warehouse className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold leading-tight">{loc.locationName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{loc.locationCode}</div>
                      </div>
                      <Badge variant="outline" className="ml-auto text-xs">{loc.items.length} SKU{loc.items.length !== 1 ? "s" : ""}</Badge>
                    </div>
                    <div className="space-y-1">
                      {loc.items.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No stock</p>
                      ) : (
                        loc.items.map(item => (
                          <div key={item.productId} className="flex items-center justify-between text-sm py-0.5">
                            <span className="text-muted-foreground truncate flex-1 pr-2">{item.productName}</span>
                            <span className="font-semibold tabular-nums">{item.qty}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Movement Log ── */}
        <TabsContent value="movements" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search movements..." value={searchMovements} onChange={e => setSearchMovements(e.target.value)} className="pl-9" />
          </div>

          <div className="border rounded-md bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingMovements ? (
                  Array(4).fill(0).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                  ))
                ) : filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <TrendingDown className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">No movements recorded</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map(mov => {
                    const isIn = mov.type === "inward" || mov.type === "transfer_in";
                    const isTransfer = mov.type?.startsWith("transfer");
                    return (
                      <TableRow key={mov.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{format(new Date(mov.createdAt), "MMM d, yyyy HH:mm")}</TableCell>
                        <TableCell className="font-medium">{mov.productName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={isTransfer
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            : isIn
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                          }>
                            {isIn ? <ArrowUp className="w-3 h-3 mr-1 inline" /> : <ArrowDown className="w-3 h-3 mr-1 inline" />}
                            {mov.type}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-bold ${isIn ? "text-emerald-500" : "text-red-500"}`}>
                          {isIn ? "+" : "−"}{mov.quantity}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{mov.batch || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{mov.reference || "—"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Record Movement Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Inventory Movement</DialogTitle></DialogHeader>
          <Form {...movementForm}>
            <form onSubmit={movementForm.handleSubmit(d => createMovement.mutate({ data: d }))} className="space-y-4">
              <FormField control={movementForm.control} name="productId" render={({ field }) => (
                <FormItem><FormLabel>Product *</FormLabel>
                  <Select onValueChange={v => field.onChange(Number(v))} value={field.value ? field.value.toString() : ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {inventory?.map(p => (
                        <SelectItem key={p.productId} value={p.productId.toString()}>
                          {p.productName} <span className="text-muted-foreground ml-2">({p.stockLevel} in stock)</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={movementForm.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="inward">Inward (Add Stock)</SelectItem>
                        <SelectItem value="outward">Outward (Remove Stock)</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={movementForm.control} name="quantity" render={({ field }) => (
                  <FormItem><FormLabel>Quantity *</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={movementForm.control} name="batch" render={({ field }) => (
                <FormItem><FormLabel>Batch Number</FormLabel><FormControl><Input placeholder="e.g. BATCH-001" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={movementForm.control} name="reference" render={({ field }) => (
                <FormItem><FormLabel>Reference / Notes</FormLabel><FormControl><Input placeholder="PO number, reason..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={createMovement.isPending}>Record Movement</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Transfer Stock Dialog ── */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transfer Stock Between Locations</DialogTitle></DialogHeader>
          <Form {...transferForm}>
            <form onSubmit={transferForm.handleSubmit(d => transferMutation.mutate(d))} className="space-y-4">
              <FormField control={transferForm.control} name="productId" render={({ field }) => (
                <FormItem><FormLabel>Product *</FormLabel>
                  <Select onValueChange={v => field.onChange(Number(v))} value={field.value ? field.value.toString() : ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {inventory?.map(p => (
                        <SelectItem key={p.productId} value={p.productId.toString()}>
                          {p.productName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={transferForm.control} name="fromLocationId" render={({ field }) => (
                  <FormItem><FormLabel>From Location</FormLabel>
                    <Select onValueChange={v => field.onChange(v === "0" ? undefined : Number(v))} value={field.value ? field.value.toString() : "0"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Any / Unassigned" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {locationOptions.map(l => (
                          <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={transferForm.control} name="toLocationId" render={({ field }) => (
                  <FormItem><FormLabel>To Location</FormLabel>
                    <Select onValueChange={v => field.onChange(v === "0" ? undefined : Number(v))} value={field.value ? field.value.toString() : "0"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Any / Unassigned" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {locationOptions.map(l => (
                          <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={transferForm.control} name="quantity" render={({ field }) => (
                <FormItem><FormLabel>Quantity *</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={transferForm.control} name="reference" render={({ field }) => (
                <FormItem><FormLabel>Reference / Notes</FormLabel><FormControl><Input placeholder="Reason for transfer..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={transferMutation.isPending}>
                <ArrowRightLeft className="w-4 h-4 mr-2" />Transfer Stock
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
