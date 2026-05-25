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
  const max = Math.max(1, ...(data?.map((p) => p.revenue) ?? [0]));
  return (
    <Card className="elev-1 hover:elev-2 transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Package className="w-4 h-4 text-emerald-600" /></span>
          Top products
        </CardTitle>
        <CardDescription>By revenue, all confirmed sales orders</CardDescription>
      </CardHeader>
      <CardContent>
        {!data?.length ? (
          <p className="text-sm text-muted-foreground">No sales data yet</p>
        ) : (
          <div className="space-y-2.5">
            {data.slice(0, 6).map((p, i) => (
              <div key={p.productId} className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                    i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-amber-700/80 text-white" : "bg-muted text-muted-foreground"
                  }`}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.productName}</p>
                  </div>
                  <div className="text-sm font-semibold text-emerald-600 whitespace-nowrap">₹{p.revenue.toLocaleString()}</div>
                </div>
                <div className="h-1 ml-7 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" style={{ width: `${(p.revenue / max) * 100}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground ml-7">{p.qty.toLocaleString()} units sold</p>
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
    <Card className="elev-1 hover:elev-2 transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-amber-600" /></span>
          AR aging
        </CardTitle>
        <CardDescription>Outstanding · <span className="font-semibold text-foreground">₹{(data?.total ?? 0).toLocaleString()}</span></CardDescription>
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
    <Card className="elev-1 hover:elev-2 transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="w-8 h-8 rounded-lg bg-amber-400/15 flex items-center justify-center"><Trophy className="w-4 h-4 text-amber-500" /></span>
          Sales leaderboard
        </CardTitle>
        <CardDescription>By opportunity pipeline + closed-won</CardDescription>
      </CardHeader>
      <CardContent>
        {!data?.length ? (
          <p className="text-sm text-muted-foreground">No assigned opportunities yet</p>
        ) : (
          <div className="space-y-3">
            {data.map((u, i) => {
              const initials = u.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
              const medal = i === 0 ? "from-amber-300 to-amber-500" : i === 1 ? "from-slate-200 to-slate-400" : i === 2 ? "from-amber-600 to-amber-800" : "from-muted to-muted";
              return (
                <div key={u.ownerId} className="flex items-center gap-3 group">
                  <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${medal} text-white flex items-center justify-center text-xs font-bold shadow-sm`}>{i + 1}</div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 text-teal-700 flex items-center justify-center text-xs font-bold ring-2 ring-white shadow-sm">{initials}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{u.name}</p>
                    <p className="text-[11px] text-muted-foreground">{u.role} · {u.openCount} open · {u.wonCount} won</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-600">₹{u.won.toLocaleString()}</div>
                    {u.pipeline > 0 && <div className="text-[11px] text-muted-foreground">+₹{u.pipeline.toLocaleString()} pipe</div>}
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
