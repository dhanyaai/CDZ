import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Edit, Trash2, Wrench, IndianRupee } from "lucide-react";

const SERVICE_TYPES = [
  { value: "BRANDING",      label: "Branding" },
  { value: "KITTING_JOBWORK", label: "Kitting / Job-work" },
  { value: "DESIGN",        label: "Design" },
  { value: "EVENT",         label: "Event" },
  { value: "OTHER",         label: "Other" },
];

const GST_RATES = [0, 5, 12, 18, 28];

const UNITS = ["JOB", "PCS", "HR", "DAY", "KG", "SQ_FT", "MTR"];

interface Service {
  id: number;
  name: string;
  type: string;
  sacCode: string | null;
  gstRate: number;
  unit: string;
  unitPrice: number;
  costEstimate: number;
  description: string | null;
}

const BLANK = { name: "", type: "OTHER", sacCode: "", gstRate: 18, unit: "JOB", unitPrice: 0, costEstimate: 0, description: "" };

function typeLabel(type: string) {
  return SERVICE_TYPES.find(t => t.value === type)?.label ?? type;
}

function typeColor(type: string) {
  const map: Record<string, string> = {
    BRANDING: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    KITTING_JOBWORK: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    DESIGN: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    EVENT: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    OTHER: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };
  return map[type] ?? map.OTHER;
}

export function Services() {
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(BLANK);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["services", search],
    queryFn: () => api(`/v1/services${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  });

  const create = useMutation({
    mutationFn: (data: typeof BLANK) => api("/v1/services", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services"] }); setDialog(false); toast({ title: "Service created" }); },
    onError: () => toast({ title: "Failed to create service", variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof BLANK }) => api(`/v1/services/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services"] }); setDialog(false); toast({ title: "Service updated" }); },
    onError: () => toast({ title: "Failed to update service", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/v1/services/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services"] }); toast({ title: "Service deleted" }); },
    onError: () => toast({ title: "Failed to delete service", variant: "destructive" }),
  });

  const openNew = () => { setEditingId(null); setForm(BLANK); setDialog(true); };
  const openEdit = (s: Service) => {
    setEditingId(s.id);
    setForm({ name: s.name, type: s.type, sacCode: s.sacCode ?? "", gstRate: s.gstRate, unit: s.unit, unitPrice: s.unitPrice, costEstimate: s.costEstimate, description: s.description ?? "" });
    setDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    if (editingId) update.mutate({ id: editingId, data: form });
    else create.mutate(form);
  };

  const margin = form.unitPrice > 0 ? Math.round(((form.unitPrice - form.costEstimate) / form.unitPrice) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Services</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{services.length} service{services.length !== 1 ? "s" : ""} in catalog</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />New Service</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search services…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>SAC Code</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>GST %</TableHead>
              <TableHead className="text-right">Unit Price (₹)</TableHead>
              <TableHead className="text-right">Cost Est. (₹)</TableHead>
              <TableHead className="text-right">Margin %</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
              ))
            ) : services.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-14">
                  <Wrench className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No services found</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add service</Button>
                </TableCell>
              </TableRow>
            ) : services.map(s => {
              const svcMargin = s.unitPrice > 0 ? Math.round(((s.unitPrice - s.costEstimate) / s.unitPrice) * 100) : 0;
              return (
                <TableRow key={s.id} className="group">
                  <TableCell className="font-medium">
                    <div>{s.name}</div>
                    {s.description && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{s.description}</div>}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeColor(s.type)}`}>
                      {typeLabel(s.type)}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{s.sacCode || "—"}</TableCell>
                  <TableCell className="text-sm">{s.unit}</TableCell>
                  <TableCell><Badge variant="outline">{s.gstRate}%</Badge></TableCell>
                  <TableCell className="text-right font-medium">
                    <span className="flex items-center justify-end gap-0.5"><IndianRupee className="w-3 h-3 text-muted-foreground" />{s.unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    <span className="flex items-center justify-end gap-0.5"><IndianRupee className="w-3 h-3 text-muted-foreground" />{s.costEstimate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`text-sm font-medium ${svcMargin >= 30 ? "text-green-600" : svcMargin >= 10 ? "text-amber-600" : "text-red-600"}`}>
                      {svcMargin}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(s.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Service" : "New Service"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Service Name *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Screen Printing" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Type</label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">SAC Code</label>
                <Input value={form.sacCode} onChange={e => setForm(f => ({ ...f, sacCode: e.target.value }))} placeholder="998363" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Unit</label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">GST Rate (%)</label>
                <Select value={String(form.gstRate)} onValueChange={v => setForm(f => ({ ...f, gstRate: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GST_RATES.map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Unit Price (₹)</label>
                <Input type="number" min="0" step="0.01" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Cost Estimate (₹)</label>
                <Input type="number" min="0" step="0.01" value={form.costEstimate} onChange={e => setForm(f => ({ ...f, costEstimate: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>

            {form.unitPrice > 0 && (
              <p className="text-sm text-muted-foreground">
                Estimated margin: <span className={`font-semibold ${margin >= 30 ? "text-green-600" : margin >= 10 ? "text-amber-600" : "text-red-600"}`}>{margin}%</span>
              </p>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes about this service" />
            </div>

            <Button type="submit" className="w-full" disabled={create.isPending || update.isPending}>
              {editingId ? "Save Changes" : "Create Service"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete service?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the service from the catalog and cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { del.mutate(deleteId); setDeleteId(null); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
