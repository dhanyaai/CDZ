import { useState } from "react";
import { useLocation } from "wouter";
import { useListClients, useCreateClient, useUpdateClient, useDeleteClient, getListClientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Plus, Edit, Trash2, Users, Building2, Mail, Phone, Eye } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  companyName: z.string().min(1),
  contactPerson: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  gstNumber: z.string().optional(),
  industry: z.string().optional(),
  tags: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const INDUSTRIES = ["Retail","Technology","Finance","Healthcare","Education","Manufacturing","FMCG","Pharma","Automotive","Other"];

const AVATAR_COLORS = [
  "from-indigo-500 to-violet-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-sky-500 to-blue-600",
  "from-fuchsia-500 to-purple-600",
];

function initials(name: string) {
  return name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
}

export function Clients() {
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  const { data: clients, isLoading } = useListClients({ search: search || undefined });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createClient = useCreateClient({
    mutation: {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() }); setDialogOpen(false); toast({ title: "Client created" }); },
    },
  });

  const updateClient = useUpdateClient({
    mutation: {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() }); setDialogOpen(false); toast({ title: "Client updated" }); },
    },
  });

  const deleteClient = useDeleteClient({
    mutation: {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() }); toast({ title: "Client deleted" }); },
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { companyName: "", contactPerson: "", email: "", phone: "", gstNumber: "", industry: "", tags: "", billingAddress: "", shippingAddress: "" },
  });

  const openNew = () => {
    setEditingId(null);
    form.reset({ companyName: "", contactPerson: "", email: "", phone: "", gstNumber: "", industry: "", tags: "", billingAddress: "", shippingAddress: "" });
    setDialogOpen(true);
  };

  const openEdit = (client: any) => {
    setEditingId(client.id);
    form.reset({
      companyName: client.companyName, contactPerson: client.contactPerson, email: client.email,
      phone: client.phone ?? "", gstNumber: client.gstNumber ?? "", industry: client.industry ?? "",
      tags: client.tags ?? "", billingAddress: client.billingAddress ?? "", shippingAddress: client.shippingAddress ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    if (editingId) updateClient.mutate({ id: editingId, data });
    else createClient.mutate({ data });
  };

  const filtered = (clients ?? []).filter(c =>
    industry === "all" || c.industry === industry
  );

  const uniqueIndustries = Array.from(new Set((clients ?? []).map(c => c.industry).filter(Boolean))) as string[];
  const totalClients = clients?.length ?? 0;
  const byIndustry = uniqueIndustries.length;

  return (
    <div className="space-y-6" data-testid="page-clients">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{totalClients} accounts · {byIndustry} industries</p>
        </div>
        <Button onClick={openNew} data-testid="button-new-client">
          <Plus className="w-4 h-4 mr-2" />New Client
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={industry} onValueChange={setIndustry}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Industries" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {uniqueIndustries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex border border-border rounded-lg overflow-hidden">
          <button onClick={() => setViewMode("table")} className={`px-3 py-2 text-xs font-medium transition-colors ${viewMode === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>Table</button>
          <button onClick={() => setViewMode("cards")} className={`px-3 py-2 text-xs font-medium transition-colors ${viewMode === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>Cards</button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : viewMode === "cards" ? (
        filtered.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No clients found</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add first client</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((client, i) => (
              <Card key={client.id} className="elev-1 hover:elev-2 transition-all cursor-pointer" onClick={() => setLocation(`/clients/${client.id}`)}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
                      {initials(client.companyName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{client.companyName}</h3>
                      <p className="text-xs text-muted-foreground truncate">{client.contactPerson}</p>
                    </div>
                    {client.industry && <Badge variant="outline" className="text-xs shrink-0">{client.industry}</Badge>}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3 shrink-0" /><span className="truncate">{client.email}</span>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3 shrink-0" /><span>{client.phone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <div className="border rounded-md bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>GST</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No clients found</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add first client</Button>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(client => (
                  <TableRow key={client.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                          {initials(client.companyName)}
                        </div>
                        <button className="hover:underline text-left" onClick={() => setLocation(`/clients/${client.id}`)}>
                          {client.companyName}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>{client.contactPerson}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <a href={`mailto:${client.email}`} className="hover:text-primary transition-colors">{client.email}</a>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{client.phone ?? "—"}</TableCell>
                    <TableCell>{client.industry ? <Badge variant="outline" className="text-xs">{client.industry}</Badge> : "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{client.gstNumber ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLocation(`/clients/${client.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(client)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(client.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Client" : "New Client"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="companyName" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>Company Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contactPerson" render={({ field }) => (
                  <FormItem><FormLabel>Contact Person *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="industry" render={({ field }) => (
                  <FormItem><FormLabel>Industry</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger></FormControl>
                      <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email *</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="gstNumber" render={({ field }) => (
                  <FormItem><FormLabel>GST Number</FormLabel><FormControl><Input className="font-mono" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="tags" render={({ field }) => (
                  <FormItem><FormLabel>Tags (comma separated)</FormLabel><FormControl><Input placeholder="VIP, Bulk, Corporate" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="billingAddress" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>Billing Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="shippingAddress" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>Shipping Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <Button type="submit" className="w-full" disabled={createClient.isPending || updateClient.isPending}>
                {editingId ? "Save Changes" : "Create Client"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the client and cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteClient.mutate({ id: deleteId }); setDeleteId(null); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
