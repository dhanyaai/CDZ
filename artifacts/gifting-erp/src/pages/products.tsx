import { useState } from "react";
import { useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useListVendors, getListProductsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Plus, Edit, Trash2, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProductManager } from "@/components/product-manager";

const formSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  stockLevel: z.coerce.number().min(0).default(0),
  lowStockThreshold: z.coerce.number().min(0).default(10),
  vendorId: z.coerce.number().optional().nullable(),
  imageUrl: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function Products() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [managerProductId, setManagerProductId] = useState<number | null>(null);

  const { data: products, isLoading } = useListProducts({ 
    search: search || undefined,
    category: category || undefined,
    lowStock: lowStockOnly || undefined
  });
  const { data: vendors } = useListVendors();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createProduct = useCreateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setDialogOpen(false);
        toast({ title: "Product created" });
      }
    }
  });

  const updateProduct = useUpdateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setDialogOpen(false);
        toast({ title: "Product updated" });
      }
    }
  });

  const deleteProduct = useDeleteProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        toast({ title: "Product deleted" });
      }
    }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", category: "", costPrice: 0, sellingPrice: 0, stockLevel: 0, lowStockThreshold: 10, vendorId: null, imageUrl: "" }
  });

  const openNew = () => {
    setEditingId(null);
    form.reset({ name: "", category: "", costPrice: 0, sellingPrice: 0, stockLevel: 0, lowStockThreshold: 10, vendorId: null, imageUrl: "" });
    setDialogOpen(true);
  };

  const openEdit = (product: any) => {
    setEditingId(product.id);
    form.reset({
      name: product.name,
      category: product.category,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      stockLevel: product.stockLevel,
      lowStockThreshold: product.lowStockThreshold ?? 10,
      vendorId: product.vendorId,
      imageUrl: product.imageUrl || ""
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    const submitData = { ...data, vendorId: data.vendorId || undefined };
    if (editingId) {
      updateProduct.mutate({ id: editingId, data: submitData });
    } else {
      createProduct.mutate({ data: submitData });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Products</h1>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> New Product</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search products..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={(v) => setCategory(v === "all" ? undefined : v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Electronics">Electronics</SelectItem>
              <SelectItem value="Stationery">Stationery</SelectItem>
              <SelectItem value="Drinkware">Drinkware</SelectItem>
              <SelectItem value="Apparel">Apparel</SelectItem>
              <SelectItem value="Bags">Bags</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="low-stock" checked={lowStockOnly} onCheckedChange={setLowStockOnly} />
          <Label htmlFor="low-stock">Low Stock Only</Label>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Cost Price</TableHead>
              <TableHead className="text-right">Selling Price</TableHead>
              <TableHead className="text-center">Stock</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
            ) : products?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center">No products found</TableCell></TableRow>
            ) : (
              products?.map(product => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">No img</div>
                      )}
                      {product.name}
                    </div>
                  </TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell className="text-right">₹{Number(product.costPrice ?? 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{Number(product.sellingPrice ?? 0).toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={product.stockLevel <= (product.lowStockThreshold ?? 10) ? "destructive" : "secondary"}>
                      {product.stockLevel}
                    </Badge>
                  </TableCell>
                  <TableCell>{product.vendorName || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setManagerProductId(product.id)} title="Variants / pricing / customizations"><Settings2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(product)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if(confirm("Are you sure?")) deleteProduct.mutate({ id: product.id }) }}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Product" : "New Product"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Electronics">Electronics</SelectItem>
                      <SelectItem value="Stationery">Stationery</SelectItem>
                      <SelectItem value="Drinkware">Drinkware</SelectItem>
                      <SelectItem value="Apparel">Apparel</SelectItem>
                      <SelectItem value="Bags">Bags</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="costPrice" render={({ field }) => (
                  <FormItem><FormLabel>Cost Price *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="sellingPrice" render={({ field }) => (
                  <FormItem><FormLabel>Selling Price *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="stockLevel" render={({ field }) => (
                  <FormItem><FormLabel>Stock Level</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (
                  <FormItem><FormLabel>Low Stock Alert At</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="vendorId" render={({ field }) => (
                <FormItem><FormLabel>Vendor</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v ? Number(v) : null)} value={field.value?.toString() || ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {vendors?.map((v) => (
                        <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="imageUrl" render={({ field }) => (
                <FormItem><FormLabel>Image URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={createProduct.isPending || updateProduct.isPending}>Save</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {managerProductId && (
        <ProductManager
          productId={managerProductId}
          open={!!managerProductId}
          onOpenChange={(v) => !v && setManagerProductId(null)}
        />
      )}
    </div>
  );
}
