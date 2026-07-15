import { useState, useRef } from "react";
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
import { Search, Plus, Edit, Trash2, Settings2, Package, AlertTriangle, IndianRupee, TrendingUp, Upload, X, Download, FileUp } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ProductManager } from "@/components/product-manager";

const PRODUCT_TYPES = [
  { value: "raw_material", label: "Raw Material" },
  { value: "finished_good", label: "Finished Good" },
  { value: "semi_finished", label: "Semi-Finished" },
  { value: "packaging", label: "Packaging" },
  { value: "other", label: "Other" },
];

const GST_RATES = [0, 5, 12, 18, 28];

const formSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  brand: z.string().optional(),
  productType: z.string().optional(),
  category: z.string().min(1),
  hsnCode: z.string().optional(),
  gstRate: z.coerce.number().default(18),
  uom: z.string().default("PCS"),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  stockLevel: z.coerce.number().min(0).default(0),
  lowStockThreshold: z.coerce.number().min(0).default(10),
  reorderQty: z.coerce.number().min(0).default(0),
  brandable: z.boolean().default(false),
  vendorId: z.coerce.number().optional().nullable(),
  imageUrl: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const EMPTY_FORM: FormValues = {
  name: "", sku: "", brand: "", productType: "", category: "",
  hsnCode: "", gstRate: 18, uom: "PCS",
  costPrice: 0, sellingPrice: 0, stockLevel: 0, lowStockThreshold: 10,
  reorderQty: 0, brandable: false,
  vendorId: null, imageUrl: "",
};

function productTypeLabel(val: string | null | undefined) {
  return PRODUCT_TYPES.find(t => t.value === val)?.label ?? val ?? "—";
}

