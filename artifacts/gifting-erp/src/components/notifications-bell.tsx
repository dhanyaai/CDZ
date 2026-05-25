import { useQuery } from "@tanstack/react-query";
import { Bell, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

type Item = {
  type: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  href: string;
  id: number;
};

type Payload = {
  counts: { total: number; high: number; medium: number; low: number };
  items: Item[];
};

const sevIcon = {
  high: <AlertTriangle className="w-4 h-4 text-red-600" />,
  medium: <AlertCircle className="w-4 h-4 text-amber-600" />,
  low: <Info className="w-4 h-4 text-blue-600" />,
};

export function NotificationsBell() {
  const { data } = useQuery<Payload>({
    queryKey: ["notifications"],
    queryFn: () => api<Payload>("/v1/notifications"),
    refetchInterval: 60_000,
  });

  const total = data?.counts.total ?? 0;
  const high = data?.counts.high ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="w-5 h-5" />
          {total > 0 && (
            <span
              className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center ${
                high > 0 ? "bg-red-600" : "bg-amber-600"
              }`}
            >
              {total > 99 ? "99+" : total}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Notifications</h3>
            <p className="text-xs text-muted-foreground">
              {total === 0 ? "All caught up" : `${total} item${total === 1 ? "" : "s"} need attention`}
            </p>
          </div>
          {total > 0 && (
            <div className="flex gap-1">
              {high > 0 && <Badge variant="destructive" className="text-xs">{high} high</Badge>}
            </div>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto divide-y">
          {(data?.items ?? []).length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No active alerts
            </div>
          ) : (
            data?.items.map((item, i) => (
              <Link
                key={`${item.type}-${item.id}-${i}`}
                href={item.href}
                className="flex items-start gap-3 px-4 py-3 hover:bg-accent transition-colors"
              >
                <div className="mt-0.5">{sevIcon[item.severity]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
