import { useState } from "react";
import { useLocation } from "wouter";
import { useListSalesOrders, useCreateSalesOrder, useListClients, useListProducts, getListSalesOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  clientId: z.coerce.number().min(1, "Client is required"),
  occasion: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one item is required")
});

type FormValues = z.infer<typeof formSchema>;

export function SalesOrders() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: orders, isLoading } = useListSalesOrders({ status: statusFilter === "All" ? undefined : statusFilter as any });
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
      }
    }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { clientId: 0, occasion: "", notes: "", items: [{ productId: 0, quantity: 1, unitPrice: 0 }] }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const onSubmit = (data: FormValues) => {
    createOrder.mutate({ data });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Draft": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      case "Confirmed": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "In Production": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
      case "Ready": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "Dispatched": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "Delivered": return "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300";
      default: return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Sales Orders</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Order</Button>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="All">All</TabsTrigger>
          <TabsTrigger value="Draft">Draft</TabsTrigger>
          <TabsTrigger value="Confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="In Production">In Production</TabsTrigger>
          <TabsTrigger value="Ready">Ready</TabsTrigger>
          <TabsTrigger value="Dispatched">Dispatched</TabsTrigger>
          <TabsTrigger value="Delivered">Delivered</TabsTrigger>
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
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
            ) : orders?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No sales orders found</TableCell></TableRow>
            ) : (
              orders?.map(order => (
                <TableRow key={order.id} className="cursor-pointer" onClick={() => setLocation(`/sales-orders/${order.id}`)}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>{order.clientName}</TableCell>
                  <TableCell><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>{order.status}</span></TableCell>
                  <TableCell>{order.occasion || "-"}</TableCell>
                  <TableCell>{format(new Date(order.createdAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">${order.totalAmount.toFixed(2)}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => setLocation(`/sales-orders/${order.id}`)}>
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
            <DialogTitle>New Sales Order</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="clientId" render={({ field }) => (
                  <FormItem><FormLabel>Client *</FormLabel>
                    <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? field.value.toString() : ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {clients?.map(c => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.companyName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="occasion" render={({ field }) => (
                  <FormItem><FormLabel>Occasion</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="space-y-4 border p-4 rounded-md">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Line Items</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: 0, quantity: 1, unitPrice: 0 })}>Add Item</Button>
                </div>
                
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-4 items-end">
                    <FormField control={form.control} name={`items.${index}.productId`} render={({ field: selectField }) => (
                      <FormItem className="flex-1"><FormLabel>Product</FormLabel>
                        <Select 
                          onValueChange={(v) => {
                            selectField.onChange(Number(v));
                            const product = products?.find(p => p.id === Number(v));
                            if (product) {
                              form.setValue(`items.${index}.unitPrice`, product.sellingPrice);
                            }
                          }} 
                          value={selectField.value ? selectField.value.toString() : ""}
                        >
                          <FormControl><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {products?.map(p => (
                              <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      <FormMessage /></FormItem>
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
                <Button type="submit" disabled={createOrder.isPending}>Create Order</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
