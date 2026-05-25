import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetDashboardStats, useGetTopClients, useGetRevenueTrend, useGetSalesPipeline } from "@workspace/api-client-react";
import { Users, ShoppingCart, Settings, FileText, Package, Briefcase } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DashboardWidgets } from "@/components/dashboard-widgets";

export function Dashboard() {
  const [months, setMonths] = useState(6);
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: topClients, isLoading: clientsLoading } = useGetTopClients();
  const { data: revenueTrend, isLoading: revenueLoading } = useGetRevenueTrend({ months });
  const { data: pipeline, isLoading: pipelineLoading } = useGetSalesPipeline();

  if (statsLoading || clientsLoading || revenueLoading || pipelineLoading) {
    return <div className="animate-pulse flex space-x-4">Loading dashboard...</div>;
  }

  const statCards = [
    { title: "Total Clients", value: stats?.totalClients || 0, icon: Users, tile: "stat-card-blue", iconBg: "bg-blue-500/10 text-blue-600", hint: "Active accounts" },
    { title: "Active Orders", value: stats?.activeOrders || 0, icon: ShoppingCart, tile: "stat-card-green", iconBg: "bg-emerald-500/10 text-emerald-600", hint: "In progress" },
    { title: "Pending Assembly", value: stats?.pendingAssembly || 0, icon: Settings, tile: "stat-card-amber", iconBg: "bg-amber-500/10 text-amber-600", hint: "Awaiting build" },
    { title: "Overdue Invoices", value: stats?.overdueInvoices || 0, icon: FileText, tile: "stat-card-red", iconBg: "bg-red-500/10 text-red-600", hint: "Need follow-up" },
    { title: "Low Stock Items", value: stats?.lowStockItems || 0, icon: Package, tile: "stat-card-orange", iconBg: "bg-orange-500/10 text-orange-600", hint: "Reorder soon" },
    { title: "Pending POs", value: stats?.pendingPOs || 0, icon: Briefcase, tile: "stat-card-purple", iconBg: "bg-violet-500/10 text-violet-600", hint: "Open with vendors" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Live overview of your gifting operations · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <Select value={String(months)} onValueChange={(v) => setMonths(Number(v))}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
            <SelectItem value="24">Last 24 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((stat, i) => (
          <Card key={i} className={`elev-1 border ${stat.tile} transition-all hover:elev-2 hover:-translate-y-0.5`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.iconBg}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 text-3xl font-bold tracking-tight">{stat.value}</div>
              <div className="text-xs font-medium text-muted-foreground mt-1">{stat.title}</div>
              <div className="text-[11px] text-muted-foreground/70 mt-0.5">{stat.hint}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value.toLocaleString()}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle>Sales Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipeline} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="status" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                />
                <Bar dataKey="value" fill="#059669" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <DashboardWidgets />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle>Top Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topClients?.map((client) => (
                <div key={client.clientId} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{client.clientName}</p>
                    <p className="text-sm text-muted-foreground">{client.totalOrders} Orders</p>
                  </div>
                  <div className="font-medium">₹{client.totalRevenue.toLocaleString()}</div>
                </div>
              ))}
              {!topClients?.length && <p className="text-sm text-muted-foreground">No client data available.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
