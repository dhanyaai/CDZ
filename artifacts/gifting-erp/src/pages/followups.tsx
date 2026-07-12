import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useListClients } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isPast, parseISO } from "date-fns";
import { CheckCircle2, Clock, AlertCircle, CalendarClock, Plus, Building2, Target, Trash2, UserCircle } from "lucide-react";

type FollowUp = {
  id: number; type: string; subject: string; description: string | null;
  dueDate: string | null; completedAt: string | null;
  clientId: number | null; clientName: string | null;
  leadId: number | null; leadTitle: string | null;
  ownerId: number | null; ownerName: string | null;
  createdAt: string;
};
type Lead = { id: number; title: string };
type User = { id: number; name: string; role: string };

function groupFollowUps(items: FollowUp[]) {
  const overdue: FollowUp[] = [], today: FollowUp[] = [], upcoming: FollowUp[] = [], noDueDate: FollowUp[] = [];
  for (const item of items) {
    if (!item.dueDate) { noDueDate.push(item); continue; }
    const d = parseISO(item.dueDate);
    if (isToday(d)) today.push(item);
    else if (isPast(d)) overdue.push(item);
    else upcoming.push(item);
  }
  return { overdue, today, upcoming, noDueDate };
}

const TYPE_COLORS: Record<string, string> = {
  "follow-up": "bg-violet-500/10 text-violet-400 border-violet-500/20",
  call: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  email: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  meeting: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  task: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

function FollowUpRow({ item, onComplete, onDelete }: { item: FollowUp; onComplete: (id: number) => void; onDelete: (id: number) => void }) {
  const isOverdue = item.dueDate && isPast(parseISO(item.dueDate)) && !isToday(parseISO(item.dueDate));
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-card/80 transition-colors">
      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 mt-0.5" onClick={() => onComplete(item.id)} title="Mark done">
        <CheckCircle2 className="w-4 h-4 text-muted-foreground hover:text-green-500 transition-colors" />
      </Button>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${TYPE_COLORS[item.type] ?? TYPE_COLORS.task}`}>{item.type}</Badge>
          <span className="font-medium text-sm">{item.subject}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {item.clientName && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{item.clientName}</span>}
          {item.leadTitle && <span className="flex items-center gap-1"><Target className="w-3 h-3" />{item.leadTitle}</span>}
          {item.ownerName && <span className="flex items-center gap-1"><UserCircle className="w-3 h-3" />{item.ownerName}</span>}
          {item.dueDate && (
            <span className={`flex items-center gap-1 ${isOverdue ? "text-red-400 font-medium" : ""}`}>
              <Clock className="w-3 h-3" />{format(parseISO(item.dueDate), "MMM d, yyyy")}
            </span>
          )}
        </div>
        {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
      </div>
      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => onDelete(item.id)}>
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

function Section({ title, icon: Icon, items, color, onComplete, onDelete }: {
  title: string; icon: React.ElementType; items: FollowUp[]; color: string;
  onComplete: (id: number) => void; onDelete: (id: number) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 text-sm font-semibold ${color}`}>
        <Icon className="w-4 h-4" /><span>{title}</span>
        <Badge variant="secondary" className="text-xs font-normal">{items.length}</Badge>
      </div>
      <div className="space-y-2">{items.map(item => <FollowUpRow key={item.id} item={item} onComplete={onComplete} onDelete={onDelete} />)}</div>
    </div>
  );
}

const BLANK_FORM = { type: "follow-up", subject: "", clientId: "", leadId: "", ownerId: "", dueDate: "", description: "" };

