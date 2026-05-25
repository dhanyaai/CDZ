import { useState } from "react";
import { useListInventory, useListInventoryMovements, useCreateInventoryMovement, getListInventoryQueryKey, getListInventoryMovementsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const movementSchema = z.object({
  productId: z.coerce.number().min(1, "Product is required"),
  type: z.enum(["inward", "outward"]),
  quantity: z.coerce.number().min(1, "Quantity must be greater than 0"),
  batch: z.string().optional(),
  reference: z.string().optional()
});

type MovementFormValues = z.infer<typeof movementSchema>;

export function Inventory() {
  const [tab, setTab] = useState("stock");
  const [searchStock, setSearchStock] = useState("");
  const [searchMovements, setSearchMovements] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: inventory, isLoading: isLoadingInventory } = useListInventory({
    lowStock: lowStockOnly || undefined
  });
  
  const { data: movements, isLoading: isLoadingMovements } = useListInventoryMovements();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMovement = useCreateInventoryMovement({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListInventoryMovementsQueryKey() });
        setDialogOpen(false);
        form.reset();
        toast({ title: "Movement recorded successfully" });
      }
    }
  });

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: { productId: 0, type: "inward", quantity: 1, batch: "", reference: "" }
  });

  const onSubmit = (data: MovementFormValues) => {
    createMovement.mutate({ data });
  };

  const getStockStatus = (item: { stockLevel: number; isLowStock?: boolean }) => {
    if (item.stockLevel === 0) return "Out of Stock";
    if (item.isLowStock) return "Low Stock";
    return "In Stock";
  };

  const getStatusBadge = (item: { stockLevel: number; isLowStock?: boolean }) => {
    const status = getStockStatus(item);
    switch (status) {
      case "In Stock": return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">In Stock</Badge>;
      case "Low Stock": return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Low Stock</Badge>;
      case "Out of Stock": return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Out of Stock</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredInventory = inventory?.filter(item =>
    !searchStock || item.productName.toLowerCase().includes(searchStock.toLowerCase()) || (item.category ?? "").toLowerCase().includes(searchStock.toLowerCase())
  ) || [];

  const filteredMovements = movements?.filter(mov =>
    !searchMovements || mov.productName.toLowerCase().includes(searchMovements.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Inventory</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> Record Movement</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="stock">Stock Levels</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search products..." 
                value={searchStock} 
                onChange={(e) => setSearchStock(e.target.value)} 
                className="pl-9"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="low-stock" checked={lowStockOnly} onCheckedChange={setLowStockOnly} />
              <Label htmlFor="low-stock">Low Stock Only</Label>
            </div>
          </div>

          <div className="border rounded-md bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Stock Level</TableHead>
                  <TableHead className="text-right">Threshold</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingInventory ? (
                  <TableRow><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                ) : filteredInventory.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">No inventory items found</TableCell></TableRow>
                ) : (
                  filteredInventory.map(item => (
                    <TableRow key={item.productId}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>{item.category ?? "-"}</TableCell>
                      <TableCell className={`text-right ${item.isLowStock ? "text-destructive font-bold" : ""}`}>
                        {item.stockLevel}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{item.lowStockThreshold}</TableCell>
                      <TableCell>{getStatusBadge(item)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search movements..." 
              value={searchMovements} 
              onChange={(e) => setSearchMovements(e.target.value)} 
              className="pl-9"
            />
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
                  <TableRow><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                ) : filteredMovements.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">No movements found</TableCell></TableRow>
                ) : (
                  filteredMovements.map(mov => (
                    <TableRow key={mov.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(mov.createdAt), "MMM d, yyyy HH:mm")}</TableCell>
                      <TableCell className="font-medium">{mov.productName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={mov.type === "inward" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {mov.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {mov.type === "inward" ? "+" : "-"}{mov.quantity}
                      </TableCell>
                      <TableCell>{mov.batch || "-"}</TableCell>
                      <TableCell>{mov.reference || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Inventory Movement</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="productId" render={({ field }) => (
                <FormItem><FormLabel>Product *</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? field.value.toString() : ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {inventory?.map(p => (
                        <SelectItem key={p.productId} value={p.productId.toString()}>{p.productName} ({p.stockLevel} in stock)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>Movement Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="inward">Inward (Add Stock)</SelectItem>
                        <SelectItem value="outward">Outward (Remove Stock)</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem><FormLabel>Quantity *</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="batch" render={({ field }) => (
                <FormItem><FormLabel>Batch Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="reference" render={({ field }) => (
                <FormItem><FormLabel>Reference / Notes</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <Button type="submit" className="w-full" disabled={createMovement.isPending}>Record Movement</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
