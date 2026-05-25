import { useState } from "react";
import { useListBundles, useCreateBundle, useUpdateBundle, useDeleteBundle, useSuggestBundle, useListProducts, getListBundlesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Plus, Edit, Trash2, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const itemSchema = z.object({
  productId: z.coerce.number().min(1, "Product is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1")
});

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  occasion: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one item is required")
});

type FormValues = z.infer<typeof formSchema>;

export function Bundles() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
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
    defaultValues: { name: "", description: "", occasion: "", items: [{ productId: 0, quantity: 1 }] }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const openNew = () => {
    setEditingId(null);
    form.reset({ name: "", description: "", occasion: "", items: [{ productId: 0, quantity: 1 }] });
    setDialogOpen(true);
  };

  const openEdit = (bundle: any) => {
    setEditingId(bundle.id);
    form.reset({
      name: bundle.name,
      description: bundle.description || "",
      occasion: bundle.occasion || "",
      items: bundle.items.map((i: any) => ({ productId: i.productId, quantity: i.quantity }))
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    if (editingId) {
      updateBundle.mutate({ id: editingId, data });
    } else {
      createBundle.mutate({ data });
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
                  <TableHead>Name</TableHead>
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
                  <TableRow><TableCell colSpan={5} className="text-center">No bundles found</TableCell></TableRow>
                ) : (
                  filteredBundles.map(bundle => (
                    <TableRow key={bundle.id}>
                      <TableCell className="font-medium">{bundle.name}</TableCell>
                      <TableCell>{bundle.occasion || "-"}</TableCell>
                      <TableCell>{bundle.items?.length || 0} items</TableCell>
                      <TableCell className="text-right">₹{Number(bundle.totalPrice ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(bundle)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if(confirm("Are you sure?")) deleteBundle.mutate({ id: bundle.id }) }}><Trash2 className="w-4 h-4" /></Button>
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
                <label className="text-sm font-medium">Target Budget ($)</label>
                <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. 50" />
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

              <Button type="submit" className="w-full" disabled={createBundle.isPending || updateBundle.isPending}>Save</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
