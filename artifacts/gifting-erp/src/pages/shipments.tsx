import { useState } from "react";
import { Link } from "wouter";
import { useListShipments, useCreateShipment, useListSalesOrders, getListShipmentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Truck, Printer, CheckCircle, MapPin, Package, IndianRupee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const COURIERS = ["BlueDart", "Delhivery", "FedEx", "DHL", "DTDC", "Ekart", "Shadowfax", "Other"];

const formSchema = z.object({
  salesOrderId: z.coerce.number().min(1, "Sales Order is required"),
  courierPartner: z.string().min(1, "Courier partner is required"),
  trackingNumber: z.string().optional(),
  estimatedDelivery: z.string().optional(),
  numberOfBoxes: z.coerce.number().int().min(0).optional(),
  totalWeight: z.coerce.number().min(0).optional(),
  freightCost: z.coerce.number().min(0).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const STATUS_CONFIG: Record<string, { color: string; badge: string }> = {
  Created:          { color: "text-slate-600",  badge: "bg-slate-100 dark:bg-slate-800 dark:text-slate-300" },
  "Label Generated":{ color: "text-blue-700",   badge: "bg-blue-100 dark:bg-blue-900 dark:text-blue-300" },
  "In Transit":     { color: "text-amber-700",  badge: "bg-amber-100 dark:bg-amber-900 dark:text-amber-300" },
  Delivered:        { color: "text-emerald-700",badge: "bg-emerald-100 dark:bg-emerald-900 dark:text-emerald-300" },
  Returned:         { color: "text-red-700",    badge: "bg-red-100 dark:bg-red-900 dark:text-red-300" },
  Preparing:        { color: "text-slate-600",  badge: "bg-slate-100 dark:bg-slate-800 dark:text-slate-300" },
};

type ShipmentItem = {
  id: number; deliveryName: string; address: string;
  status: string; trackingNumber: string | null; awbNumber: string | null;
  podName: string | null; podAt: string | null; podFileKey: string | null;
};

type ShipmentDetail = {
  id: number; shipmentNumber: string; salesOrderId: number; orderNumber: string | null;
  courierPartner: string; status: string; validTransitions: string[];
  trackingNumber: string | null; dispatchDate: string | null; estimatedDelivery: string | null;
  numberOfBoxes: number | null; totalWeight: number | null; freightCost: number;
  items: ShipmentItem[];
  createdAt: string;
};

function printDeliveryChallan(shipment: ShipmentDetail) {
  const w = window.open("", "_blank");
  if (!w) return;
  const items = shipment.items.map(it =>
    `<tr><td>${it.deliveryName}</td><td>${it.address}</td><td>${it.awbNumber || "—"}</td><td>${it.status}</td></tr>`
  ).join("");
  w.document.write(`<!DOCTYPE html><html><head><title>Delivery Challan – ${shipment.shipmentNumber}</title>
    <style>body{font-family:Arial,sans-serif;margin:32px;color:#111}h2{margin-bottom:4px}table{border-collapse:collapse;width:100%}th{background:#f3f4f6;padding:6px 10px;border:1px solid #e5e7eb;text-align:left}td{padding:6px 10px;border:1px solid #e5e7eb}</style>
    </head><body>
    <h2>Delivery Challan</h2>
    <p style="color:#6b7280;font-size:13px">Shipment #${shipment.shipmentNumber} &nbsp;|&nbsp; Order: ${shipment.orderNumber || shipment.salesOrderId}</p>
    <table style="margin:12px 0"><tbody>
      <tr><td style="width:160px;color:#6b7280">Courier</td><td>${shipment.courierPartner}</td></tr>
      <tr><td style="color:#6b7280">Tracking #</td><td>${shipment.trackingNumber || "—"}</td></tr>
      <tr><td style="color:#6b7280">Dispatch Date</td><td>${shipment.dispatchDate ? format(new Date(shipment.dispatchDate), "MMM d, yyyy") : "—"}</td></tr>
      <tr><td style="color:#6b7280">Est. Delivery</td><td>${shipment.estimatedDelivery ? format(new Date(shipment.estimatedDelivery), "MMM d, yyyy") : "—"}</td></tr>
      <tr><td style="color:#6b7280">Boxes / Weight</td><td>${shipment.numberOfBoxes ?? "—"} boxes / ${shipment.totalWeight != null ? shipment.totalWeight + " kg" : "—"}</td></tr>
      <tr><td style="color:#6b7280">Freight Cost</td><td>${shipment.freightCost > 0 ? "₹" + shipment.freightCost.toLocaleString("en-IN") : "—"}</td></tr>
    </tbody></table>
    ${items ? `<h3>Delivery Addresses</h3><table><thead><tr><th>Name</th><th>Address</th><th>AWB #</th><th>Status</th></tr></thead><tbody>${items}</tbody></table>` : ""}
    <script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

export function Shipments() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [podDialogItem, setPodDialogItem] = useState<{ shipmentId: number; item: ShipmentItem } | null>(null);
  const [podName, setPodName] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: shipments, isLoading } = useListShipments({ status: statusFilter === "All" ? undefined : statusFilter as any });
  const { data: salesOrders } = useListSalesOrders();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: shipmentDetail } = useQuery<ShipmentDetail>({
    queryKey: ["shipment-detail", selectedId],
    queryFn: () => api<ShipmentDetail>(`/v1/shipments/${selectedId}`),
    enabled: !!selectedId,
  });

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

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/v1/shipments/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListShipmentsQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["shipment-detail", selectedId] });
      toast({ title: "Status updated" });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err?.message ?? "Unknown error", variant: "destructive" });
    },
  });

  const capturePod = useMutation({
    mutationFn: ({ shipmentId, itemId, podName }: { shipmentId: number; itemId: number; podName: string }) =>
      api(`/v1/shipments/${shipmentId}/items/${itemId}/pod`, { method: "PATCH", body: JSON.stringify({ podName }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListShipmentsQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["shipment-detail", selectedId] });
      setPodDialogItem(null); setPodName("");
      toast({ title: "POD captured — address marked Delivered" });
    },
    onError: (err: any) => {
      toast({ title: "POD capture failed", description: err?.message, variant: "destructive" });
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { salesOrderId: 0, courierPartner: "", trackingNumber: "", estimatedDelivery: "", numberOfBoxes: undefined, totalWeight: undefined, freightCost: undefined },
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
        freightCost: data.freightCost ?? undefined,
      } as any,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Shipments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Dispatch tracking with per-address POD capture</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />New Shipment</Button>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          {["All", "Created", "Label Generated", "In Transit", "Delivered", "Returned"].map(s => (
            <TabsTrigger key={s} value={s}>{s}</TabsTrigger>
          ))}
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
              <TableHead className="text-right">Freight</TableHead>
              <TableHead>Dispatch</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
              ))
            ) : shipments?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <Truck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No shipments found</p>
                </TableCell>
              </TableRow>
            ) : (
              shipments?.map((shipment) => {
                const s = shipment as any;
                const cfg = STATUS_CONFIG[shipment.status] ?? STATUS_CONFIG.Created!;
                return (
                  <TableRow key={shipment.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedId(shipment.id)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-muted-foreground" />{shipment.shipmentNumber}</div>
                    </TableCell>
                    <TableCell>
                      {shipment.salesOrderId ? (
                        <Link href={`/sales-orders/${shipment.salesOrderId}`} className="text-primary hover:underline" onClick={e => e.stopPropagation()}>
                          {shipment.orderNumber || `SO-${shipment.salesOrderId}`}
                        </Link>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{shipment.courierPartner}</TableCell>
                    <TableCell className="font-mono text-sm">{shipment.trackingNumber || "—"}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs border-0 ${cfg.badge}`}>{shipment.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {s.freightCost > 0 ? `₹${Number(s.freightCost).toLocaleString("en-IN")}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {shipment.dispatchDate ? format(new Date(shipment.dispatchDate), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" title="Print Delivery Challan" onClick={() => {
                          if (shipmentDetail && shipmentDetail.id === shipment.id) {
                            printDeliveryChallan(shipmentDetail);
                          } else {
                            setSelectedId(shipment.id);
                          }
                        }}>
                          <Printer className="w-4 h-4" />
                        </Button>
                        {(s.validTransitions ?? []).map((t: string) => (
                          <Button key={t} variant="outline" size="sm" className="h-7 text-xs"
                            onClick={() => changeStatus.mutate({ id: shipment.id, status: t })}
                            disabled={changeStatus.isPending}>
                            {t}
                          </Button>
                        ))}
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Shipment</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="salesOrderId" render={({ field }) => (
                <FormItem><FormLabel>Sales Order *</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? field.value.toString() : ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select sales order" /></SelectTrigger></FormControl>
                    <SelectContent position="popper" className="max-h-60">
                      {salesOrders?.map((so) => (
                        <SelectItem key={so.id} value={so.id.toString()}>{so.orderNumber} ({so.clientName})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="courierPartner" render={({ field }) => (
                <FormItem><FormLabel>Courier Partner *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "__none__"}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select courier" /></SelectTrigger></FormControl>
                    <SelectContent position="popper">
                      {COURIERS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="trackingNumber" render={({ field }) => (
                <FormItem><FormLabel>Tracking / AWB Number</FormLabel>
                  <FormControl><Input {...field} placeholder="Master AWB / Docket number" /></FormControl>
                <FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="estimatedDelivery" render={({ field }) => (
                  <FormItem><FormLabel>Est. Delivery Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="freightCost" render={({ field }) => (
                  <FormItem><FormLabel>Freight Cost (₹)</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.01" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)} placeholder="0" /></FormControl>
                  <FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="numberOfBoxes" render={({ field }) => (
                  <FormItem><FormLabel>Number of Boxes</FormLabel>
                    <FormControl><Input type="number" min="0" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="totalWeight" render={({ field }) => (
                  <FormItem><FormLabel>Total Weight (kg)</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.1" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl>
                  <FormMessage /></FormItem>
                )} />
              </div>
              <Button type="submit" className="w-full" disabled={createShipment.isPending}>Create Shipment</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Shipment Detail Sheet */}
      <Sheet open={!!selectedId} onOpenChange={o => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {shipmentDetail ? (
            <>
              <SheetHeader className="mb-5">
                <SheetTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-muted-foreground" />
                  {shipmentDetail.shipmentNumber}
                </SheetTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`text-xs border-0 ${STATUS_CONFIG[shipmentDetail.status]?.badge ?? ""}`}>{shipmentDetail.status}</Badge>
                  <span className="text-sm text-muted-foreground">{shipmentDetail.courierPartner}</span>
                  {shipmentDetail.orderNumber && (
                    <Link href={`/sales-orders/${shipmentDetail.salesOrderId}`} className="text-xs text-primary hover:underline">
                      {shipmentDetail.orderNumber}
                    </Link>
                  )}
                </div>
              </SheetHeader>

              <div className="space-y-5">
                {/* Shipment info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {shipmentDetail.trackingNumber && (
                    <div className="col-span-2">
                      <div className="text-xs text-muted-foreground">Tracking #</div>
                      <div className="font-mono">{shipmentDetail.trackingNumber}</div>
                    </div>
                  )}
                  {shipmentDetail.dispatchDate && (
                    <div>
                      <div className="text-xs text-muted-foreground">Dispatched</div>
                      <div>{format(new Date(shipmentDetail.dispatchDate), "MMM d, yyyy")}</div>
                    </div>
                  )}
                  {shipmentDetail.estimatedDelivery && (
                    <div>
                      <div className="text-xs text-muted-foreground">Est. Delivery</div>
                      <div>{format(new Date(shipmentDetail.estimatedDelivery), "MMM d, yyyy")}</div>
                    </div>
                  )}
                  {shipmentDetail.numberOfBoxes != null && (
                    <div>
                      <div className="text-xs text-muted-foreground">Boxes</div>
                      <div className="flex items-center gap-1"><Package className="w-3.5 h-3.5 text-muted-foreground" />{shipmentDetail.numberOfBoxes}</div>
                    </div>
                  )}
                  {shipmentDetail.totalWeight != null && (
                    <div>
                      <div className="text-xs text-muted-foreground">Weight</div>
                      <div>{shipmentDetail.totalWeight} kg</div>
                    </div>
                  )}
                  {shipmentDetail.freightCost > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground">Freight Cost</div>
                      <div className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5 text-muted-foreground" />₹{shipmentDetail.freightCost.toLocaleString("en-IN")}</div>
                    </div>
                  )}
                </div>

                {/* Delivery addresses */}
                {shipmentDetail.items.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Delivery Addresses ({shipmentDetail.items.length})</div>
                    <div className="space-y-2">
                      {shipmentDetail.items.map(item => (
                        <div key={item.id} className="rounded-lg border bg-muted/20 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                              <div>
                                <div className="text-sm font-medium">{item.deliveryName}</div>
                                <div className="text-xs text-muted-foreground">{item.address}</div>
                                {item.awbNumber && <div className="text-xs font-mono text-muted-foreground mt-0.5">AWB: {item.awbNumber}</div>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge className={`text-xs border-0 ${STATUS_CONFIG[item.status]?.badge ?? STATUS_CONFIG.Created!.badge}`}>
                                {item.status}
                              </Badge>
                              {item.status === "In Transit" && !item.podName && (
                                <Button size="sm" variant="outline" className="h-6 text-xs"
                                  onClick={() => { setPodDialogItem({ shipmentId: shipmentDetail.id, item }); setPodName(""); }}>
                                  <CheckCircle className="w-3 h-3 mr-1" />POD
                                </Button>
                              )}
                            </div>
                          </div>
                          {item.podName && (
                            <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Delivered to {item.podName}{item.podAt ? ` on ${format(new Date(item.podAt), "MMM d, yyyy HH:mm")}` : ""}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {shipmentDetail.validTransitions.map(t => (
                    <Button key={t} variant={t === "Returned" ? "destructive" : "default"} size="sm"
                      onClick={() => changeStatus.mutate({ id: shipmentDetail.id, status: t })}
                      disabled={changeStatus.isPending}>
                      {t === "Delivered" && <CheckCircle className="w-4 h-4 mr-2" />}
                      {t === "In Transit" && <Truck className="w-4 h-4 mr-2" />}
                      {t}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => printDeliveryChallan(shipmentDetail)}>
                    <Printer className="w-4 h-4 mr-2" />Print Challan
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4 pt-4">
              {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* POD Capture Dialog */}
      <Dialog open={!!podDialogItem} onOpenChange={o => !o && setPodDialogItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Capture Proof of Delivery</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Delivery to: <span className="font-medium text-foreground">{podDialogItem?.item.deliveryName}</span>
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Receiver Name *</label>
              <Input value={podName} onChange={e => setPodName(e.target.value)} placeholder="Name of person who received" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPodDialogItem(null)}>Cancel</Button>
            <Button disabled={!podName.trim() || capturePod.isPending} onClick={() => {
              if (podDialogItem) capturePod.mutate({ shipmentId: podDialogItem.shipmentId, itemId: podDialogItem.item.id, podName });
            }}>
              <CheckCircle className="w-4 h-4 mr-2" />Confirm Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
