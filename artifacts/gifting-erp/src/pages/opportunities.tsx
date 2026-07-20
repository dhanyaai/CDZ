import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useListClients } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Calendar, Building2, IndianRupee, TrendingUp, Target, BarChart3, UserCircle, FlaskConical, Printer, Package, BookOpen, Search, LayoutList, Columns3, Link2, Check, FileText, ExternalLink, ArrowRight, Truck, PackageCheck, Navigation, XCircle, ClipboardList } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { useLocation } from "wouter";
import { printSampleOrder, printReturnNote, printCatalogue, printQuote, printDeliveryChallan, printSalesOrder } from "@/lib/print-utils";

type Opportunity = {
  id: number; title: string; clientId: number | null; clientName: string | null;
  leadId: number | null; stage: string; value: number | null; probability: number;
  expectedCloseDate: string | null; ownerId: number | null; ownerName: string | null;
  notes: string | null; createdAt: string;
};
type Lead = { id: number; title: string; companyName: string | null };
type User = { id: number; name: string; role: string };
type Product = { id: number; name: string; sku: string | null; brand: string | null; category: string; sellingPrice: string | number; imageUrl: string | null; brandable: boolean; stockLevel: number };
type SampleOrderItem = { id: number; productId: number; productName: string; quantity: number; returnedQty: number; disposition: "gift" | "invoice" | null; notes: string | null };
type SampleOrderSummary = { id: number; sampleNumber: string; status: string; notes: string | null; createdAt: string; items: SampleOrderItem[] };
type SampleOrderDetail = SampleOrderSummary & {
  clientName: string | null; customerName: string | null;
  customerPhone: string | null; customerEmail: string | null;
  items: { id: number; productId: number; productName: string; quantity: number; returnedQty: number; disposition: "gift" | "invoice" | null; notes: string | null }[];
};
type SampleLine = { productId: string; quantity: string };
type LineItem = { description: string; quantity: number; unitPrice: number; productId?: number; imageUrl?: string | null };
type OppQuote = { id: number; quoteNumber: string; subject: string | null; status: string; totalAmount: number; opportunityId: number | null; createdAt: string };
type OppSalesOrder = { id: number; orderNumber: string; clientName: string; quoteId: number | null; status: string; validTransitions: string[]; grandTotal: number; deliveryDate: string | null; poNumber: string | null; createdAt: string };
type OppShipment = { id: number; shipmentNumber: string; salesOrderId: number; orderNumber: string | null; courierPartner: string; status: string; validTransitions: string[]; trackingNumber: string | null; dispatchDate: string | null; estimatedDelivery: string | null; numberOfBoxes: number | null; totalWeight: number | null; freightCost: number; items: Array<{ id: number; deliveryName: string; address: string; awbNumber: string | null; status: string }>; createdAt: string };
const PAYMENT_TERMS = ["Immediate", "Net 7", "Net 15", "Net 30", "Net 45", "Net 60", "50% Advance", "100% Advance"];

const SAMPLE_STATUS_COLOR: Record<string, string> = {
  Requested: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Dispatched: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Received: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Converted: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Rejected: "bg-red-500/10 text-red-500 border-red-500/20",
};

const STAGES = [
  "enquiry", "sent_catalogue", "samples",
  "negotiation", "shortlisted", "quotation_sent",
  "final_negotiation", "received_po", "material_supplied",
  "received_payments", "lost",
];
const LABELS: Record<string, string> = {
  enquiry: "Enquiry",
  sent_catalogue: "Send Catalogue",
  samples: "Samples",
  negotiation: "Negotiation",
  shortlisted: "Shortlisted Products",
  quotation_sent: "Quotation Sent",
  final_negotiation: "Final Negotiation",
  received_po: "Received PO / Advance",
  material_supplied: "Material Supplied",
  received_payments: "Received Complete Payments",
  lost: "Lost",
};
const STAGE_HEADER: Record<string, string> = {
  enquiry: "border-t-slate-400",
  sent_catalogue: "border-t-blue-400",
  samples: "border-t-violet-400",
  negotiation: "border-t-orange-400",
  shortlisted: "border-t-amber-400",
  quotation_sent: "border-t-emerald-400",
  final_negotiation: "border-t-cyan-400",
  received_po: "border-t-indigo-400",
  material_supplied: "border-t-green-400",
  received_payments: "border-t-teal-400",
  lost: "border-t-red-400",
};
const PROB_COLOR = (p: number) => { if (p >= 75) return "bg-emerald-500"; if (p >= 50) return "bg-amber-500"; if (p >= 25) return "bg-blue-500"; return "bg-slate-500"; };
const STAGE_BADGE: Record<string, string> = {
  enquiry: "bg-slate-100 text-slate-700 border-slate-300",
  sent_catalogue: "bg-blue-100 text-blue-700 border-blue-300",
  samples: "bg-violet-100 text-violet-700 border-violet-300",
  negotiation: "bg-orange-100 text-orange-700 border-orange-300",
  shortlisted: "bg-amber-100 text-amber-700 border-amber-300",
  quotation_sent: "bg-emerald-100 text-emerald-700 border-emerald-300",
  final_negotiation: "bg-cyan-100 text-cyan-700 border-cyan-300",
  received_po: "bg-indigo-100 text-indigo-700 border-indigo-300",
  material_supplied: "bg-green-100 text-green-700 border-green-300",
  received_payments: "bg-teal-100 text-teal-700 border-teal-300",
  lost: "bg-red-100 text-red-700 border-red-300",
};
const MAIN_FLOW = STAGES.filter(s => s !== "lost");

const BLANK_FORM = { title: "", clientId: "", leadId: "", value: "", probability: "50", expectedCloseDate: "", ownerId: "", notes: "" };

