import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

type Loc = {
  id: number; name: string; code: string; zone: string | null; bin: string | null;
  type: string; capacity: number | null; notes: string | null;
};

export function Locations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", zone: "", bin: "", type: "storage", capacity: "", notes: "" });

  const { data, isLoading } = useQuery({ queryKey: ["locations"], queryFn: () => api<Loc[]>("/v1/locations") });

  const create = useMutation({
    mutationFn: () => api("/v1/locations", { method: "POST", body: JSON.stringify({
      ...form, capacity: form.capacity ? Number(form.capacity) : null,
    })}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["locations"] }); setDialog(false);
      setForm({ name: "", code: "", zone: "", bin: "", type: "storage", capacity: "", notes: "" });
      toast({ title: "Location added" }); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/v1/locations/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locations"] }),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6" data-testid="page-locations">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Warehouse Locations</h1>
        <Button onClick={() => setDialog(true)}><Plus className="w-4 h-4 mr-2" />New Location</Button>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Zone / Bin</TableHead>
            <TableHead>Type</TableHead><TableHead>Capacity</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data?.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-mono">{l.code}</TableCell>
                <TableCell className="font-medium">{l.name}</TableCell>
                <TableCell>{[l.zone, l.bin].filter(Boolean).join(" / ") || "—"}</TableCell>
                <TableCell><Badge variant="outline">{l.type}</Badge></TableCell>
                <TableCell>{l.capacity ?? "—"}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => del.mutate(l.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>
              </TableRow>
            ))}
            {!data?.length && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No locations yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Location</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Code *" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Zone" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} />
              <Input placeholder="Bin" value={form.bin} onChange={(e) => setForm({ ...form, bin: e.target.value })} />
            </div>
            <Input placeholder="Type (storage/picking)" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            <Input placeholder="Capacity" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <Button onClick={() => create.mutate()} disabled={!form.name || !form.code || create.isPending} className="w-full">Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
