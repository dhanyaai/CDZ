import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Building2, CheckCircle2, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api, setToken } from "@/lib/api";
import { getStoredCompanyId, setStoredCompanyId } from "@/lib/auth";
import { format } from "date-fns";

interface Company {
  id: number;
  name: string;
  gstin?: string | null;
  gstAddress?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  logoUrl?: string | null;
  createdAt: string;
  isCurrent: boolean;
}

interface CompanyForm {
  name: string;
  gstin: string;
  gstAddress: string;
  city: string;
  state: string;
  pincode: string;
  logoUrl: string;
}

function blankForm(): CompanyForm {
  return { name: "", gstin: "", gstAddress: "", city: "", state: "", pincode: "", logoUrl: "" };
}

function useCompanies() {
  return useQuery<Company[]>({
    queryKey: ["companies"],
    queryFn: () => api<Company[]>("/v1/companies"),
  });
}

export function Companies() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: companies, isLoading } = useCompanies();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyForm>(blankForm());

  const setField = (k: keyof CompanyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const createMutation = useMutation({
    mutationFn: (data: CompanyForm) => api<Company>("/v1/companies", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setDialogOpen(false);
      setForm(blankForm());
      toast({ title: "Company created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CompanyForm }) =>
      api<Company>(`/v1/companies/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setDialogOpen(false);
      setEditCompany(null);
      setForm(blankForm());
      toast({ title: "Company updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const switchMutation = useMutation({
    mutationFn: (id: number) =>
      api<{ success: boolean; token: string; companyId: number; companyName: string }>(`/v1/companies/${id}/switch`, { method: "POST" }),
    onSuccess: (data) => {
      setToken(data.token);
      setStoredCompanyId(data.companyId);
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.clear();
      toast({ title: `Switched to ${data.companyName}`, description: "All data will now reflect the selected company." });
    },
    onError: (e: Error) => toast({ title: "Switch failed", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditCompany(null);
    setForm(blankForm());
    setDialogOpen(true);
  };

  const openEdit = (c: Company) => {
    setEditCompany(c);
    setForm({
      name: c.name,
      gstin: c.gstin ?? "",
      gstAddress: c.gstAddress ?? "",
      city: c.city ?? "",
      state: c.state ?? "",
      pincode: c.pincode ?? "",
      logoUrl: c.logoUrl ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (editCompany) {
      updateMutation.mutate({ id: editCompany.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const currentId = getStoredCompanyId();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Companies</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your multi-company setup and switch context</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />New Company</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array(3).fill(0).map((_, i) => (
            <Card key={i} className="elev-1"><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
          : (companies ?? []).map((c) => {
            const isActive = c.id === currentId;
            return (
              <Card key={c.id} className={`elev-1 transition-all ${isActive ? "ring-2 ring-primary ring-offset-1" : "hover:elev-2"}`}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold leading-tight">{c.name}</div>
                        <div className="text-xs text-muted-foreground">ID #{c.id}</div>
                      </div>
                    </div>
                    {isActive && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs shrink-0">
                        <CheckCircle2 className="w-3 h-3 mr-1" />Active
                      </Badge>
                    )}
                  </div>

                  {(c.city || c.state || c.gstin) && (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {(c.city || c.state) && <div>{[c.city, c.state].filter(Boolean).join(", ")}</div>}
                      {c.gstin && <div>GSTIN: {c.gstin}</div>}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Created {format(new Date(c.createdAt), "MMM d, yyyy")}
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(c)}>
                      Edit
                    </Button>
                    {!isActive && (
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={switchMutation.isPending}
                        onClick={() => switchMutation.mutate(c.id)}
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
                        Switch
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editCompany ? "Edit Company" : "New Company"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>Company Name *</Label>
              <Input placeholder="e.g. Customize Duniya Pvt Ltd" value={form.name} onChange={setField("name")} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>GSTIN</Label>
              <Input placeholder="e.g. 27AABCU9603R1ZX" value={form.gstin} onChange={setField("gstin")} />
            </div>
            <div className="space-y-1.5">
              <Label>GST / Registered Address</Label>
              <Input placeholder="Street address for invoices" value={form.gstAddress} onChange={setField("gstAddress")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input placeholder="Mumbai" value={form.city} onChange={setField("city")} />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input placeholder="Maharashtra" value={form.state} onChange={setField("state")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Pincode</Label>
              <Input placeholder="400001" value={form.pincode} onChange={setField("pincode")} />
            </div>
            <div className="space-y-1.5">
              <Label>Logo URL</Label>
              <Input placeholder="https://example.com/logo.png" value={form.logoUrl} onChange={setField("logoUrl")} />
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={!form.name.trim() || createMutation.isPending || updateMutation.isPending}
            >
              {editCompany ? "Save Changes" : "Create Company"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
