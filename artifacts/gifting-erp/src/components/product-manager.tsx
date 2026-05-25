import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Variant = { id: number; sku: string; variantName: string; size: string | null; color: string | null; material: string | null; priceAdjustment: number; stockLevel: number };
type Tier = { id: number; tierName: string; minQuantity: number; unitPrice: number };
type Custom = { id: number; optionType: string; optionName: string; description: string | null; priceUplift: number; leadTimeDays: number };

export function ProductManager({ productId, open, onOpenChange }: { productId: number; open: boolean; onOpenChange: (v: boolean) => void }) {
  if (!productId) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Manage product</DialogTitle></DialogHeader>
        <Tabs defaultValue="variants">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="variants">Variants</TabsTrigger>
            <TabsTrigger value="pricing">Pricing tiers</TabsTrigger>
            <TabsTrigger value="custom">Customizations</TabsTrigger>
          </TabsList>
          <TabsContent value="variants"><VariantsTab productId={productId} /></TabsContent>
          <TabsContent value="pricing"><TiersTab productId={productId} /></TabsContent>
          <TabsContent value="custom"><CustomTab productId={productId} /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function VariantsTab({ productId }: { productId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const key = ["variants", productId];
  const { data } = useQuery({ queryKey: key, queryFn: () => api<Variant[]>(`/v1/products/${productId}/variants`) });
  const [f, setF] = useState({ sku: "", variantName: "", size: "", color: "", material: "", priceAdjustment: 0, stockLevel: 0 });
  const create = useMutation({
    mutationFn: () => api(`/v1/products/${productId}/variants`, { method: "POST", body: JSON.stringify(f) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); setF({ sku: "", variantName: "", size: "", color: "", material: "", priceAdjustment: 0, stockLevel: 0 }); toast({ title: "Variant added" }); },
  });
  const del = useMutation({
    mutationFn: (id: number) => api(`/v1/variants/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  return (
    <div className="space-y-4 pt-4">
      <Table>
        <TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Name</TableHead><TableHead>Size</TableHead><TableHead>Color</TableHead><TableHead className="text-right">+ Price</TableHead><TableHead className="text-right">Stock</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {data?.map((v) => (
            <TableRow key={v.id}>
              <TableCell className="font-mono text-xs">{v.sku}</TableCell>
              <TableCell>{v.variantName}</TableCell>
              <TableCell>{v.size ?? "—"}</TableCell>
              <TableCell>{v.color ?? "—"}</TableCell>
              <TableCell className="text-right">₹{Number(v.priceAdjustment ?? 0).toFixed(2)}</TableCell>
              <TableCell className="text-right">{v.stockLevel}</TableCell>
              <TableCell><Button size="icon" variant="ghost" onClick={() => del.mutate(v.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>
            </TableRow>
          ))}
          {!data?.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-4">No variants</TableCell></TableRow>}
        </TableBody>
      </Table>
      <div className="grid grid-cols-6 gap-2 border-t pt-4">
        <Input placeholder="SKU *" value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} />
        <Input placeholder="Name *" value={f.variantName} onChange={(e) => setF({ ...f, variantName: e.target.value })} />
        <Input placeholder="Size" value={f.size} onChange={(e) => setF({ ...f, size: e.target.value })} />
        <Input placeholder="Color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} />
        <Input type="number" placeholder="+ Price" value={f.priceAdjustment} onChange={(e) => setF({ ...f, priceAdjustment: Number(e.target.value) })} />
        <Input type="number" placeholder="Stock" value={f.stockLevel} onChange={(e) => setF({ ...f, stockLevel: Number(e.target.value) })} />
        <Button size="sm" className="col-span-6" onClick={() => create.mutate()} disabled={!f.sku || !f.variantName}><Plus className="w-4 h-4 mr-1" />Add variant</Button>
      </div>
    </div>
  );
}

function TiersTab({ productId }: { productId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const key = ["tiers", productId];
  const { data } = useQuery({ queryKey: key, queryFn: () => api<Tier[]>(`/v1/products/${productId}/pricing-tiers`) });
  const [f, setF] = useState({ tierName: "", minQuantity: 0, unitPrice: 0 });
  const create = useMutation({
    mutationFn: () => api(`/v1/products/${productId}/pricing-tiers`, { method: "POST", body: JSON.stringify(f) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); setF({ tierName: "", minQuantity: 0, unitPrice: 0 }); toast({ title: "Tier added" }); },
  });
  const del = useMutation({
    mutationFn: (id: number) => api(`/v1/pricing-tiers/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  return (
    <div className="space-y-4 pt-4">
      <Table>
        <TableHeader><TableRow><TableHead>Tier</TableHead><TableHead className="text-right">Min qty</TableHead><TableHead className="text-right">Unit price</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {data?.map((t) => (
            <TableRow key={t.id}>
              <TableCell>{t.tierName}</TableCell>
              <TableCell className="text-right">{t.minQuantity}</TableCell>
              <TableCell className="text-right">₹{Number(t.unitPrice ?? 0).toFixed(2)}</TableCell>
              <TableCell><Button size="icon" variant="ghost" onClick={() => del.mutate(t.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>
            </TableRow>
          ))}
          {!data?.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No tiers</TableCell></TableRow>}
        </TableBody>
      </Table>
      <div className="grid grid-cols-4 gap-2 border-t pt-4">
        <Input placeholder="Tier name *" value={f.tierName} onChange={(e) => setF({ ...f, tierName: e.target.value })} />
        <Input type="number" placeholder="Min qty *" value={f.minQuantity} onChange={(e) => setF({ ...f, minQuantity: Number(e.target.value) })} />
        <Input type="number" placeholder="Unit price *" value={f.unitPrice} onChange={(e) => setF({ ...f, unitPrice: Number(e.target.value) })} />
        <Button size="sm" onClick={() => create.mutate()} disabled={!f.tierName}><Plus className="w-4 h-4 mr-1" />Add</Button>
      </div>
    </div>
  );
}

function CustomTab({ productId }: { productId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const key = ["custom", productId];
  const { data } = useQuery({ queryKey: key, queryFn: () => api<Custom[]>(`/v1/products/${productId}/customizations`) });
  const [f, setF] = useState({ optionType: "Printing", optionName: "", description: "", priceUplift: 0, leadTimeDays: 0 });
  const create = useMutation({
    mutationFn: () => api(`/v1/products/${productId}/customizations`, { method: "POST", body: JSON.stringify(f) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); setF({ optionType: "Printing", optionName: "", description: "", priceUplift: 0, leadTimeDays: 0 }); toast({ title: "Option added" }); },
  });
  const del = useMutation({
    mutationFn: (id: number) => api(`/v1/customizations/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  return (
    <div className="space-y-4 pt-4">
      <Table>
        <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Name</TableHead><TableHead className="text-right">Uplift</TableHead><TableHead className="text-right">Lead days</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {data?.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.optionType}</TableCell>
              <TableCell>{c.optionName}</TableCell>
              <TableCell className="text-right">₹{Number(c.priceUplift ?? 0).toFixed(2)}</TableCell>
              <TableCell className="text-right">{c.leadTimeDays}</TableCell>
              <TableCell><Button size="icon" variant="ghost" onClick={() => del.mutate(c.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>
            </TableRow>
          ))}
          {!data?.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">No customization options</TableCell></TableRow>}
        </TableBody>
      </Table>
      <div className="grid grid-cols-5 gap-2 border-t pt-4">
        <Input placeholder="Type" value={f.optionType} onChange={(e) => setF({ ...f, optionType: e.target.value })} />
        <Input placeholder="Name *" value={f.optionName} onChange={(e) => setF({ ...f, optionName: e.target.value })} />
        <Input type="number" placeholder="Uplift" value={f.priceUplift} onChange={(e) => setF({ ...f, priceUplift: Number(e.target.value) })} />
        <Input type="number" placeholder="Lead days" value={f.leadTimeDays} onChange={(e) => setF({ ...f, leadTimeDays: Number(e.target.value) })} />
        <Button size="sm" onClick={() => create.mutate()} disabled={!f.optionName}><Plus className="w-4 h-4 mr-1" />Add</Button>
      </div>
    </div>
  );
}
