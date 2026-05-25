import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

type Category = { id: number; name: string; slug: string; parentId: number | null; description: string | null };

export function Categories() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });

  const { data, isLoading } = useQuery({ queryKey: ["categories"], queryFn: () => api<Category[]>("/v1/categories") });

  const create = useMutation({
    mutationFn: () => api("/v1/categories", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); setDialog(false);
      setForm({ name: "", slug: "", description: "" }); toast({ title: "Category created" }); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/v1/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6" data-testid="page-categories">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Categories</h1>
        <Button onClick={() => setDialog(true)}><Plus className="w-4 h-4 mr-2" />New Category</Button>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Description</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data?.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="font-mono text-xs">{c.slug}</TableCell>
                <TableCell className="text-muted-foreground">{c.description ?? "—"}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => del.mutate(c.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>
              </TableRow>
            ))}
            {!data?.length && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No categories yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} />
            <Input placeholder="Slug *" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Button onClick={() => create.mutate()} disabled={!form.name || !form.slug || create.isPending} className="w-full">Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
