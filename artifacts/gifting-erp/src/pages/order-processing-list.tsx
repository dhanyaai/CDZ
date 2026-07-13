import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ClipboardCheck, Search, ArrowRight, Calendar, Building2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

interface SalesOrderSummary {
  id: number;
  orderNumber: string;
  clientName: string | null;
  status: string;
  deliveryDate: string | null;
  grandTotal: string;
  hasProcessingForm: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  Confirmed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "In Production": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Ready: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Dispatched: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  Delivered: "bg-green-500/10 text-green-400 border-green-500/20",
};

export function OrderProcessingList() {
  const [search, setSearch] = useState("");

  const { data: orders, isLoading } = useQuery<SalesOrderSummary[]>({
    queryKey: ["order-processing-list"],
    queryFn: () => api<SalesOrderSummary[]>("/v1/order-processing/list"),
  });

  const filtered = (orders ?? []).filter((o) =>
    !search ||
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    (o.clientName ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const withForm = filtered.filter((o) => o.hasProcessingForm);
  const withoutForm = filtered.filter((o) => !o.hasProcessingForm);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-primary" />
            Order Processing
          </h1>
          <p className="text-muted-foreground mt-1">Track and manage order processing forms linked to sales orders.</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by order number or client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (
        <div className="space-y-8">
          {withoutForm.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
                Pending Processing Form ({withoutForm.length})
              </h2>
              <div className="divide-y border rounded-lg overflow-hidden">
                {withoutForm.map((order) => (
                  <OrderRow key={order.id} order={order} />
                ))}
              </div>
            </div>
          )}

          {withForm.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                Form in Progress ({withForm.length})
              </h2>
              <div className="divide-y border rounded-lg overflow-hidden">
                {withForm.map((order) => (
                  <OrderRow key={order.id} order={order} />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No sales orders found</p>
              <p className="text-sm mt-1">Create a sales order to start processing.</p>
              <Link href="/sales-orders">
                <Button className="mt-4" variant="outline">Go to Sales Orders</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OrderRow({ order }: { order: SalesOrderSummary }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex-shrink-0">
          {order.hasProcessingForm ? (
            <ClipboardCheck className="w-5 h-5 text-emerald-500" />
          ) : (
            <ClipboardCheck className="w-5 h-5 text-muted-foreground/40" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-semibold text-sm">{order.orderNumber}</span>
            <Badge className={`border text-xs ${STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground"}`}>
              {order.status}
            </Badge>
            {order.hasProcessingForm && (
              <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
                Form active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            {order.clientName && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {order.clientName}
              </span>
            )}
            {order.deliveryDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(order.deliveryDate), "dd MMM yyyy")}
              </span>
            )}
            <span className="font-medium text-foreground/70">₹{Number(order.grandTotal).toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>
      <Link href={`/order-processing/${order.id}`}>
        <Button size="sm" variant={order.hasProcessingForm ? "outline" : "default"} className="flex-shrink-0 ml-4">
          {order.hasProcessingForm ? "View Form" : "Start Form"}
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </Link>
    </div>
  );
}
