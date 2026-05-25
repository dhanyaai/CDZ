import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, ArrowRight, Trash2 } from "lucide-react";

type Lead = {
  id: number; title: string; clientId: number | null; companyName: string | null;
  contactName: string | null; email: string | null; phone: string | null;
  source: string | null; status: string; estimatedValue: number | null;
  ownerId: number | null; ownerName: string | null; notes: string | null;
  createdAt: string;
};

const STAGES = ["new", "qualified", "proposal", "negotiation", "won", "lost", "converted"];
const STAGE_LABELS: Record<string, string> = {
  new: "New", qualified: "Qualified", proposal: "Proposal",
  negotiation: "Negotiation", won: "Won", lost: "Lost", converted: "Converted",
};

export function Leads() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ title: "", companyName: "", contactName: "", email: "", phone: "", source: "", estimatedValue: "" });

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads"], queryFn: () => api<Lead[]>("/v1/leads"),
  });

  const create = useMutation({
    mutationFn: () => api<Lead>("/v1/leads", { method: "POST", body: JSON.stringify({
      ...form, estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : null,
    })}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); setDialog(false);
      setForm({ title: "", companyName: "", contactName: "", email: "", phone: "", source: "", estimatedValue: "" });
      toast({ title: "Lead created" }); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/v1/leads/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  const convert = useMutation({
    mutationFn: (id: number) => api(`/v1/leads/${id}/convert`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      toast({ title: "Converted to opportunity" }); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/v1/leads/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); toast({ title: "Lead deleted" }); },
  });

  const byStatus = (status: string) => leads?.filter((l) => l.status === status) ?? [];
  const total = leads?.reduce((s, l) => s + (l.estimatedValue ?? 0), 0) ?? 0;

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-12 w-64" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="space-y-6" data-testid="page-leads">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads Pipeline</h1>
          <p className="text-sm text-muted-foreground">Pipeline value: ₹{total.toLocaleString()}</p>
        </div>
        <Button onClick={() => setDialog(true)} data-testid="button-new-lead"><Plus className="w-4 h-4 mr-2" />New Lead</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {STAGES.map((stage) => {
          const items = byStatus(stage);
          const stageValue = items.reduce((s, l) => s + (l.estimatedValue ?? 0), 0);
          return (
            <Card key={stage} className="min-h-[300px]">
              <CardHeader className="p-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{STAGE_LABELS[stage]}</span>
                  <Badge variant="secondary">{items.length}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">₹{stageValue.toLocaleString()}</p>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {items.map((lead) => (
                  <div key={lead.id} className="p-2 border rounded-md bg-card text-xs space-y-1" data-testid={`lead-${lead.id}`}>
                    <div className="font-medium">{lead.title}</div>
                    {lead.companyName && <div className="text-muted-foreground">{lead.companyName}</div>}
                    {lead.estimatedValue && <div className="text-primary font-semibold">₹{lead.estimatedValue.toLocaleString()}</div>}
                    <div className="flex gap-1 pt-1">
                      <Select value={lead.status} onValueChange={(v) => updateStatus.mutate({ id: lead.id, status: v })}>
                        <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {lead.status !== "converted" && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => convert.mutate(lead.id)} title="Convert">
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del.mutate(lead.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Company" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            <Input placeholder="Contact name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Source (Web/Referral/Cold call)" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            <Input placeholder="Estimated value (₹)" type="number" value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })} />
            <Button onClick={() => create.mutate()} disabled={!form.title || create.isPending} className="w-full">Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
