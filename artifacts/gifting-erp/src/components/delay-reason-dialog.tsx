import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const DELAY_REASONS = [
  "Client was slow to respond",
  "Waiting on internal approval",
  "Team bandwidth / workload",
  "Waiting on vendor / product info",
  "Pricing negotiation dragged on",
  "Requirements kept changing",
  "Holiday / client unavailable",
  "Other",
] as const;

// Mirrors the server defaults in KPI_DEADLINES (api-server routes/kpi.ts).
// Used only as a fallback until the company's configured targets load.
export const KPI_DELAY_TARGETS = {
  leadToOpportunity: 1, // days
  opportunityToQuote: 2, // days
  quoteToOrder: 3, // days
  orderToInvoice: 7, // days
  invoiceToPayment: 30, // days
};

export type KpiDelayTargets = typeof KPI_DELAY_TARGETS;

/**
 * Company KPI deadline targets: the defaults overlaid with any per-company
 * overrides configured in Settings → KPI Targets. Shares the react-query
 * cache with the Settings page.
 */
export function useKpiDelayTargets(): KpiDelayTargets {
  const { data } = useQuery<{ kpiTargets: Record<string, number> | null }>({
    queryKey: ["settings", "company"],
    queryFn: () => api("/v1/settings/company"),
    staleTime: 60_000,
  });
  const overrides = data?.kpiTargets;
  const out = { ...KPI_DELAY_TARGETS };
  if (overrides && typeof overrides === "object") {
    for (const k of Object.keys(out) as (keyof KpiDelayTargets)[]) {
      const v = overrides[k];
      if (typeof v === "number" && Number.isFinite(v) && v > 0) out[k] = v;
    }
  }
  return out;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Whole days elapsed since an ISO date/Date. */
export const daysSince = (iso: string | Date) =>
  (Date.now() - new Date(iso).getTime()) / DAY_MS;

interface Props {
  open: boolean;
  title: string; // e.g. "This lead is past its follow-up target"
  entityLabel: string; // record title shown in description
  daysOverTarget?: number | null; // rounded days beyond the KPI target, for context
  pending?: boolean;
  onConfirm: (reason: string, note: string | null) => void;
  onSkip: () => void; // proceed with the stage change without a reason
  onCancel: () => void; // abort the stage change entirely
}

/**
 * Prompts for a slip/delay reason when a stage that blew past its KPI deadline
 * finally completes. Feeds the "Delay Reasons" breakdown on the KPI page.
 */
export function DelayReasonDialog({ open, title, entityLabel, daysOverTarget, pending, onConfirm, onSkip, onCancel }: Props) {
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");

  const reset = () => { setReason(""); setNote(""); };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onCancel(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            “{entityLabel}” went past its KPI deadline{daysOverTarget != null && daysOverTarget > 0 ? ` by ~${daysOverTarget} day${daysOverTarget === 1 ? "" : "s"}` : ""}.
            What caused the delay? This feeds the Delay Reasons report on the KPI page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Reason for delay</Label>
            <Select value={reason || undefined} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Select a reason…" /></SelectTrigger>
              <SelectContent position="popper">
                {DELAY_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Details (optional)</Label>
            <Textarea rows={3} placeholder="Any extra context — what was blocking, who we were waiting on, etc." value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { reset(); onCancel(); }} disabled={pending}>Cancel</Button>
            <Button variant="ghost" onClick={() => { reset(); onSkip(); }} disabled={pending}>Skip</Button>
            <Button
              disabled={!reason || pending}
              onClick={() => { onConfirm(reason, note.trim() || null); reset(); }}>
              {pending ? "Saving…" : "Save & Continue"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