export function Products() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [managerProductId, setManagerProductId] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageUploading, setImageUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvImportRef = useRef<HTMLInputElement>(null);

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
    defaultValues: EMPTY_FORM,
  });

  const openNew = () => {
    setEditingId(null);
    form.reset(EMPTY_FORM);
    setImagePreview("");
    setDialogOpen(true);
  };

  const openEdit = (product: any) => {
    setEditingId(product.id);
    form.reset({
      name: product.name,
      sku: product.sku || "",
      brand: product.brand || "",
      productType: product.productType || "",
      category: product.category,
      hsnCode: product.hsnCode || "",
      gstRate: product.gstRate ?? 18,
      uom: product.uom || "PCS",
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      stockLevel: product.stockLevel,
      lowStockThreshold: product.lowStockThreshold ?? 10,
      reorderQty: product.reorderQty ?? 0,
      brandable: product.brandable ?? false,
      vendorId: product.vendorId,
      imageUrl: product.imageUrl || "",
    });
    setImagePreview(product.imageUrl || "");
    setDialogOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/v1/uploads/image", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      form.setValue("imageUrl", url);
      setImagePreview(url);
    } catch {
      toast({ title: "Image upload failed", variant: "destructive" });
    } finally {
      setImageUploading(false);
    }
  };

  const clearImage = () => {
    form.setValue("imageUrl", "");
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = (data: FormValues) => {
    const submitData = {
      ...data,
      brand: data.brand || undefined,
      productType: data.productType || undefined,
      vendorId: data.vendorId || undefined,
      imageUrl: data.imageUrl || undefined,
    };
    if (editingId) updateProduct.mutate({ id: editingId, data: submitData });
    else createProduct.mutate({ data: submitData });
  };

  const CSV_COLUMNS = ["name","sku","brand","productType","category","hsnCode","gstRate","uom","costPrice","sellingPrice","stockLevel","lowStockThreshold","reorderQty","brandable","barcode"] as const;

  const downloadTemplate = () => {
    const header = CSV_COLUMNS.join(",");
    const example = ["Sample Mug","SKU001","BrandX","finished_good","Drinkware","6911890000","18","PCS","250","450","100","20","50","false",""].join(",");
    const csv = [header, example].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const list = allProducts ?? [];
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = CSV_COLUMNS.join(",");
    const rows = list.map(p => CSV_COLUMNS.map(col => escape((p as Record<string, unknown>)[col])).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());
    if (lines.length < 2) return [];
    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let cur = "";
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuote) {
          if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
          else if (ch === '"') { inQuote = false; }
          else { cur += ch; }
        } else {
          if (ch === '"') { inQuote = true; }
          else if (ch === ",") { result.push(cur); cur = ""; }
          else { cur += ch; }
        }
      }
      result.push(cur);
      return result;
    };
    const headers = parseRow(lines[0]);
    return lines.slice(1).map(line => {
      const vals = parseRow(line);
      return Object.fromEntries(headers.map((h, i) => [h.trim(), (vals[i] ?? "").trim()]));
    });
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (csvImportRef.current) csvImportRef.current.value = "";
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        toast({ title: "Empty or invalid CSV", variant: "destructive" });
        return;
      }
      const res = await fetch("/api/v1/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json() as { imported: number; updated: number; errors: { row: number; message: string }[] };
      if (!res.ok) {
        toast({ title: "Import failed", description: (data as { error?: string }).error, variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      const parts: string[] = [];
      if (data.imported) parts.push(`${data.imported} added`);
      if (data.updated) parts.push(`${data.updated} updated`);
      if (data.errors.length) parts.push(`${data.errors.length} error(s)`);
      toast({
        title: "Import complete",
        description: parts.join(", ") + (data.errors.length ? ` — row ${data.errors[0].row}: ${data.errors[0].message}` : ""),
        variant: data.errors.length && !data.imported && !data.updated ? "destructive" : "default",
      });
    } catch {
      toast({ title: "Import failed", description: "Could not read file", variant: "destructive" });
    } finally {
      setImporting(false);
    }
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
        <div className="flex items-center gap-2">
          <input ref={csvImportRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" />Template
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!allProducts?.length}>
            <Download className="w-4 h-4 mr-2" />Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => csvImportRef.current?.click()} disabled={importing}>
            <FileUp className="w-4 h-4 mr-2" />{importing ? "Importing…" : "Import CSV"}
          </Button>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />New Product</Button>
        </div>
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
              <TableHead>HSN</TableHead>
              <TableHead className="text-center">GST%</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Margin</TableHead>
              <TableHead className="text-center">Stock (Avail / Res / Total)</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={10}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
              ))
            ) : products?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12">
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
                          <img src={product.imageUrl} alt={product.name} className="w-9 h-9 rounded-lg object-cover border border-border shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <span>{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">{(product as any).hsnCode || "—"}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs font-medium">{(product as any).gstRate ?? 18}%</span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">₹{cost.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-right font-medium">₹{sell.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-right">
                      <span className={`text-xs font-semibold ${margin >= 30 ? "text-emerald-500" : margin >= 15 ? "text-amber-500" : "text-red-500"}`}>
                        {margin}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <Badge variant={isOut ? "destructive" : isLow ? "outline" : "secondary"}
                          className={isLow && !isOut ? "border-amber-500/50 text-amber-500" : ""}>
                          {(product as any).availableQty ?? product.stockLevel}
                        </Badge>
                        {(product as any).reservedQty > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {(product as any).reservedQty} res / {product.stockLevel} tot
                          </span>
                        )}
                      </div>
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
                        onClick={() => setDeleteId(product.id)}>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Product" : "New Product"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              {/* Image upload */}
              <div className="space-y-2">
                <Label>Product Image</Label>
                <div className="flex items-center gap-3">
                  {imagePreview ? (
                    <div className="relative w-20 h-20 shrink-0">
                      <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-lg object-cover border border-border" />
                      <button
                        type="button"
                        onClick={clearImage}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center hover:opacity-80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-muted border-2 border-dashed border-border flex items-center justify-center shrink-0">
                      <Package className="w-7 h-7 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageUploading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {imageUploading ? "Uploading…" : imagePreview ? "Change Image" : "Upload Image"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1.5">JPG, PNG, WebP — stored in DigitalOcean Spaces</p>
                  </div>
                </div>
              </div>

              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="sku" render={({ field }) => (
                  <FormItem><FormLabel>SKU</FormLabel><FormControl><Input placeholder="e.g. MUG-001" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="brand" render={({ field }) => (
                  <FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g. Nike, Fastrack" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="productType" render={({ field }) => (
                  <FormItem><FormLabel>Product Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "__none__"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">— None —</SelectItem>
                        {PRODUCT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
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
              </div>

              {/* India compliance */}
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="hsnCode" render={({ field }) => (
                  <FormItem><FormLabel>HSN Code</FormLabel><FormControl><Input placeholder="e.g. 9608" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="gstRate" render={({ field }) => (
                  <FormItem><FormLabel>GST %</FormLabel>
                    <Select onValueChange={v => field.onChange(Number(v))} value={String(field.value)}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {GST_RATES.map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="uom" render={({ field }) => (
                  <FormItem><FormLabel>UOM</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {["PCS","BOX","SET","KG","LTR","MTR","DOZ","PAC"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="costPrice" render={({ field }) => (
                  <FormItem><FormLabel>Cost Price ₹</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="sellingPrice" render={({ field }) => (
                  <FormItem><FormLabel>Selling Price ₹</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="stockLevel" render={({ field }) => (
                  <FormItem><FormLabel>Stock Level</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (
                  <FormItem><FormLabel>Low Stock Alert</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="reorderQty" render={({ field }) => (
                  <FormItem><FormLabel>Reorder Qty</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
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

              <FormField control={form.control} name="brandable" render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="cursor-pointer font-normal">Brandable (can print client logo)</FormLabel>
                </FormItem>
              )} />

              <Button type="submit" className="w-full" disabled={createProduct.isPending || updateProduct.isPending}>Save Product</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {managerProductId && (
        <ProductManager productId={managerProductId} open={!!managerProductId} onOpenChange={v => !v && setManagerProductId(null)} />
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the product and cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteProduct.mutate({ id: deleteId }); setDeleteId(null); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
