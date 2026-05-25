import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, CheckCircle2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Contact = { id: number; firstName: string; lastName: string | null; designation: string | null; email: string | null; phone: string | null; isPrimary: boolean };
type Activity = { id: number; type: string; subject: string; description: string | null; dueDate: string | null; completedAt: string | null; createdAt: string };

export function ContactsCard({ clientId }: { clientId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const key = ["contacts", clientId];
  const { data } = useQuery({ queryKey: key, queryFn: () => api<Contact[]>(`/v1/clients/${clientId}/contacts`) });
  const [f, setF] = useState({ firstName: "", lastName: "", designation: "", email: "", phone: "", isPrimary: false });
  const [adding, setAdding] = useState(false);
  const create = useMutation({
    mutationFn: () => api(`/v1/clients/${clientId}/contacts`, { method: "POST", body: JSON.stringify(f) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); setF({ firstName: "", lastName: "", designation: "", email: "", phone: "", isPrimary: false }); setAdding(false); toast({ title: "Contact added" }); },
  });
  const del = useMutation({
    mutationFn: (id: number) => api(`/v1/contacts/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Contacts</CardTitle>
        <Button size="sm" variant="ghost" onClick={() => setAdding(!adding)}><Plus className="w-4 h-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {data?.map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-2 text-sm border-b pb-2 last:border-0">
            <div className="flex-1 min-w-0">
              <div className="font-medium flex items-center gap-1">
                {c.isPrimary && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                {c.firstName} {c.lastName ?? ""}
              </div>
              {c.designation && <div className="text-xs text-muted-foreground">{c.designation}</div>}
              {c.email && <div className="text-xs">{c.email}</div>}
              {c.phone && <div className="text-xs text-muted-foreground">{c.phone}</div>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => del.mutate(c.id)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        ))}
        {!data?.length && !adding && <div className="text-sm text-muted-foreground text-center py-2">No contacts yet</div>}
        {adding && (
          <div className="space-y-2 border-t pt-3">
            <Input placeholder="First name *" value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} />
            <Input placeholder="Last name" value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} />
            <Input placeholder="Designation" value={f.designation} onChange={(e) => setF({ ...f, designation: e.target.value })} />
            <Input placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <Input placeholder="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isPrimary} onChange={(e) => setF({ ...f, isPrimary: e.target.checked })} />Primary contact</label>
            <Button size="sm" className="w-full" onClick={() => create.mutate()} disabled={!f.firstName}>Save</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ActivitiesCard({ clientId }: { clientId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const key = ["activities", clientId];
  const { data } = useQuery({ queryKey: key, queryFn: () => api<Activity[]>(`/v1/activities?clientId=${clientId}`) });
  const [f, setF] = useState({ type: "task", subject: "", description: "", dueDate: "" });
  const [adding, setAdding] = useState(false);
  const create = useMutation({
    mutationFn: () => api(`/v1/activities`, { method: "POST", body: JSON.stringify({ ...f, clientId, dueDate: f.dueDate || undefined }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); setF({ type: "task", subject: "", description: "", dueDate: "" }); setAdding(false); toast({ title: "Activity created" }); },
  });
  const complete = useMutation({
    mutationFn: (id: number) => api(`/v1/activities/${id}/complete`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Activities & Tasks</CardTitle>
        <Button size="sm" variant="ghost" onClick={() => setAdding(!adding)}><Plus className="w-4 h-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && (
          <div className="space-y-2 border rounded-md p-3">
            <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["task", "call", "email", "meeting", "follow-up"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Subject *" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
            <Input placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
            <Input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} />
            <Button size="sm" className="w-full" onClick={() => create.mutate()} disabled={!f.subject}>Create</Button>
          </div>
        )}
        {data?.map((a) => (
          <div key={a.id} className="flex items-start gap-3 text-sm border-b pb-2 last:border-0">
            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" disabled={!!a.completedAt} onClick={() => complete.mutate(a.id)}>
              <CheckCircle2 className={`w-4 h-4 ${a.completedAt ? "text-green-600" : "text-muted-foreground"}`} />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize text-xs">{a.type}</Badge>
                <span className={`font-medium ${a.completedAt ? "line-through text-muted-foreground" : ""}`}>{a.subject}</span>
              </div>
              {a.description && <div className="text-xs text-muted-foreground mt-1">{a.description}</div>}
              {a.dueDate && <div className="text-xs text-muted-foreground mt-1">Due {format(new Date(a.dueDate), "MMM d, yyyy")}</div>}
            </div>
          </div>
        ))}
        {!data?.length && !adding && <div className="text-sm text-muted-foreground text-center py-2">No activities yet</div>}
      </CardContent>
    </Card>
  );
}
