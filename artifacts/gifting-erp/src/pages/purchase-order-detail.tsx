import { Link } from "wouter";
import { useGetPurchaseOrder, useUpdatePurchaseOrderStatus, getGetPurchaseOrderQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Calendar, User, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
        
        <div className="flex items-center gap-4 bg-card p-4 rounded-lg border">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>PO Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-bold text-lg">₹{order.totalAmount.toFixed(2)}</span>
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
                  {`SO-${order.salesOrderId}`}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
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
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items?.map((item: any) => {
                  const progress = item.quantity > 0 ? (item.receivedQuantity / item.quantity) * 100 : 0;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product?.name || item.productName}</TableCell>
                      <TableCell className="text-right">₹{item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="w-[200px]">
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span>{item.receivedQuantity}</span>
                            <span>{item.quantity}</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">₹{item.totalPrice.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
