import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Building2, Lock, User as UserIcon, Gauge } from "lucide-react";

const KPI_TARGET_FIELDS: { key: string; label: string; def: number }[] = [
  { key: "leadToOpportunity", label: "Lead → Opportunity", def: 1 },
  { key: "opportunityToQuote", label: "Opportunity → Quote", def: 2 },
  { key: "quoteToOrder", label: "Quote → Order", def: 3 },
  { key: "orderToInvoice", label: "Order → Invoice", def: 7 },
  { key: "invoiceToPayment", label: "Invoice → Payment", def: 30 },
  { key: "poToGrn", label: "PO → Goods Receipt", def: 7 },
];

const PROCESSING_TARGET_FIELDS: { key: string; label: string; def: number }[] = [
  { key: "procurement", label: "Procurement", def: 2 },
  { key: "designStart", label: "Design Start", def: 2 },
  { key: "mockupApproval", label: "Mockup Approval", def: 4 },
  { key: "preProduction", label: "Pre-Production Approval", def: 6 },
  { key: "productionStart", label: "Production Start", def: 7 },
  { key: "qc", label: "Quality Check", def: 10 },
  { key: "stockUpdate", label: "Stock Update", def: 12 },
  { key: "dispatch", label: "Dispatch", def: 14 },
];

type Settings = {
  id: number;
  companyName: string;
  legalName: string | null;
  gstNumber: string | null;
  stateCode: string | null;
  pan: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  website: string | null;
  logoUrl: string | null;
  bankDetails: string | null;
  invoicePrefix: string;
  soPrefix: string;
  poPrefix: string;
  grnPrefix: string;
  shipPrefix: string;
  quotePrefix: string;
  defaultGstPct: string;
  currency: string;
  fyStartMonth: number;
  kpiTargets: Record<string, number> | null;
  processingTargets: Record<string, number> | null;
};

