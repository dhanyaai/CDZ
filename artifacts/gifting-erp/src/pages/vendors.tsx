import { useState } from "react";
import { useListVendors, useCreateVendor, useUpdateVendor, getListVendorsQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Package, Mail, Phone, MapPin, CreditCard, Landmark, Clock, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Delhi", "Jammu & Kashmir", "Ladakh",
];

const PAYMENT_TERMS = ["Net 7", "Net 15", "Net 30", "Net 45", "Net 60", "Advance", "COD", "LC", "Custom"];

const formSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  contactPerson: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  gstNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  paymentTerms: z.string().optional(),
  bankAccount: z.string().optional(),
  leadTimeDays: z.coerce.number().min(0).default(7),
});
type FormValues = z.infer<typeof formSchema>;

const BLANK: FormValues = { name: "", contactPerson: "", email: "", phone: "", gstNumber: "", address: "", city: "", state: "", pincode: "", paymentTerms: "", bankAccount: "", leadTimeDays: 7 };

export function Vendors() {
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [productsVendor, setProductsVendor] = useState<{ id: number; name: string } | null>(null);

  const { data: vendors, isLoading } = useListVendors();
  const qc = useQueryClient();
  const { toast } = useToast();

  const filteredVendors = (vendors ?? []).filter(v => {
    const vx = v as any;
    return !search || v.name.toLowerCase().includes(search.toLowerCase())
      || (v.email ?? "").toLowerCase().includes(search.toLowerCase())
      || (vx.city ?? "").toLowerCase().includes(search.toLowerCase());
  });

  const createVendor = useCreateVendor({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListVendorsQueryKey() }); setSheetOpen(false); toast({ title: "Vendor created" }); } } });
  const updateVendor = useUpdateVendor({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListVendorsQueryKey() }); setSheetOpen(false); toast({ title: "Vendor updated" }); } } });

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: BLANK });

  const openNew = () => { setEditingId(null); form.reset(BLANK); setSheetOpen(true); };
  const openEdit = (vendor: any) => {
    setEditingId(vendor.id);
    form.reset({
      name: vendor.name, contactPerson: vendor.contactPerson || "", email: vendor.email || "",
      phone: vendor.phone || "", gstNumber: vendor.gstNumber || "", address: vendor.address || "",
      city: vendor.city || "", state: vendor.state || "", pincode: vendor.pincode || "",
      paymentTerms: vendor.paymentTerms || "", bankAccount: vendor.bankAccount || "",
      leadTimeDays: vendor.leadTimeDays || 7,
    });
    setSheetOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    const payload = { ...data, email: data.email || undefined };
    if (editingId) updateVendor.mutate({ id: editingId, data: payload });
    else createVendor.mutate({ data: payload });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Vendors</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filteredVendors.length} supplier{filteredVendors.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />New Vendor</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search vendors…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Email / Phone</TableHead>
              <TableHead>GST No.</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Payment Terms</TableHead>
              <TableHead>Lead Time</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(3).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)
            ) : filteredVendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No vendors found</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add vendor</Button>
                </TableCell>
              </TableRow>
            ) : (
              filteredVendors.map(vendor => (
                <TableRow key={vendor.id} className="group">
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell className="text-muted-foreground">{vendor.contactPerson || "—"}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      {vendor.email && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="w-3 h-3" />{vendor.email}</div>}
                      {vendor.phone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{vendor.phone}</div>}
                      {!vendor.email && !vendor.phone && <span className="text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{(vendor as any).gstNumber || "—"}</TableCell>
                  <TableCell>
                    {((vendor as any).city || (vendor as any).state) ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {[(vendor as any).city, (vendor as any).state].filter(Boolean).join(", ")}
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {(vendor as any).paymentTerms ? (
                      <Badge variant="secondary" className="text-xs">{(vendor as any).paymentTerms}</Badge>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{vendor.leadTimeDays}d</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" title="View mapped products" onClick={() => setProductsVendor({ id: vendor.id, name: vendor.name })}>
                      <Package className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" onClick={() => openEdit(vendor)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit side sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? "Edit Vendor" : "New Vendor"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-5">
            {/* Basic Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</h3>
              <div className="space-y-1">
                <label className="text-sm font-medium">Vendor Name *</label>
                <Input {...form.register("name")} placeholder="Company / supplier name" />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Contact Person</label>
                  <Input {...form.register("contactPerson")} placeholder="Name" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Phone</label>
                  <Input {...form.register("phone")} placeholder="+91 98765 43210" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Email</label>
                <Input {...form.register("email")} placeholder="vendor@example.com" type="email" />
              </div>
            </div>

            {/* Tax & Compliance */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Landmark className="w-4 h-4" />Tax & Compliance
              </h3>
              <div className="space-y-1">
                <label className="text-sm font-medium">GST Number</label>
                <Input {...form.register("gstNumber")} placeholder="e.g. 27AAPFU0939F1ZV" className="font-mono uppercase" />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <MapPin className="w-4 h-4" />Address
              </h3>
              <div className="space-y-1">
                <label className="text-sm font-medium">Street Address</label>
                <Input {...form.register("address")} placeholder="Building, street, area" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1 col-span-1">
                  <label className="text-sm font-medium">City</label>
                  <Input {...form.register("city")} placeholder="City" />
                </div>
                <div className="space-y-1 col-span-1">
                  <label className="text-sm font-medium">State</label>
                  <Controller control={form.control} name="state" render={({ field }) => (
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="— State —" /></SelectTrigger>
                      <SelectContent>{INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-1 col-span-1">
                  <label className="text-sm font-medium">Pincode</label>
                  <Input {...form.register("pincode")} placeholder="400001" />
                </div>
              </div>
            </div>

            {/* Payment & Banking */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <CreditCard className="w-4 h-4" />Payment & Banking
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Payment Terms</label>
                  <Controller control={form.control} name="paymentTerms" render={({ field }) => (
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="— Select —" /></SelectTrigger>
                      <SelectContent>{PAYMENT_TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-1 flex items-end">
                  <div className="w-full">
                    <label className="text-sm font-medium flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Lead Time (days)</label>
                    <Input {...form.register("leadTimeDays")} type="number" min="0" />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Bank Account / UPI Details</label>
                <Input {...form.register("bankAccount")} placeholder="Account No, IFSC / UPI ID" />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={createVendor.isPending || updateVendor.isPending}>
              {editingId ? "Save Changes" : "Create Vendor"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
      <VendorProductsSheet vendor={productsVendor} onClose={() => setProductsVendor(null)} />
    </div>
  );
}

type VendorProductMapping = {
  id: number;
  productId: number;
  productName: string;
  productSku: string | null;
  productCategory: string | null;
  unitPrice: number;
  leadTimeDays: number;
  isPreferred: boolean;
};

function VendorProductsSheet({ vendor, onClose }: {
  vendor: { id: number; name: string } | null;
  onClose: () => void;
}) {
  const { data: mappings = [], isLoading } = useQuery<VendorProductMapping[]>({
    queryKey: ["vendor-products", vendor?.id],
    enabled: !!vendor,
    queryFn: () => api<VendorProductMapping[]>(`/v1/vendors/${vendor!.id}/products`),
  });

  return (
    <Sheet open={!!vendor} onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-muted-foreground" />
            Products for <span className="font-semibold truncate">{vendor?.name}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : mappings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No products mapped to this vendor yet.</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Go to Products → click the truck icon on a product to map it here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                {mappings.length} product{mappings.length > 1 ? "s" : ""} mapped
              </p>
              {mappings.map(m => (
                <div key={m.id} className={`flex items-start gap-3 rounded-lg border p-3 ${m.isPreferred ? "border-amber-500/40 bg-amber-500/5" : "bg-card"}`}>
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{m.productName}</span>
                      {m.isPreferred && (
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-500 font-medium">
                          <Star className="w-3 h-3 fill-amber-400" /> Preferred
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {m.productSku && <span className="text-xs font-mono text-muted-foreground">{m.productSku}</span>}
                      {m.productCategory && <span className="text-xs text-muted-foreground">· {m.productCategory}</span>}
                    </div>
                    <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">₹{m.unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      <span>·</span>
                      <span>{m.leadTimeDays}d lead time</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
