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
import { Search, Plus, Edit, Trash2, Wand2, Upload, X, Package } from "lucide-react";
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
  
  const [budget, setBudget] = useState("");
  const [suggestOccasion, setSuggestOccasion] = useState("");

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

  const handleSuggest = () => {
    if (!budget) return;
    const suggestData = suggestOccasion ? { budget: Number(budget), occasion: suggestOccasion } : { budget: Number(budget), occasion: "General" };
    suggestBundle.mutate({ data: suggestData }, {
      onSuccess: (res) => {
        openNew();
        form.setValue("items", res.items.map((i: any) => ({ productId: i.productId, quantity: i.quantity })));
      }
    });
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

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" />
                Smart Suggest
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Budget (₹)</label>
                <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. 5000" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Occasion</label>
                <Input value={suggestOccasion} onChange={(e) => setSuggestOccasion(e.target.value)} placeholder="e.g. Diwali, Onboarding" />
              </div>
              <Button className="w-full" onClick={handleSuggest} disabled={!budget || suggestBundle.isPending}>
                {suggestBundle.isPending ? "Generating..." : "Suggest Bundle"}
              </Button>
            </CardContent>
          </Card>
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
