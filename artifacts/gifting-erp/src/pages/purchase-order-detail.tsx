import { Link } from "wouter";
import { useGetPurchaseOrder, useUpdatePurchaseOrderStatus, getGetPurchaseOrderQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Calendar, User, ShoppingBag, Printer, Phone, Mail, MapPin, FileText, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { printPurchaseOrder } from "@/lib/print-utils";

export function PurchaseOrderDetail({ id }: { id: number }) {
  const { data: order, isLoading } = useGetPurchaseOrder(id, { query: { enabled: !!id, queryKey: getGetPurchaseOrderQueryKey(id) } });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateStatus = useUpdatePurchaseOrderStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPurchaseOrderQueryKey(id) });
        toast({ title: "Status updated" });
      }
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Ordered": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "Partially Received": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
      case "Fully Received": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default: return "";
    }
  };

  const allStatuses = ["Ordered", "Partially Received", "Fully Received"];

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-20 w-full" /><Skeleton className="h-[400px]" /></div>;
  }

  if (!order) {
    return <div>PO not found</div>;
  }

  const o = order as any;
  const vendorAddressParts = [o.vendorAddress, o.vendorCity, o.vendorState, o.vendorPincode].filter(Boolean);

  return (
    <div className="space-y-6">
      <Link href="/purchase-orders" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Purchase Orders
      </Link>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            {order.poNumber}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
              {order.status}
            </span>
          </h1>
          <p className="text-muted-foreground mt-1 text-lg flex items-center gap-2">
            <User className="w-4 h-4" /> {order.vendorName}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => printPurchaseOrder(o)}>
            <Printer className="w-4 h-4 mr-2" />Print
          </Button>
          <div className="flex items-center gap-3 bg-card p-3 rounded-lg border">
            <div className="text-sm font-medium">Update Status:</div>
            <Select 
              value={order.status} 
              onValueChange={(v) => updateStatus.mutate({ id, data: { status: v as any } })}
              disabled={updateStatus.isPending}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allStatuses.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Vendor Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="w-4 h-4" /> Vendor Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-semibold text-base">{order.vendorName}</p>
              {o.vendorContactPerson && (
                <p className="text-sm text-muted-foreground mt-0.5">{o.vendorContactPerson}</p>
              )}
            </div>
            {o.vendorPhone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span>{o.vendorPhone}</span>
              </div>
            )}
            {o.vendorEmail && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="break-all">{o.vendorEmail}</span>
              </div>
            )}
            {o.vendorGst && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="font-mono text-xs">{o.vendorGst}</span>
              </div>
            )}
            {vendorAddressParts.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{vendorAddressParts.join(", ")}</span>
              </div>
            )}
            {o.vendorPaymentTerms && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">{o.vendorPaymentTerms}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PO Summary */}
        <Card>
          <CardHeader>
            <CardTitle>PO Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-bold text-lg">₹{Number(order.totalAmount ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4"/> Created</span>
              <span>{format(new Date(order.createdAt), "MMM d, yyyy")}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4"/> Expected</span>
              <span>{order.expectedDelivery ? format(new Date(order.expectedDelivery), "MMM d, yyyy") : "-"}</span>
            </div>
            {order.salesOrderId && (
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground flex items-center gap-2"><ShoppingBag className="w-4 h-4"/> Related SO</span>
                <Link href={`/sales-orders/${order.salesOrderId}`} className="text-primary hover:underline">
                  {o.orderNumber ?? `SO-${order.salesOrderId}`}
                </Link>
              </div>
            )}
            {o.vendorLeadTimeDays && (
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground">Lead Time</span>
                <span>{o.vendorLeadTimeDays} days</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Items — full width second row */}
        <Card className="col-span-1 md:col-span-3">
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-center">Received / Ordered</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items?.map((item: any) => {
                  const qty = Number(item.quantity ?? 0);
                  const received = Number(item.receivedQty ?? item.receivedQuantity ?? 0);
                  const unitPrice = Number(item.unitPrice ?? 0);
                  const lineTotal = Number(item.lineTotal ?? item.totalPrice ?? unitPrice * qty);
                  const progress = qty > 0 ? (received / qty) * 100 : 0;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product?.name || item.productName}</TableCell>
                      <TableCell className="text-right">₹{unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="w-[220px]">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Received: <strong className="text-foreground">{received}</strong></span>
                            <span>Ordered: <strong className="text-foreground">{qty}</strong></span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">₹{lineTotal.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex justify-end mt-4 pt-4 border-t">
              <div className="text-right">
                <span className="text-muted-foreground text-sm mr-4">Grand Total</span>
                <span className="text-xl font-bold">₹{Number(order.totalAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
