import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Trophy, Package, AlertTriangle } from "lucide-react";

type TopProduct = { productId: number; productName: string; qty: number; revenue: number };
type ArBuckets = { buckets: { bucket: string; value: number }[]; total: number; detail: { bucket: string; invoiceNumber: string; balance: number; daysOverdue: number; clientId: number }[] };
type Leader = { ownerId: number; name: string; role: string; pipeline: number; won: number; openCount: number; wonCount: number };

const bucketColor: Record<string, string> = {
  current: "bg-green-500",
  "1-30": "bg-amber-500",
  "31-60": "bg-orange-500",
  "61-90": "bg-red-500",
  "90+": "bg-red-700",
};

export function TopProductsCard() {
  const { data } = useQuery<TopProduct[]>({
    queryKey: ["analytics", "top-products"],
    queryFn: () => api<TopProduct[]>("/v1/analytics/top-products"),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-emerald-600" />Top products</CardTitle>
        <CardDescription>By revenue, all confirmed sales orders</CardDescription>
      </CardHeader>
      <CardContent>
        {!data?.length ? (
          <p className="text-sm text-muted-foreground">No sales data yet</p>
        ) : (
          <div className="space-y-3">
            {data.map((p, i) => (
              <div key={p.productId} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs font-semibold">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.productName}</p>
                  <p className="text-xs text-muted-foreground">{p.qty} units sold</p>
                </div>
                <div className="text-sm font-semibold text-emerald-600">₹{p.revenue.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ArAgingCard() {
  const { data } = useQuery<ArBuckets>({
    queryKey: ["analytics", "ar-aging"],
    queryFn: () => api<ArBuckets>("/v1/analytics/ar-aging"),
  });
  const max = Math.max(1, ...(data?.buckets.map((b) => b.value) ?? [0]));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-600" />AR aging</CardTitle>
        <CardDescription>Outstanding receivables · Total: ₹{(data?.total ?? 0).toLocaleString()}</CardDescription>
      </CardHeader>
      <CardContent>
        {!data?.buckets.some((b) => b.value > 0) ? (
          <p className="text-sm text-muted-foreground">No outstanding invoices</p>
        ) : (
          <div className="space-y-2">
            {data.buckets.map((b) => (
              <div key={b.bucket} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium capitalize">{b.bucket === "current" ? "Current" : `${b.bucket} days`}</span>
                  <span className="text-muted-foreground">₹{b.value.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-muted rounded overflow-hidden">
                  <div
                    className={`h-full ${bucketColor[b.bucket]} transition-all`}
                    style={{ width: `${(b.value / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SalesLeaderboardCard() {
  const { data } = useQuery<Leader[]>({
    queryKey: ["analytics", "sales-leaderboard"],
    queryFn: () => api<Leader[]>("/v1/analytics/sales-leaderboard"),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" />Sales leaderboard</CardTitle>
        <CardDescription>By opportunity pipeline + closed-won</CardDescription>
      </CardHeader>
      <CardContent>
        {!data?.length ? (
          <p className="text-sm text-muted-foreground">No assigned opportunities yet</p>
        ) : (
          <div className="space-y-3">
            {data.map((u, i) => {
              const initials = u.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
              return (
                <div key={u.ownerId} className="flex items-center gap-3">
                  <div className="w-6 text-center text-sm font-semibold text-muted-foreground">#{i + 1}</div>
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{initials}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.role} · {u.openCount} open · {u.wonCount} won</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-emerald-600">₹{u.won.toLocaleString()}</div>
                    {u.pipeline > 0 && <div className="text-xs text-muted-foreground">+₹{u.pipeline.toLocaleString()} pipe</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardWidgets() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <TopProductsCard />
      <SalesLeaderboardCard />
      <ArAgingCard />
    </div>
  );
}
