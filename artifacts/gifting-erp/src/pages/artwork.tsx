import { useState } from "react";
import { Link } from "wouter";
import { useListArtworkApprovals, useCreateArtworkApproval, useUpdateArtworkStatus, useListClients, getListArtworkApprovalsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, CheckSquare, Image as ImageIcon, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const formSchema = z.object({
  clientId: z.coerce.number().min(1, "Client is required"),
  salesOrderId: z.coerce.number().optional().nullable(),
  assetName: z.string().min(1, "Asset name is required"),
  assetUrl: z.string().optional(),
  notes: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

export function Artwork() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<any>(null);

  const { data: artworks, isLoading } = useListArtworkApprovals({ status: statusFilter === "All" ? undefined : statusFilter as any });
  const { data: clients } = useListClients();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createArtwork = useCreateArtworkApproval({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListArtworkApprovalsQueryKey() });
        setDialogOpen(false);
        form.reset();
        toast({ title: "Artwork created" });
      }
    }
  });

  const updateStatus = useUpdateArtworkStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListArtworkApprovalsQueryKey() });
        setStatusDialogOpen(false);
        toast({ title: "Status updated" });
      }
    }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { clientId: 0, salesOrderId: null, assetName: "", assetUrl: "", notes: "" }
  });

  const onSubmit = (data: FormValues) => {
    createArtwork.mutate({ data: { ...data, salesOrderId: data.salesOrderId || undefined } });
  };

  const handleUpdateStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArtwork) return;
    
    const formData = new FormData(e.target as HTMLFormElement);
    const status = formData.get("status") as string;
    const notes = formData.get("notes") as string;
    
    updateStatus.mutate({ id: selectedArtwork.id, data: { status: status as any, notes: notes || undefined } });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      case "Client Approved": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "Sent to Vendor": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
      case "Completed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default: return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Artwork Approvals</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Artwork</Button>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="All">All</TabsTrigger>
          <TabsTrigger value="Pending">Pending</TabsTrigger>
          <TabsTrigger value="Client Approved">Client Approved</TabsTrigger>
          <TabsTrigger value="Sent to Vendor">Sent to Vendor</TabsTrigger>
          <TabsTrigger value="Completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset Name</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Order #</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
            ) : artworks?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">No artwork found</TableCell></TableRow>
            ) : (
              artworks?.map(art => (
                <TableRow key={art.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      {art.assetName}
                      {art.assetUrl && (
                        <a href={art.assetUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{art.clientName}</TableCell>
                  <TableCell>
                    {art.salesOrderId ? (
                      <Link href={`/sales-orders/${art.salesOrderId}`} className="text-primary hover:underline">
                        {`SO-${art.salesOrderId}`}
                      </Link>
                    ) : "-"}
                  </TableCell>
                  <TableCell><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(art.status)}`}>{art.status}</span></TableCell>
                  <TableCell>{format(new Date(art.createdAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground" title={art.notes ?? ""}>{art.notes || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedArtwork(art); setStatusDialogOpen(true); }}>
                      <CheckSquare className="w-4 h-4 mr-1" /> Update Status
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Artwork Approval</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="clientId" render={({ field }) => (
                <FormItem><FormLabel>Client *</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? field.value.toString() : ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {clients?.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.companyName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
              
              <FormField control={form.control} name="salesOrderId" render={({ field }) => (
                <FormItem><FormLabel>Sales Order ID (Optional)</FormLabel>
                  <FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} /></FormControl>
                <FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="assetName" render={({ field }) => (
                <FormItem><FormLabel>Asset Name *</FormLabel><FormControl><Input {...field} placeholder="e.g. Logo Vector, Packaging Design" /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="assetUrl" render={({ field }) => (
                <FormItem><FormLabel>Asset URL</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <Button type="submit" className="w-full" disabled={createArtwork.isPending}>Create Artwork Record</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Status: {selectedArtwork?.assetName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateStatus} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select name="status" defaultValue={selectedArtwork?.status}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Client Approved">Client Approved</SelectItem>
                  <SelectItem value="Sent to Vendor">Sent to Vendor</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Notes</label>
              <Textarea name="notes" defaultValue={selectedArtwork?.notes || ""} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateStatus.isPending}>Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
