export function formatINR(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  if (isNaN(n)) return "₹0";
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function formatINRDecimals(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  if (isNaN(n)) return "₹0.00";
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  Draft:              { label: "Draft",             color: "bg-slate-100 text-slate-700" },
  Confirmed:          { label: "Confirmed",          color: "bg-blue-100 text-blue-700" },
  "In Production":    { label: "In Production",      color: "bg-purple-100 text-purple-700" },
  "Ready to Dispatch":{ label: "Ready to Dispatch",  color: "bg-amber-100 text-amber-700" },
  Dispatched:         { label: "Dispatched",          color: "bg-orange-100 text-orange-700" },
  Delivered:          { label: "Delivered",           color: "bg-emerald-100 text-emerald-700" },
  Cancelled:          { label: "Cancelled",           color: "bg-red-100 text-red-700" },
  Ordered:            { label: "Ordered",             color: "bg-blue-100 text-blue-700" },
  "Partially Received":{ label: "Partially Received", color: "bg-amber-100 text-amber-700" },
  "Fully Received":   { label: "Fully Received",      color: "bg-emerald-100 text-emerald-700" },
  Pending:            { label: "Pending",             color: "bg-yellow-100 text-yellow-700" },
  "In Progress":      { label: "In Progress",         color: "bg-blue-100 text-blue-700" },
  Completed:          { label: "Completed",           color: "bg-emerald-100 text-emerald-700" },
  Rejected:           { label: "Rejected",            color: "bg-red-100 text-red-700" },
  Unpaid:             { label: "Unpaid",              color: "bg-red-100 text-red-700" },
  "Partially Paid":   { label: "Partially Paid",      color: "bg-amber-100 text-amber-700" },
  Paid:               { label: "Paid",                color: "bg-emerald-100 text-emerald-700" },
  sent:               { label: "Sent",                color: "bg-blue-100 text-blue-700" },
  accepted:           { label: "Accepted",            color: "bg-emerald-100 text-emerald-700" },
  rejected:           { label: "Rejected",            color: "bg-red-100 text-red-700" },
  draft:              { label: "Draft",               color: "bg-slate-100 text-slate-700" },
};

export function statusBadge(status: string): { label: string; color: string } {
  return STATUS_CONFIG[status] ?? { label: status, color: "bg-slate-100 text-slate-600" };
}

export const GST_RATES = [0, 5, 12, 18, 28];

export const INDIAN_STATES: { code: string; name: string }[] = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh (New)" },
];
