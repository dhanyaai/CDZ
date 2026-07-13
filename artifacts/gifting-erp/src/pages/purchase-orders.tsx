import { useState } from "react";
import { useLocation } from "wouter";
import { useListPurchaseOrders, useCreatePurchaseOrder, useListVendors, useListProducts, useListSalesOrders, getListPurchaseOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Eye, ClipboardList, Truck, IndianRupee, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const itemSchema = z.object({
  productId: z.coerce.number().min(1, "Product is required"),
  quantity: z.coerce.number().min(1),
  unitPrice: z.coerce.number().min(0),
});

const formSchema = z.object({
  vendorId: z.coerce.number().min(1, "Vendor is required"),
  salesOrderId: z.coerce.number().optional().nullable(),
  expectedDelivery: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one item is required"),
});

type FormValues = z.infer<typeof formSchema>;

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  Ordered: { label: "Ordered", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  "Partially Received": { label: "Partial", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  "Fully Received": { label: "Received", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
};

export function PurchaseOrders() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: orders, isLoading } = useListPurchaseOrders({ status: statusFilter === "All" ? undefined : statusFilter as any });
  const { data: allOrders } = useListPurchaseOrders();
  const { data: vendors } = useListVendors();
  const { data: products } = useListProducts();
  const { data: salesOrders } = useListSalesOrders();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createOrder = useCreatePurchaseOrder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() });
        setDialogOpen(false);
        toast({ title: "Purchase order created" });
      },
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { vendorId: 0, salesOrderId: null, expectedDelivery: "", items: [{ productId: 0, quantity: 1, unitPrice: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  const onSubmit = (data: FormValues) =>
    createOrder.mutate({ data: { ...data, salesOrderId: data.salesOrderId || undefined, expectedDelivery: data.expectedDelivery || undefined } });

  const totalSpend = (allOrders ?? []).reduce((s, o) => s + Number(o.totalAmount ?? 0), 0);
  const orderedCount = (allOrders ?? []).filter(o => o.status === "Ordered").length;
  const partialCount = (allOrders ?? []).filter(o => o.status === "Partially Received").length;
  const receivedCount = (allOrders ?? []).filter(o => o.status === "Fully Received").length;

  const watchedItems = form.watch("items");
  const orderTotal = watchedItems.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Procurement from vendors and stock replenishment</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />New PO</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Spend", value: `₹${totalSpend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: IndianRupee, color: "text-primary" },
          { label: "Ordered", value: orderedCount, icon: ClipboardList, color: "text-blue-500" },
          { label: "In Transit", value: partialCount, icon: Truck, color: "text-amber-500" },
          { label: "Received", value: receivedCount, icon: CheckCircle2, color: "text-emerald-500" },
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
          <TabsTrigger value="All">All ({(allOrders ?? []).length})</TabsTrigger>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <TabsTrigger key={k} value={k}>{v.label} ({(allOrders ?? []).filter(o => o.status === k).length})</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO #</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expected Delivery</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
              ))
            ) : orders?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No purchase orders found</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />Create first PO
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              orders?.map(order => {
                const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.Ordered;
                const isOverdue = order.expectedDelivery && new Date(order.expectedDelivery) < new Date() && order.status !== "Fully Received";
                return (
                  <TableRow key={order.id} className={`cursor-pointer hover:bg-muted/30 ${isOverdue ? "bg-amber-500/5" : ""}`}
                    onClick={() => setLocation(`/purchase-orders/${order.id}`)}>
                    <TableCell className="font-medium">{order.poNumber}</TableCell>
                    <TableCell>{order.vendorName}</TableCell>
                    <TableCell>
                      <Badge className={`border text-xs ${cfg.color}`}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className={isOverdue ? "text-amber-500 font-medium" : "text-muted-foreground"}>
                      {order.expectedDelivery ? format(new Date(order.expectedDelivery), "MMM d, yyyy") : "—"}
                      {isOverdue && " (overdue)"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ₹{Number(order.totalAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLocation(`/purchase-orders/${order.id}`)}>
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
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="vendorId" render={({ field }) => (
                  <FormItem><FormLabel>Vendor *</FormLabel>
                    <Select onValueChange={v => field.onChange(Number(v))} value={field.value ? field.value.toString() : ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger></FormControl>
                      <SelectContent>{vendors?.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}</SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="expectedDelivery" render={({ field }) => (
                  <FormItem><FormLabel>Expected Delivery</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="salesOrderId" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>Linked Sales Order (optional)</FormLabel>
                    <Select
                      onValueChange={v => field.onChange(v === "__none__" ? null : Number(v))}
                      value={field.value ? field.value.toString() : "__none__"}
                    >
                      <FormControl><SelectTrigger><SelectValue placeholder="Link to sales order…" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">— None —</SelectItem>
                        {salesOrders?.map(so => <SelectItem key={so.id} value={so.id.toString()}>{so.orderNumber} · {so.clientName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
              </div>

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
                      <FormItem className="col-span-6">
                        {index === 0 && <FormLabel>Product</FormLabel>}
                        <Select onValueChange={v => {
                          sf.onChange(Number(v));
                          const p = products?.find(p => p.id === Number(v));
                          if (p) form.setValue(`items.${index}.unitPrice`, Number(p.costPrice ?? 0));
                        }} value={sf.value ? sf.value.toString() : ""}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger></FormControl>
                          <SelectContent>{products?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`items.${index}.quantity`} render={({ field: f }) => (
                      <FormItem className="col-span-2">
                        {index === 0 && <FormLabel>Qty</FormLabel>}
                        <FormControl><Input type="number" min="1" {...f} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`items.${index}.unitPrice`} render={({ field: f }) => (
                      <FormItem className="col-span-3">
                        {index === 0 && <FormLabel>Unit Price ₹</FormLabel>}
                        <FormControl><Input type="number" step="0.01" min="0" {...f} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="button" variant="ghost" size="icon" className="col-span-1 text-destructive" onClick={() => remove(index)} disabled={fields.length === 1}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {orderTotal > 0 && (
                  <div className="flex justify-end text-sm font-semibold pt-2 border-t border-border">
                    <span className="text-muted-foreground mr-2">PO Total:</span>
                    <span>₹{orderTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createOrder.isPending}>Create PO</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
