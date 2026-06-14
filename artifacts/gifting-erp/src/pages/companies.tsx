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
import { api } from "@/lib/api";
import { getStoredCompanyId, setStoredCompanyId } from "@/lib/auth";
import { format } from "date-fns";

interface Company {
  id: number;
  name: string;
  createdAt: string;
  isCurrent: boolean;
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
  const [name, setName] = useState("");

  const createMutation = useMutation({
    mutationFn: (name: string) => api<Company>("/v1/companies", { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setDialogOpen(false);
      setName("");
      toast({ title: "Company created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      api<Company>(`/v1/companies/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setDialogOpen(false);
      setEditCompany(null);
      setName("");
      toast({ title: "Company updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const switchMutation = useMutation({
    mutationFn: (id: number) =>
      api<{ success: boolean; companyId: number; companyName: string }>(`/v1/companies/${id}/switch`, { method: "POST" }),
    onSuccess: (data) => {
      setStoredCompanyId(data.companyId);
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.clear();
      toast({ title: `Switched to ${data.companyName}`, description: "All data will now reflect the selected company." });
    },
    onError: (e: Error) => toast({ title: "Switch failed", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditCompany(null);
    setName("");
    setDialogOpen(true);
  };

  const openEdit = (c: Company) => {
    setEditCompany(c);
    setName(c.name);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (editCompany) {
      updateMutation.mutate({ id: editCompany.id, name: name.trim() });
    } else {
      createMutation.mutate(name.trim());
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCompany ? "Edit Company" : "New Company"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Company Name *</Label>
              <Input
                placeholder="e.g. Acme Corp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                autoFocus
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}
            >
              {editCompany ? "Save Changes" : "Create Company"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