export function FollowUps() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM });

  const { data: pending, isLoading: loadingPending } = useQuery({
    queryKey: ["followups", "pending"], queryFn: () => api<FollowUp[]>("/v1/activities?pending=true"),
  });
  const { data: completed, isLoading: loadingCompleted } = useQuery({
    queryKey: ["followups", "completed"], queryFn: () => api<FollowUp[]>("/v1/activities"),
    enabled: showCompleted, select: data => data.filter(a => !!a.completedAt),
  });
  const { data: clients } = useListClients();
  const { data: leads } = useQuery({ queryKey: ["leads"], queryFn: () => api<Lead[]>("/v1/leads") });
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => api<User[]>("/v1/users") });

  const createMutation = useMutation({
    mutationFn: () => api("/v1/activities", {
      method: "POST",
      body: JSON.stringify({
        type: form.type, subject: form.subject,
        clientId: form.clientId ? Number(form.clientId) : undefined,
        leadId: form.leadId ? Number(form.leadId) : undefined,
        ownerId: form.ownerId ? Number(form.ownerId) : undefined,
        dueDate: form.dueDate || undefined,
        description: form.description || undefined,
      }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["followups"] }); setShowDialog(false); setForm({ ...BLANK_FORM }); toast({ title: "Follow-up scheduled" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) => api(`/v1/activities/${id}/complete`, { method: "PATCH" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["followups"] }); qc.invalidateQueries({ queryKey: ["activities"] }); toast({ title: "Marked as done" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/v1/activities/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["followups"] }); qc.invalidateQueries({ queryKey: ["activities"] }); },
  });

  const groups = groupFollowUps(pending ?? []);
  const overdueCount = groups.overdue.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Follow-ups</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pending tasks and follow-ups across all clients and leads
            {overdueCount > 0 && <span className="ml-2 text-red-400 font-medium">{overdueCount} overdue</span>}
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-2" />Schedule Follow-up</Button>
      </div>

      {loadingPending ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (pending ?? []).length === 0 ? (
        <Card className="elev-1">
          <CardContent className="py-16 text-center">
            <CalendarClock className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">All caught up!</h3>
            <p className="text-muted-foreground text-sm mb-4">No pending follow-ups. Schedule one to stay on top of your leads and clients.</p>
            <Button onClick={() => setShowDialog(true)} variant="outline"><Plus className="w-4 h-4 mr-2" />Schedule Follow-up</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Section title="Overdue" icon={AlertCircle} items={groups.overdue} color="text-red-400" onComplete={id => completeMutation.mutate(id)} onDelete={id => deleteMutation.mutate(id)} />
          <Section title="Due Today" icon={Clock} items={groups.today} color="text-amber-400" onComplete={id => completeMutation.mutate(id)} onDelete={id => deleteMutation.mutate(id)} />
          <Section title="Upcoming" icon={CalendarClock} items={groups.upcoming} color="text-blue-400" onComplete={id => completeMutation.mutate(id)} onDelete={id => deleteMutation.mutate(id)} />
          <Section title="No Due Date" icon={Clock} items={groups.noDueDate} color="text-muted-foreground" onComplete={id => completeMutation.mutate(id)} onDelete={id => deleteMutation.mutate(id)} />
        </div>
      )}

      <div className="border-t pt-4">
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowCompleted(!showCompleted)}>
          <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />{showCompleted ? "Hide" : "Show"} completed
        </Button>
        {showCompleted && !loadingCompleted && (completed ?? []).length > 0 && (
          <div className="mt-3 space-y-2 opacity-60">
            {completed!.map(item => (
              <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card/50">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.type}</Badge>
                    <span className="text-sm line-through text-muted-foreground">{item.subject}</span>
                  </div>
                  {item.clientName && <div className="text-xs text-muted-foreground mt-0.5">{item.clientName}</div>}
                </div>
                {item.completedAt && <span className="text-xs text-muted-foreground shrink-0">Done {format(parseISO(item.completedAt), "MMM d")}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Schedule Follow-up</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-sm font-medium">Type</label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["follow-up", "call", "email", "meeting", "task"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Subject *</label>
              <Input placeholder="e.g. Follow up on proposal" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Client</label>
                <Select value={form.clientId} onValueChange={v => setForm({ ...form, clientId: v })}>
                  <SelectTrigger><SelectValue placeholder="Link client…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— None —</SelectItem>
                    {clients?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Lead</label>
                <Select value={form.leadId} onValueChange={v => setForm({ ...form, leadId: v })}>
                  <SelectTrigger><SelectValue placeholder="Link lead…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— None —</SelectItem>
                    {leads?.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Assigned To</label>
                <Select value={form.ownerId} onValueChange={v => setForm({ ...form, ownerId: v })}>
                  <SelectTrigger><SelectValue placeholder="Assign to…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Unassigned —</SelectItem>
                    {users?.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Due Date</label>
                <Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Notes</label>
              <Textarea placeholder="Add context or reminders…" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!form.subject.trim() || createMutation.isPending}>
              Schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
