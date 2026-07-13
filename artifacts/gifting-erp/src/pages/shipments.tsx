import { useState } from "react";
import { Link } from "wouter";
import { useListShipments, useCreateShipment, useUpdateShipmentStatus, useListSalesOrders, getListShipmentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Truck, Edit, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const formSchema = z.object({
  salesOrderId: z.coerce.number().min(1, "Sales Order is required"),
  courierPartner: z.string().min(1, "Courier partner is required"),
  trackingNumber: z.string().optional(),
  estimatedDelivery: z.string().optional(),
  numberOfBoxes: z.coerce.number().int().min(0).optional(),
  totalWeight: z.coerce.number().min(0).optional(),
});

type FormValues = z.infer<typeof formSchema>;

function printDeliveryChallan(shipment: any) {
  const w = window.open("", "_blank");
  if (!w) return;
  const items = (shipment.items ?? []).map((it: any) =>
    `<tr><td style="padding:6px 10px;border:1px solid #e5e7eb">${it.deliveryName}</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${it.address}</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${it.status}</td></tr>`
  ).join("");
  w.document.write(`<!DOCTYPE html><html><head><title>Delivery Challan – ${shipment.shipmentNumber}</title>
    <style>body{font-family:Arial,sans-serif;margin:32px;color:#111}h2{margin-bottom:4px}table{border-collapse:collapse;width:100%}th{background:#f3f4f6;padding:6px 10px;border:1px solid #e5e7eb;text-align:left}</style>
    </head><body>
    <h2>Delivery Challan</h2>
    <p style="color:#6b7280;font-size:13px">Shipment #${shipment.shipmentNumber} &nbsp;|&nbsp; Order: ${shipment.orderNumber || shipment.salesOrderId}</p>
    <table style="margin:16px 0"><tbody>
      <tr><td style="padding:4px 0;width:160px;color:#6b7280">Courier</td><td>${shipment.courierPartner}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Tracking #</td><td>${shipment.trackingNumber || "—"}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Dispatch Date</td><td>${shipment.dispatchDate ? format(new Date(shipment.dispatchDate), "MMM d, yyyy") : "—"}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Est. Delivery</td><td>${shipment.estimatedDelivery ? format(new Date(shipment.estimatedDelivery), "MMM d, yyyy") : "—"}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Boxes</td><td>${shipment.numberOfBoxes ?? "—"}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Weight</td><td>${shipment.totalWeight != null ? shipment.totalWeight + " kg" : "—"}</td></tr>
    </tbody></table>
    ${items ? `<h3>Delivery Addresses</h3><table><thead><tr><th>Name</th><th>Address</th><th>Status</th></tr></thead><tbody>${items}</tbody></table>` : ""}
    <script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

export function Shipments() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);

  const { data: shipments, isLoading } = useListShipments({ status: statusFilter === "All" ? undefined : statusFilter as any });
  const { data: salesOrders } = useListSalesOrders();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createShipment = useCreateShipment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListShipmentsQueryKey() });
        setDialogOpen(false);
        form.reset();
        toast({ title: "Shipment created" });
      },
    },
  });

  const updateStatus = useUpdateShipmentStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListShipmentsQueryKey() });
        setStatusDialogOpen(false);
        toast({ title: "Status updated" });
      },
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { salesOrderId: 0, courierPartner: "", trackingNumber: "", estimatedDelivery: "", numberOfBoxes: undefined, totalWeight: undefined },
  });

  const onSubmit = (data: FormValues) => {
    createShipment.mutate({
      data: {
        salesOrderId: data.salesOrderId,
        courierPartner: data.courierPartner,
        trackingNumber: data.trackingNumber || undefined,
        estimatedDelivery: data.estimatedDelivery || undefined,
        numberOfBoxes: data.numberOfBoxes ?? undefined,
        totalWeight: data.totalWeight ?? undefined,
      },
    });
  };

  const handleUpdateStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const status = formData.get("status") as string;
    updateStatus.mutate({ id: selectedShipment.id, data: { status: status as any } });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Preparing": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      case "Dispatched": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "In Transit": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
      case "Delivered": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default: return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Shipments</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Shipment</Button>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="All">All</TabsTrigger>
          <TabsTrigger value="Preparing">Preparing</TabsTrigger>
          <TabsTrigger value="Dispatched">Dispatched</TabsTrigger>
          <TabsTrigger value="In Transit">In Transit</TabsTrigger>
          <TabsTrigger value="Delivered">Delivered</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shipment #</TableHead>
              <TableHead>Order #</TableHead>
              <TableHead>Courier</TableHead>
              <TableHead>Tracking #</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dispatch</TableHead>
              <TableHead>Est. Delivery</TableHead>
              <TableHead>Boxes</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
            ) : shipments?.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8">No shipments found</TableCell></TableRow>
            ) : (
              shipments?.map((shipment) => (
                <TableRow key={shipment.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      {shipment.shipmentNumber}
                    </div>
                  </TableCell>
                  <TableCell>
                    {shipment.salesOrderId ? (
                      <Link href={`/sales-orders/${shipment.salesOrderId}`} className="text-primary hover:underline">
                        {shipment.orderNumber || `SO-${shipment.salesOrderId}`}
                      </Link>
                    ) : "—"}
                  </TableCell>
                  <TableCell>{shipment.courierPartner}</TableCell>
                  <TableCell className="font-mono text-sm">{shipment.trackingNumber || "—"}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(shipment.status)}`}>
                      {shipment.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {shipment.dispatchDate ? format(new Date(shipment.dispatchDate), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {(shipment as any).estimatedDelivery ? format(new Date((shipment as any).estimatedDelivery), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{(shipment as any).numberOfBoxes ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {(shipment as any).totalWeight != null ? `${(shipment as any).totalWeight} kg` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" title="Print Delivery Challan" onClick={() => printDeliveryChallan(shipment)}>
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { setSelectedShipment(shipment); setStatusDialogOpen(true); }}>
                        <Edit className="w-4 h-4 mr-1" /> Status
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Shipment</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="salesOrderId" render={({ field }) => (
                <FormItem><FormLabel>Sales Order *</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? field.value.toString() : ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select sales order" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {salesOrders?.map((so) => (
                        <SelectItem key={so.id} value={so.id.toString()}>{so.orderNumber} ({so.clientName})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="courierPartner" render={({ field }) => (
                <FormItem><FormLabel>Courier Partner *</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. FedEx, BlueDart, DTDC" /></FormControl>
                <FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="trackingNumber" render={({ field }) => (
                <FormItem><FormLabel>Tracking Number</FormLabel>
                  <FormControl><Input {...field} placeholder="AWB / Docket number" /></FormControl>
                <FormMessage /></FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="estimatedDelivery" render={({ field }) => (
                  <FormItem><FormLabel>Est. Delivery Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="numberOfBoxes" render={({ field }) => (
                  <FormItem><FormLabel>Number of Boxes</FormLabel>
                    <FormControl><Input type="number" min="0" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl>
                  <FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="totalWeight" render={({ field }) => (
                <FormItem><FormLabel>Total Weight (kg)</FormLabel>
                  <FormControl><Input type="number" min="0" step="0.1" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g. 12.5" /></FormControl>
                <FormMessage /></FormItem>
              )} />

              <Button type="submit" className="w-full" disabled={createShipment.isPending}>Create Shipment</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Status: {selectedShipment?.shipmentNumber}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateStatus} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select name="status" defaultValue={selectedShipment?.status}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Preparing">Preparing</SelectItem>
                  <SelectItem value="Dispatched">Dispatched</SelectItem>
                  <SelectItem value="In Transit">In Transit</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
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
