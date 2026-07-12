import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useListUsers, useCreateUser, useUpdateUser, useDeleteUser, getListUsersQueryKey } from "@workspace/api-client-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit, UserCircle, Building2, X, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const roles = ["Admin", "Sales", "Purchase Manager", "Warehouse", "Production", "Finance"] as const;

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().optional(),
  role: z.enum(roles),
  isActive: z.boolean().default(true),
});
type FormValues = z.infer<typeof formSchema>;

type UserCompany = { companyId: number; companyName: string | null };
type Company = { id: number; name: string };

export function Users() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [companySheetUser, setCompanySheetUser] = useState<{ id: number; name: string } | null>(null);

  const { data: users, isLoading } = useListUsers();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: allCompanies } = useQuery<Company[]>({ queryKey: ["companies"], queryFn: () => api("/v1/companies") });
  const { data: userCompanies } = useQuery<UserCompany[]>({
    queryKey: ["user-companies", companySheetUser?.id],
    queryFn: () => api(`/v1/users/${companySheetUser!.id}/companies`),
    enabled: !!companySheetUser,
  });

  const addCompany = useMutation({
    mutationFn: ({ userId, companyId }: { userId: number; companyId: number }) =>
      api(`/v1/users/${userId}/companies/${companyId}`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["user-companies", companySheetUser?.id] }); toast({ title: "Company access granted" }); },
  });

  const removeCompany = useMutation({
    mutationFn: ({ userId, companyId }: { userId: number; companyId: number }) =>
      api(`/v1/users/${userId}/companies/${companyId}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["user-companies", companySheetUser?.id] }); toast({ title: "Company access removed" }); },
  });

  const createUser = useCreateUser({
    mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListUsersQueryKey() }); setDialogOpen(false); toast({ title: "User created" }); } }
  });
  const updateUser = useUpdateUser({
    mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListUsersQueryKey() }); setDialogOpen(false); toast({ title: "User updated" }); } }
  });
  const deleteUser = useDeleteUser({
    mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListUsersQueryKey() }); toast({ title: "User deleted" }); } }
  });

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { name: "", email: "", password: "", role: "Sales", isActive: true } });

  const openNew = () => { setEditingId(null); form.reset({ name: "", email: "", password: "", role: "Sales", isActive: true }); setDialogOpen(true); };
  const openEdit = (user: any) => { setEditingId(user.id); form.reset({ name: user.name, email: user.email, password: "", role: user.role, isActive: user.isActive ?? true }); setDialogOpen(true); };

  const onSubmit = (data: FormValues) => {
    if (editingId) {
      const submitData = { ...data };
      if (!submitData.password) delete submitData.password;
      updateUser.mutate({ id: editingId, data: submitData });
    } else {
      if (!data.password) { form.setError("password", { message: "Password is required for new users" }); return; }
      createUser.mutate({ data: data as any });
    }
  };

  const toggleActive = (id: number, current: boolean) => updateUser.mutate({ id, data: { isActive: !current } });

  const getRoleColor = (role: string) => {
    const map: Record<string, string> = {
      Admin: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
      Sales: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
      "Purchase Manager": "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
      Warehouse: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300",
      Production: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
      Finance: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300",
    };
    return map[role] ?? "";
  };

  const assignedCompanyIds = new Set((userCompanies ?? []).map(uc => uc.companyId));
  const unassignedCompanies = (allCompanies ?? []).filter(c => !assignedCompanyIds.has(c.id));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage users, roles, and multi-company access</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> New User</Button>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Company Access</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
            ) : users?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
            ) : (
              users?.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <UserCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                      {user.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell><Badge variant="outline" className={getRoleColor(user.role)}>{user.role}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={user.isActive ?? false} onCheckedChange={() => toggleActive(user.id, user.isActive ?? false)} disabled={updateUser.isPending} />
                      <span className="text-sm text-muted-foreground">{(user.isActive ?? false) ? "Active" : "Inactive"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" onClick={() => setCompanySheetUser({ id: user.id, name: user.name })}>
                      <Building2 className="w-3.5 h-3.5" />Manage
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{format(new Date(user.createdAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(user)}><Edit className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit User" : "New User"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Full Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email *</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>{editingId ? "New Password (leave blank to keep current)" : "Password *"}</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem><FormLabel>Role *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger></FormControl>
                    <SelectContent>{roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              {editingId && (
                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-3">
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="!mt-0">Active</FormLabel>
                    </div>
                  </FormItem>
                )} />
              )}
              <Button type="submit" className="w-full" disabled={createUser.isPending || updateUser.isPending}>Save User</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Company assignment sheet */}
      <Sheet open={!!companySheetUser} onOpenChange={o => !o && setCompanySheetUser(null)}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Company Access — {companySheetUser?.name}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Currently has access to</p>
              {(userCompanies ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No company assigned</p>
              ) : (
                <div className="space-y-2">
                  {(userCompanies ?? []).map(uc => (
                    <div key={uc.companyId} className="flex items-center justify-between p-2.5 rounded-lg border bg-card">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{uc.companyName ?? `Company #${uc.companyId}`}</span>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeCompany.mutate({ userId: companySheetUser!.id, companyId: uc.companyId })}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {unassignedCompanies.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Grant access to</p>
                <div className="space-y-2">
                  {unassignedCompanies.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{c.name}</span>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => addCompany.mutate({ userId: companySheetUser!.id, companyId: c.id })}
                        disabled={addCompany.isPending}>
                        <Plus className="w-3 h-3 mr-1" />Add
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
