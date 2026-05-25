import { useState } from "react";
import { useLocation } from "wouter";
import { useListPurchaseOrders, useCreatePurchaseOrder, useListVendors, getListPurchaseOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const itemSchema = z.object({
  productId: z.coerce.number().min(1, "Product is required"),
  quantity: z.coerce.number().min(1),
  unitPrice: z.coerce.number().min(0)
});

const formSchema = z.object({
  vendorId: z.coerce.number().min(1, "Vendor is required"),
  salesOrderId: z.coerce.number().optional().nullable(),
  expectedDelivery: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one item is required")
});

type FormValues = z.infer<typeof formSchema>;

export function PurchaseOrders() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: orders, isLoading } = useListPurchaseOrders({ status: statusFilter === "All" ? undefined : statusFilter as any });
  const { data: vendors } = useListVendors();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createOrder = useCreatePurchaseOrder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() });
        setDialogOpen(false);
        toast({ title: "Purchase order created" });
      }
    }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { vendorId: 0, salesOrderId: null, expectedDelivery: "", items: [{ productId: 0, quantity: 1, unitPrice: 0 }] }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const onSubmit = (data: FormValues) => {
    createOrder.mutate({ data: { ...data, salesOrderId: data.salesOrderId || undefined, expectedDelivery: data.expectedDelivery || undefined } });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Ordered": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "Partially Received": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
      case "Fully Received": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default: return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Purchase Orders</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> New PO</Button>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="All">All</TabsTrigger>
          <TabsTrigger value="Ordered">Ordered</TabsTrigger>
          <TabsTrigger value="Partially Received">Partially Received</TabsTrigger>
          <TabsTrigger value="Fully Received">Fully Received</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO #</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Sales Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expected Delivery</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
            ) : orders?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No purchase orders found</TableCell></TableRow>
            ) : (
              orders?.map(order => (
                <TableRow key={order.id} className="cursor-pointer" onClick={() => setLocation(`/purchase-orders/${order.id}`)}>
                  <TableCell className="font-medium">{order.poNumber}</TableCell>
                  <TableCell>{order.vendorName}</TableCell>
                  <TableCell>{order.salesOrderId ? `SO-${order.salesOrderId}` : "-"}</TableCell>
                  <TableCell><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>{order.status}</span></TableCell>
                  <TableCell>{order.expectedDelivery ? format(new Date(order.expectedDelivery), "MMM d, yyyy") : "-"}</TableCell>
                  <TableCell className="text-right">${order.totalAmount.toFixed(2)}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => setLocation(`/purchase-orders/${order.id}`)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Purchase Order</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="vendorId" render={({ field }) => (
                  <FormItem><FormLabel>Vendor *</FormLabel>
                    <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? field.value.toString() : ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {vendors?.map(v => (
                          <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="salesOrderId" render={({ field }) => (
                  <FormItem><FormLabel>Sales Order ID (Optional)</FormLabel>
                    <FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} /></FormControl>
                  <FormMessage /></FormItem>
                )} />
              </div>
              
              <FormField control={form.control} name="expectedDelivery" render={({ field }) => (
                <FormItem><FormLabel>Expected Delivery Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="space-y-4 border p-4 rounded-md">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Line Items</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: 0, quantity: 1, unitPrice: 0 })}>Add Item</Button>
                </div>
                
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-4 items-end">
                    <FormField control={form.control} name={`items.${index}.productId`} render={({ field: inputField }) => (
                      <FormItem className="flex-1"><FormLabel>Product ID</FormLabel><FormControl><Input type="number" {...inputField} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`items.${index}.quantity`} render={({ field: inputField }) => (
                      <FormItem className="w-24"><FormLabel>Qty</FormLabel><FormControl><Input type="number" min="1" {...inputField} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`items.${index}.unitPrice`} render={({ field: inputField }) => (
                      <FormItem className="w-32"><FormLabel>Unit Price ($)</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...inputField} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="button" variant="ghost" size="icon" className="text-destructive mb-0.5" onClick={() => remove(index)} disabled={fields.length === 1}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-4">
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
