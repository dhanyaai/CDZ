import { useState } from "react";
import { Link } from "wouter";
import { useGetSalesOrder, useUpdateSalesOrderStatus, getGetSalesOrderQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, MapPin, Calendar, FileText, Printer, Package, Building2, Phone, Mail, CreditCard, Truck, ClipboardCheck, ChevronRight, XCircle, FilePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { printSalesOrder } from "@/lib/print-utils";

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  Confirmed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "In Production": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Ready to Dispatch": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Dispatched: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  Delivered: "bg-green-500/10 text-green-400 border-green-500/20",
  Cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

const TRANSITION_LABELS: Record<string, { label: string; variant: "default" | "outline" | "destructive" }> = {
  Confirmed: { label: "Confirm Order", variant: "default" },
  "In Production": { label: "Start Production", variant: "default" },
  "Ready to Dispatch": { label: "Mark Ready", variant: "default" },
  Dispatched: { label: "Mark Dispatched", variant: "default" },
  Delivered: { label: "Mark Delivered", variant: "default" },
  Cancelled: { label: "Cancel Order", variant: "destructive" },
};

export function SalesOrderDetail({ id }: { id: number }) {
  const { data: order, isLoading } = useGetSalesOrder(id, { query: { enabled: !!id, queryKey: getGetSalesOrderQueryKey(id) } });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const updateStatus = useUpdateSalesOrderStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSalesOrderQueryKey(id) });
        toast({ title: "Status updated successfully" });
        setPendingStatus(null);
      },
      onError: (error: any) => {
        const message = error?.response?.data?.error ?? error?.message ?? "Failed to update status";
        toast({ title: "Cannot update status", description: message, variant: "destructive" });
        setPendingStatus(null);
      },
    },
  });

  const handleTransition = (toStatus: string) => {
    if (toStatus === "Cancelled") {
      setPendingStatus(toStatus);
      setShowConfirm(true);
    } else {
      updateStatus.mutate({ id, data: { status: toStatus as any } });
    }
  };

  const confirmTransition = () => {
    if (pendingStatus) {
      updateStatus.mutate({ id, data: { status: pendingStatus as any } });
      setShowConfirm(false);
    }
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-20 w-full" /><Skeleton className="h-[400px]" /></div>;
  }

  if (!order) return <div>Order not found</div>;

  const o = order as any;
  const subtotal = Number(o.totalAmount ?? 0);
  const discountPct = Number(o.discountPct ?? 0);
  const gstAmount = Number(o.gstAmount ?? 0);
  const grandTotal = Number(o.grandTotal ?? 0);
  const discountAmt = subtotal > 0 && discountPct > 0 ? subtotal / (1 - discountPct / 100) * (discountPct / 100) : 0;
  const validTransitions: string[] = o.validTransitions ?? [];

  return (
    <div className="space-y-6">
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
            <AlertDialogDescription>
              Cancelling will release any reserved stock. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowConfirm(false); setPendingStatus(null); }}>Keep Order</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTransition} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Cancel Order</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Link href="/sales-orders" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sales Orders
      </Link>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            {order.orderNumber}
            <Badge className={`border text-sm ${STATUS_COLORS[order.status] ?? ""}`}>{order.status}</Badge>
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">{order.clientName}</p>
          {o.poNumber && <p className="text-sm text-muted-foreground">Client PO: <span className="font-medium text-foreground">{o.poNumber}</span></p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => printSalesOrder(order as any)}>
            <Printer className="w-4 h-4 mr-2" />Print
          </Button>
          <Link href={`/order-processing/${id}`}>
            <Button variant="outline" size="sm">
              <ClipboardCheck className="w-4 h-4 mr-2" />Process
            </Button>
          </Link>
          {order.status !== "Cancelled" && (
            <Link href="/invoices">
              <Button size="sm" variant="outline" className="border-violet-400/50 text-violet-600 hover:bg-violet-50">
                <FilePlus className="w-4 h-4 mr-2" />Create Invoice
              </Button>
            </Link>
          )}
          {validTransitions.filter(s => s !== "Cancelled").map(toStatus => {
            const cfg = TRANSITION_LABELS[toStatus] ?? { label: toStatus, variant: "default" as const };
            return (
              <Button
                key={toStatus}
                variant={cfg.variant}
                size="sm"
                onClick={() => handleTransition(toStatus)}
                disabled={updateStatus.isPending}
              >
                <ChevronRight className="w-4 h-4 mr-1.5" />
                {cfg.label}
              </Button>
            );
          })}
          {validTransitions.includes("Cancelled") && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleTransition("Cancelled")}
              disabled={updateStatus.isPending}
            >
              <XCircle className="w-4 h-4 mr-1.5" />Cancel Order
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4" />Financial Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
            {discountPct > 0 && (
              <div className="flex justify-between text-amber-600"><span>Discount ({discountPct}%)</span><span>−₹{discountAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
            )}
            <div className="flex justify-between text-muted-foreground"><span>GST 18%</span><span>₹{gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
            <Separator />
            <div className="flex justify-between font-bold text-base"><span>Grand Total</span><span>₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
            {o.paymentTerms && (
              <div className="pt-2 flex items-center gap-2 text-muted-foreground">
                <CreditCard className="w-3.5 h-3.5" />
                <span>{o.paymentTerms}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" />Order Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>Created: <span className="text-foreground">{format(new Date(order.createdAt), "MMM d, yyyy")}</span></span>
            </div>
            {o.deliveryDate && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Truck className="w-3.5 h-3.5" />
                <span>Delivery: <span className="text-foreground font-medium">{format(new Date(o.deliveryDate), "MMM d, yyyy")}</span></span>
              </div>
            )}
            {order.occasion && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>Occasion: <span className="text-foreground">{order.occasion}</span></span>
              </div>
            )}
            {order.notes && (
              <div className="pt-2">
                <div className="text-muted-foreground text-xs mb-1">Notes</div>
                <p className="text-sm">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4" />Client Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="font-medium">{order.clientName}</div>
            {o.contactPerson && <div className="text-muted-foreground">{o.contactPerson}</div>}
            {o.clientEmail && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-3.5 h-3.5" /><span>{o.clientEmail}</span>
              </div>
            )}
            {o.clientPhone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3.5 h-3.5" /><span>{o.clientPhone}</span>
              </div>
            )}
            {o.clientGst && <div className="text-xs text-muted-foreground">GSTIN: <span className="font-mono text-foreground">{o.clientGst}</span></div>}
            {o.billingAddress && (
              <div className="text-xs text-muted-foreground pt-1 border-t border-border">
                <div className="text-xs font-medium mb-0.5">Billing Address</div>
                {o.billingAddress}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4" />Line Items</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>HSN</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {item.productImage ? (
                          <img src={item.productImage} alt={item.productName} className="w-8 h-8 rounded object-cover border border-border shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div>{item.productName}</div>
                          {item.uom && <div className="text-xs text-muted-foreground">{item.uom}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">{item.hsnCode ?? "—"}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">₹{Number(item.unitPrice ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-medium">₹{Number(item.totalPrice ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {order.deliveryAddresses && order.deliveryAddresses.length > 0 && (
          <Card className="md:col-span-3">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4" />Delivery Addresses</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {order.deliveryAddresses.map((addr: any) => (
                  <div key={addr.id} className="border p-4 rounded-md space-y-1.5">
                    <div className="font-medium">{addr.name}</div>
                    {addr.phone && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />{addr.phone}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{addr.address}</p>
                    {(addr.city || addr.pincode) && (
                      <p className="text-sm text-muted-foreground">{[addr.city, addr.pincode].filter(Boolean).join(" — ")}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
