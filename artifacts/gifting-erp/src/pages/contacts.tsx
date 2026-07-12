import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useListClients } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Mail, Phone, Building2, User, Edit, Briefcase, Users } from "lucide-react";

type Contact = {
  id: number;
  clientId: number;
  clientName: string | null;
  firstName: string;
  lastName: string | null;
  designation: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  notes: string | null;
  createdAt: string;
};

const BLANK_FORM = {
  clientId: "", firstName: "", lastName: "", designation: "", department: "",
  email: "", phone: "", isPrimary: false, notes: "",
};

const AVATAR_COLORS = [
  "from-indigo-500 to-violet-600", "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600", "from-rose-500 to-pink-600", "from-sky-500 to-blue-600",
];

function fullName(c: Contact) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ");
}
function initials(name: string) {
  return name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
}

export function Contacts() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [form, setForm] = useState({ ...BLANK_FORM });

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts"], queryFn: () => api<Contact[]>("/v1/contacts"),
  });
  const { data: clients } = useListClients();

  const openNew = () => { setEditId(null); setForm({ ...BLANK_FORM }); setDialog(true); };
  const openEdit = (c: Contact) => {
    setEditId(c.id);
    setForm({
      clientId: String(c.clientId), firstName: c.firstName, lastName: c.lastName ?? "",
      designation: c.designation ?? "", department: c.department ?? "",
      email: c.email ?? "", phone: c.phone ?? "", isPrimary: c.isPrimary, notes: c.notes ?? "",
    });
    setDialog(true);
  };

  const create = useMutation({
    mutationFn: () => api("/v1/contacts", {
      method: "POST", body: JSON.stringify({
        clientId: Number(form.clientId), firstName: form.firstName, lastName: form.lastName || null,
        designation: form.designation || null, department: form.department || null,
        email: form.email || null, phone: form.phone || null, isPrimary: form.isPrimary,
        notes: form.notes || null,
      }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contacts"] }); setDialog(false); toast({ title: "Contact created" }); },
  });

  const update = useMutation({
    mutationFn: () => api(`/v1/contacts/${editId}`, {
      method: "PATCH", body: JSON.stringify({
        firstName: form.firstName, lastName: form.lastName || null,
        designation: form.designation || null, department: form.department || null,
        email: form.email || null, phone: form.phone || null, isPrimary: form.isPrimary,
        notes: form.notes || null,
      }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contacts"] }); setDialog(false); toast({ title: "Contact updated" }); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/v1/contacts/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contacts"] }); toast({ title: "Contact deleted" }); },
  });

  const filtered = (contacts ?? []).filter(c => {
    const q = search.toLowerCase();
    const name = fullName(c).toLowerCase();
    const matchSearch = !q || name.includes(q) || (c.email ?? "").toLowerCase().includes(q)
      || (c.designation ?? "").toLowerCase().includes(q) || (c.clientName ?? "").toLowerCase().includes(q);
    const matchClient = clientFilter === "all" || c.clientId === Number(clientFilter);
    return matchSearch && matchClient;
  });

  const uniqueClients = Array.from(new Map((contacts ?? []).map(c => [c.clientId, c.clientName])).entries());

  const handleSubmit = () => { editId ? update.mutate() : create.mutate(); };
  const isPending = create.isPending || update.isPending;
  const canSubmit = !!form.clientId && !!form.firstName;

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-44" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="page-contacts">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{contacts?.length ?? 0} contacts across {uniqueClients.length} clients</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />New Contact</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, designation, email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Clients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {uniqueClients.map(([id, name]) => (
              <SelectItem key={id} value={String(id)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">No contacts found</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Add your first contact to start tracking relationships</p>
          <Button variant="outline" size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add contact</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((contact, idx) => {
            const name = fullName(contact);
            return (
              <Card key={contact.id} className="elev-1 hover:elev-2 transition-all group">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
                      {initials(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold truncate">{name}</h3>
                        {contact.isPrimary && (
                          <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 border px-1 py-0 shrink-0">Primary</Badge>
                        )}
                      </div>
                      {contact.designation && (
                        <p className="text-xs text-muted-foreground truncate">{contact.designation}</p>
                      )}
                      {contact.department && (
                        <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                          <Briefcase className="w-3 h-3 shrink-0" />{contact.department}
                        </p>
                      )}
                      {contact.clientName && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">{contact.clientName}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(contact)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => del.mutate(contact.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 border-t border-border/50 pt-3">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </a>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                    {contact.notes && (
                      <p className="text-[11px] text-muted-foreground/70 line-clamp-2 pt-0.5 border-t border-border/30 mt-1">
                        {contact.notes}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Contact" : "New Contact"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!editId && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Client *</label>
                <Select value={form.clientId} onValueChange={v => setForm({ ...form, clientId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select client…" /></SelectTrigger>
                  <SelectContent>{clients?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">First Name *</label>
                <Input placeholder="First name" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Last Name</label>
                <Input placeholder="Last name" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Designation / Title</label>
                <Input placeholder="e.g. CFO, Procurement Head" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Department</label>
                <Input placeholder="e.g. Finance, Procurement" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Email</label>
                <Input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Phone</label>
                <Input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Notes</label>
              <Textarea placeholder="Any additional notes about this contact…" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isPrimary} onChange={e => setForm({ ...form, isPrimary: e.target.checked })} className="rounded" />
              Mark as primary contact for this client
            </label>
            <Button onClick={handleSubmit} disabled={!canSubmit || isPending} className="w-full">
              {editId ? "Save Changes" : "Create Contact"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
