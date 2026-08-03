import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const LOSS_REASONS = [
  "Price too high",
  "Lost to competitor",
  "No budget",
  "Timeline too tight",
  "Client unresponsive",
  "Requirements changed",
  "Quality / product mismatch",
  "Duplicate / junk enquiry",
  "Other",
] as const;

interface Props {
  open: boolean;
  title: string; // e.g. "Mark lead as lost"
  entityLabel: string; // e.g. lead/opportunity title shown in description
  pending?: boolean;
  onConfirm: (reason: string, note: string | null) => void;
  onCancel: () => void;
}

/** Prompts for a loss reason (picklist + optional free text) before marking a lead/opportunity lost. */
export function LossReasonDialog({ open, title, entityLabel, pending, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");

  const reset = () => { setReason(""); setNote(""); };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onCancel(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Why was “{entityLabel}” lost? This feeds the Loss Reasons report on the KPI page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reason || undefined} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Select a reason…" /></SelectTrigger>
              <SelectContent position="popper">
                {LOSS_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Details (optional)</Label>
            <Textarea rows={3} placeholder="Any extra context — who we lost to, price gap, etc." value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { reset(); onCancel(); }} disabled={pending}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!reason || pending}
              onClick={() => { onConfirm(reason, note.trim() || null); reset(); }}>
              {pending ? "Saving…" : "Mark as Lost"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
