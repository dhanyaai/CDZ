import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useListClients } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

type Opportunity = {
  id: number; title: string; clientId: number | null; clientName: string | null;
  stage: string; value: number | null; probability: number;
  expectedCloseDate: string | null; ownerName: string | null; notes: string | null;
};

const STAGES = ["prospect", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"];
const LABELS: Record<string, string> = {
  prospect: "Prospect", qualified: "Qualified", proposal: "Proposal",
  negotiation: "Negotiation", closed_won: "Won", closed_lost: "Lost",
};

export function Opportunities() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ title: "", clientId: "", value: "", probability: "50", expectedCloseDate: "" });

  const { data: opps, isLoading } = useQuery({ queryKey: ["opportunities"], queryFn: () => api<Opportunity[]>("/v1/opportunities") });
  const { data: clients } = useListClients();

  const create = useMutation({
    mutationFn: () => api("/v1/opportunities", { method: "POST", body: JSON.stringify({
      title: form.title, clientId: form.clientId ? Number(form.clientId) : null,
      value: form.value ? Number(form.value) : null, probability: Number(form.probability),
      expectedCloseDate: form.expectedCloseDate || null,
    })}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["opportunities"] }); setDialog(false);
      setForm({ title: "", clientId: "", value: "", probability: "50", expectedCloseDate: "" });
      toast({ title: "Opportunity created" }); },
  });

  const updateStage = useMutation({
    mutationFn: ({ id, stage }: { id: number; stage: string }) =>
      api(`/v1/opportunities/${id}`, { method: "PATCH", body: JSON.stringify({ stage }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opportunities"] }),
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/v1/opportunities/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opportunities"] }),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  const totalWeighted = opps?.reduce((s, o) => s + ((o.value ?? 0) * o.probability) / 100, 0) ?? 0;

  return (
    <div className="space-y-6" data-testid="page-opportunities">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Opportunities</h1>
          <p className="text-sm text-muted-foreground">Weighted pipeline: ₹{totalWeighted.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <Button onClick={() => setDialog(true)}><Plus className="w-4 h-4 mr-2" />New Opportunity</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAGES.map((stage) => {
          const items = opps?.filter((o) => o.stage === stage) ?? [];
          const stageVal = items.reduce((s, o) => s + (o.value ?? 0), 0);
          return (
            <Card key={stage}>
              <CardHeader className="p-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{LABELS[stage]}</span>
                  <Badge variant="secondary">{items.length}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">₹{stageVal.toLocaleString()}</p>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {items.map((o) => (
                  <div key={o.id} className="p-2 border rounded text-xs space-y-1">
                    <div className="font-medium">{o.title}</div>
                    <div className="text-muted-foreground">{o.clientName ?? "—"}</div>
                    {o.value && <div className="text-primary font-semibold">₹{o.value.toLocaleString()} · {o.probability}%</div>}
                    <div className="flex gap-1">
                      <Select value={o.stage} onValueChange={(v) => updateStage.mutate({ id: o.id, stage: v })}>
                        <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{LABELS[s]}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del.mutate(o.id)}><Trash2 className="w-3 h-3" /></Button>
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
          <DialogHeader><DialogTitle>New Opportunity</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
              <SelectTrigger><SelectValue placeholder="Client" /></SelectTrigger>
              <SelectContent>{clients?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Value (₹)" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            <Input placeholder="Probability %" type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
            <Input placeholder="Expected close date" type="date" value={form.expectedCloseDate} onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })} />
            <Button onClick={() => create.mutate()} disabled={!form.title || create.isPending} className="w-full">Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
