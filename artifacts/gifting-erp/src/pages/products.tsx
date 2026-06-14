import { useState } from "react";
import { useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useListVendors, getListProductsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Search, Plus, Edit, Trash2, Settings2, Package, AlertTriangle, IndianRupee, TrendingUp } from "lucide-react";
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
    lowStock: lowStockOnly || undefined,
  });
  const { data: allProducts } = useListProducts();
  const { data: vendors } = useListVendors();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createProduct = useCreateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setDialogOpen(false);
        toast({ title: "Product created" });
      },
    },
  });

  const updateProduct = useUpdateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setDialogOpen(false);
        toast({ title: "Product updated" });
      },
    },
  });

  const deleteProduct = useDeleteProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        toast({ title: "Product deleted" });
      },
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", category: "", costPrice: 0, sellingPrice: 0, stockLevel: 0, lowStockThreshold: 10, vendorId: null, imageUrl: "" },
  });

  const openNew = () => {
    setEditingId(null);
    form.reset({ name: "", category: "", costPrice: 0, sellingPrice: 0, stockLevel: 0, lowStockThreshold: 10, vendorId: null, imageUrl: "" });
    setDialogOpen(true);
  };

  const openEdit = (product: any) => {
    setEditingId(product.id);
    form.reset({
      name: product.name, category: product.category,
      costPrice: product.costPrice, sellingPrice: product.sellingPrice,
      stockLevel: product.stockLevel, lowStockThreshold: product.lowStockThreshold ?? 10,
      vendorId: product.vendorId, imageUrl: product.imageUrl || "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    const submitData = { ...data, vendorId: data.vendorId || undefined };
    if (editingId) updateProduct.mutate({ id: editingId, data: submitData });
    else createProduct.mutate({ data: submitData });
  };

  const totalSKUs = (allProducts ?? []).length;
  const totalStockValue = (allProducts ?? []).reduce((s, p) => s + p.stockLevel * Number(p.costPrice ?? 0), 0);
  const lowStockCount = (allProducts ?? []).filter(p => p.stockLevel <= (p.lowStockThreshold ?? 10) && p.stockLevel > 0).length;
  const avgMargin = (allProducts ?? []).length
    ? Math.round((allProducts ?? []).reduce((s, p) => {
        const cost = Number(p.costPrice ?? 0);
        const sell = Number(p.sellingPrice ?? 0);
        return s + (sell > 0 ? ((sell - cost) / sell) * 100 : 0);
      }, 0) / (allProducts ?? []).length)
    : 0;

  const categoryOptions = Array.from(new Set((allProducts ?? []).map(p => p.category).filter(Boolean))) as string[];
  if (!categoryOptions.length) categoryOptions.push("Electronics","Stationery","Drinkware","Apparel","Bags","Other");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Product catalog with variants, pricing tiers and customizations</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />New Product</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total SKUs", value: totalSKUs, icon: Package, color: "text-primary" },
          { label: "Stock Value", value: `₹${totalStockValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: IndianRupee, color: "text-emerald-500" },
          { label: "Low Stock", value: lowStockCount, icon: AlertTriangle, color: "text-amber-500" },
          { label: "Avg. Margin", value: `${avgMargin}%`, icon: TrendingUp, color: "text-violet-500" },
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={category ?? "all"} onValueChange={v => setCategory(v === "all" ? undefined : v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
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
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Margin</TableHead>
              <TableHead className="text-center">Stock</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
              ))
            ) : products?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No products found</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={openNew}>
                    <Plus className="w-4 h-4 mr-2" />Add first product
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              products?.map(product => {
                const cost = Number(product.costPrice ?? 0);
                const sell = Number(product.sellingPrice ?? 0);
                const margin = sell > 0 ? Math.round(((sell - cost) / sell) * 100) : 0;
                const isLow = product.stockLevel <= (product.lowStockThreshold ?? 10);
                const isOut = product.stockLevel === 0;
                return (
                  <TableRow key={product.id} className={isOut ? "bg-red-500/5" : isLow ? "bg-amber-500/5" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-9 h-9 rounded-lg object-cover border border-border" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <span>{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">₹{cost.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-right font-medium">₹{sell.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-right">
                      <span className={`text-xs font-semibold ${margin >= 30 ? "text-emerald-500" : margin >= 15 ? "text-amber-500" : "text-red-500"}`}>
                        {margin}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={isOut ? "destructive" : isLow ? "outline" : "secondary"}
                        className={isLow && !isOut ? "border-amber-500/50 text-amber-500" : ""}>
                        {product.stockLevel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{product.vendorName || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setManagerProductId(product.id)} title="Variants / pricing / customizations">
                        <Settings2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(product)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm("Delete this product?")) deleteProduct.mutate({ id: product.id }); }}>
                        <Trash2 className="w-4 h-4" />
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {categoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="costPrice" render={({ field }) => (
                  <FormItem><FormLabel>Cost Price ₹</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="sellingPrice" render={({ field }) => (
                  <FormItem><FormLabel>Selling Price ₹</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
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
                  <Select onValueChange={v => field.onChange(v === "none" ? null : Number(v))} value={field.value?.toString() || "none"}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">No vendor</SelectItem>
                      {vendors?.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="imageUrl" render={({ field }) => (
                <FormItem><FormLabel>Image URL</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={createProduct.isPending || updateProduct.isPending}>Save Product</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {managerProductId && (
        <ProductManager productId={managerProductId} open={!!managerProductId} onOpenChange={v => !v && setManagerProductId(null)} />
      )}
    </div>
  );
}
