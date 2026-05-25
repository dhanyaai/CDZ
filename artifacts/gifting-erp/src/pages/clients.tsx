import { useState } from "react";
import { useLocation } from "wouter";
import { useListClients, useCreateClient, useUpdateClient, useDeleteClient, getListClientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
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

export function Clients() {
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState<string | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  const { data: clients, isLoading } = useListClients({ search: search || undefined });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createClient = useCreateClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        setDialogOpen(false);
        toast({ title: "Client created" });
      }
    }
  });

  const updateClient = useUpdateClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        setDialogOpen(false);
        toast({ title: "Client updated" });
      }
    }
  });

  const deleteClient = useDeleteClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        toast({ title: "Client deleted" });
      }
    }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { companyName: "", contactPerson: "", email: "", phone: "", gstNumber: "", industry: "", tags: "", billingAddress: "", shippingAddress: "" }
  });

  const openNew = () => {
    setEditingId(null);
    form.reset({ companyName: "", contactPerson: "", email: "", phone: "", gstNumber: "", industry: "", tags: "", billingAddress: "", shippingAddress: "" });
    setDialogOpen(true);
  };

  const openEdit = (client: any) => {
    setEditingId(client.id);
    form.reset({
      companyName: client.companyName,
      contactPerson: client.contactPerson,
      email: client.email,
      phone: client.phone || "",
      gstNumber: client.gstNumber || "",
      industry: client.industry || "",
      tags: client.tags || "",
      billingAddress: client.billingAddress || "",
      shippingAddress: client.shippingAddress || ""
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    if (editingId) {
      updateClient.mutate({ id: editingId, data });
    } else {
      createClient.mutate({ data });
    }
  };

  const filteredClients = clients?.filter(c => !industry || c.industry === industry) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">{filteredClients.length} {filteredClients.length === 1 ? "company" : "companies"} in your CRM</p>
        </div>
        <Button onClick={openNew} className="shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-shadow"><Plus className="w-4 h-4 mr-2" /> New Client</Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card elev-1 border-border/60"
          />
        </div>
        <Select value={industry} onValueChange={(v) => setIndustry(v === "all" ? undefined : v)}>
          <SelectTrigger className="w-[200px] bg-card elev-1 border-border/60">
            <SelectValue placeholder="All Industries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            <SelectItem value="technology">Technology</SelectItem>
            <SelectItem value="finance">Finance</SelectItem>
            <SelectItem value="healthcare">Healthcare</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border/60 bg-card elev-1 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Company</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Contact</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Industry</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Email</TableHead>
              <TableHead className="text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
            ) : filteredClients.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No clients found · try adjusting your filters</TableCell></TableRow>
            ) : (
              filteredClients.map(client => {
                const initials = client.companyName.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <TableRow key={client.id} className="cursor-pointer transition-colors hover:bg-primary/5 border-b border-border/40 last:border-0" onClick={() => setLocation(`/clients/${client.id}`)}>
                    <TableCell className="font-medium py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold ring-1 ring-amber-300">{initials}</div>
                        <span>{client.companyName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{client.contactPerson}</TableCell>
                    <TableCell>{client.industry ? <Badge variant="outline" className="capitalize bg-secondary/50">{client.industry}</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{client.email}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="hover:bg-primary/10" onClick={() => openEdit(client)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => { if(confirm("Are you sure?")) deleteClient.mutate({ id: client.id }) }}><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Client" : "New Client"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="companyName" render={({ field }) => (
                <FormItem><FormLabel>Company Name *</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="contactPerson" render={({ field }) => (
                <FormItem><FormLabel>Contact Person *</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email *</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={createClient.isPending || updateClient.isPending}>Save</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