export function Settings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const user = getStoredUser();

  const { data: settings } = useQuery<Settings>({
    queryKey: ["settings", "company"],
    queryFn: () => api<Settings>("/v1/settings/company"),
  });

  const [form, setForm] = useState<Partial<Settings>>({});
  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  const isAdmin = user?.role === "Admin";

  const saveCompany = useMutation({
    mutationFn: (data: Partial<Settings>) =>
      api("/v1/settings/company", { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "company"] });
      toast({ title: "Company settings saved" });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  // KPI target editing state — strings while typing, validated on save
  const [kpiForm, setKpiForm] = useState<Record<string, string>>({});
  const [procForm, setProcForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!settings) return;
    setKpiForm(Object.fromEntries(KPI_TARGET_FIELDS.map((f) => [f.key, String(settings.kpiTargets?.[f.key] ?? f.def)])));
    setProcForm(Object.fromEntries(PROCESSING_TARGET_FIELDS.map((f) => [f.key, String(settings.processingTargets?.[f.key] ?? f.def)])));
  }, [settings]);

  const saveKpiTargets = useMutation({
    mutationFn: (data: { kpiTargets: Record<string, number>; processingTargets: Record<string, number> }) =>
      api("/v1/settings/company", { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "company"] });
      qc.invalidateQueries({ queryKey: ["kpi-report"] });
      toast({ title: "KPI targets saved", description: "The KPI & KRA report now uses the new deadlines." });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const onSaveKpiTargets = () => {
    const parse = (form: Record<string, string>, fields: typeof KPI_TARGET_FIELDS) => {
      const out: Record<string, number> = {};
      for (const f of fields) {
        const n = Number(form[f.key]);
        if (!Number.isFinite(n) || n <= 0) return { error: `${f.label} must be a positive number of days` };
        out[f.key] = n;
      }
      return { value: out };
    };
    const k = parse(kpiForm, KPI_TARGET_FIELDS);
    const p = parse(procForm, PROCESSING_TARGET_FIELDS);
    if ("error" in k || "error" in p) {
      toast({ title: "Invalid value", description: ("error" in k ? k.error : (p as { error: string }).error), variant: "destructive" });
      return;
    }
    saveKpiTargets.mutate({ kpiTargets: k.value!, processingTargets: p.value! });
  };

  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const changePassword = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api("/v1/auth/change-password", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      setPwd({ current: "", next: "", confirm: "" });
      toast({ title: "Password changed", description: "Use the new password next time you sign in." });
    },
    onError: (e: Error) => toast({ title: "Change failed", description: e.message, variant: "destructive" }),
  });

  const onChangePwd = () => {
    if (pwd.next.length < 6) {
      toast({ title: "Password too short", description: "At least 6 characters", variant: "destructive" });
      return;
    }
    if (pwd.next !== pwd.confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    changePassword.mutate({ currentPassword: pwd.current, newPassword: pwd.next });
  };

  const field = (key: keyof Settings, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        type={type}
        value={(form[key] as string) ?? ""}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        disabled={!isAdmin}
      />
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your profile, security, and company configuration</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile"><UserIcon className="w-4 h-4 mr-2" />Profile</TabsTrigger>
          <TabsTrigger value="security"><Lock className="w-4 h-4 mr-2" />Security</TabsTrigger>
          <TabsTrigger value="company"><Building2 className="w-4 h-4 mr-2" />Company</TabsTrigger>
          <TabsTrigger value="kpi"><Gauge className="w-4 h-4 mr-2" />KPI Targets</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your profile</CardTitle>
              <CardDescription>Signed-in account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Name</Label><Input value={user?.name ?? ""} disabled /></div>
                <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
                <div><Label>Role</Label><Input value={user?.role ?? ""} disabled /></div>
                <div><Label>User ID</Label><Input value={String(user?.id ?? "")} disabled /></div>
              </div>
              <p className="text-xs text-muted-foreground">To edit name/email/role, go to User Management (Admin only).</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>You'll stay signed in. Use the new password next time.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <Label>Current password</Label>
                <Input type="password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>New password</Label>
                <Input type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm new password</Label>
                <Input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
              </div>
              <Button onClick={onChangePwd} disabled={changePassword.isPending || !pwd.current || !pwd.next}>
                {changePassword.isPending ? "Saving..." : "Update password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company profile</CardTitle>
              <CardDescription>Used on invoices, quotes, and customer-facing documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {field("companyName", "Display name")}
                {field("legalName", "Legal name")}
                {field("gstNumber", "GST number")}
                {field("pan", "PAN")}
                {field("email", "Email", "email")}
                {field("phone", "Phone")}
                {field("website", "Website")}
                {field("currency", "Currency")}
              </div>
              <div>
                {field("address", "Address")}
              </div>
              <div className="grid grid-cols-3 gap-4">
                {field("city", "City")}
                {field("state", "State")}
                {field("pincode", "Pincode")}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {field("gstNumber", "GSTIN")}
                {field("stateCode", "State Code (2-digit, e.g. 07 = Delhi)")}
              </div>
              <div>
                <Label htmlFor="bankDetails">Bank Details (for invoices)</Label>
                <textarea
                  id="bankDetails"
                  className="mt-1.5 w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none disabled:opacity-60"
                  value={(form.bankDetails as string) ?? ""}
                  onChange={(e) => setForm({ ...form, bankDetails: e.target.value })}
                  disabled={!isAdmin}
                  placeholder="Bank: HDFC Bank&#10;A/C: 50100XXXXXXXX&#10;IFSC: HDFC0001234"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {field("invoicePrefix", "Invoice # prefix")}
                {field("soPrefix", "SO # prefix")}
                {field("poPrefix", "PO # prefix")}
              </div>
              <div className="grid grid-cols-3 gap-4">
                {field("grnPrefix", "GRN # prefix")}
                {field("shipPrefix", "Shipment # prefix")}
                {field("quotePrefix", "Quote # prefix")}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {field("defaultGstPct", "Default GST %")}
                {field("fyStartMonth", "FY Start Month (4 = April)", "number")}
              </div>
              {!isAdmin && (
                <p className="text-xs text-amber-600">Read-only — only Admin users can edit company settings.</p>
              )}
              <Button onClick={() => saveCompany.mutate(form)} disabled={saveCompany.isPending || !isAdmin}>
                {saveCompany.isPending ? "Saving..." : "Save company settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpi" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales funnel deadlines</CardTitle>
              <CardDescription>Target days per stage — the KPI &amp; KRA report flags anything slower as overdue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {KPI_TARGET_FIELDS.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <Label htmlFor={`kpi-${f.key}`}>{f.label} (days)</Label>
                    <Input
                      id={`kpi-${f.key}`}
                      type="number"
                      min={0.5}
                      step="0.5"
                      value={kpiForm[f.key] ?? ""}
                      onChange={(e) => setKpiForm({ ...kpiForm, [f.key]: e.target.value })}
                      disabled={!isAdmin}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order processing step deadlines</CardTitle>
              <CardDescription>Target days from sales-order creation for each internal step</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {PROCESSING_TARGET_FIELDS.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <Label htmlFor={`proc-${f.key}`}>{f.label} (days)</Label>
                    <Input
                      id={`proc-${f.key}`}
                      type="number"
                      min={0.5}
                      step="0.5"
                      value={procForm[f.key] ?? ""}
                      onChange={(e) => setProcForm({ ...procForm, [f.key]: e.target.value })}
                      disabled={!isAdmin}
                    />
                  </div>
                ))}
              </div>
              {!isAdmin && (
                <p className="text-xs text-amber-600">Read-only — only Admin users can edit KPI targets.</p>
              )}
              <Button onClick={onSaveKpiTargets} disabled={saveKpiTargets.isPending || !isAdmin}>
                {saveKpiTargets.isPending ? "Saving..." : "Save KPI targets"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
