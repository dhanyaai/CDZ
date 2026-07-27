import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

/**
 * Prompt for the customer's PO number before converting a quote into a Sales Order.
 * The PO number is stored on the sales order and shown on its printout.
 */
export function ConvertToSalesOrderDialog({
  open,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  pending: boolean;
  onCancel: () => void;
  /** Called with the trimmed PO number, or null when left blank. */
  onConfirm: (poNumber: string | null) => void;
}) {
  const [poNumber, setPoNumber] = useState("");
  useEffect(() => {
    if (open) setPoNumber("");
  }, [open]);

  const confirm = () => {
    if (!pending) onConfirm(poNumber.trim() || null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !pending) onCancel(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Convert to Sales Order</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium">Customer PO Number</label>
          <Input
            autoFocus
            placeholder="e.g. PO/2026/0042"
            value={poNumber}
            maxLength={100}
            onChange={(e) => setPoNumber(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") confirm(); }}
          />
          <p className="text-xs text-muted-foreground">
            Shown on the sales order and its printout. Leave blank if the client hasn't shared a PO number.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={pending} onClick={onCancel}>Cancel</Button>
          <Button size="sm" disabled={pending} onClick={confirm}>
            {pending ? "Creating…" : <><ArrowRight className="w-4 h-4 mr-1" />Create Sales Order</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
