import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Building2, Plus, Search, TrendingDown, DollarSign, Package2, ChevronDown, ChevronUp, Wrench } from "lucide-react";

interface Location { id: number; name: string; code: string }
interface FixedAsset {
  id: number; assetCode: string; name: string; category: string;
  description: string | null; serialNumber: string | null;
  purchaseDate: string; purchaseCost: number; usefulLifeYears: number;
  depreciationMethod: string; residualValue: number; currentBookValue: number;
  locationId: number | null; locationName: string | null;
  status: string; notes: string | null;
  totalDepreciation: number;
}
interface Summary {
  totalAssets: number; activeAssets: number;
  totalCost: number; totalBookValue: number; totalDepreciation: number;
  byCategory: { category: string; count: number; totalCost: number; totalBV: number }[];
}

const CATEGORIES = ["Land & Building", "Plant & Machinery", "Furniture & Fixtures", "Vehicles", "Computer Equipment", "Office Equipment", "Other"];
const STATUSES = ["Active", "Under Maintenance", "Disposed", "Retired"];
const DEPR_METHODS = [
  { value: "straight_line", label: "Straight Line" },
  { value: "reducing_balance", label: "Reducing Balance" },
];

const STATUS_COLOR: Record<string, string> = {
  Active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Under Maintenance": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Disposed: "bg-red-500/10 text-red-500 border-red-500/20",
  Retired: "bg-muted text-muted-foreground",
};

