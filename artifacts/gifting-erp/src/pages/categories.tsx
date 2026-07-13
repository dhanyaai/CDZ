import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, FolderTree, Package, Edit } from "lucide-react";

type Category = { id: number; name: string; slug: string; parentId: number | null; description: string | null; productCount?: number };

const ICONS = ["🎁", "📦", "🖊️", "👕", "☕", "🎨", "💼", "🧴", "📓", "🎀", "🏆", "💎"];
const COLORS = [
  { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-500/20" },
  { bg: "bg-violet-500/10", text: "text-violet-600", border: "border-violet-500/20" },
  { bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-500/20" },
  { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/20" },
  { bg: "bg-rose-500/10", text: "text-rose-600", border: "border-rose-500/20" },
  { bg: "bg-indigo-500/10", text: "text-indigo-600", border: "border-indigo-500/20" },
  { bg: "bg-orange-500/10", text: "text-orange-600", border: "border-orange-500/20" },
  { bg: "bg-teal-500/10", text: "text-teal-600", border: "border-teal-500/20" },
];

export function Categories() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", hsnCode: "", icon: "🎁" });
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/v1/categories"),
  });

  const create = useMutation({
    mutationFn: () => api("/v1/categories", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] }); setDialog(false);
      setForm({ name: "", slug: "", description: "", hsnCode: "", icon: "🎁" });
      toast({ title: "Category created" });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof form }) =>
      api(`/v1/categories/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] }); setDialog(false);
      setEditingId(null);
      toast({ title: "Category updated" });
    },
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/v1/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); toast({ title: "Category deleted" }); },
  });

  const openNew = () => {
    setEditingId(null);
    setForm({ name: "", slug: "", description: "", hsnCode: "", icon: "🎁" });
    setDialog(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, slug: cat.slug, description: cat.description ?? "", hsnCode: (cat as any).hsnCode ?? "", icon: "🎁" });
    setDialog(true);
  };

  const handleSubmit = () => {
    if (editingId) update.mutate({ id: editingId, data: form });
    else create.mutate();
  };

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="page-categories">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data?.length ?? 0} product categories</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />New Category</Button>
      </div>

      {data?.length === 0 ? (
        <div className="text-center py-16">
          <FolderTree className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-3">No categories yet. Create your first one.</p>
          <Button variant="outline" onClick={openNew}><Plus className="w-4 h-4 mr-2" />Create Category</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data?.map((cat, i) => {
            const color = COLORS[i % COLORS.length];
            const icon = ICONS[i % ICONS.length];
            return (
              <Card key={cat.id} className={`elev-1 border ${color.border} hover:elev-2 transition-all group`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-12 h-12 rounded-xl ${color.bg} flex items-center justify-center text-2xl shrink-0`}>
                      {icon}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(cat)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm("Delete this category?")) del.mutate(cat.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-semibold mb-0.5">{cat.name}</h3>
                  <p className="font-mono text-[11px] text-muted-foreground/70 mb-2">{cat.slug}</p>
                  {cat.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{cat.description}</p>
                  )}
                  {(cat as any).hsnCode && (
                    <p className="font-mono text-[11px] text-muted-foreground/70 mb-1">HSN: {(cat as any).hsnCode}</p>
                  )}
                  <div className="flex items-center gap-1 mt-auto">
                    <Package className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {cat.productCount != null ? `${cat.productCount} products` : ""}
                    </span>
                    {cat.parentId && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 ml-auto">Sub</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Icon picker */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Icon</label>
              <div className="flex items-center gap-2">
                <button
                  className="w-12 h-12 rounded-xl border border-border bg-muted flex items-center justify-center text-2xl hover:bg-muted/80 transition-colors"
                  onClick={() => setPickerOpen(p => !p)}
                  type="button"
                >
                  {form.icon}
                </button>
                <span className="text-xs text-muted-foreground">Click to change icon</span>
              </div>
              {pickerOpen && (
                <div className="grid grid-cols-6 gap-2 p-2 border border-border rounded-lg bg-card">
                  {ICONS.map(ic => (
                    <button key={ic} type="button"
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center hover:bg-muted transition-colors ${form.icon === ic ? "bg-primary/10 ring-1 ring-primary" : ""}`}
                      onClick={() => { setForm({ ...form, icon: ic }); setPickerOpen(false); }}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Input
              placeholder="Name *"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })}
            />
            <Input
              placeholder="Slug *"
              value={form.slug}
              onChange={e => setForm({ ...form, slug: e.target.value })}
              className="font-mono text-sm"
            />
            <Input
              placeholder="Description"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
            <Input
              placeholder="HSN / SAC Code (for GST)"
              value={form.hsnCode}
              onChange={e => setForm({ ...form, hsnCode: e.target.value })}
              className="font-mono text-sm"
            />
            <Button
              onClick={handleSubmit}
              disabled={!form.name || !form.slug || create.isPending || update.isPending}
              className="w-full"
            >
              {editingId ? "Save Changes" : "Create Category"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
