import { useState, useRef } from "react";
import { useListBundles, useCreateBundle, useUpdateBundle, useDeleteBundle, useSuggestBundle, useListProducts, getListBundlesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Plus, Edit, Trash2, Wand2, Upload, X, Package, IndianRupee, CheckCircle2, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const itemSchema = z.object({
  productId: z.coerce.number().min(1, "Product is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1")
});

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  occasion: z.string().optional(),
  imageUrl: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one item is required")
});

type FormValues = z.infer<typeof formSchema>;

const EMPTY: FormValues = { name: "", description: "", occasion: "", imageUrl: "", items: [{ productId: 0, quantity: 1 }] };

export function Bundles() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageUploading, setImageUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [suggestResult, setSuggestResult] = useState<null | {
    items: Array<{ productId: number; productName: string; quantity: number; unitPrice: number }>;
    totalPrice: number;
    totalCost: number;
    margin: number;
    priceUtilization: number;
    withinRange: boolean;
  }>(null);

  const { data: bundles, isLoading } = useListBundles();
  const { data: products } = useListProducts();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const filteredBundles = bundles?.filter(b =>
    !search || b.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const createBundle = useCreateBundle({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBundlesQueryKey() });
        setDialogOpen(false);
        toast({ title: "Bundle created" });
      }
    }
  });

  const updateBundle = useUpdateBundle({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBundlesQueryKey() });
        setDialogOpen(false);
        toast({ title: "Bundle updated" });
      }
    }
  });

  const deleteBundle = useDeleteBundle({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBundlesQueryKey() });
        toast({ title: "Bundle deleted" });
      }
    }
  });

  const suggestBundle = useSuggestBundle();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const openNew = () => {
    setEditingId(null);
    form.reset(EMPTY);
    setImagePreview("");
    setDialogOpen(true);
  };

  const openEdit = (bundle: any) => {
    setEditingId(bundle.id);
    form.reset({
      name: bundle.name,
      description: bundle.description || "",
      occasion: bundle.occasion || "",
      imageUrl: bundle.imageUrl || "",
      items: bundle.items.map((i: any) => ({ productId: i.productId, quantity: i.quantity }))
    });
    setImagePreview(bundle.imageUrl || "");
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
    const payload = { ...data, imageUrl: data.imageUrl || undefined };
    if (editingId) {
      updateBundle.mutate({ id: editingId, data: payload });
    } else {
      createBundle.mutate({ data: payload });
    }
  };

  const categoryOptions = Array.from(new Set((products ?? []).map((p: any) => p.category).filter(Boolean))).sort() as string[];

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
    setSuggestResult(null);
  };

  const handleSuggest = () => {
    if (!maxBudget) return;
    setSuggestResult(null);
    suggestBundle.mutate({
      data: {
        maxBudget: Number(maxBudget),
        ...(minBudget ? { minBudget: Number(minBudget) } : {}),
        ...(selectedCategories.length > 0 ? { categories: selectedCategories } : {}),
      }
    }, {
      onSuccess: (res: any) => {
        setSuggestResult(res);
      }
    });
  };

  const applysuggestion = () => {
    if (!suggestResult) return;
    openNew();
    form.setValue("items", suggestResult.items.map((i) => ({ productId: i.productId, quantity: i.quantity })));
    setSuggestResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gift Bundles</h1>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> New Bundle</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search bundles..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-9"
            />
          </div>

          <div className="border rounded-md bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bundle</TableHead>
                  <TableHead>Occasion</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                ) : filteredBundles.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No bundles found</TableCell></TableRow>
                ) : (
                  filteredBundles.map(bundle => (
                    <TableRow key={bundle.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {(bundle as any).imageUrl ? (
                            <img src={(bundle as any).imageUrl} alt={bundle.name} className="w-9 h-9 rounded-lg object-cover border border-border shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <span>{bundle.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{bundle.occasion || "-"}</TableCell>
                      <TableCell>{bundle.items?.length || 0} items</TableCell>
                      <TableCell className="text-right">₹{Number(bundle.totalPrice ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(bundle)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(bundle.id)}><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wand2 className="w-4 h-4 text-primary" />
                Smart Suggest
              </CardTitle>
              <p className="text-xs text-muted-foreground">Pick a budget range and categories to get product suggestions</p>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Budget Range (₹)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Min</p>
                    <Input
                      type="number"
                      min="0"
                      value={minBudget}
                      onChange={(e) => { setMinBudget(e.target.value); setSuggestResult(null); }}
                      placeholder="e.g. 500"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Max *</p>
                    <Input
                      type="number"
                      min="1"
                      value={maxBudget}
                      onChange={(e) => { setMaxBudget(e.target.value); setSuggestResult(null); }}
                      placeholder="e.g. 2000"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Item Categories</label>
                  {selectedCategories.length > 0 && (
                    <button className="text-[10px] text-muted-foreground hover:text-foreground underline" onClick={() => { setSelectedCategories([]); setSuggestResult(null); }}>
                      Clear all
                    </button>
                  )}
                </div>
                {categoryOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No categories found</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {categoryOptions.map((cat) => {
                      const active = selectedCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          onClick={() => toggleCategory(cat)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"}`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">{selectedCategories.length === 0 ? "All categories" : `${selectedCategories.length} selected`}</p>
              </div>

              <Button className="w-full" onClick={handleSuggest} disabled={!maxBudget || suggestBundle.isPending}>
                {suggestBundle.isPending ? (
                  <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />Analysing...</span>
                ) : (
                  <span className="flex items-center gap-2"><Wand2 className="w-3.5 h-3.5" />Suggest Bundle</span>
                )}
              </Button>
            </CardContent>
          </Card>

          {suggestResult && (
            <Card className={`border-2 ${suggestResult.withinRange ? "border-green-500/40 bg-green-50/30 dark:bg-green-950/10" : "border-amber-400/40 bg-amber-50/30 dark:bg-amber-950/10"}`}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Suggested Products</span>
                  <CheckCircle2 className={`w-4 h-4 ${suggestResult.withinRange ? "text-green-600" : "text-amber-500"}`} />
                </div>

                {suggestResult.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No matching products found for this budget and category selection.</p>
                ) : (
                  <>
                    <div className="rounded-md border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/60">
                          <tr>
                            <th className="text-left px-2 py-1.5 font-medium">Product</th>
                            <th className="text-center px-2 py-1.5 font-medium w-8">Qty</th>
                            <th className="text-right px-2 py-1.5 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {suggestResult.items.map((item, i) => (
                            <tr key={i} className="bg-card">
                              <td className="px-2 py-1.5">
                                <span className="truncate block max-w-[110px]" title={item.productName}>{item.productName}</span>
                                <span className="text-muted-foreground">₹{item.unitPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })} ea.</span>
                              </td>
                              <td className="px-2 py-1.5 text-center font-semibold">{item.quantity}</td>
                              <td className="px-2 py-1.5 text-right font-medium">₹{(item.unitPrice * item.quantity).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-muted/60 border-t">
                          <tr>
                            <td colSpan={2} className="px-2 py-1.5 font-semibold text-xs">Total Sell Price</td>
                            <td className="px-2 py-1.5 text-right font-bold">₹{suggestResult.totalPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Margin</span>
                      <span className={`font-semibold ${suggestResult.margin >= 30 ? "text-green-600" : "text-amber-600"}`}>{Math.round(suggestResult.margin)}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Budget used</span>
                      <span className={`font-medium ${suggestResult.priceUtilization >= 80 ? "text-green-600" : "text-amber-600"}`}>{Math.round(suggestResult.priceUtilization)}% of max</span>
                    </div>

                    <Button size="sm" className="w-full" onClick={applysuggestion}>
                      <span className="flex items-center gap-1.5">Use This Bundle<ChevronRight className="w-3.5 h-3.5" /></span>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Bundle" : "New Bundle"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              {/* Image upload */}
              <div className="space-y-2">
                <Label>Bundle Image</Label>
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
                <FormItem><FormLabel>Bundle Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="occasion" render={({ field }) => (
                <FormItem><FormLabel>Occasion</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <div className="space-y-4 border p-4 rounded-md">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Items</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: 0, quantity: 1 })}>Add Item</Button>
                </div>
                
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-4 items-end">
                    <FormField control={form.control} name={`items.${index}.productId`} render={({ field }) => (
                      <FormItem className="flex-1"><FormLabel>Product</FormLabel>
                        <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? field.value.toString() : ""}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {products?.map(p => (
                              <SelectItem key={p.id} value={p.id.toString()}>{p.name} (₹{Number(p.sellingPrice).toLocaleString("en-IN")})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      <FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                      <FormItem className="w-24"><FormLabel>Qty</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="button" variant="ghost" size="icon" className="text-destructive mb-0.5" onClick={() => remove(index)} disabled={fields.length === 1}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button type="submit" className="w-full" disabled={createBundle.isPending || updateBundle.isPending}>Save Bundle</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bundle?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the bundle and cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteBundle.mutate({ id: deleteId }); setDeleteId(null); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
