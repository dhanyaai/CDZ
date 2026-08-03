import { db, statusHistoryTable } from "@workspace/db";

export type StatusEntity =
  | "lead" | "opportunity" | "quote" | "sales_order" | "invoice"
  | "purchase_order" | "sample_order" | "proforma_invoice";

/**
 * Record a status/stage transition. Never throws — history must not break the
 * main operation. Skips no-op transitions (from === to).
 */
export async function recordStatusChange(opts: {
  companyId: number;
  entityType: StatusEntity;
  entityId: number;
  fromStatus: string | null;
  toStatus: string;
  changedBy?: number | null;
  reason?: string | null;
  reasonNote?: string | null;
}): Promise<void> {
  if (opts.fromStatus === opts.toStatus) return;
  try {
    await db.insert(statusHistoryTable).values({
      companyId: opts.companyId,
      entityType: opts.entityType,
      entityId: opts.entityId,
      fromStatus: opts.fromStatus,
      toStatus: opts.toStatus,
      changedBy: opts.changedBy ?? null,
      reason: opts.reason ?? null,
      reasonNote: opts.reasonNote ?? null,
    });
  } catch (err) {
    console.error("statusHistory: failed to record", err);
  }
}
