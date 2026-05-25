import { useState } from "react";
import { Link } from "wouter";
import { useListAssemblyJobs, useCreateAssemblyJob, useUpdateAssemblyJobStatus, useListSalesOrders, getListAssemblyJobsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Play, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const formSchema = z.object({
  salesOrderId: z.coerce.number().min(1, "Sales Order is required"),
  totalKits: z.coerce.number().min(1, "At least 1 kit is required")
});

type FormValues = z.infer<typeof formSchema>;

export function Assembly() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: jobs, isLoading } = useListAssemblyJobs({ status: statusFilter === "All" ? undefined : statusFilter as any });
  const { data: salesOrders } = useListSalesOrders();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createJob = useCreateAssemblyJob({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAssemblyJobsQueryKey() });
        setDialogOpen(false);
        toast({ title: "Assembly job created" });
      }
    }
  });

  const updateStatus = useUpdateAssemblyJobStatus();

  const handleStatusAdvance = (id: number, currentStatus: string) => {
    let nextStatus: any = null;
    if (currentStatus === "Pending") nextStatus = "In Progress";
    else if (currentStatus === "In Progress") nextStatus = "Completed";
    
    if (nextStatus) {
      updateStatus.mutate({ id, data: { status: nextStatus } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAssemblyJobsQueryKey() });
          toast({ title: `Status updated to ${nextStatus}` });
        }
      });
    }
  };

  const handleStatusReject = (id: number) => {
    if(confirm("Are you sure you want to reject this job?")) {
      updateStatus.mutate({ id, data: { status: "Rejected" } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAssemblyJobsQueryKey() });
          toast({ title: `Job rejected`, variant: "destructive" });
        }
      });
    }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { salesOrderId: 0, totalKits: 1 }
  });

  const onSubmit = (data: FormValues) => {
    createJob.mutate({ data });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      case "In Progress": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
      case "Completed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "Rejected": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Assembly Jobs</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Job</Button>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="All">All</TabsTrigger>
          <TabsTrigger value="Pending">Pending</TabsTrigger>
          <TabsTrigger value="In Progress">In Progress</TabsTrigger>
          <TabsTrigger value="Completed">Completed</TabsTrigger>
          <TabsTrigger value="Rejected">Rejected</TabsTrigger>
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
              <TableHead>Date Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
            ) : jobs?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">No assembly jobs found</TableCell></TableRow>
            ) : (
              jobs?.map(job => {
                const progress = job.totalKits > 0 ? (job.completedKits / job.totalKits) * 100 : 0;
                return (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.jobNumber}</TableCell>
                    <TableCell>
                      {job.salesOrderId ? (
                        <Link href={`/sales-orders/${job.salesOrderId}`} className="text-primary hover:underline">
                          {job.orderNumber || `SO-${job.salesOrderId}`}
                        </Link>
                      ) : "-"}
                    </TableCell>
                    <TableCell><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>{job.status}</span></TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>{job.completedKits} kits</span>
                          <span className="text-muted-foreground">{job.totalKits} kits</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(job.createdAt), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {job.status === "Pending" && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleStatusAdvance(job.id, job.status)}>
                            <Play className="w-3 h-3 mr-1" /> Start
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleStatusReject(job.id)}>
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {job.status === "In Progress" && (
                        <Button variant="outline" size="sm" className="border-green-200 text-green-700 hover:bg-green-50" onClick={() => handleStatusAdvance(job.id, job.status)}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Complete
                        </Button>
                      )}
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
            <DialogTitle>New Assembly Job</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="salesOrderId" render={({ field }) => (
                <FormItem><FormLabel>Sales Order *</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? field.value.toString() : ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select sales order" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {salesOrders?.map(so => (
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

              <Button type="submit" className="w-full" disabled={createJob.isPending}>Create Job</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
