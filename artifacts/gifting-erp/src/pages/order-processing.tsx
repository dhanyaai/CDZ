import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Printer, Plus, Trash2, CheckSquare, Package, Truck, Palette, Wrench, FileText } from "lucide-react";
import { format } from "date-fns";

interface ChecklistItem {
  productName: string;
  inhouseQty: string;
  procureQty: string;
  totalReceiveNote: string;
}

interface OrderFormData {
  confirmedOrderDate: string;
  orderBy: string;
  firmName: string;
  pocName: string;
  pocContact: string;
  logoFilesReceived: boolean;
  cdTape: boolean;
  cdSticker: boolean;
  thankYouCard: boolean;
  branding: boolean;
  brandingPositionSize: string;
  productionType: string;
  invoiceMethod: string;
  totalAmount: string;
  advanceReceived: string;
  balanceAmount: string;
  moreInfo: string;
  procurementDate: string;
  procurementTime: string;
  materialReceived: boolean;
  materialReceivedDate: string;
  materialReceivedTime: string;
  procurementSignedBy: string;
  procurementRemarks: string;
  designStartDate: string;
  designStartTime: string;
  designerAttachments: string;
  mockupApprovalEndDate: string;
  mockupApprovalEndTime: string;
  mockupApprovalSignedBy: string;
  preProductionApprovalEndDate: string;
  preProductionApprovalEndTime: string;
  preProductionApprovalSignedBy: string;
  designerRemarks: string;
  productionInitiateDate: string;
  productionInitiateTime: string;
  qc1EndDate: string;
  qc1EndTime: string;
  qc1SignedBy: string;
  qc2EndDate: string;
  qc2EndTime: string;
  qc2SignedBy: string;
  productionRemarks: string;
  stockUpdateDate: string;
  stockUpdateTime: string;
  stockUpdateSignedBy: string;
  dispatchPaymentStatus: string;
  dispatchDate: string;
  dispatchTime: string;
  dispatchSignedBy: string;
  dispatchIncharge: string;
  dispatchInchargeDate: string;
  dispatchInchargeTime: string;
  dispatchInchargeSignedBy: string;
  checklistItems: ChecklistItem[];
}

interface ProcessingFormResponse {
  id: number;
  salesOrderId: number;
  orderNumber: string | null;
  clientName: string | null;
  deliveryDate: string | null;
  totalAmount: string | null;
  formData: Partial<OrderFormData>;
  createdAt: string;
  updatedAt: string;
}

const EMPTY: OrderFormData = {
  confirmedOrderDate: "", orderBy: "", firmName: "", pocName: "", pocContact: "",
  logoFilesReceived: false, cdTape: false, cdSticker: false, thankYouCard: false,
  branding: false, brandingPositionSize: "", productionType: "", invoiceMethod: "",
  totalAmount: "", advanceReceived: "", balanceAmount: "", moreInfo: "",
  procurementDate: "", procurementTime: "", materialReceived: false,
  materialReceivedDate: "", materialReceivedTime: "", procurementSignedBy: "", procurementRemarks: "",
  designStartDate: "", designStartTime: "", designerAttachments: "",
  mockupApprovalEndDate: "", mockupApprovalEndTime: "", mockupApprovalSignedBy: "",
  preProductionApprovalEndDate: "", preProductionApprovalEndTime: "", preProductionApprovalSignedBy: "",
  designerRemarks: "",
  productionInitiateDate: "", productionInitiateTime: "",
  qc1EndDate: "", qc1EndTime: "", qc1SignedBy: "",
  qc2EndDate: "", qc2EndTime: "", qc2SignedBy: "",
  productionRemarks: "", stockUpdateDate: "", stockUpdateTime: "", stockUpdateSignedBy: "",
  dispatchPaymentStatus: "", dispatchDate: "", dispatchTime: "", dispatchSignedBy: "",
  dispatchIncharge: "", dispatchInchargeDate: "", dispatchInchargeTime: "", dispatchInchargeSignedBy: "",
  checklistItems: [{ productName: "", inhouseQty: "", procureQty: "", totalReceiveNote: "" }],
};

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  );
}

