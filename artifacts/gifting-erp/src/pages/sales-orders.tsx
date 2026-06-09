import { useState } from "react";
import { useLocation } from "wouter";
import { useListSalesOrders, useCreateSalesOrder, useListClients, useListProducts, getListSalesOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Eye, ShoppingCart, TrendingUp, Clock, CheckCircle2, IndianRupee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const itemSchema = z.object({
  productId: z.coerce.number().min(1, "Product is required"),
  quantity: z.coerce.number().min(1),
  unitPrice: z.coerce.number().min(0),
});

const formSchema = z.object({
  clientId: z.coerce.number().min(1, "Client is required"),
  occasion: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one item is required"),
});

type FormValues = z.infer<typeof formSchema>;

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  Draft: { label: "Draft", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  Confirmed: { label: "Confirmed", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  "In Production": { label: "In Production", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  Ready: { label: "Ready", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  Dispatched: { label: "Dispatched", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  Delivered: { label: "Delivered", color: "bg-green-500/10 text-green-400 border-green-500/20" },
};

const STATUSES = Object.keys(STATUS_CONFIG);

export function SalesOrders() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: orders, isLoading } = useListSalesOrders({ status: statusFilter === "All" ? undefined : statusFilter as any });
  const { data: allOrders } = useListSalesOrders();
  const { data: clients } = useListClients();
  const { data: products } = useListProducts();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createOrder = useCreateSalesOrder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSalesOrdersQueryKey() });
        setDialogOpen(false);
        toast({ title: "Sales order created" });
      },
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { clientId: 0, occasion: "", notes: "", items: [{ productId: 0, quantity: 1, unitPrice: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const onSubmit = (data: FormValues) => createOrder.mutate({ data });

  const totalRevenue = (allOrders ?? []).reduce((s, o) => s + Number(o.totalAmount ?? 0), 0);
  const activeCount = (allOrders ?? []).filter(o => !["Delivered","Draft"].includes(o.status)).length;
  const deliveredCount = (allOrders ?? []).filter(o => o.status === "Delivered").length;
  const draftCount = (allOrders ?? []).filter(o => o.status === "Draft").length;

  const watchedItems = form.watch("items");
  const orderTotal = watchedItems.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sales Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">End-to-end order lifecycle management</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />New Order</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: IndianRupee, color: "text-primary" },
          { label: "Active Orders", value: activeCount, icon: TrendingUp, color: "text-amber-500" },
          { label: "Delivered", value: deliveredCount, icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Drafts", value: draftCount, icon: Clock, color: "text-slate-400" },
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

      {/* Status stepper display */}
      <div className="hidden md:flex items-center gap-1 bg-muted/40 rounded-xl p-3 overflow-x-auto">
        {STATUSES.map((s, i) => {
          const count = (allOrders ?? []).filter(o => o.status === s).length;
          const cfg = STATUS_CONFIG[s];
          return (
            <div key={s} className="flex items-center gap-1">
              <button
                onClick={() => setStatusFilter(s)}
                className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition-all min-w-[80px] ${statusFilter === s ? "bg-card shadow-sm ring-1 ring-border" : "hover:bg-card/60"}`}
              >
                <span className={`text-lg font-bold ${count > 0 ? "text-foreground" : "text-muted-foreground/40"}`}>{count}</span>
                <span className="text-muted-foreground">{s}</span>
              </button>
              {i < STATUSES.length - 1 && <div className="w-4 h-px bg-border shrink-0" />}
            </div>
          );
        })}
        <button
          onClick={() => setStatusFilter("All")}
          className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium ml-2 transition-all min-w-[60px] ${statusFilter === "All" ? "bg-card shadow-sm ring-1 ring-border" : "hover:bg-card/60"}`}
        >
          <span className="text-lg font-bold">{(allOrders ?? []).length}</span>
          <span className="text-muted-foreground">All</span>
        </button>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="md:hidden">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="All">All</TabsTrigger>
          {STATUSES.map(s => <TabsTrigger key={s} value={s}>{s}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Occasion</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
              ))
            ) : orders?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <ShoppingCart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No sales orders found</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />Create first order
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              orders?.map(order => {
                const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.Draft;
                return (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setLocation(`/sales-orders/${order.id}`)}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>{order.clientName}</TableCell>
                    <TableCell>
                      <Badge className={`border text-xs ${cfg.color}`}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{order.occasion || "—"}</TableCell>
                    <TableCell>{format(new Date(order.createdAt), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right font-semibold">₹{Number(order.totalAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => setLocation(`/sales-orders/${order.id}`)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Sales Order</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="clientId" render={({ field }) => (
                  <FormItem><FormLabel>Client *</FormLabel>
                    <Select onValueChange={v => field.onChange(Number(v))} value={field.value ? field.value.toString() : ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger></FormControl>
                      <SelectContent>{clients?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.companyName}</SelectItem>)}</SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="occasion" render={({ field }) => (
                  <FormItem><FormLabel>Occasion</FormLabel><FormControl><Input placeholder="Diwali, Anniversary..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="space-y-3 border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Line Items</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: 0, quantity: 1, unitPrice: 0 })}>
                    <Plus className="w-3 h-3 mr-1" />Add Item
                  </Button>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                    <FormField control={form.control} name={`items.${index}.productId`} render={({ field: sf }) => (
                      <FormItem className="col-span-6"><FormLabel className={index > 0 ? "sr-only" : ""}>Product</FormLabel>
                        <Select onValueChange={v => {
                          sf.onChange(Number(v));
                          const p = products?.find(p => p.id === Number(v));
                          if (p) form.setValue(`items.${index}.unitPrice`, p.sellingPrice);
                        }} value={sf.value ? sf.value.toString() : ""}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger></FormControl>
                          <SelectContent>{products?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                      <FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`items.${index}.quantity`} render={({ field: f }) => (
                      <FormItem className="col-span-2"><FormLabel className={index > 0 ? "sr-only" : ""}>Qty</FormLabel>
                        <FormControl><Input type="number" min="1" {...f} /></FormControl><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`items.${index}.unitPrice`} render={({ field: f }) => (
                      <FormItem className="col-span-3"><FormLabel className={index > 0 ? "sr-only" : ""}>Unit Price ₹</FormLabel>
                        <FormControl><Input type="number" step="0.01" min="0" {...f} /></FormControl><FormMessage />
                      </FormItem>
                    )} />
                    <Button type="button" variant="ghost" size="icon" className="col-span-1 text-destructive" onClick={() => remove(index)} disabled={fields.length === 1}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {orderTotal > 0 && (
                  <div className="flex justify-end text-sm font-semibold pt-2 border-t border-border">
                    <span className="text-muted-foreground mr-2">Order Total:</span>
                    <span>₹{orderTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createOrder.isPending}>Create Order</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
