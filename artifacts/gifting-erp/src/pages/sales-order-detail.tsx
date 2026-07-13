import { Link } from "wouter";
import { useGetSalesOrder, useUpdateSalesOrderStatus, getGetSalesOrderQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MapPin, Calendar, FileText, Printer, Package, Building2, Phone, Mail, CreditCard, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { printSalesOrder } from "@/lib/print-utils";

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  Confirmed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "In Production": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Ready: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Dispatched: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  Delivered: "bg-green-500/10 text-green-400 border-green-500/20",
};

const ALL_STATUSES = ["Draft", "Confirmed", "In Production", "Ready", "Dispatched", "Delivered"];

export function SalesOrderDetail({ id }: { id: number }) {
  const { data: order, isLoading } = useGetSalesOrder(id, { query: { enabled: !!id, queryKey: getGetSalesOrderQueryKey(id) } });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateStatus = useUpdateSalesOrderStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSalesOrderQueryKey(id) });
        toast({ title: "Status updated" });
      },
    },
  });

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

  return (
    <div className="space-y-6">
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
          {o.poNumber && <p className="text-sm text-muted-foreground">PO: <span className="font-medium text-foreground">{o.poNumber}</span></p>}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => printSalesOrder(order as any)}>
            <Printer className="w-4 h-4 mr-2" />Print
          </Button>
          <div className="flex items-center gap-3 bg-card p-3 rounded-lg border">
            <div className="text-sm font-medium">Status:</div>
            <Select value={order.status} onValueChange={(v) => updateStatus.mutate({ id, data: { status: v as any } })} disabled={updateStatus.isPending}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>{ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Financial Summary */}
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

        {/* Order Info */}
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

        {/* Client Info */}
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

        {/* Line Items */}
        <Card className="md:col-span-3">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4" />Line Items</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
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
                        {item.product?.name || item.productName}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">₹{Number(item.unitPrice ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-medium">₹{Number(item.totalPrice ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Delivery Addresses */}
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