function SignatureRow({ dateLabel, timeLabel, signLabel, dateVal, timeVal, signVal, onChange }: {
  dateLabel?: string; timeLabel?: string; signLabel?: string;
  dateVal: string; timeVal: string; signVal: string;
  onChange: (key: string, val: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Field label={dateLabel ?? "Date"}>
        <Input type="date" value={dateVal} onChange={(e) => onChange("date", e.target.value)} />
      </Field>
      <Field label={timeLabel ?? "Time"}>
        <Input type="time" value={timeVal} onChange={(e) => onChange("time", e.target.value)} />
      </Field>
      <Field label={signLabel ?? "Sign & Stamp"}>
        <Input value={signVal} placeholder="Name / initials" onChange={(e) => onChange("sign", e.target.value)} />
      </Field>
    </div>
  );
}

function printOrderProcessingForm(data: OrderFormData, meta: { orderNumber: string; clientName: string; deliveryDate?: string }) {
  const fmt = (v: string | undefined) => v || "—";
  const yesNo = (v: boolean | undefined) => v ? "Yes ☑" : "No ☑";

  const checklist = (data.checklistItems ?? []).map((item, i) => `
    <tr>
      <td>${i + 1}. ${item.productName || ""}</td>
      <td>${item.inhouseQty || ""}</td>
      <td>${item.procureQty || ""}</td>
      <td>${item.totalReceiveNote || ""}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Order Processing Form — ${meta.orderNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .brand { font-size: 20px; font-weight: 800; color: #4338ca; }
    .brand-sub { font-size: 10px; color: #888; }
    h1 { text-align: center; font-size: 16px; font-weight: 700; border: 2px solid #4338ca; padding: 6px; margin-bottom: 12px; background: #ede9fe; color: #4338ca; letter-spacing: 1px; text-transform: uppercase; }
    table.info { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    table.info td { border: 1px solid #d1d5db; padding: 6px 8px; vertical-align: top; }
    table.info .lbl { font-weight: 700; white-space: nowrap; background: #f9fafb; width: 160px; }
    .section { margin-bottom: 16px; }
    .section-title { font-size: 13px; font-weight: 800; color: #4338ca; border-bottom: 2px solid #4338ca; padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .row { display: flex; gap: 20px; margin-bottom: 8px; }
    .row .item { flex: 1; }
    .row .item .lbl { font-weight: 700; font-size: 11px; color: #555; margin-bottom: 2px; }
    .row .item .val { border-bottom: 1px solid #d1d5db; padding-bottom: 2px; min-height: 20px; }
    table.checklist { width: 100%; border-collapse: collapse; margin-top: 8px; }
    table.checklist th { background: #ede9fe; color: #4338ca; text-align: left; padding: 6px 8px; font-size: 11px; border: 1px solid #d1d5db; }
    table.checklist td { border: 1px solid #d1d5db; padding: 6px 8px; min-height: 24px; }
    @media print { body { padding: 0; } @page { margin: 15mm; size: A4; } }
  </style></head><body>
  <div class="header">
    <div>
      <div class="brand">customize duniya</div>
      <div class="brand-sub">Corporate Gifting ERP</div>
    </div>
    <div style="text-align:right; font-size:11px;">
      <div><strong>Order No:</strong> ${meta.orderNumber}</div>
      <div><strong>Confirmed Order Date:</strong> ${fmt(data.confirmedOrderDate)}</div>
    </div>
  </div>

  <h1>Order Processing Form</h1>

  <table class="info">
    <tr><td class="lbl">Order By (Sales Person)</td><td>${fmt(data.orderBy)}</td><td class="lbl">Delivery Date</td><td>${fmt(meta.deliveryDate)}</td></tr>
    <tr><td class="lbl">Firm / Company Name</td><td colspan="3">${fmt(data.firmName || meta.clientName)}</td></tr>
    <tr><td class="lbl">Name (POC)</td><td>${fmt(data.pocName)}</td><td class="lbl">Contact No.</td><td>${fmt(data.pocContact)}</td></tr>
    <tr>
      <td class="lbl">Logo Files Received</td><td>${yesNo(data.logoFilesReceived)}</td>
      <td class="lbl">CD Tape</td><td>${yesNo(data.cdTape)}</td>
    </tr>
    <tr>
      <td class="lbl">CD Sticker</td><td>${yesNo(data.cdSticker)}</td>
      <td class="lbl">Thank You Card</td><td>${yesNo(data.thankYouCard)}</td>
    </tr>
    <tr>
      <td class="lbl">Branding</td><td>${yesNo(data.branding)}</td>
      <td class="lbl">Branding Position &amp; Size</td><td>${fmt(data.brandingPositionSize)}</td>
    </tr>
    <tr>
      <td class="lbl">Production</td><td>${data.productionType === "in_house" ? "In-House" : data.productionType === "out_source" ? "Out-Source" : "—"}</td>
      <td class="lbl">Invoice Method</td><td>${data.invoiceMethod === "invoice" ? "Invoice" : data.invoiceMethod === "cash" ? "Cash" : "—"}</td>
    </tr>
    <tr><td class="lbl">Total Amount</td><td>₹ ${fmt(data.totalAmount)}</td><td class="lbl">Advance Received</td><td>₹ ${fmt(data.advanceReceived)}</td></tr>
    <tr><td class="lbl">Balance Amount</td><td>₹ ${fmt(data.balanceAmount)}</td><td></td><td></td></tr>
    <tr><td class="lbl">More Information</td><td colspan="3">${fmt(data.moreInfo)}</td></tr>
  </table>

  <div class="section">
    <div class="section-title">Procurement</div>
    <div class="row">
      <div class="item"><div class="lbl">Procurement Date</div><div class="val">${fmt(data.procurementDate)}</div></div>
      <div class="item"><div class="lbl">Procurement Time</div><div class="val">${fmt(data.procurementTime)}</div></div>
      <div class="item"><div class="lbl">Material Received</div><div class="val">${yesNo(data.materialReceived)}</div></div>
    </div>
    <div class="row">
      <div class="item"><div class="lbl">Material Received Date</div><div class="val">${fmt(data.materialReceivedDate)}</div></div>
      <div class="item"><div class="lbl">Material Received Time</div><div class="val">${fmt(data.materialReceivedTime)}</div></div>
      <div class="item"><div class="lbl">Sign &amp; Stamp</div><div class="val">${fmt(data.procurementSignedBy)}</div></div>
    </div>
    <div class="row">
      <div class="item"><div class="lbl">Remarks</div><div class="val">${fmt(data.procurementRemarks)}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Designer</div>
    <div class="row">
      <div class="item"><div class="lbl">Design Start Date</div><div class="val">${fmt(data.designStartDate)}</div></div>
      <div class="item"><div class="lbl">Design Start Time</div><div class="val">${fmt(data.designStartTime)}</div></div>
      <div class="item"><div class="lbl">Attachments</div><div class="val">${fmt(data.designerAttachments)}</div></div>
    </div>
    <div class="row">
      <div class="item">
        <div class="lbl" style="font-weight:700;">Mock-up Approval</div>
        <div class="row" style="margin-top:4px;">
          <div class="item"><div class="lbl">End Date</div><div class="val">${fmt(data.mockupApprovalEndDate)}</div></div>
          <div class="item"><div class="lbl">End Time</div><div class="val">${fmt(data.mockupApprovalEndTime)}</div></div>
          <div class="item"><div class="lbl">Sign &amp; Stamp</div><div class="val">${fmt(data.mockupApprovalSignedBy)}</div></div>
        </div>
      </div>
      <div class="item">
        <div class="lbl" style="font-weight:700;">Pre-Production Approval</div>
        <div class="row" style="margin-top:4px;">
          <div class="item"><div class="lbl">End Date</div><div class="val">${fmt(data.preProductionApprovalEndDate)}</div></div>
          <div class="item"><div class="lbl">End Time</div><div class="val">${fmt(data.preProductionApprovalEndTime)}</div></div>
          <div class="item"><div class="lbl">Sign &amp; Stamp</div><div class="val">${fmt(data.preProductionApprovalSignedBy)}</div></div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="item"><div class="lbl">Remarks</div><div class="val">${fmt(data.designerRemarks)}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Production</div>
    <div class="row">
      <div class="item"><div class="lbl">Production Initiate Date</div><div class="val">${fmt(data.productionInitiateDate)}</div></div>
      <div class="item"><div class="lbl">Production Initiate Time</div><div class="val">${fmt(data.productionInitiateTime)}</div></div>
    </div>
    <div class="row">
      <div class="item">
        <div class="lbl" style="font-weight:700;">Quality Check 1</div>
        <div class="row" style="margin-top:4px;">
          <div class="item"><div class="lbl">End Date</div><div class="val">${fmt(data.qc1EndDate)}</div></div>
          <div class="item"><div class="lbl">End Time</div><div class="val">${fmt(data.qc1EndTime)}</div></div>
          <div class="item"><div class="lbl">Sign &amp; Stamp</div><div class="val">${fmt(data.qc1SignedBy)}</div></div>
        </div>
      </div>
      <div class="item">
        <div class="lbl" style="font-weight:700;">Quality Check 2</div>
        <div class="row" style="margin-top:4px;">
          <div class="item"><div class="lbl">End Date</div><div class="val">${fmt(data.qc2EndDate)}</div></div>
          <div class="item"><div class="lbl">End Time</div><div class="val">${fmt(data.qc2EndTime)}</div></div>
          <div class="item"><div class="lbl">Sign &amp; Stamp</div><div class="val">${fmt(data.qc2SignedBy)}</div></div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="item"><div class="lbl">Remarks</div><div class="val">${fmt(data.productionRemarks)}</div></div>
    </div>
    <div style="margin-top:8px;"><div class="lbl" style="font-weight:700;">Stock / Warehouse Update</div></div>
    <div class="row" style="margin-top:6px;">
      <div class="item"><div class="lbl">Date</div><div class="val">${fmt(data.stockUpdateDate)}</div></div>
      <div class="item"><div class="lbl">Time</div><div class="val">${fmt(data.stockUpdateTime)}</div></div>
      <div class="item"><div class="lbl">Sign &amp; Stamp</div><div class="val">${fmt(data.stockUpdateSignedBy)}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Dispatch</div>
    <div class="row">
      <div class="item"><div class="lbl">Payment Status</div><div class="val">${fmt(data.dispatchPaymentStatus)}</div></div>
      <div class="item"><div class="lbl">Date</div><div class="val">${fmt(data.dispatchDate)}</div></div>
      <div class="item"><div class="lbl">Time</div><div class="val">${fmt(data.dispatchTime)}</div></div>
      <div class="item"><div class="lbl">Sign &amp; Stamp</div><div class="val">${fmt(data.dispatchSignedBy)}</div></div>
    </div>
    <div style="margin-top:8px;"><div class="lbl" style="font-weight:700;">Dispatch Incharge</div></div>
    <div class="row" style="margin-top:6px;">
      <div class="item"><div class="lbl">Name</div><div class="val">${fmt(data.dispatchIncharge)}</div></div>
      <div class="item"><div class="lbl">Date</div><div class="val">${fmt(data.dispatchInchargeDate)}</div></div>
      <div class="item"><div class="lbl">Time</div><div class="val">${fmt(data.dispatchInchargeTime)}</div></div>
      <div class="item"><div class="lbl">Sign &amp; Stamp</div><div class="val">${fmt(data.dispatchInchargeSignedBy)}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Check List</div>
    <table class="checklist">
      <thead><tr><th>Product Name</th><th>Inhouse Availability QTY</th><th>Procure QTY</th><th>Total Receive or Not &amp; Date</th></tr></thead>
      <tbody>${checklist || "<tr><td colspan='4' style='text-align:center;color:#888;'>No items</td></tr>"}</tbody>
    </table>
  </div>

  <div style="margin-top:40px; padding-top:12px; border-top:1px solid #e5e7eb; font-size:10px; color:#9ca3af; display:flex; justify-content:space-between;">
    <span>Customize Duniya — Order Processing Form</span>
    <span>Printed: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</span>
  </div>
  </body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 300);
}

export function OrderProcessing({ salesOrderId }: { salesOrderId: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [formData, setFormData] = useState<OrderFormData>(EMPTY);
  const [formId, setFormId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("order-info");

  const { data: existingForm, isLoading } = useQuery<ProcessingFormResponse | null>({
    queryKey: ["order-processing", salesOrderId],
    queryFn: () => api<ProcessingFormResponse | null>(`/v1/order-processing?salesOrderId=${salesOrderId}`),
    enabled: !!salesOrderId,
  });

  useEffect(() => {
    if (existingForm) {
      setFormId(existingForm.id);
      setFormData({ ...EMPTY, ...(existingForm.formData as Partial<OrderFormData>) });
    }
  }, [existingForm]);

  const saveMutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      return api<ProcessingFormResponse>("/v1/order-processing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salesOrderId, formData: data }),
      });
    },
    onSuccess: (res) => {
      setFormId(res.id);
      qc.invalidateQueries({ queryKey: ["order-processing", salesOrderId] });
      qc.invalidateQueries({ queryKey: ["order-processing-list"] });
      toast({ title: "Form saved successfully" });
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const set = useCallback(<K extends keyof OrderFormData>(key: K, value: OrderFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setChecklist = (index: number, key: keyof ChecklistItem, value: string) => {
    setFormData((prev) => {
      const items = [...prev.checklistItems];
      items[index] = { ...items[index], [key]: value };
      return { ...prev, checklistItems: items };
    });
  };

  const addChecklistRow = () => {
    setFormData((prev) => ({
      ...prev,
      checklistItems: [...prev.checklistItems, { productName: "", inhouseQty: "", procureQty: "", totalReceiveNote: "" }],
    }));
  };

  const removeChecklistRow = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      checklistItems: prev.checklistItems.filter((_, i) => i !== index),
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  const meta = {
    orderNumber: existingForm?.orderNumber ?? `SO-${salesOrderId}`,
    clientName: existingForm?.clientName ?? "",
    deliveryDate: existingForm?.deliveryDate ? format(new Date(existingForm.deliveryDate), "dd MMM yyyy") : "",
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link href="/order-processing" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Order Processing
      </Link>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            Order Processing Form
            <Badge variant="outline" className="text-base font-mono">{meta.orderNumber}</Badge>
          </h1>
          {meta.clientName && <p className="text-muted-foreground mt-1">{meta.clientName}</p>}
          {meta.deliveryDate && (
            <p className="text-sm text-muted-foreground">Delivery: <span className="font-medium text-foreground">{meta.deliveryDate}</span></p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => printOrderProcessingForm(formData, meta)}
          >
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate(formData)}
            disabled={saveMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Saving…" : formId ? "Update" : "Save"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex h-auto flex-wrap gap-1 bg-muted/50 p-1">
          <TabsTrigger value="order-info" className="flex items-center gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" /> Order Info
          </TabsTrigger>
          <TabsTrigger value="procurement" className="flex items-center gap-1.5 text-xs">
            <Package className="w-3.5 h-3.5" /> Procurement
          </TabsTrigger>
          <TabsTrigger value="designer" className="flex items-center gap-1.5 text-xs">
            <Palette className="w-3.5 h-3.5" /> Designer
          </TabsTrigger>
          <TabsTrigger value="production" className="flex items-center gap-1.5 text-xs">
            <Wrench className="w-3.5 h-3.5" /> Production
          </TabsTrigger>
          <TabsTrigger value="dispatch" className="flex items-center gap-1.5 text-xs">
            <Truck className="w-3.5 h-3.5" /> Dispatch
          </TabsTrigger>
          <TabsTrigger value="checklist" className="flex items-center gap-1.5 text-xs">
            <CheckSquare className="w-3.5 h-3.5" /> Checklist
          </TabsTrigger>
        </TabsList>

        {/* ORDER INFO TAB */}
        <TabsContent value="order-info">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Order Information</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Confirmed Order Date">
                  <Input type="date" value={formData.confirmedOrderDate} onChange={(e) => set("confirmedOrderDate", e.target.value)} />
                </Field>
                <Field label="Order By (Sales Person)">
                  <Input value={formData.orderBy} placeholder="Sales person name" onChange={(e) => set("orderBy", e.target.value)} />
                </Field>
                <Field label="Firm / Company Name">
                  <Input value={formData.firmName} placeholder={meta.clientName || "Company name"} onChange={(e) => set("firmName", e.target.value)} />
                </Field>
                <Field label="Delivery Date">
                  <Input type="date" value={existingForm?.deliveryDate ? existingForm.deliveryDate.slice(0, 10) : ""} disabled className="opacity-60" />
                </Field>
                <Field label="POC Name">
                  <Input value={formData.pocName} placeholder="Point of contact" onChange={(e) => set("pocName", e.target.value)} />
                </Field>
                <Field label="Contact No.">
                  <Input value={formData.pocContact} placeholder="Phone number" onChange={(e) => set("pocContact", e.target.value)} />
                </Field>
              </div>

              <Separator />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {([ ["logoFilesReceived", "Logo Files Received (PDF/CDR/SVG/PNG)"], ["cdTape", "CD Tape"], ["cdSticker", "CD Sticker"], ["thankYouCard", "Thank You Card"] ] as [keyof OrderFormData, string][]).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={key}
                      checked={formData[key] as boolean}
                      onCheckedChange={(v) => set(key, Boolean(v))}
                    />
                    <Label htmlFor={key} className="text-sm cursor-pointer">{label}</Label>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox id="branding" checked={formData.branding} onCheckedChange={(v) => set("branding", Boolean(v))} />
                    <Label htmlFor="branding" className="text-sm cursor-pointer font-medium">Branding Required</Label>
                  </div>
                  {formData.branding && (
                    <Field label="Branding Position & Size">
                      <Input value={formData.brandingPositionSize} placeholder="If yes, specify position & size" onChange={(e) => set("brandingPositionSize", e.target.value)} />
                    </Field>
                  )}
                </div>
                <div className="space-y-3">
                  <Field label="Production Type">
                    <div className="flex gap-4 mt-1">
                      {(["in_house", "out_source"] as const).map((v) => (
                        <div key={v} className="flex items-center gap-2">
                          <Checkbox id={`prod-${v}`} checked={formData.productionType === v} onCheckedChange={(checked) => set("productionType", checked ? v : "")} />
                          <Label htmlFor={`prod-${v}`} className="cursor-pointer">{v === "in_house" ? "In-House" : "Out-Source"}</Label>
                        </div>
                      ))}
                    </div>
                  </Field>
                  <Field label="Invoice Method">
                    <div className="flex gap-4 mt-1">
                      {(["invoice", "cash"] as const).map((v) => (
                        <div key={v} className="flex items-center gap-2">
                          <Checkbox id={`inv-${v}`} checked={formData.invoiceMethod === v} onCheckedChange={(checked) => set("invoiceMethod", checked ? v : "")} />
                          <Label htmlFor={`inv-${v}`} className="cursor-pointer capitalize">{v}</Label>
                        </div>
                      ))}
                    </div>
                  </Field>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Total Amount (₹)">
                  <Input value={formData.totalAmount} placeholder={existingForm?.totalAmount ?? "0.00"} onChange={(e) => set("totalAmount", e.target.value)} />
                </Field>
                <Field label="Advance Received (₹)">
                  <Input value={formData.advanceReceived} placeholder="0.00" onChange={(e) => set("advanceReceived", e.target.value)} />
                </Field>
                <Field label="Balance Amount (₹)">
                  <Input value={formData.balanceAmount} placeholder="0.00" onChange={(e) => set("balanceAmount", e.target.value)} />
                </Field>
              </div>

              <Field label="More Information (if any)">
                <Textarea rows={3} value={formData.moreInfo} placeholder="Additional notes…" onChange={(e) => set("moreInfo", e.target.value)} />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROCUREMENT TAB */}
        <TabsContent value="procurement">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Procurement</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Procurement Date">
                  <Input type="date" value={formData.procurementDate} onChange={(e) => set("procurementDate", e.target.value)} />
                </Field>
                <Field label="Procurement Time">
                  <Input type="time" value={formData.procurementTime} onChange={(e) => set("procurementTime", e.target.value)} />
                </Field>
              </div>

              <div className="flex items-center gap-2 py-2">
                <Checkbox id="materialReceived" checked={formData.materialReceived} onCheckedChange={(v) => set("materialReceived", Boolean(v))} />
                <Label htmlFor="materialReceived" className="text-sm font-medium cursor-pointer">Material Received (Inward / GRN)</Label>
              </div>

              {formData.materialReceived && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-lg p-4 bg-muted/30">
                  <Field label="Material Received Date">
                    <Input type="date" value={formData.materialReceivedDate} onChange={(e) => set("materialReceivedDate", e.target.value)} />
                  </Field>
                  <Field label="Material Received Time">
                    <Input type="time" value={formData.materialReceivedTime} onChange={(e) => set("materialReceivedTime", e.target.value)} />
                  </Field>
                </div>
              )}

              <Field label="Sign & Stamp">
                <Input value={formData.procurementSignedBy} placeholder="Name / initials" onChange={(e) => set("procurementSignedBy", e.target.value)} />
              </Field>

              <Field label="Remarks">
                <Textarea rows={3} value={formData.procurementRemarks} placeholder="Any remarks…" onChange={(e) => set("procurementRemarks", e.target.value)} />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DESIGNER TAB */}
        <TabsContent value="designer">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Designer</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Design Start Date">
                  <Input type="date" value={formData.designStartDate} onChange={(e) => set("designStartDate", e.target.value)} />
                </Field>
                <Field label="Design Start Time">
                  <Input type="time" value={formData.designStartTime} onChange={(e) => set("designStartTime", e.target.value)} />
                </Field>
                <Field label="Attachments / References">
                  <Input value={formData.designerAttachments} placeholder="File names or notes" onChange={(e) => set("designerAttachments", e.target.value)} />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Mock-up Approval</p>
                  <SignatureRow
                    dateVal={formData.mockupApprovalEndDate}
                    timeVal={formData.mockupApprovalEndTime}
                    signVal={formData.mockupApprovalSignedBy}
                    onChange={(key, val) => {
                      if (key === "date") set("mockupApprovalEndDate", val);
                      else if (key === "time") set("mockupApprovalEndTime", val);
                      else set("mockupApprovalSignedBy", val);
                    }}
                    dateLabel="End Date"
                    timeLabel="End Time"
                  />
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Pre-Production Approval</p>
                  <SignatureRow
                    dateVal={formData.preProductionApprovalEndDate}
                    timeVal={formData.preProductionApprovalEndTime}
                    signVal={formData.preProductionApprovalSignedBy}
                    onChange={(key, val) => {
                      if (key === "date") set("preProductionApprovalEndDate", val);
                      else if (key === "time") set("preProductionApprovalEndTime", val);
                      else set("preProductionApprovalSignedBy", val);
                    }}
                    dateLabel="End Date"
                    timeLabel="End Time"
                  />
                </div>
              </div>

              <Field label="Remarks">
                <Textarea rows={3} value={formData.designerRemarks} placeholder="Any remarks…" onChange={(e) => set("designerRemarks", e.target.value)} />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRODUCTION TAB */}
        <TabsContent value="production">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Production</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Production Initiate Date">
                  <Input type="date" value={formData.productionInitiateDate} onChange={(e) => set("productionInitiateDate", e.target.value)} />
                </Field>
                <Field label="Production Initiate Time">
                  <Input type="time" value={formData.productionInitiateTime} onChange={(e) => set("productionInitiateTime", e.target.value)} />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Quality Check – 1</p>
                  <SignatureRow
                    dateVal={formData.qc1EndDate}
                    timeVal={formData.qc1EndTime}
                    signVal={formData.qc1SignedBy}
                    onChange={(key, val) => {
                      if (key === "date") set("qc1EndDate", val);
                      else if (key === "time") set("qc1EndTime", val);
                      else set("qc1SignedBy", val);
                    }}
                    dateLabel="End Date"
                    timeLabel="End Time"
                  />
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Quality Check – 2</p>
                  <SignatureRow
                    dateVal={formData.qc2EndDate}
                    timeVal={formData.qc2EndTime}
                    signVal={formData.qc2SignedBy}
                    onChange={(key, val) => {
                      if (key === "date") set("qc2EndDate", val);
                      else if (key === "time") set("qc2EndTime", val);
                      else set("qc2SignedBy", val);
                    }}
                    dateLabel="End Date"
                    timeLabel="End Time"
                  />
                </div>
              </div>

              <Field label="Remarks">
                <Textarea rows={2} value={formData.productionRemarks} placeholder="Any remarks…" onChange={(e) => set("productionRemarks", e.target.value)} />
              </Field>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-semibold">Stock / Warehouse Update</p>
                <SignatureRow
                  dateVal={formData.stockUpdateDate}
                  timeVal={formData.stockUpdateTime}
                  signVal={formData.stockUpdateSignedBy}
                  onChange={(key, val) => {
                    if (key === "date") set("stockUpdateDate", val);
                    else if (key === "time") set("stockUpdateTime", val);
                    else set("stockUpdateSignedBy", val);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DISPATCH TAB */}
        <TabsContent value="dispatch">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dispatch</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-semibold">Dispatch Co-ordinator</p>
                <Field label="Payment Status">
                  <Input value={formData.dispatchPaymentStatus} placeholder="Paid / Partial / Pending" onChange={(e) => set("dispatchPaymentStatus", e.target.value)} />
                </Field>
                <SignatureRow
                  dateVal={formData.dispatchDate}
                  timeVal={formData.dispatchTime}
                  signVal={formData.dispatchSignedBy}
                  onChange={(key, val) => {
                    if (key === "date") set("dispatchDate", val);
                    else if (key === "time") set("dispatchTime", val);
                    else set("dispatchSignedBy", val);
                  }}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-semibold">Dispatch Incharge</p>
                <Field label="Dispatch Incharge Name">
                  <Input value={formData.dispatchIncharge} placeholder="Incharge name" onChange={(e) => set("dispatchIncharge", e.target.value)} />
                </Field>
                <SignatureRow
                  dateVal={formData.dispatchInchargeDate}
                  timeVal={formData.dispatchInchargeTime}
                  signVal={formData.dispatchInchargeSignedBy}
                  onChange={(key, val) => {
                    if (key === "date") set("dispatchInchargeDate", val);
                    else if (key === "time") set("dispatchInchargeTime", val);
                    else set("dispatchInchargeSignedBy", val);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CHECKLIST TAB */}
        <TabsContent value="checklist">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Check List</CardTitle>
                <Button size="sm" variant="outline" onClick={addChecklistRow}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground w-1/3">Product Name</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Inhouse Avail. QTY</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Procure QTY</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Total Receive or Not &amp; Date</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.checklistItems.map((item, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1.5 px-2">
                          <Input value={item.productName} placeholder="Product name" className="h-8 text-sm" onChange={(e) => setChecklist(i, "productName", e.target.value)} />
                        </td>
                        <td className="py-1.5 px-2">
                          <Input value={item.inhouseQty} placeholder="0" className="h-8 text-sm" onChange={(e) => setChecklist(i, "inhouseQty", e.target.value)} />
                        </td>
                        <td className="py-1.5 px-2">
                          <Input value={item.procureQty} placeholder="0" className="h-8 text-sm" onChange={(e) => setChecklist(i, "procureQty", e.target.value)} />
                        </td>
                        <td className="py-1.5 px-2">
                          <Input value={item.totalReceiveNote} placeholder="Received / pending date" className="h-8 text-sm" onChange={(e) => setChecklist(i, "totalReceiveNote", e.target.value)} />
                        </td>
                        <td className="py-1.5 px-2">
                          {formData.checklistItems.length > 1 && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeChecklistRow(i)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pb-8">
        <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending} size="lg">
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Saving…" : formId ? "Update Form" : "Save Form"}
        </Button>
      </div>
    </div>
  );
}