export function Opportunities() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [dialog, setDialog] = useState(false);
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [sampleDialog, setSampleDialog] = useState(false);
  const [sampleLines, setSampleLines] = useState<SampleLine[]>([{ productId: "", quantity: "1" }]);
  const [sampleNotes, setSampleNotes] = useState("");
  const [sampleCustomer, setSampleCustomer] = useState("");
  const [returnDialog, setReturnDialog] = useState(false);
  const [returningOrder, setReturningOrder] = useState<SampleOrderDetail | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<number, number>>({});
  const [dispositions, setDispositions] = useState<Record<number, "gift" | "invoice" | null>>({});
  const [catalogueType, setCatalogueType] = useState("Corporate Gifts");
  const [catalogueCustomType, setCatalogueCustomType] = useState("");
  const [catalogueSearch, setCatalogueSearch] = useState("");
  const [catalogueSelected, setCatalogueSelected] = useState<Set<number>>(new Set());
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [printingQuoteId, setPrintingQuoteId] = useState<number | null>(null);
  const [advShowForm, setAdvShowForm] = useState(false);
  const [advForm, setAdvForm] = useState({ amount: "", paymentMode: "", referenceNo: "", receiptDate: new Date().toISOString().slice(0, 10), notes: "" });
  const [pmtShowForm, setPmtShowForm] = useState(false);
  const [pmtForm, setPmtForm] = useState({ amount: "", paymentMode: "", referenceNo: "", paymentDate: new Date().toISOString().slice(0, 10), notes: "" });
  const [convertingQuoteId, setConvertingQuoteId] = useState<number | null>(null);
  const [shipShowForm, setShipShowForm] = useState(false);
  const [shipForm, setShipForm] = useState({ courierPartner: "", trackingNumber: "", estimatedDelivery: "", numberOfBoxes: "", freightCost: "" });
  const [advancingShipId, setAdvancingShipId] = useState<number | null>(null);
  const [oppEditMode, setOppEditMode] = useState(false);
  const [oppEditForm, setOppEditForm] = useState({ title: "", clientId: "", value: "", probability: "50", expectedCloseDate: "", ownerId: "", notes: "" });
  const [qShowForm, setQShowForm] = useState(false);
  const [qSubject, setQSubject] = useState("");
  const [qDiscountPct, setQDiscountPct] = useState("0");
  const [qValidUntil, setQValidUntil] = useState("");
  const [qPaymentTerms, setQPaymentTerms] = useState("");
  const [qNotes, setQNotes] = useState("");
  const [qItems, setQItems] = useState<LineItem[]>([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [listSearch, setListSearch] = useState("");
  const [listStage, setListStage] = useState("all");
  const [sortField, setSortField] = useState<"title" | "value" | "probability" | "expectedCloseDate" | "createdAt">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: opps, isLoading } = useQuery({ queryKey: ["opportunities"], queryFn: () => api<Opportunity[]>("/v1/opportunities") });
  const { data: clients } = useListClients();
  const { data: leads } = useQuery({ queryKey: ["leads"], queryFn: () => api<Lead[]>("/v1/leads") });
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => api<User[]>("/v1/users") });
  const { data: sampleOrders } = useQuery({
    queryKey: ["opp-sample-orders", selected?.id],
    queryFn: () => api<SampleOrderSummary[]>(`/v1/sample-orders?opportunityId=${selected!.id}`),
    enabled: !!selected && selected.stage === "samples",
  });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => api<Product[]>("/v1/products"), enabled: sampleDialog || selected?.stage === "sent_catalogue" || selected?.stage === "quotation_sent" });
  const { data: oppQuotes } = useQuery<OppQuote[], Error, OppQuote[]>({
    queryKey: ["opp-quotes", selected?.id],
    queryFn: () => api<OppQuote[]>("/v1/quotes"),
    select: (all) => all.filter(q => q.opportunityId === selected?.id),
    enabled: !!selected && (selected.stage === "quotation_sent" || selected.stage === "received_po" || selected.stage === "material_supplied" || selected.stage === "received_payments"),
  });

  type OppInvoice = { id: number; invoiceNumber: string; salesOrderId: number | null; orderNumber: string | null; clientName: string; grandTotal: number; gstAmount: number; totalAmount: number; status: string; validTransitions: string[]; dueDate: string | null; paymentTerms: string | null; createdAt: string };
  type OppPayment = { id: number; invoiceId: number; amount: number; type: string; paymentMode: string | null; referenceNo: string | null; paymentDate: string; notes: string | null; createdAt: string };
  type AdvanceReceipt = { id: number; opportunityId: number; amount: number; paymentMode: string | null; referenceNo: string | null; receiptDate: string; notes: string | null; createdAt: string };
  const { data: advanceReceipts } = useQuery<AdvanceReceipt[]>({
    queryKey: ["advance-receipts", selected?.id],
    queryFn: () => api<AdvanceReceipt[]>(`/v1/advance-receipts?opportunityId=${selected!.id}`),
    enabled: !!selected && selected.stage === "received_po",
  });

  const acceptedQuoteForSO = oppQuotes?.find(q => q.status === "accepted") ?? oppQuotes?.[oppQuotes.length - 1];
  const { data: oppSalesOrders } = useQuery<OppSalesOrder[]>({
    queryKey: ["opp-sales-orders", selected?.id, acceptedQuoteForSO?.id],
    queryFn: () => api<OppSalesOrder[]>(`/v1/sales-orders?quoteId=${acceptedQuoteForSO!.id}`),
    enabled: !!selected && (selected.stage === "material_supplied" || selected.stage === "received_po" || selected.stage === "received_payments") && !!acceptedQuoteForSO,
  });
  const firstSO = oppSalesOrders?.[0];
  const { data: oppInvoices } = useQuery<OppInvoice[]>({
    queryKey: ["opp-invoice", firstSO?.id],
    queryFn: () => api<OppInvoice[]>(`/v1/invoices?salesOrderId=${firstSO!.id}`),
    enabled: !!firstSO && selected?.stage === "received_payments",
  });
  const oppInvoice = oppInvoices?.[0] ?? null;
  const { data: oppPayments, refetch: refetchPayments } = useQuery<OppPayment[]>({
    queryKey: ["opp-payments", oppInvoice?.id],
    queryFn: () => api<OppPayment[]>(`/v1/payments?invoiceId=${oppInvoice!.id}`),
    enabled: !!oppInvoice,
  });
  const { data: oppShipments, refetch: refetchShipments } = useQuery<OppShipment[]>({
    queryKey: ["opp-shipments", firstSO?.id],
    queryFn: () => api<OppShipment[]>(`/v1/shipments?salesOrderId=${firstSO!.id}`),
    enabled: !!firstSO,
  });

  const create = useMutation({
    mutationFn: () => api("/v1/opportunities", {
      method: "POST", body: JSON.stringify({
        title: form.title,
        clientId: form.clientId ? Number(form.clientId) : null,
        leadId: form.leadId ? Number(form.leadId) : null,
        value: form.value ? Number(form.value) : null,
        probability: Number(form.probability),
        expectedCloseDate: form.expectedCloseDate || null,
        ownerId: form.ownerId ? Number(form.ownerId) : null,
        notes: form.notes || null,
      }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["opportunities"] }); setDialog(false); setForm({ ...BLANK_FORM }); toast({ title: "Opportunity created" }); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Opportunity> }) =>
      api(`/v1/opportunities/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: (_result, { id, data }) => {
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      setSelected(prev => {
        if (!prev || prev.id !== id) return prev;
        const merged = { ...prev, ...data } as Opportunity;
        if (data.clientId !== undefined) {
          merged.clientName = data.clientId != null
            ? (clients?.find(c => c.id === (data.clientId as number))?.companyName ?? prev.clientName)
            : null;
        }
        if (data.ownerId !== undefined) {
          merged.ownerName = data.ownerId != null
            ? (users?.find(u => u.id === (data.ownerId as number))?.name ?? prev.ownerName)
            : null;
        }
        return merged;
      });
      setOppEditMode(false);
      toast({ title: "Updated" });
    },
    onError: (e: Error) => toast({ title: "Failed to update", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/v1/opportunities/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["opportunities"] }); setSelected(null); },
  });

  const resetSampleForm = () => { setSampleLines([{ productId: "", quantity: "1" }]); setSampleNotes(""); setSampleCustomer(""); };
  const resetQuoteForm = () => { setQSubject(""); setQDiscountPct("0"); setQValidUntil(""); setQPaymentTerms(""); setQNotes(""); setQItems([{ description: "", quantity: 1, unitPrice: 0 }]); setQShowForm(false); };

  const createQuote = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No opportunity selected");
      if (!selected.clientId) throw new Error("Opportunity has no linked client");
      const filledItems = qItems.filter(i => i.description.trim());
      if (filledItems.length === 0) throw new Error("Add at least one line item");
      return api("/v1/quotes", {
        method: "POST",
        body: JSON.stringify({
          clientId: selected.clientId,
          opportunityId: selected.id,
          subject: qSubject.trim() || selected.title,
          discountPct: Number(qDiscountPct),
          validUntil: qValidUntil || null,
          paymentTerms: qPaymentTerms || null,
          notes: qNotes.trim() || null,
          items: filledItems.map(i => ({
            productId: i.productId,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            imageUrl: i.imageUrl,
          })),
        }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opp-quotes", selected?.id] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
      resetQuoteForm();
      toast({ title: "Quote created" });
    },
    onError: (err: unknown) => {
      toast({ title: "Failed to create quote", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    },
  });

  const convertQuote = useMutation({
    mutationFn: async (quoteId: number) => {
      await api(`/v1/quotes/${quoteId}`, { method: "PATCH", body: JSON.stringify({ status: "accepted" }) });
      return api<{ salesOrderId: number; orderNumber: string }>(`/v1/quotes/${quoteId}/convert`, { method: "POST" });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["opp-quotes", selected?.id] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
      toast({ title: "Sales Order Created", description: `${data.orderNumber} created from quote` });
    },
    onError: (err: unknown) => {
      toast({ title: "Conversion failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    },
  });

  const createAdvanceReceipt = useMutation({
    mutationFn: () => api("/v1/advance-receipts", {
      method: "POST",
      body: JSON.stringify({
        opportunityId: selected!.id,
        amount: Number(advForm.amount),
        paymentMode: advForm.paymentMode || null,
        referenceNo: advForm.referenceNo || null,
        receiptDate: advForm.receiptDate,
        notes: advForm.notes || null,
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["advance-receipts", selected?.id] });
      setAdvShowForm(false);
      setAdvForm({ amount: "", paymentMode: "", referenceNo: "", receiptDate: new Date().toISOString().slice(0, 10), notes: "" });
      toast({ title: "Advance receipt recorded" });
    },
  });

  const deleteAdvanceReceipt = useMutation({
    mutationFn: (id: number) => api(`/v1/advance-receipts/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["advance-receipts", selected?.id] }); },
  });

  const recordInvoicePayment = useMutation({
    mutationFn: ({ invoiceId, amount, paymentMode, referenceNo, paymentDate, notes }: { invoiceId: number; amount: number; paymentMode: string; referenceNo: string; paymentDate: string; notes: string }) =>
      api("/v1/payments", { method: "POST", body: JSON.stringify({ invoiceId, amount, type: "Invoice Payment", paymentMode: paymentMode || null, referenceNo: referenceNo || null, paymentDate, notes: notes || null }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opp-invoice"] });
      qc.invalidateQueries({ queryKey: ["opp-payments"] });
      setPmtShowForm(false);
      setPmtForm({ amount: "", paymentMode: "", referenceNo: "", paymentDate: new Date().toISOString().slice(0, 10), notes: "" });
      toast({ title: "Payment recorded" });
    },
    onError: () => toast({ title: "Could not record payment", variant: "destructive" }),
  });

  const updateSOStatus = useMutation({
    mutationFn: ({ soId, status }: { soId: number; status: string }) =>
      api(`/v1/sales-orders/${soId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: (_data, { status }) => {
      qc.invalidateQueries({ queryKey: ["opp-sales-orders"] });
      qc.invalidateQueries({ queryKey: ["sales-orders"] });
      toast({ title: status === "Confirmed" ? "Sales Order confirmed" : "Sales Order cancelled" });
    },
    onError: () => toast({ title: "Could not update Sales Order", variant: "destructive" }),
  });

  const createShipment = useMutation({
    mutationFn: (soId: number) => api<OppShipment>("/v1/shipments", {
      method: "POST",
      body: JSON.stringify({
        salesOrderId: soId,
        courierPartner: shipForm.courierPartner.trim(),
        trackingNumber: shipForm.trackingNumber.trim() || undefined,
        estimatedDelivery: shipForm.estimatedDelivery || undefined,
        numberOfBoxes: shipForm.numberOfBoxes ? parseInt(shipForm.numberOfBoxes, 10) : undefined,
        freightCost: shipForm.freightCost ? parseFloat(shipForm.freightCost) : undefined,
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opp-shipments"] });
      setShipShowForm(false);
      setShipForm({ courierPartner: "", trackingNumber: "", estimatedDelivery: "", numberOfBoxes: "", freightCost: "" });
      toast({ title: "Shipment created" });
    },
  });

  const advanceShipmentStatus = useMutation({
    mutationFn: ({ shipId, status }: { shipId: number; status: string }) =>
      api<OppShipment>(`/v1/shipments/${shipId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onMutate: ({ shipId }) => setAdvancingShipId(shipId),
    onSettled: () => setAdvancingShipId(null),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["opp-shipments"] }); toast({ title: "Shipment status updated" }); },
    onError: () => toast({ title: "Could not update status", variant: "destructive" }),
  });

  const createSample = useMutation({
    mutationFn: () => api("/v1/sample-orders", {
      method: "POST",
      body: JSON.stringify({
        opportunityId: selected!.id,
        clientId: selected!.clientId ?? undefined,
        customerName: !selected!.clientId ? sampleCustomer.trim() : undefined,
        notes: sampleNotes.trim() || undefined,
        items: sampleLines.map(l => ({ productId: Number(l.productId), quantity: Number(l.quantity) })),
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opp-sample-orders"] });
      qc.invalidateQueries({ queryKey: ["sample-orders"] });
      setSampleDialog(false); resetSampleForm();
      toast({ title: "Sample order created" });
    },
    onError: (e: Error) => toast({ title: "Failed to create sample order", description: e.message, variant: "destructive" }),
  });

  const canCreateSample = sampleLines.length > 0
    && sampleLines.every(l => l.productId && Number(l.quantity) > 0)
    && (!!selected?.clientId || sampleCustomer.trim().length > 0);

  const handlePrintSample = async (id: number) => {
    try {
      const d = await api<SampleOrderDetail>(`/v1/sample-orders/${id}`);
      printSampleOrder({ ...d, opportunityTitle: selected?.title ?? null });
    } catch {
      toast({ title: "Could not load sample order for printing", variant: "destructive" });
    }
  };

  const updateSampleStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/v1/sample-orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opp-sample-orders"] });
      qc.invalidateQueries({ queryKey: ["sample-orders"] });
      toast({ title: "Status updated" });
    },
    onError: (e: Error) => toast({ title: "Failed to update status", description: e.message, variant: "destructive" }),
  });

  const openReturnDialog = async (id: number) => {
    try {
      const d = await api<SampleOrderDetail>(`/v1/sample-orders/${id}`);
      setReturningOrder(d);
      // For already-Returned orders: lock qty at existing returnedQty; for Received: default to full qty
      setReturnQtys(Object.fromEntries(d.items.map(i => [i.id, d.status === "Returned" ? i.returnedQty : i.quantity])));
      setDispositions(Object.fromEntries(d.items.map(i => [i.id, i.disposition])));
      setReturnDialog(true);
    } catch {
      toast({ title: "Could not load sample order", variant: "destructive" });
    }
  };

  const submitReturn = useMutation({
    mutationFn: () => api(`/v1/sample-orders/${returningOrder!.id}/return`, {
      method: "PATCH",
      body: JSON.stringify({
        items: returningOrder!.items.map(i => ({
          itemId: i.id,
          returnedQty: returnQtys[i.id] ?? 0,
          disposition: (returnQtys[i.id] ?? 0) < i.quantity ? (dispositions[i.id] ?? null) : null,
        })),
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opp-sample-orders"] });
      qc.invalidateQueries({ queryKey: ["sample-orders"] });
      const wasReturned = returningOrder?.status === "Returned";
      setReturnDialog(false); setReturningOrder(null);
      toast({ title: wasReturned ? "Disposition saved" : "Return recorded — status set to Returned" });
    },
    onError: (e: Error) => toast({ title: "Failed to record return", description: e.message, variant: "destructive" }),
  });

  function oppNextStatuses(status: string) {
    if (status === "Requested") return ["Dispatched", "Rejected"];
    if (status === "Dispatched") return ["Received", "Rejected"];
    return [];
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  const totalPipeline = (opps ?? []).reduce((s, o) => s + (o.value ?? 0), 0);
  const totalWeighted = (opps ?? []).reduce((s, o) => s + ((o.value ?? 0) * o.probability) / 100, 0);
  const quotationValue = (opps ?? []).filter(o => o.stage === "quotation_sent").reduce((s, o) => s + (o.value ?? 0), 0);
  const totalDeals = (opps ?? []).length;

  return (
    <div className="space-y-6" data-testid="page-opportunities">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Opportunities</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Sales pipeline with probability-weighted forecast</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg p-0.5 bg-muted/40">
            <button onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === "kanban" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <Columns3 className="w-3.5 h-3.5" />Kanban
            </button>
            <button onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <LayoutList className="w-3.5 h-3.5" />List
            </button>
          </div>
          <Button onClick={() => setDialog(true)}><Plus className="w-4 h-4 mr-2" />New Opportunity</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Pipeline", value: `₹${totalPipeline.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: IndianRupee, color: "text-primary" },
          { label: "Weighted Forecast", value: `₹${totalWeighted.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: BarChart3, color: "text-violet-500" },
          { label: "Quotation Sent", value: `₹${quotationValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: "text-emerald-500" },
          { label: "Total Deals", value: `${totalDeals}`, icon: Target, color: "text-amber-500" },
        ].map(s => (
          <Card key={s.label} className="elev-1">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 ${s.color}`}><s.icon className="w-5 h-5" /></div>
              <div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {viewMode === "kanban" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {STAGES.map(stage => {
            const items = (opps ?? []).filter(o => o.stage === stage);
            const stageVal = items.reduce((s, o) => s + (o.value ?? 0), 0);
            return (
              <div key={stage} className={`flex flex-col min-h-[280px] rounded-xl border border-t-2 bg-card/50 ${STAGE_HEADER[stage]}`}>
                <div className="p-3 border-b border-border/50">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-semibold">{LABELS[stage]}</span>
                    <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">₹{stageVal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {items.map(o => {
                    const daysLeft = o.expectedCloseDate ? differenceInDays(new Date(o.expectedCloseDate), new Date()) : null;
                    return (
                      <div key={o.id} className="p-2.5 border rounded-lg bg-card text-xs space-y-2 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all" onClick={() => { setSelected(o); setShareUrl(null); }}>
                        <div className="font-medium leading-tight">{o.title}</div>
                        {o.clientName && <div className="flex items-center gap-1 text-muted-foreground"><Building2 className="w-3 h-3 shrink-0" />{o.clientName}</div>}
                        {o.value != null && <div className="font-semibold text-primary">₹{o.value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>}
                        <div className="space-y-1">
                          <div className="flex justify-between text-muted-foreground">
                            <span>{o.probability}%</span>
                            {daysLeft !== null && <span className={daysLeft < 0 ? "text-red-400" : daysLeft < 7 ? "text-amber-400" : ""}>{daysLeft < 0 ? `${Math.abs(daysLeft)}d late` : `${daysLeft}d`}</span>}
                          </div>
                          <Progress value={o.probability} className="h-1" indicatorClassName={PROB_COLOR(o.probability)} />
                        </div>
                        {o.ownerName && <div className="flex items-center gap-1 text-muted-foreground pt-0.5"><UserCircle className="w-3 h-3 shrink-0" />{o.ownerName}</div>}
                      </div>
                    );
                  })}
                  {items.length === 0 && <div className="text-center text-muted-foreground/50 text-xs py-6">No opportunities</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "list" && (() => {
        const toggleSort = (field: typeof sortField) => {
          if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
          else { setSortField(field); setSortDir("asc"); }
        };
        const SortIcon = ({ field }: { field: typeof sortField }) => (
          <span className="ml-1 text-muted-foreground/60">{sortField === field ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
        );
        const STAGE_BADGE: Record<string, string> = {
          enquiry: "bg-slate-100 text-slate-700",
          sent_catalogue: "bg-blue-100 text-blue-700",
          samples: "bg-violet-100 text-violet-700",
          negotiation: "bg-orange-100 text-orange-700",
          shortlisted: "bg-amber-100 text-amber-700",
          quotation_sent: "bg-emerald-100 text-emerald-700",
          final_negotiation: "bg-cyan-100 text-cyan-700",
          received_po: "bg-indigo-100 text-indigo-700",
          material_supplied: "bg-green-100 text-green-700",
          received_payments: "bg-teal-100 text-teal-700",
          lost: "bg-red-100 text-red-700",
        };
        const filtered = (opps ?? [])
          .filter(o => {
            const q = listSearch.toLowerCase();
            const matchQ = !q || o.title.toLowerCase().includes(q) || (o.clientName ?? "").toLowerCase().includes(q) || (o.ownerName ?? "").toLowerCase().includes(q);
            const matchStage = listStage === "all" || o.stage === listStage;
            return matchQ && matchStage;
          })
          .sort((a, b) => {
            let av: string | number = 0, bv: string | number = 0;
            if (sortField === "title") { av = a.title; bv = b.title; }
            else if (sortField === "value") { av = a.value ?? 0; bv = b.value ?? 0; }
            else if (sortField === "probability") { av = a.probability; bv = b.probability; }
            else if (sortField === "expectedCloseDate") { av = a.expectedCloseDate ?? ""; bv = b.expectedCloseDate ?? ""; }
            else if (sortField === "createdAt") { av = a.createdAt; bv = b.createdAt; }
            if (av < bv) return sortDir === "asc" ? -1 : 1;
            if (av > bv) return sortDir === "asc" ? 1 : -1;
            return 0;
          });

        return (
          <div className="space-y-3">
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input className="pl-8 h-8 text-sm" placeholder="Search title, client, owner…"
                  value={listSearch} onChange={e => setListSearch(e.target.value)} />
              </div>
              <Select value={listStage} onValueChange={setListStage}>
                <SelectTrigger className="h-8 text-sm w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {STAGES.map(s => <SelectItem key={s} value={s}>{LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{filtered.length} deal{filtered.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Table */}
            <div className="rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b text-xs">
                      <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort("title")}>
                        Title <SortIcon field="title" />
                      </th>
                      <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">Client</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">Stage</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort("value")}>
                        Value <SortIcon field="value" />
                      </th>
                      <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort("probability")}>
                        Prob% <SortIcon field="probability" />
                      </th>
                      <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">Weighted</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">Owner</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort("expectedCloseDate")}>
                        Close Date <SortIcon field="expectedCloseDate" />
                      </th>
                      <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">Days Left</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort("createdAt")}>
                        Created <SortIcon field="createdAt" />
                      </th>
                      <th className="px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map((o, idx) => {
                      const daysLeft = o.expectedCloseDate ? differenceInDays(new Date(o.expectedCloseDate), new Date()) : null;
                      const weighted = o.value != null ? Math.round((o.value * o.probability) / 100) : null;
                      return (
                        <tr key={o.id}
                          className={`cursor-pointer transition-colors hover:bg-muted/40 ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                          onClick={() => { setSelected(o); setShareUrl(null); }}>
                          <td className="px-4 py-3 font-medium max-w-[200px]">
                            <div className="truncate">{o.title}</div>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground max-w-[140px]">
                            <div className="truncate">{o.clientName ?? "—"}</div>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STAGE_BADGE[o.stage] ?? "bg-muted text-muted-foreground"}`}>
                              {LABELS[o.stage] ?? o.stage}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-primary whitespace-nowrap">
                            {o.value != null ? `₹${o.value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-col items-center gap-1 min-w-[60px]">
                              <span className="text-xs font-medium">{o.probability}%</span>
                              <Progress value={o.probability} className="h-1.5 w-14" indicatorClassName={PROB_COLOR(o.probability)} />
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right text-muted-foreground whitespace-nowrap">
                            {weighted != null ? `₹${weighted.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground max-w-[120px]">
                            <div className="truncate">{o.ownerName ?? "—"}</div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                            {o.expectedCloseDate ? format(new Date(o.expectedCloseDate), "dd MMM yyyy") : "—"}
                          </td>
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            {daysLeft === null ? <span className="text-muted-foreground">—</span>
                              : daysLeft < 0 ? <span className="text-red-500 font-medium text-xs">{Math.abs(daysLeft)}d late</span>
                              : daysLeft < 7 ? <span className="text-amber-500 font-medium text-xs">{daysLeft}d</span>
                              : <span className="text-muted-foreground text-xs">{daysLeft}d</span>}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">
                            {format(new Date(o.createdAt), "dd MMM yyyy")}
                          </td>
                          <td className="px-3 py-3 max-w-[180px]">
                            <div className="truncate text-xs text-muted-foreground" title={o.notes ?? ""}>{o.notes ?? "—"}</div>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={11} className="text-center text-muted-foreground py-10 text-sm">No opportunities found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* New dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Opportunity</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Title *</label>
              <Input placeholder="e.g. Diwali Campaign — TCS" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Client</label>
                <Select value={form.clientId || "__none__"} onValueChange={v => setForm({ ...form, clientId: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select client…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {clients?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Source Lead</label>
                <Select value={form.leadId || "__none__"} onValueChange={v => setForm({ ...form, leadId: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Link to lead…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {leads?.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Value (₹)</label>
                <Input placeholder="Deal value" type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Probability %</label>
                <Input placeholder="0–100" type="number" min="0" max="100" value={form.probability} onChange={e => setForm({ ...form, probability: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Expected Close Date</label>
                <Input type="date" value={form.expectedCloseDate} onChange={e => setForm({ ...form, expectedCloseDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Assigned To</label>
                <Select value={form.ownerId || "__none__"} onValueChange={v => setForm({ ...form, ownerId: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Assign owner…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Unassigned —</SelectItem>
                    {users?.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Notes</label>
              <Textarea placeholder="Context, requirements, key decision makers…" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <Button onClick={() => create.mutate()} disabled={!form.title || create.isPending} className="w-full">Create Opportunity</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={o => { if (!o) { setSelected(null); setOppEditMode(false); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-start justify-between gap-2">
                  <SheetTitle className="text-xl leading-snug">{oppEditMode ? "Edit Opportunity" : selected.title}</SheetTitle>
                  {!oppEditMode ? (
                    <Button size="sm" variant="outline" className="shrink-0 h-8 text-xs px-3 mt-0.5"
                      onClick={() => {
                        setOppEditForm({
                          title: selected.title,
                          clientId: selected.clientId != null ? String(selected.clientId) : "",
                          value: selected.value != null ? String(selected.value) : "",
                          probability: String(selected.probability),
                          expectedCloseDate: selected.expectedCloseDate ? selected.expectedCloseDate.split("T")[0] : "",
                          ownerId: selected.ownerId != null ? String(selected.ownerId) : "",
                          notes: selected.notes ?? "",
                        });
                        setOppEditMode(true);
                      }}>
                      Edit
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" className="shrink-0 h-8 text-xs px-3 mt-0.5" onClick={() => setOppEditMode(false)}>
                      Cancel
                    </Button>
                  )}
                </div>
                {!oppEditMode && selected.clientName && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1"><Building2 className="w-4 h-4" />{selected.clientName}</p>
                )}
              </SheetHeader>

              {/* ── EDIT MODE ── */}
              {oppEditMode && (
                <div className="space-y-4 mb-6">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Title *</label>
                    <Input value={oppEditForm.title} onChange={e => setOppEditForm(f => ({ ...f, title: e.target.value }))} placeholder="Opportunity title" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Client</label>
                    <Select value={oppEditForm.clientId || "__none__"} onValueChange={v => setOppEditForm(f => ({ ...f, clientId: v === "__none__" ? "" : v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Link to client…" /></SelectTrigger>
                      <SelectContent position="popper" className="max-h-60">
                        <SelectItem value="__none__">— No client —</SelectItem>
                        {clients?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {!oppEditForm.clientId && (
                      <p className="text-xs text-amber-600">A linked client is required to create quotes.</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Deal Value (₹)</label>
                      <Input className="h-8 text-sm" type="number" value={oppEditForm.value} onChange={e => setOppEditForm(f => ({ ...f, value: e.target.value }))} placeholder="0" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Probability %</label>
                      <Input className="h-8 text-sm" type="number" min="0" max="100" value={oppEditForm.probability} onChange={e => setOppEditForm(f => ({ ...f, probability: e.target.value }))} placeholder="50" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expected Close</label>
                      <Input className="h-8 text-sm" type="date" value={oppEditForm.expectedCloseDate} onChange={e => setOppEditForm(f => ({ ...f, expectedCloseDate: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assigned To</label>
                      <Select value={oppEditForm.ownerId || "__none__"} onValueChange={v => setOppEditForm(f => ({ ...f, ownerId: v === "__none__" ? "" : v }))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Assign…" /></SelectTrigger>
                        <SelectContent position="popper" className="max-h-60">
                          <SelectItem value="__none__">— Unassigned —</SelectItem>
                          {users?.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</label>
                    <Textarea rows={3} value={oppEditForm.notes} onChange={e => setOppEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes…" />
                  </div>

                  <Button
                    className="w-full"
                    disabled={!oppEditForm.title.trim() || update.isPending}
                    onClick={() => update.mutate({
                      id: selected.id,
                      data: {
                        title: oppEditForm.title.trim(),
                        clientId: oppEditForm.clientId ? Number(oppEditForm.clientId) : null,
                        value: oppEditForm.value ? Number(oppEditForm.value) : null,
                        probability: Number(oppEditForm.probability) || 50,
                        expectedCloseDate: oppEditForm.expectedCloseDate || null,
                        ownerId: oppEditForm.ownerId ? Number(oppEditForm.ownerId) : null,
                        notes: oppEditForm.notes.trim() || null,
                      },
                    })}>
                    {update.isPending ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              )}

              {!oppEditMode && <div className="space-y-5">
                {selected.ownerName && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UserCircle className="w-4 h-4" /><span>Assigned to <strong>{selected.ownerName}</strong></span>
                  </div>
                )}
                {selected.value != null && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="text-xs text-muted-foreground mb-0.5">Deal Value</div>
                    <div className="text-3xl font-bold text-primary">₹{selected.value.toLocaleString("en-IN")}</div>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Probability: {selected.probability}%</span>
                        <span>Weighted: ₹{Math.round((selected.value * selected.probability) / 100).toLocaleString("en-IN")}</span>
                      </div>
                      <Progress value={selected.probability} className="h-2" indicatorClassName={PROB_COLOR(selected.probability)} />
                    </div>
                  </div>
                )}
                {selected.expectedCloseDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Expected close: <strong>{format(new Date(selected.expectedCloseDate), "MMM d, yyyy")}</strong></span>
                  </div>
                )}
                {selected.notes && <div className="bg-muted/40 rounded-lg p-3"><div className="text-xs font-medium text-muted-foreground mb-1">Notes</div><p className="text-sm whitespace-pre-wrap">{selected.notes}</p></div>}
                {(() => {
                  const idx = MAIN_FLOW.indexOf(selected.stage);
                  const nextStage = idx >= 0 && idx < MAIN_FLOW.length - 1 ? MAIN_FLOW[idx + 1] : null;
                  const prevStage = idx > 0 ? MAIN_FLOW[idx - 1] : null;
                  const moveToStage = (s: string) => { update.mutate({ id: selected.id, data: { stage: s } }); setSelected({ ...selected, stage: s }); };
                  return (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Stage</label>
                      {/* Current stage badge */}
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${STAGE_BADGE[selected.stage] ?? "bg-muted text-muted-foreground border-border"}`}>
                          {LABELS[selected.stage]}
                        </span>
                        {selected.stage === "lost" && (
                          <button
                            className="text-xs text-muted-foreground hover:text-foreground underline"
                            onClick={() => moveToStage("enquiry")}>
                            Reopen
                          </button>
                        )}
                      </div>
                      {/* Advance button */}
                      {nextStage && selected.stage !== "lost" && (
                        <Button
                          className="w-full"
                          size="sm"
                          disabled={update.isPending}
                          onClick={() => moveToStage(nextStage)}>
                          <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                          Move to {LABELS[nextStage]}
                        </Button>
                      )}
                      {/* Back + Mark as Lost row */}
                      {selected.stage !== "lost" && (
                        <div className="flex items-center justify-between pt-0.5">
                          {prevStage ? (
                            <button
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 disabled:opacity-40"
                              disabled={update.isPending}
                              onClick={() => moveToStage(prevStage)}>
                              ← {LABELS[prevStage]}
                            </button>
                          ) : <span />}
                          <button
                            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                            disabled={update.isPending}
                            onClick={() => moveToStage("lost")}>
                            Mark as Lost
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {selected.stage === "sent_catalogue" && (
                  <div className="space-y-3 border rounded-xl p-4 bg-blue-50/40">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-700">Product Catalogue</span>
                    </div>
                    {/* Catalogue type */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Catalogue Type</label>
                      <Select value={catalogueType} onValueChange={v => { setCatalogueType(v); if (v !== "Custom") setCatalogueCustomType(""); }}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          {["Corporate Gifts","Diwali Gifting","New Year Collection","Festive Hampers","Premium Executive Gifts","Custom"].map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {catalogueType === "Custom" && (
                        <Input className="h-8 text-sm" placeholder="Enter catalogue title…"
                          value={catalogueCustomType} onChange={e => setCatalogueCustomType(e.target.value)} />
                      )}
                    </div>
                    {/* Product search */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-muted-foreground">Select Products</label>
                        <div className="flex gap-1.5 text-xs text-muted-foreground">
                          <button className="hover:text-foreground underline-offset-2 hover:underline"
                            onClick={() => setCatalogueSelected(new Set((products ?? []).map(p => p.id)))}>All</button>
                          <span>·</span>
                          <button className="hover:text-foreground underline-offset-2 hover:underline"
                            onClick={() => setCatalogueSelected(new Set())}>None</button>
                        </div>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input className="h-8 text-sm pl-8" placeholder="Search products…"
                          value={catalogueSearch} onChange={e => setCatalogueSearch(e.target.value)} />
                      </div>
                      <div className="border rounded-lg bg-background max-h-48 overflow-y-auto divide-y">
                        {(products ?? [])
                          .filter(p => p.name.toLowerCase().includes(catalogueSearch.toLowerCase()) || p.category.toLowerCase().includes(catalogueSearch.toLowerCase()))
                          .map(p => (
                            <label key={p.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors">
                              <input type="checkbox" className="accent-blue-600 w-3.5 h-3.5"
                                checked={catalogueSelected.has(p.id)}
                                onChange={e => setCatalogueSelected(prev => {
                                  const next = new Set(prev);
                                  e.target.checked ? next.add(p.id) : next.delete(p.id);
                                  return next;
                                })} />
                              {p.imageUrl
                                ? <img src={p.imageUrl} className="w-7 h-7 rounded object-cover border shrink-0" />
                                : <div className="w-7 h-7 rounded bg-blue-100 flex items-center justify-content-center shrink-0 text-base flex items-center justify-center">🎁</div>
                              }
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium truncate">{p.name}</div>
                                <div className="text-xs text-muted-foreground">{p.category}{p.brand ? ` · ${p.brand}` : ""}</div>
                              </div>
                              <span className="text-xs font-semibold text-blue-700 shrink-0">₹{Number(p.sellingPrice).toLocaleString("en-IN")}</span>
                            </label>
                          ))}
                        {(products ?? []).length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">Loading products…</p>
                        )}
                      </div>
                      {catalogueSelected.size > 0 && (
                        <p className="text-xs text-blue-600 font-medium">{catalogueSelected.size} product{catalogueSelected.size !== 1 ? "s" : ""} selected</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-8 text-sm"
                        disabled={catalogueSelected.size === 0 || (catalogueType === "Custom" && !catalogueCustomType.trim())}
                        onClick={() => {
                          const selectedProducts = (products ?? []).filter(p => catalogueSelected.has(p.id));
                          printCatalogue({
                            title: catalogueType === "Custom" ? catalogueCustomType.trim() : catalogueType,
                            clientName: selected.clientName ?? selected.title,
                            products: selectedProducts,
                          });
                        }}>
                        <Printer className="w-3.5 h-3.5 mr-1.5" />PDF ({catalogueSelected.size})
                      </Button>
                      <Button className="flex-1 h-8 text-sm" variant="outline"
                        disabled={catalogueSelected.size === 0 || (catalogueType === "Custom" && !catalogueCustomType.trim()) || shareLoading}
                        onClick={async () => {
                          setShareLoading(true);
                          try {
                            const res = await api("/v1/catalogue-shares", {
                              method: "POST",
                              body: JSON.stringify({
                                opportunityTitle: selected.title,
                                clientName: selected.clientName ?? selected.title,
                                catalogueType: catalogueType === "Custom" ? catalogueCustomType.trim() : catalogueType,
                                productIds: Array.from(catalogueSelected),
                              }),
                            });
                            const { token } = res as { token: string };
                            const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
                            const url = `${window.location.origin}${base}/catalogue/${token}`;
                            setShareUrl(url);
                            try { await navigator.clipboard.writeText(url); setShareCopied(true); setTimeout(() => setShareCopied(false), 3000); } catch { /* clipboard unavailable — user will copy from dialog */ }
                          } catch {
                            toast({ title: "Failed to generate link", variant: "destructive" });
                          } finally {
                            setShareLoading(false);
                          }
                        }}>
                        {shareCopied ? <Check className="w-3.5 h-3.5 mr-1.5 text-green-500" /> : <Link2 className="w-3.5 h-3.5 mr-1.5" />}
                        {shareLoading ? "Generating…" : shareCopied ? "Copied!" : "Share Link"}
                      </Button>
                    </div>
                    {shareUrl && (
                      <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-3 space-y-2">
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5" />Shareable link (valid 30 days)
                        </p>
                        <div className="flex gap-2 items-center">
                          <input readOnly value={shareUrl} className="flex-1 text-xs bg-white dark:bg-background border rounded px-2 py-1.5 font-mono truncate select-all" onFocus={e => e.target.select()} />
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2 shrink-0"
                            onClick={async () => {
                              try { await navigator.clipboard.writeText(shareUrl); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); } catch {
                                const el = document.querySelector<HTMLInputElement>('input[value="' + shareUrl + '"]'); el?.select(); document.execCommand("copy"); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000);
                              }
                            }}>
                            {shareCopied ? <Check className="w-3 h-3 text-green-500" /> : <Link2 className="w-3 h-3" />}
                            {shareCopied ? "Copied!" : "Copy"}
                          </Button>
                        </div>
                        <p className="text-xs text-blue-500 dark:text-blue-400">Tap the link to select it, then copy & share with your customer.</p>
                      </div>
                    )}
                  </div>
                )}
                {selected.stage === "samples" && (
                  <div className="space-y-2" data-testid="section-sample-orders">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium flex items-center gap-1.5">
                        <FlaskConical className="w-4 h-4 text-violet-500" />Sample Orders
                      </label>
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                        onClick={() => { resetSampleForm(); if (!selected?.clientId) setSampleCustomer(selected?.title ?? ""); setSampleDialog(true); }}>
                        <Plus className="w-3 h-3 mr-1" />New Sample Order
                      </Button>
                    </div>
                    {(sampleOrders ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground border rounded-lg p-3 bg-muted/20">
                        No sample orders yet. Create one to record the samples you're sending, then print or save it as a PDF for the client.
                      </p>
                    ) : (
                      <div className="border rounded-lg divide-y">
                        {(sampleOrders ?? []).map(so => (
                          <div key={so.id} className="px-3 py-2.5 space-y-2">
                            {/* Row 1: number + badge + date */}
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold">{so.sampleNumber}</span>
                              <Badge variant="outline" className={`text-xs ${SAMPLE_STATUS_COLOR[so.status] ?? ""}`}>{so.status}</Badge>
                              <span className="text-xs text-muted-foreground ml-auto">{format(new Date(so.createdAt), "MMM d")}</span>
                            </div>
                            {/* Item-wise details */}
                            {(so.items ?? []).length > 0 && (
                              <div className="rounded-md bg-muted/30 divide-y divide-border/50 border border-border/50 text-xs">
                                {(so.items ?? []).map(item => {
                                  const keptQty = item.quantity - item.returnedQty;
                                  const isReturned = so.status === "Returned" || item.returnedQty > 0;
                                  return (
                                    <div key={item.id} className="flex flex-col gap-1 px-2.5 py-1.5">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium truncate">{item.productName}</span>
                                        <span className="text-muted-foreground shrink-0">×{item.quantity}</span>
                                      </div>
                                      {isReturned && (
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {item.returnedQty > 0 && (
                                            <span className="text-orange-600 font-medium">↩ {item.returnedQty} returned</span>
                                          )}
                                          {keptQty > 0 && item.disposition === "gift" && (
                                            <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">🎁 {keptQty} gifted</span>
                                          )}
                                          {keptQty > 0 && item.disposition === "invoice" && (
                                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">🧾 {keptQty} to invoice</span>
                                          )}
                                          {keptQty > 0 && !item.disposition && (
                                            <span className="text-amber-600 font-medium">{keptQty} kept — disposition pending</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {/* Row 2: action buttons */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {oppNextStatuses(so.status).map(ns => (
                                <Button key={ns} size="sm"
                                  variant={ns === "Rejected" ? "destructive" : "outline"}
                                  className="h-6 text-xs px-2"
                                  disabled={updateSampleStatus.isPending}
                                  onClick={() => updateSampleStatus.mutate({ id: so.id, status: ns })}>
                                  {ns}
                                </Button>
                              ))}
                              {so.status === "Received" && (
                                <Button size="sm" variant="outline"
                                  className="h-6 text-xs px-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                                  onClick={() => openReturnDialog(so.id)}>
                                  Return
                                </Button>
                              )}
                              {so.status === "Returned" && (so.items ?? []).some(i => i.quantity - i.returnedQty > 0 && !i.disposition) && (
                                <Button size="sm" variant="outline"
                                  className="h-6 text-xs px-2 text-amber-600 border-amber-300 hover:bg-amber-50"
                                  onClick={() => openReturnDialog(so.id)}>
                                  Set Disposition
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs ml-auto"
                                onClick={() => handlePrintSample(so.id)}>
                                <Printer className="w-3 h-3 mr-1" />Print
                              </Button>
                              {so.status === "Returned" && (
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-orange-600"
                                  onClick={() => printReturnNote({ ...so, opportunityTitle: selected?.title ?? null })}>
                                  <Printer className="w-3 h-3 mr-1" />Return Note
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Quotation Sent: Inline Quote Creation ── */}
                {selected.stage === "quotation_sent" && (() => {
                  const linkedQuotes = oppQuotes ?? [];
                  const qSubtotal = qItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
                  const qAfterDisc = qSubtotal * (1 - Number(qDiscountPct || 0) / 100);
                  const qGst = qAfterDisc * 0.18;
                  const qTotal = qAfterDisc + qGst;
                  const qFilledItems = qItems.filter(i => i.description.trim());
                  const QUOTE_STATUS: Record<string, string> = {
                    draft: "bg-zinc-100 text-zinc-700",
                    sent: "bg-blue-100 text-blue-700",
                    accepted: "bg-emerald-100 text-emerald-700",
                    rejected: "bg-red-100 text-red-600",
                    expired: "bg-amber-100 text-amber-700",
                  };
                  return (
                    <div className="space-y-3" data-testid="section-quotes">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-blue-500" />Quotes
                        </label>
                        {!qShowForm && (
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                            onClick={() => { setQSubject(selected.title); setQShowForm(true); }}>
                            <Plus className="w-3 h-3 mr-1" />New Quote
                          </Button>
                        )}
                      </div>

                      {/* Existing quotes list */}
                      {linkedQuotes.length === 0 && !qShowForm && (
                        <p className="text-xs text-muted-foreground border rounded-lg p-3 bg-muted/20">
                          No quotes yet. Create one to share a formal quotation with the client.
                        </p>
                      )}
                      {linkedQuotes.length > 0 && (
                        <div className="border rounded-lg divide-y text-sm">
                          {linkedQuotes.map(q => (
                            <div key={q.id} className="flex items-center gap-2 px-3 py-2">
                              <span className="font-mono text-xs font-semibold text-muted-foreground">{q.quoteNumber}</span>
                              <span className="flex-1 truncate text-xs">{q.subject ?? "—"}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${QUOTE_STATUS[q.status] ?? "bg-zinc-100 text-zinc-700"}`}>{q.status}</span>
                              <span className="text-xs font-semibold">₹{Number(q.totalAmount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                              <button
                                title="Print quote"
                                disabled={printingQuoteId === q.id}
                                className="text-muted-foreground hover:text-foreground disabled:opacity-40"
                                onClick={async () => {
                                  setPrintingQuoteId(q.id);
                                  try {
                                    const detail = await api<{ quoteNumber: string; clientName: string | null; subject: string | null; status: string; totalAmount: number; gstAmount: number; subtotal: number; discountPct: number; validUntil: string | null; notes: string | null; paymentTerms: string | null; items: Array<{ description: string; quantity: number; unitPrice: number; lineTotal: number; imageUrl: string | null }> }>(`/v1/quotes/${q.id}`);
                                    printQuote({ ...detail, clientName: detail.clientName ?? selected?.clientName ?? null });
                                  } finally {
                                    setPrintingQuoteId(null);
                                  }
                                }}>
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <a href="/quotes" className="text-muted-foreground hover:text-foreground">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Inline quote form */}
                      {qShowForm && (
                        <div className="border rounded-lg p-3 space-y-3 bg-muted/10">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New Quote</span>
                            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={resetQuoteForm}>Cancel</Button>
                          </div>

                          {!selected.clientId && (
                            <p className="text-xs text-destructive border border-destructive/30 rounded p-2 bg-destructive/5">
                              This opportunity has no linked client. Link a client first to create a quote.
                            </p>
                          )}

                          <Input
                            placeholder="Quote subject"
                            value={qSubject}
                            onChange={e => setQSubject(e.target.value)}
                            className="text-sm h-8"
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <Input type="date" value={qValidUntil} onChange={e => setQValidUntil(e.target.value)} className="text-sm h-8" />
                            <Input type="number" placeholder="Discount %" min="0" max="100" value={qDiscountPct} onChange={e => setQDiscountPct(e.target.value)} className="text-sm h-8" />
                          </div>

                          <Select value={qPaymentTerms || "__none__"} onValueChange={v => setQPaymentTerms(v === "__none__" ? "" : v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Payment terms (optional)" /></SelectTrigger>
                            <SelectContent position="popper">
                              <SelectItem value="__none__">— No payment terms —</SelectItem>
                              {PAYMENT_TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                          </Select>

                          {/* Line items */}
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Line Items</div>
                            {qItems.map((item, i) => (
                              <div key={i} className="rounded-md border bg-background p-2.5 space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="shrink-0 w-8 h-8 rounded overflow-hidden border bg-muted flex items-center justify-center">
                                    {item.imageUrl
                                      ? <img src={item.imageUrl} alt={item.description} className="w-full h-full object-cover" />
                                      : <Package className="w-3.5 h-3.5 text-muted-foreground" />}
                                  </div>
                                  <Select
                                    value={item.productId ? String(item.productId) : "__custom__"}
                                    onValueChange={v => {
                                      if (v === "__custom__") {
                                        setQItems(prev => prev.map((it, idx) => idx === i ? { ...it, productId: undefined, imageUrl: null } : it));
                                      } else {
                                        const prod = (products ?? []).find(p => String(p.id) === v);
                                        if (prod) setQItems(prev => prev.map((it, idx) => idx === i ? { ...it, productId: prod.id, description: prod.name, unitPrice: Number(prod.sellingPrice), imageUrl: prod.imageUrl ?? null } : it));
                                      }
                                    }}>
                                    <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Select product…" /></SelectTrigger>
                                    <SelectContent position="popper" className="max-h-60">
                                      <SelectItem value="__custom__">— Custom description —</SelectItem>
                                      {(products ?? []).map(p => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                          <div className="flex items-center gap-2">
                                            {p.imageUrl
                                              ? <img src={p.imageUrl} alt={p.name} className="w-4 h-4 rounded object-cover shrink-0" />
                                              : <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                                            <span>{p.name}</span>
                                            <span className="text-muted-foreground ml-auto text-xs">₹{Number(p.sellingPrice).toLocaleString("en-IN")}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button size="icon" variant="ghost" className="shrink-0 h-8 w-8" onClick={() => setQItems(qItems.filter((_, x) => x !== i))}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-12 gap-1.5">
                                  <Input className="col-span-6 text-xs h-7" placeholder="Description"
                                    value={item.description} onChange={e => { const n = [...qItems]; n[i].description = e.target.value; setQItems(n); }} />
                                  <Input className="col-span-2 text-xs h-7" type="number" placeholder="Qty" min="1"
                                    value={item.quantity} onChange={e => { const n = [...qItems]; n[i].quantity = Number(e.target.value); setQItems(n); }} />
                                  <Input className="col-span-4 text-xs h-7" type="number" placeholder="Unit price ₹"
                                    value={item.unitPrice} onChange={e => { const n = [...qItems]; n[i].unitPrice = Number(e.target.value); setQItems(n); }} />
                                </div>
                                {item.quantity > 0 && item.unitPrice > 0 && (
                                  <div className="text-xs text-right text-muted-foreground">
                                    Line total: ₹{(item.quantity * item.unitPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </div>
                                )}
                              </div>
                            ))}
                            <Button variant="outline" size="sm" className="h-7 text-xs"
                              onClick={() => setQItems([...qItems, { description: "", quantity: 1, unitPrice: 0 }])}>
                              <Plus className="w-3 h-3 mr-1" />Add line
                            </Button>
                          </div>

                          {/* Financial summary */}
                          {qFilledItems.length > 0 && (
                            <div className="bg-muted/40 rounded-md p-3 space-y-1 text-xs">
                              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{qSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                              {Number(qDiscountPct) > 0 && <div className="flex justify-between text-amber-600"><span>Discount ({qDiscountPct}%)</span><span>−₹{(qSubtotal - qAfterDisc).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>}
                              <div className="flex justify-between text-muted-foreground"><span>GST 18%</span><span>₹{qGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                              <div className="flex justify-between font-bold text-sm pt-1 border-t border-border"><span>Total</span><span>₹{qTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                            </div>
                          )}

                          <Textarea placeholder="Notes (optional)" value={qNotes} onChange={e => setQNotes(e.target.value)} rows={2} className="text-sm" />

                          {qFilledItems.length === 0 && <p className="text-xs text-destructive text-center">Add at least one line item with a description</p>}
                          <Button
                            onClick={() => createQuote.mutate()}
                            disabled={!selected.clientId || qFilledItems.length === 0 || createQuote.isPending}
                            className="w-full h-8 text-sm">
                            {createQuote.isPending ? "Creating…" : "Create Quote"}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── Received PO / Advance: Confirmed Quote + Advance Receipts ── */}
                {selected.stage === "received_po" && (() => {
                  const quotes = oppQuotes ?? [];
                  const acceptedQuote = quotes.find(q => q.status === "accepted");
                  const latestQuote = acceptedQuote ?? quotes[quotes.length - 1];
                  const receipts = advanceReceipts ?? [];
                  const totalAdvance = receipts.reduce((s, r) => s + r.amount, 0);
                  const PAYMENT_MODES = ["Cash", "Bank Transfer", "Cheque", "UPI", "NEFT/RTGS", "Other"];
                  const linkedSO = firstSO ?? null;
                  const SO_STATUS_COLOR: Record<string, string> = {
                    Draft: "bg-zinc-100 text-zinc-700",
                    Confirmed: "bg-blue-100 text-blue-700",
                    "In Production": "bg-amber-100 text-amber-700",
                    Shipped: "bg-indigo-100 text-indigo-700",
                    Delivered: "bg-emerald-100 text-emerald-700",
                    Cancelled: "bg-red-100 text-red-700",
                  };
                  return (
                    <div className="space-y-4" data-testid="section-received-po">
                      {/* Confirmed Quote */}
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" />Confirmed Quote
                        </div>
                        {!latestQuote ? (
                          <p className="text-xs text-muted-foreground text-center py-3 border rounded-lg">No quotes linked to this opportunity</p>
                        ) : (
                          <div className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-primary">{latestQuote.quoteNumber}</span>
                              <div className="flex items-center gap-1.5">
                                {linkedSO && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 flex items-center gap-1"><Check className="w-2.5 h-2.5" />Converted</span>}
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  latestQuote.status === "accepted" ? "bg-emerald-100 text-emerald-700" :
                                  latestQuote.status === "sent" ? "bg-blue-100 text-blue-700" :
                                  latestQuote.status === "draft" ? "bg-zinc-100 text-zinc-700" :
                                  "bg-amber-100 text-amber-700"
                                }`}>{latestQuote.status}</span>
                              </div>
                            </div>
                            {latestQuote.subject && <p className="text-xs text-muted-foreground truncate">{latestQuote.subject}</p>}
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold">₹{Number(latestQuote.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  title="Print quote"
                                  disabled={printingQuoteId === latestQuote.id}
                                  className="text-muted-foreground hover:text-foreground disabled:opacity-40 p-1"
                                  onClick={async () => {
                                    setPrintingQuoteId(latestQuote.id);
                                    try {
                                      const detail = await api<{ quoteNumber: string; clientName: string | null; status: string; totalAmount: number; gstAmount: number; subtotal: number; discountPct: number; validUntil: string | null; notes: string | null; items: Array<{ description: string; quantity: number; unitPrice: number; lineTotal: number; imageUrl: string | null }> }>(`/v1/quotes/${latestQuote.id}`);
                                      printQuote({ ...detail, clientName: detail.clientName ?? selected.clientName ?? null });
                                    } finally { setPrintingQuoteId(null); }
                                  }}>
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <a href="/quotes" className="text-muted-foreground hover:text-foreground p-1">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                            {!linkedSO && latestQuote.status !== "accepted" && (
                              <Button
                                size="sm"
                                className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={convertQuote.isPending}
                                onClick={() => { setConvertingQuoteId(latestQuote.id); convertQuote.mutate(latestQuote.id); }}>
                                {convertQuote.isPending ? "Creating…" : <><Check className="w-3 h-3 mr-1" />Mark Accepted &amp; Convert to Sales Order</>}
                              </Button>
                            )}
                            {!linkedSO && latestQuote.status === "accepted" && (
                              <Button
                                size="sm"
                                className="w-full h-7 text-xs"
                                disabled={convertQuote.isPending}
                                onClick={() => { setConvertingQuoteId(latestQuote.id); convertQuote.mutate(latestQuote.id); }}>
                                {convertQuote.isPending ? "Creating…" : <><ArrowRight className="w-3 h-3 mr-1" />Convert to Sales Order</>}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Linked Sales Order — shown after conversion */}
                      {linkedSO && (
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <PackageCheck className="w-3.5 h-3.5" />Sales Order
                          </div>
                          <div className="border rounded-lg p-3 space-y-3">
                            {/* Header row */}
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-primary">{linkedSO.orderNumber}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SO_STATUS_COLOR[linkedSO.status] ?? "bg-muted text-muted-foreground"}`}>{linkedSO.status}</span>
                            </div>
                            {/* Amount + print */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold">₹{linkedSO.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  title="Print Sales Order"
                                  className="text-muted-foreground hover:text-foreground p-1"
                                  onClick={async () => {
                                    const detail = await api<{ id: number; orderNumber: string; clientName: string; status: string; totalAmount: number; discountPct: number; gstAmount: number; grandTotal: number; paymentTerms: string | null; deliveryDate: string | null; poNumber: string | null; occasion: string | null; notes: string | null; createdAt: string; items: Array<{ id: number; productName: string; productId: number | null; quantity: number; unitPrice: number; totalPrice: number }> }>(`/v1/sales-orders/${linkedSO.id}`);
                                    printSalesOrder({
                                      orderNumber: detail.orderNumber,
                                      clientName: detail.clientName,
                                      status: detail.status,
                                      totalAmount: detail.totalAmount,
                                      discountPct: detail.discountPct,
                                      gstAmount: detail.gstAmount,
                                      grandTotal: detail.grandTotal,
                                      paymentTerms: detail.paymentTerms,
                                      deliveryDate: detail.deliveryDate,
                                      poNumber: detail.poNumber,
                                      occasion: detail.occasion,
                                      notes: detail.notes,
                                      createdAt: detail.createdAt,
                                      items: detail.items.map(i => ({ id: i.id, productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice, totalPrice: i.totalPrice })),
                                    });
                                  }}>
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <a href="/sales-orders" className="text-muted-foreground hover:text-foreground p-1">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                            {linkedSO.deliveryDate && (
                              <p className="text-xs text-muted-foreground">Delivery: {new Date(linkedSO.deliveryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                            )}

                            {/* Draft actions */}
                            {linkedSO.status === "Draft" && (
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <Button
                                  size="sm"
                                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                  disabled={updateSOStatus.isPending}
                                  onClick={() => updateSOStatus.mutate({ soId: linkedSO.id, status: "Confirmed" })}>
                                  {updateSOStatus.isPending ? "…" : <><Check className="w-3 h-3 mr-1" />Confirm SO</>}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                  disabled={updateSOStatus.isPending}
                                  onClick={() => updateSOStatus.mutate({ soId: linkedSO.id, status: "Cancelled" })}>
                                  <XCircle className="w-3 h-3 mr-1" />Cancel SO
                                </Button>
                              </div>
                            )}

                            {/* Confirmed — Process button */}
                            {linkedSO.status === "Confirmed" && (
                              <Button
                                size="sm"
                                className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => navigate(`/order-processing/${linkedSO.id}`)}>
                                <ClipboardList className="w-3 h-3 mr-1" />Process — Fill Order Form
                              </Button>
                            )}

                            {/* Cancelled notice */}
                            {linkedSO.status === "Cancelled" && (
                              <p className="text-xs text-red-600 text-center py-1">This sales order was cancelled.</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Advance Receipts */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                            <IndianRupee className="w-3.5 h-3.5" />Advance Receipts
                            {receipts.length > 0 && (
                              <span className="ml-1 text-xs font-bold text-emerald-700">₹{totalAdvance.toLocaleString("en-IN", { minimumFractionDigits: 0 })} total</span>
                            )}
                          </div>
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setAdvShowForm(v => !v)}>
                            {advShowForm ? "Cancel" : <><Plus className="w-3 h-3 mr-1" />Add</>}
                          </Button>
                        </div>

                        {advShowForm && (
                          <div className="border rounded-lg p-3 space-y-2.5 bg-muted/10 mb-2">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">New Advance Receipt</div>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="number"
                                placeholder="Amount (₹)"
                                value={advForm.amount}
                                onChange={e => setAdvForm(f => ({ ...f, amount: e.target.value }))}
                                className="text-sm h-8"
                              />
                              <Input
                                type="date"
                                value={advForm.receiptDate}
                                onChange={e => setAdvForm(f => ({ ...f, receiptDate: e.target.value }))}
                                className="text-sm h-8"
                              />
                            </div>
                            <Select value={advForm.paymentMode || "__none__"} onValueChange={v => setAdvForm(f => ({ ...f, paymentMode: v === "__none__" ? "" : v }))}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Payment mode (optional)" /></SelectTrigger>
                              <SelectContent position="popper">
                                <SelectItem value="__none__">— Mode —</SelectItem>
                                {PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="Reference / cheque no. (optional)"
                              value={advForm.referenceNo}
                              onChange={e => setAdvForm(f => ({ ...f, referenceNo: e.target.value }))}
                              className="text-sm h-8"
                            />
                            <Input
                              placeholder="Notes (optional)"
                              value={advForm.notes}
                              onChange={e => setAdvForm(f => ({ ...f, notes: e.target.value }))}
                              className="text-sm h-8"
                            />
                            <Button
                              size="sm"
                              className="w-full h-8 text-sm"
                              disabled={!advForm.amount || !advForm.receiptDate || createAdvanceReceipt.isPending}
                              onClick={() => createAdvanceReceipt.mutate()}>
                              {createAdvanceReceipt.isPending ? "Saving…" : "Record Advance Receipt"}
                            </Button>
                          </div>
                        )}

                        {receipts.length === 0 && !advShowForm ? (
                          <p className="text-xs text-muted-foreground text-center py-3 border rounded-lg">No advance receipts recorded yet</p>
                        ) : receipts.length > 0 && (
                          <div className="border rounded-lg divide-y text-sm">
                            {receipts.map(r => (
                              <div key={r.id} className="flex items-center gap-2 px-3 py-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-emerald-700">₹{Number(r.amount).toLocaleString("en-IN", { minimumFractionDigits: 0 })}</div>
                                  <div className="text-xs text-muted-foreground">{new Date(r.receiptDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}{r.paymentMode ? ` · ${r.paymentMode}` : ""}{r.referenceNo ? ` · ${r.referenceNo}` : ""}</div>
                                  {r.notes && <div className="text-xs text-muted-foreground truncate">{r.notes}</div>}
                                </div>
                                <button
                                  className="text-muted-foreground hover:text-destructive shrink-0 p-1"
                                  onClick={() => deleteAdvanceReceipt.mutate(r.id)}
                                  title="Delete receipt">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {selected.stage === "material_supplied" && (() => {
                  const SO_STATUS_COLOR: Record<string, string> = {
                    Draft: "bg-zinc-100 text-zinc-700",
                    Confirmed: "bg-blue-100 text-blue-700",
                    "In Production": "bg-amber-100 text-amber-700",
                    Shipped: "bg-indigo-100 text-indigo-700",
                    Delivered: "bg-emerald-100 text-emerald-700",
                    Cancelled: "bg-red-100 text-red-700",
                  };
                  const SHIP_STATUS_COLOR: Record<string, string> = {
                    Created: "bg-zinc-100 text-zinc-700",
                    "Label Generated": "bg-blue-100 text-blue-700",
                    "In Transit": "bg-amber-100 text-amber-800",
                    Delivered: "bg-emerald-100 text-emerald-700",
                    Returned: "bg-red-100 text-red-700",
                  };
                  const shipments = oppShipments ?? [];
                  return (
                    <div className="space-y-4" data-testid="section-material-supplied">
                      {/* Linked Sales Order */}
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <PackageCheck className="w-3.5 h-3.5" />Sales Order
                        </div>
                        {!firstSO ? (
                          <p className="text-xs text-muted-foreground text-center py-3 border rounded-lg">
                            No Sales Order found — convert a quote first from the Received PO stage
                          </p>
                        ) : (
                          <div className="border rounded-lg p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-primary">{firstSO.orderNumber}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SO_STATUS_COLOR[firstSO.status] ?? "bg-muted text-muted-foreground"}`}>{firstSO.status}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold">₹{firstSO.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                              <a href="/sales-orders" className="text-muted-foreground hover:text-foreground p-1">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                            {firstSO.deliveryDate && (
                              <div className="text-xs text-muted-foreground">
                                Delivery: {new Date(firstSO.deliveryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                              </div>
                            )}
                            {firstSO.poNumber && <div className="text-xs text-muted-foreground">PO: {firstSO.poNumber}</div>}
                          </div>
                        )}
                      </div>

                      {/* Shipments */}
                      {firstSO && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5" />Shipments
                              {shipments.length > 0 && <span className="text-foreground font-bold">{shipments.length}</span>}
                            </div>
                            <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setShipShowForm(v => !v)}>
                              {shipShowForm ? "Cancel" : <><Plus className="w-3 h-3 mr-1" />Create</>}
                            </Button>
                          </div>

                          {shipShowForm && (
                            <div className="border rounded-lg p-3 space-y-2.5 bg-muted/10 mb-3">
                              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">New Shipment</div>
                              <Input
                                placeholder="Courier Partner *"
                                value={shipForm.courierPartner}
                                onChange={e => setShipForm(f => ({ ...f, courierPartner: e.target.value }))}
                                className="text-sm h-8"
                              />
                              <Input
                                placeholder="Tracking Number (optional)"
                                value={shipForm.trackingNumber}
                                onChange={e => setShipForm(f => ({ ...f, trackingNumber: e.target.value }))}
                                className="text-sm h-8"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Est. Delivery</p>
                                  <Input
                                    type="date"
                                    value={shipForm.estimatedDelivery}
                                    onChange={e => setShipForm(f => ({ ...f, estimatedDelivery: e.target.value }))}
                                    className="text-sm h-8"
                                  />
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">No. of Boxes</p>
                                  <Input
                                    type="number"
                                    min="1"
                                    placeholder="e.g. 12"
                                    value={shipForm.numberOfBoxes}
                                    onChange={e => setShipForm(f => ({ ...f, numberOfBoxes: e.target.value }))}
                                    className="text-sm h-8"
                                  />
                                </div>
                              </div>
                              <Button
                                size="sm"
                                className="w-full h-8 text-sm"
                                disabled={!shipForm.courierPartner.trim() || createShipment.isPending}
                                onClick={() => createShipment.mutate(firstSO.id)}>
                                {createShipment.isPending ? "Creating…" : "Create Shipment"}
                              </Button>
                            </div>
                          )}

                          {shipments.length === 0 && !shipShowForm ? (
                            <p className="text-xs text-muted-foreground text-center py-3 border rounded-lg">No shipments yet — create one above</p>
                          ) : shipments.length > 0 && (
                            <div className="space-y-2">
                              {shipments.map(sh => {
                                const nextStatus = sh.validTransitions[0] ?? null;
                                const isAdvancing = advancingShipId === sh.id;
                                return (
                                  <div key={sh.id} className="border rounded-lg p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="font-mono text-xs font-bold">{sh.shipmentNumber}</span>
                                      </div>
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SHIP_STATUS_COLOR[sh.status] ?? "bg-muted text-muted-foreground"}`}>{sh.status}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground space-y-0.5">
                                      <div><span className="font-medium">Courier:</span> {sh.courierPartner}</div>
                                      {sh.trackingNumber && <div><span className="font-medium">Tracking:</span> <span className="font-mono">{sh.trackingNumber}</span></div>}
                                      {sh.numberOfBoxes && <div><span className="font-medium">Boxes:</span> {sh.numberOfBoxes}</div>}
                                      {sh.dispatchDate && <div><span className="font-medium">Dispatched:</span> {new Date(sh.dispatchDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>}
                                      {sh.estimatedDelivery && <div><span className="font-medium">Est. Delivery:</span> {new Date(sh.estimatedDelivery).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>}
                                    </div>
                                    <div className="flex items-center gap-2 pt-1">
                                      {nextStatus && (
                                        <Button
                                          size="sm"
                                          className="flex-1 h-7 text-xs"
                                          disabled={isAdvancing}
                                          onClick={() => advanceShipmentStatus.mutate({ shipId: sh.id, status: nextStatus })}>
                                          {isAdvancing ? "Updating…" : (
                                            nextStatus === "In Transit" ? <><Navigation className="w-3 h-3 mr-1" />Mark In Transit</> :
                                            nextStatus === "Label Generated" ? <><Check className="w-3 h-3 mr-1" />Generate Label</> :
                                            nextStatus === "Delivered" ? <><PackageCheck className="w-3 h-3 mr-1" />Mark Delivered</> :
                                            nextStatus
                                          )}
                                        </Button>
                                      )}
                                      <button
                                        title="Print Delivery Challan"
                                        className="text-muted-foreground hover:text-foreground p-1.5 border rounded"
                                        onClick={() => printDeliveryChallan({
                                          shipmentNumber: sh.shipmentNumber,
                                          salesOrderId: sh.salesOrderId,
                                          orderNumber: sh.orderNumber,
                                          courierPartner: sh.courierPartner,
                                          trackingNumber: sh.trackingNumber,
                                          dispatchDate: sh.dispatchDate,
                                          estimatedDelivery: sh.estimatedDelivery,
                                          numberOfBoxes: sh.numberOfBoxes,
                                          totalWeight: sh.totalWeight ?? undefined,
                                          freightCost: sh.freightCost,
                                          items: sh.items,
                                        })}>
                                        <Printer className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── Received Complete Payments ── */}
                {selected.stage === "received_payments" && (() => {
                  const PAYMENT_MODES = ["Cash", "Bank Transfer", "Cheque", "UPI", "NEFT/RTGS", "Other"];
                  const payments = oppPayments ?? [];
                  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
                  const balance = oppInvoice ? oppInvoice.grandTotal - totalPaid : 0;
                  const invoiceStatusColor: Record<string, string> = {
                    Draft: "bg-zinc-100 text-zinc-700",
                    Issued: "bg-blue-100 text-blue-700",
                    "Partially Paid": "bg-amber-100 text-amber-700",
                    Paid: "bg-emerald-100 text-emerald-700",
                    Cancelled: "bg-red-100 text-red-700",
                  };
                  return (
                    <div className="space-y-4" data-testid="section-received-payments">

                      {/* Linked SO card (compact) */}
                      {firstSO && (
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <PackageCheck className="w-3.5 h-3.5" />Sales Order
                          </div>
                          <div className="border rounded-lg p-3 flex items-center justify-between">
                            <div>
                              <span className="font-mono text-xs font-bold text-primary">{firstSO.orderNumber}</span>
                              <p className="text-sm font-bold mt-0.5">₹{firstSO.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              firstSO.status === "Confirmed" ? "bg-blue-100 text-blue-700" :
                              firstSO.status === "Delivered" ? "bg-emerald-100 text-emerald-700" :
                              "bg-zinc-100 text-zinc-700"
                            }`}>{firstSO.status}</span>
                          </div>
                        </div>
                      )}
                      {!firstSO && (
                        <p className="text-xs text-muted-foreground text-center py-3 border rounded-lg">No Sales Order linked to this opportunity yet.</p>
                      )}

                      {/* Invoice & Payments section */}
                      {firstSO && (
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />Invoice &amp; Payments
                          </div>

                          {!oppInvoice ? (
                            <p className="text-xs text-muted-foreground text-center py-3 border rounded-lg border-dashed">
                              No invoice generated yet. Go to <a href="/invoices" className="underline text-primary">Invoices</a> to generate one from the Sales Order.
                            </p>
                          ) : (
                            <div className="border rounded-lg p-3 space-y-3">
                              {/* Invoice header */}
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-primary">{oppInvoice.invoiceNumber}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${invoiceStatusColor[oppInvoice.status] ?? "bg-muted text-muted-foreground"}`}>{oppInvoice.status}</span>
                              </div>

                              {/* Amount summary */}
                              <div className="grid grid-cols-3 gap-1 text-center">
                                <div className="bg-muted/50 rounded p-1.5">
                                  <p className="text-xs text-muted-foreground">Total</p>
                                  <p className="text-xs font-bold">₹{oppInvoice.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className="bg-emerald-50 rounded p-1.5">
                                  <p className="text-xs text-muted-foreground">Paid</p>
                                  <p className="text-xs font-bold text-emerald-700">₹{totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className={`rounded p-1.5 ${balance > 0 ? "bg-red-50" : "bg-emerald-50"}`}>
                                  <p className="text-xs text-muted-foreground">Balance</p>
                                  <p className={`text-xs font-bold ${balance > 0 ? "text-red-600" : "text-emerald-700"}`}>₹{Math.max(0, balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                                </div>
                              </div>

                              {oppInvoice.dueDate && (
                                <p className="text-xs text-muted-foreground">Due: {new Date(oppInvoice.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                              )}

                              {/* Fully paid banner */}
                              {oppInvoice.status === "Paid" && (
                                <div className="flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 rounded-md">
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-xs font-semibold text-emerald-700">Fully Paid</span>
                                </div>
                              )}

                              {/* Record payment toggle — only when not fully paid */}
                              {oppInvoice.status !== "Paid" && oppInvoice.status !== "Cancelled" && (
                                <Button
                                  size="sm"
                                  className="w-full h-7 text-xs"
                                  variant={pmtShowForm ? "outline" : "default"}
                                  onClick={() => setPmtShowForm(v => !v)}>
                                  {pmtShowForm ? "Cancel" : <><Plus className="w-3 h-3 mr-1" />Record Payment</>}
                                </Button>
                              )}

                              {/* Payment form */}
                              {pmtShowForm && oppInvoice.status !== "Paid" && (
                                <div className="space-y-2 border-t pt-3">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-xs text-muted-foreground">Amount (₹) *</label>
                                      <Input
                                        type="number" min="0" step="0.01"
                                        placeholder={balance > 0 ? balance.toFixed(2) : "0.00"}
                                        className="h-7 text-xs mt-0.5"
                                        value={pmtForm.amount}
                                        onChange={e => setPmtForm(f => ({ ...f, amount: e.target.value }))} />
                                    </div>
                                    <div>
                                      <label className="text-xs text-muted-foreground">Date *</label>
                                      <Input
                                        type="date"
                                        className="h-7 text-xs mt-0.5"
                                        value={pmtForm.paymentDate}
                                        onChange={e => setPmtForm(f => ({ ...f, paymentDate: e.target.value }))} />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">Payment Mode</label>
                                    <select
                                      className="w-full h-7 mt-0.5 text-xs border rounded-md px-2 bg-background"
                                      value={pmtForm.paymentMode}
                                      onChange={e => setPmtForm(f => ({ ...f, paymentMode: e.target.value }))}>
                                      <option value="">— Select —</option>
                                      {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">Reference / Txn No.</label>
                                    <Input
                                      placeholder="UTR, cheque no., etc."
                                      className="h-7 text-xs mt-0.5"
                                      value={pmtForm.referenceNo}
                                      onChange={e => setPmtForm(f => ({ ...f, referenceNo: e.target.value }))} />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">Notes</label>
                                    <Input
                                      placeholder="Optional"
                                      className="h-7 text-xs mt-0.5"
                                      value={pmtForm.notes}
                                      onChange={e => setPmtForm(f => ({ ...f, notes: e.target.value }))} />
                                  </div>
                                  <Button
                                    size="sm"
                                    className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                    disabled={recordInvoicePayment.isPending || !pmtForm.amount || !pmtForm.paymentDate}
                                    onClick={() => {
                                      if (!oppInvoice) return;
                                      recordInvoicePayment.mutate({
                                        invoiceId: oppInvoice.id,
                                        amount: Number(pmtForm.amount),
                                        paymentMode: pmtForm.paymentMode,
                                        referenceNo: pmtForm.referenceNo,
                                        paymentDate: pmtForm.paymentDate,
                                        notes: pmtForm.notes,
                                      });
                                    }}>
                                    {recordInvoicePayment.isPending ? "Saving…" : <><Check className="w-3 h-3 mr-1" />Save Payment</>}
                                  </Button>
                                </div>
                              )}

                              {/* Payments history */}
                              {payments.length > 0 && (
                                <div className="border-t pt-2 space-y-1.5">
                                  <p className="text-xs font-semibold text-muted-foreground">Payment History</p>
                                  {payments.map(p => (
                                    <div key={p.id} className="flex items-center justify-between py-1 border-b last:border-0">
                                      <div>
                                        <p className="text-xs font-medium">₹{p.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                                        <p className="text-xs text-muted-foreground">{new Date(p.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}{p.paymentMode ? ` · ${p.paymentMode}` : ""}</p>
                                      </div>
                                      {p.referenceNo && <span className="text-xs text-muted-foreground font-mono truncate max-w-[80px]">{p.referenceNo}</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <Button variant="destructive" className="w-full" onClick={() => del.mutate(selected.id)} disabled={del.isPending}>
                  <Trash2 className="w-4 h-4 mr-2" />Delete Opportunity
                </Button>
              </div>}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Return Dialog ── */}
      <Dialog open={returnDialog} onOpenChange={(o) => { setReturnDialog(o); if (!o) setReturningOrder(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Package className="w-4 h-4" />{returningOrder?.status === "Returned" ? "Set Disposition" : "Record Return"} — {returningOrder?.sampleNumber}
            </DialogTitle>
          </DialogHeader>
          {returningOrder && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {returningOrder.status === "Returned"
                    ? "Assign Gift or Invoice for kept items."
                    : "Set returned qty. For any units kept, choose Gift or Invoice."}
                </p>
                {returningOrder.status !== "Returned" && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-orange-600 shrink-0"
                    onClick={() => setReturnQtys(Object.fromEntries(returningOrder.items.map(i => [i.id, i.quantity])))}>
                    Return All
                  </Button>
                )}
              </div>
              <div className="divide-y border rounded-lg overflow-hidden">
                {returningOrder.items.map(item => {
                  const rQty = returnQtys[item.id] ?? item.quantity;
                  const keptQty = item.quantity - rQty;
                  const disp = dispositions[item.id] ?? null;
                  return (
                    <div key={item.id} className="px-3 py-2.5 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium flex-1 min-w-0 truncate">{item.productName}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">sent {item.quantity}</span>
                        {returningOrder.status === "Returned" ? (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {rQty > 0 ? `${rQty} returned` : "none returned"}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                            <span>return</span>
                            <Input
                              type="number" min={0} max={item.quantity}
                              className="w-14 h-7 text-sm text-center px-1"
                              value={rQty}
                              onChange={e => setReturnQtys(q => ({ ...q, [item.id]: Math.min(item.quantity, Math.max(0, Number(e.target.value))) }))}
                            />
                          </div>
                        )}
                      </div>
                      {keptQty > 0 && (
                        <div className="flex items-center gap-2 pl-1">
                          <span className="text-xs text-muted-foreground">Kept {keptQty} →</span>
                          <button
                            type="button"
                            onClick={() => setDispositions(d => ({ ...d, [item.id]: "gift" }))}
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${disp === "gift" ? "bg-emerald-500 text-white border-emerald-500" : "border-muted-foreground/30 text-muted-foreground hover:border-emerald-400 hover:text-emerald-600"}`}>
                            🎁 Gift
                          </button>
                          <button
                            type="button"
                            onClick={() => setDispositions(d => ({ ...d, [item.id]: "invoice" }))}
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${disp === "invoice" ? "bg-blue-500 text-white border-blue-500" : "border-muted-foreground/30 text-muted-foreground hover:border-blue-400 hover:text-blue-600"}`}>
                            🧾 Invoice
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => submitReturn.mutate()}
                  disabled={submitReturn.isPending}>
                  {submitReturn.isPending ? "Saving…" : returningOrder.status === "Returned" ? "Save Disposition" : "Confirm Return"}
                </Button>
                <Button variant="outline" className="shrink-0"
                  title={returningOrder.status === "Returned" ? "Print Return Note" : "Print Sample Order"}
                  onClick={() => returningOrder.status === "Returned"
                    ? printReturnNote({ ...returningOrder, opportunityTitle: selected?.title ?? null })
                    : printSampleOrder({ ...returningOrder, opportunityTitle: selected?.title ?? null })}>
                  <Printer className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── New Sample Order Dialog ── */}
      <Dialog open={sampleDialog} onOpenChange={(o) => { setSampleDialog(o); if (!o) resetSampleForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-violet-500" />New Sample Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selected && (
              <p className="text-sm text-muted-foreground">
                For <strong className="text-foreground">{selected.title}</strong>
                {selected.clientName ? <> · {selected.clientName}</> : null}
              </p>
            )}
            {selected && !selected.clientId && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Customer Name *</label>
                <Input value={sampleCustomer} onChange={e => setSampleCustomer(e.target.value)} placeholder="Customer / company name" data-testid="input-sample-customer" />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sample Products *</label>
              {sampleLines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Select value={line.productId} onValueChange={v => setSampleLines(ls => ls.map((l, i) => i === idx ? { ...l, productId: v } : l))}>
                    <SelectTrigger className="flex-1" data-testid={`select-sample-product-${idx}`}>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {(products ?? []).map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" min={1} className="w-20" value={line.quantity}
                    onChange={e => setSampleLines(ls => ls.map((l, i) => i === idx ? { ...l, quantity: e.target.value } : l))}
                    data-testid={`input-sample-qty-${idx}`} />
                  {sampleLines.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0"
                      onClick={() => setSampleLines(ls => ls.filter((_, i) => i !== idx))}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <Button size="sm" variant="outline" className="text-xs"
                onClick={() => setSampleLines(ls => [...ls, { productId: "", quantity: "1" }])}>
                <Plus className="w-3 h-3 mr-1" />Add Product
              </Button>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={sampleNotes} onChange={e => setSampleNotes(e.target.value)} rows={2}
                placeholder="Courier details, customization notes…" data-testid="input-sample-notes" />
            </div>
            <Button className="w-full" onClick={() => createSample.mutate()}
              disabled={!canCreateSample || createSample.isPending} data-testid="button-create-sample-order">
              <FlaskConical className="w-4 h-4 mr-2" />
              {createSample.isPending ? "Creating…" : "Create Sample Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
