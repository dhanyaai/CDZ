import { useState } from "react";
import { Link } from "wouter";
import { useListAssemblyJobs, useCreateAssemblyJob, useListSalesOrders, getListAssemblyJobsQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Play, CheckCircle, XCircle, Gauge, Package, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const formSchema = z.object({
  salesOrderId: z.coerce.number().min(1, "Sales Order is required"),
  totalKits: z.coerce.number().min(1, "At least 1 kit is required"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  Pending:      { color: "text-slate-600",  bg: "bg-slate-100 dark:bg-slate-800 dark:text-slate-300" },
  "In Progress":{ color: "text-amber-700",  bg: "bg-amber-100 dark:bg-amber-900 dark:text-amber-300" },
  Completed:    { color: "text-emerald-700",bg: "bg-emerald-100 dark:bg-emerald-900 dark:text-emerald-300" },
  Rejected:     { color: "text-red-700",    bg: "bg-red-100 dark:bg-red-900 dark:text-red-300" },
};

export function Assembly() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [kitsDialogOpen, setKitsDialogOpen] = useState(false);
  const [rejectConfirmId, setRejectConfirmId] = useState<number | null>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [kitsCompleted, setKitsCompleted] = useState("");
  const [updatingKits, setUpdatingKits] = useState(false);

  const { data: jobs, isLoading } = useListAssemblyJobs({ status: statusFilter === "All" ? undefined : statusFilter as any });
  const { data: salesOrders } = useListSalesOrders();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createJob = useCreateAssemblyJob({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAssemblyJobsQueryKey() });
        setDialogOpen(false);
        form.reset();
        toast({ title: "Assembly job created" });
      },
    },
  });

  const advanceStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/v1/assembly/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: getListAssemblyJobsQueryKey() });
      toast({ title: `Status updated to ${vars.status}` });
    },
    onError: (err: any) => {
      toast({
        title: "Status change failed",
        description: err?.message ?? "Unknown error",
        variant: "destructive",
      });
    },
  });

  const handleUpdateKits = async () => {
    if (!selectedJob || kitsCompleted === "") return;
    const count = parseInt(kitsCompleted, 10);
    if (isNaN(count) || count < 0 || count > selectedJob.totalKits) {
      toast({ title: "Invalid count", description: `Must be between 0 and ${selectedJob.totalKits}`, variant: "destructive" });
      return;
    }
    setUpdatingKits(true);
    try {
      await api(`/v1/assembly/${selectedJob.id}`, { method: "PATCH", body: JSON.stringify({ completedKits: count }) });
      queryClient.invalidateQueries({ queryKey: getListAssemblyJobsQueryKey() });
      setKitsDialogOpen(false);
      toast({ title: `Updated: ${count} / ${selectedJob.totalKits} kits completed` });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setUpdatingKits(false);
    }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { salesOrderId: 0, totalKits: 1, notes: "" },
  });

  const onSubmit = (data: FormValues) => {
    createJob.mutate({ data: { ...data, notes: data.notes || undefined } });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Assembly Jobs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kit assembly with automatic stock backflush on completion</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />New Job</Button>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          {["All", "Pending", "In Progress", "Completed", "Rejected"].map(s => (
            <TabsTrigger key={s} value={s}>{s}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job #</TableHead>
              <TableHead>Sales Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[200px]">Progress</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
              ))
            ) : jobs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No assembly jobs found</p>
                </TableCell>
              </TableRow>
            ) : (
              jobs?.map((job) => {
                const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.Pending!;
                const progress = job.totalKits > 0 ? (job.completedKits / job.totalKits) * 100 : 0;
                const vt: string[] = (job as any).validTransitions ?? [];
                return (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium font-mono">{job.jobNumber}</TableCell>
                    <TableCell>
                      {job.salesOrderId ? (
                        <Link href={`/sales-orders/${job.salesOrderId}`} className="text-primary hover:underline">
                          {job.orderNumber || `SO-${job.salesOrderId}`}
                        </Link>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs font-medium border-0 ${cfg.bg}`}>{job.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">{job.completedKits} done</span>
                          <span className="text-muted-foreground">{job.totalKits} total</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate" title={(job as any).notes ?? ""}>
                      {(job as any).notes || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(job.createdAt), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {job.status === "In Progress" && (
                          <Button variant="ghost" size="icon" title="Update kits completed" onClick={() => {
                            setSelectedJob(job);
                            setKitsCompleted(String(job.completedKits));
                            setKitsDialogOpen(true);
                          }}>
                            <Gauge className="w-4 h-4" />
                          </Button>
                        )}
                        {vt.includes("In Progress") && (
                          <Button variant="outline" size="sm" onClick={() => advanceStatus.mutate({ id: job.id, status: "In Progress" })}
                            disabled={advanceStatus.isPending}>
                            <Play className="w-3 h-3 mr-1" />Start
                          </Button>
                        )}
                        {vt.includes("Completed") && (
                          <Button variant="outline" size="sm" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
                            onClick={() => advanceStatus.mutate({ id: job.id, status: "Completed" })}
                            disabled={advanceStatus.isPending}>
                            <CheckCircle className="w-3 h-3 mr-1" />Complete
                            <span className="ml-1 text-xs opacity-60">(backflush)</span>
                          </Button>
                        )}
                        {vt.includes("Rejected") && (
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                            title="Reject job" onClick={() => setRejectConfirmId(job.id)}>
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                        {vt.includes("Pending") && (
                          <Button variant="outline" size="sm" onClick={() => advanceStatus.mutate({ id: job.id, status: "Pending" })}
                            disabled={advanceStatus.isPending}>
                            Re-open
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Assembly Job</DialogTitle></DialogHeader>
          <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Completing a job will <strong>backflush stock</strong> — component inventory will be atomically reduced.</span>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="salesOrderId" render={({ field }) => (
                <FormItem><FormLabel>Sales Order *</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? field.value.toString() : ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select sales order" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {salesOrders?.filter(s => !["Draft", "Cancelled"].includes(s.status)).map((so) => (
                        <SelectItem key={so.id} value={so.id.toString()}>{so.orderNumber} ({so.clientName})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="totalKits" render={({ field }) => (
                <FormItem><FormLabel>Total Kits to Assemble *</FormLabel>
                  <FormControl><Input type="number" min="1" {...field} /></FormControl>
                <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel>
                  <FormControl><Textarea {...field} placeholder="Special instructions, packaging notes, etc." /></FormControl>
                <FormMessage /></FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={createJob.isPending}>Create Job</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Update Kits Dialog */}
      <Dialog open={kitsDialogOpen} onOpenChange={setKitsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Kits Completed — {selectedJob?.jobNumber}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Total kits: <span className="font-semibold text-foreground">{selectedJob?.totalKits}</span>
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kits Completed</label>
              <Input type="number" min="0" max={selectedJob?.totalKits}
                value={kitsCompleted} onChange={(e) => setKitsCompleted(e.target.value)} placeholder="Enter count" />
            </div>
            {kitsCompleted !== "" && selectedJob && (
              <Progress value={(parseInt(kitsCompleted) / selectedJob.totalKits) * 100} className="h-2" />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKitsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateKits} disabled={updatingKits}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation */}
      <AlertDialog open={rejectConfirmId !== null} onOpenChange={o => !o && setRejectConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Assembly Job?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the job as Rejected. No stock changes will occur. You can reopen it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (rejectConfirmId) { advanceStatus.mutate({ id: rejectConfirmId, status: "Rejected" }); setRejectConfirmId(null); } }}>
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