const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export function FixedAssets() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [deprOpen, setDeprOpen] = useState<FixedAsset | null>(null);
  const [deprAmount, setDeprAmount] = useState("");
  const [form, setForm] = useState({
    name: "", category: "Plant & Machinery", description: "", serialNumber: "",
    purchaseDate: "", purchaseCost: "", usefulLifeYears: "5",
    depreciationMethod: "straight_line", residualValue: "0",
    locationId: "none", notes: "",
  });

  const { data: assets = [], isLoading } = useQuery<FixedAsset[]>({
    queryKey: ["fixed-assets"],
    queryFn: () => api<FixedAsset[]>("/v1/fixed-assets"),
  });
  const { data: summary } = useQuery<Summary>({
    queryKey: ["fixed-assets-summary"],
    queryFn: () => api<Summary>("/v1/fixed-assets/summary"),
  });
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: () => api<Location[]>("/v1/locations"),
  });

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const createMutation = useMutation({
    mutationFn: () => api("/v1/fixed-assets", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        purchaseCost: Number(form.purchaseCost),
        usefulLifeYears: Number(form.usefulLifeYears),
        residualValue: Number(form.residualValue),
        locationId: form.locationId !== "none" ? Number(form.locationId) : undefined,
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fixed-assets"] });
      qc.invalidateQueries({ queryKey: ["fixed-assets-summary"] });
      setCreateOpen(false);
      toast({ title: "Asset registered" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deprMutation = useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: number }) =>
      api(`/v1/fixed-assets/${id}/depreciate`, { method: "POST", body: JSON.stringify({ amount }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fixed-assets"] });
      qc.invalidateQueries({ queryKey: ["fixed-assets-summary"] });
      setDeprOpen(null); setDeprAmount("");
      toast({ title: "Depreciation recorded" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/v1/fixed-assets/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fixed-assets"] });
      toast({ title: "Status updated" });
    },
  });

  const categories = ["All", ...CATEGORIES.filter((c) => assets.some((a) => a.category === c))];
  const filtered = assets.filter((a) => {
    if (tab !== "All" && a.category !== tab) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.assetCode.toLowerCase().includes(q) ||
      (a.serialNumber ?? "").toLowerCase().includes(q) || (a.locationName ?? "").toLowerCase().includes(q);
  });

  const canCreate = form.name && form.category && form.purchaseDate && form.purchaseCost;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fixed Assets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Asset register with depreciation tracking</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />Register Asset
        </Button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Assets", value: summary.totalAssets, sub: `${summary.activeAssets} active`, icon: Package2, color: "text-primary bg-primary/10" },
            { label: "Gross Block", value: fmt(summary.totalCost), sub: "original cost", icon: DollarSign, color: "text-blue-600 bg-blue-500/10" },
            { label: "Net Block", value: fmt(summary.totalBookValue), sub: "current book value", icon: Building2, color: "text-emerald-600 bg-emerald-500/10" },
            { label: "Total Depreciation", value: fmt(summary.totalDepreciation), sub: "accumulated", icon: TrendingDown, color: "text-amber-600 bg-amber-500/10" },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <Card key={label} className="elev-1">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-bold leading-none">{value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{label}</div>
                  <div className="text-xs text-muted-foreground">{sub}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Category tabs + search */}
      <div className="flex items-center gap-4 flex-wrap">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            {categories.map((c) => (
              <TabsTrigger key={c} value={c}>{c}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search assets…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-6" />
              <TableHead>Asset Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Purchase Cost</TableHead>
              <TableHead className="text-right">Book Value</TableHead>
              <TableHead className="text-right">Depreciated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={10}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-14">
                  <Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="font-medium text-muted-foreground">No assets found</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((asset) => {
                const deprPct = asset.purchaseCost > 0
                  ? Math.min(100, (asset.totalDepreciation / (asset.purchaseCost - asset.residualValue)) * 100)
                  : 0;
                return (
                  <>
                    <TableRow key={asset.id} className="cursor-pointer hover:bg-muted/20"
                      onClick={() => setExpanded((p) => p === asset.id ? null : asset.id)}>
                      <TableCell className="w-6">
                        {expanded === asset.id
                          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium">{asset.assetCode}</TableCell>
                      <TableCell>
                        <div className="font-medium">{asset.name}</div>
                        {asset.serialNumber && <div className="text-xs text-muted-foreground">S/N: {asset.serialNumber}</div>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{asset.category}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{asset.locationName ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${STATUS_COLOR[asset.status] ?? ""}`}>{asset.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{fmt(asset.purchaseCost)}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium">{fmt(asset.currentBookValue)}</TableCell>
                      <TableCell className="text-right text-sm">
                        <div className="text-amber-600 tabular-nums">{fmt(asset.totalDepreciation)}</div>
                        <Progress value={deprPct} className="h-1 mt-1 w-20 ml-auto" />
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                            onClick={() => { setDeprOpen(asset); setDeprAmount(""); }}>
                            <TrendingDown className="w-3 h-3 mr-1" />Depreciate
                          </Button>
                          {asset.status === "Active" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                              onClick={() => statusMutation.mutate({ id: asset.id, status: "Under Maintenance" })}>
                              <Wrench className="w-3 h-3 mr-1" />Maintenance
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {expanded === asset.id && (
                      <TableRow key={`${asset.id}-detail`} className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={10} className="pl-10 py-3">
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div><span className="text-muted-foreground">Purchase Date: </span>{format(new Date(asset.purchaseDate), "d MMM yyyy")}</div>
                            <div><span className="text-muted-foreground">Useful Life: </span>{asset.usefulLifeYears} years</div>
                            <div><span className="text-muted-foreground">Method: </span>{asset.depreciationMethod === "straight_line" ? "Straight Line" : "Reducing Balance"}</div>
                            <div><span className="text-muted-foreground">Residual Value: </span>{fmt(asset.residualValue)}</div>
                            {asset.description && <div className="col-span-4 text-muted-foreground">{asset.description}</div>}
                            {asset.notes && <div className="col-span-4 text-muted-foreground">{asset.notes}</div>}
                            <div className="flex gap-2 col-span-4">
                              {STATUSES.filter((s) => s !== asset.status).map((s) => (
                                <Button key={s} size="sm" variant="outline" className="h-7 text-xs px-2"
                                  onClick={() => statusMutation.mutate({ id: asset.id, status: s })}>
                                  Mark {s}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />Register Fixed Asset
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Asset Name *</label>
                <Input placeholder="e.g. HP LaserJet Pro Printer" value={form.name} onChange={setF("name")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Category *</label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Location</label>
                <Select value={form.locationId} onValueChange={(v) => setForm((f) => ({ ...f, locationId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {locations.map((l) => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Serial Number</label>
                <Input placeholder="Optional" value={form.serialNumber} onChange={setF("serialNumber")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Purchase Date *</label>
                <Input type="date" value={form.purchaseDate} onChange={setF("purchaseDate")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Purchase Cost (₹) *</label>
                <Input type="number" min="0" placeholder="0" value={form.purchaseCost} onChange={setF("purchaseCost")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Residual Value (₹)</label>
                <Input type="number" min="0" placeholder="0" value={form.residualValue} onChange={setF("residualValue")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Useful Life (years)</label>
                <Input type="number" min="1" value={form.usefulLifeYears} onChange={setF("usefulLifeYears")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Depreciation Method</label>
                <Select value={form.depreciationMethod} onValueChange={(v) => setForm((f) => ({ ...f, depreciationMethod: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEPR_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <Textarea placeholder="Optional description" value={form.description}
                  onChange={setF("description")} rows={2} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Notes</label>
                <Textarea placeholder="Internal notes, warranty info, vendor details…" value={form.notes}
                  onChange={setF("notes")} rows={2} />
              </div>
            </div>
            <Button className="w-full" onClick={() => createMutation.mutate()}
              disabled={!canCreate || createMutation.isPending}>
              <Building2 className="w-4 h-4 mr-2" />Register Asset
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Depreciation Dialog */}
      <Dialog open={!!deprOpen} onOpenChange={(o) => { if (!o) { setDeprOpen(null); setDeprAmount(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />Record Depreciation
            </DialogTitle>
          </DialogHeader>
          {deprOpen && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 border p-3 text-sm space-y-1">
                <div className="font-medium">{deprOpen.name} <span className="text-muted-foreground text-xs">({deprOpen.assetCode})</span></div>
                <div className="text-muted-foreground">Current Book Value: <span className="font-semibold text-foreground">{fmt(deprOpen.currentBookValue)}</span></div>
                <div className="text-muted-foreground">Residual Value: {fmt(deprOpen.residualValue)}</div>
                <div className="text-muted-foreground text-xs mt-1">
                  Straight-line annual: {fmt((deprOpen.purchaseCost - deprOpen.residualValue) / deprOpen.usefulLifeYears)}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Depreciation Amount (₹) *</label>
                <Input type="number" min="1" placeholder="Enter amount"
                  value={deprAmount} onChange={(e) => setDeprAmount(e.target.value)} />
              </div>
              <Button className="w-full"
                onClick={() => deprMutation.mutate({ id: deprOpen.id, amount: Number(deprAmount) })}
                disabled={!deprAmount || Number(deprAmount) <= 0 || deprMutation.isPending}>
                Record Depreciation
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
