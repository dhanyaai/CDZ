import { Link } from "wouter";
import { useGetSalesOrder, useUpdateSalesOrderStatus, getGetSalesOrderQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MapPin, Calendar, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function SalesOrderDetail({ id }: { id: number }) {
  const { data: order, isLoading } = useGetSalesOrder(id, { query: { enabled: !!id, queryKey: getGetSalesOrderQueryKey(id) } });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateStatus = useUpdateSalesOrderStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSalesOrderQueryKey(id) });
        toast({ title: "Status updated" });
      }
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Draft": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      case "Confirmed": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "In Production": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
      case "Ready": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "Dispatched": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "Delivered": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300";
      default: return "";
    }
  };

  const allStatuses = ["Draft", "Confirmed", "In Production", "Ready", "Dispatched", "Delivered"];

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-20 w-full" /><Skeleton className="h-[400px]" /></div>;
  }

  if (!order) {
    return <div>Order not found</div>;
  }

  return (
    <div className="space-y-6">
      <Link href="/sales-orders" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sales Orders
      </Link>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            {order.orderNumber}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
              {order.status}
            </span>
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            {order.clientName}
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
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-bold text-lg">₹{Number(order.totalAmount ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4"/> Date</span>
              <span>{format(new Date(order.createdAt), "MMM d, yyyy")}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Occasion</span>
              <span>{order.occasion || "-"}</span>
            </div>
            {order.notes && (
              <div className="pt-2">
                <span className="text-muted-foreground flex items-center gap-2 mb-1"><FileText className="w-4 h-4"/> Notes</span>
                <p className="text-sm">{order.notes}</p>
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
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product?.name || item.productName}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">₹{Number(item.unitPrice ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">₹{Number(item.totalPrice ?? 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {order.deliveryAddresses && order.deliveryAddresses.length > 0 && (
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Delivery Addresses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {order.deliveryAddresses.map((addr: any) => (
                  <div key={addr.id} className="border p-4 rounded-md space-y-2">
                    <div className="font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      {addr.recipientName}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{addr.address}</p>
                    {addr.phone && <p className="text-sm">{addr.phone}</p>}
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
