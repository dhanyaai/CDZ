---
name: Status history tracking
description: How status/stage transitions are recorded and the migration convention for new tables.
---

- Every status/stage change should go through `recordStatusChange` (api-server lib/statusHistory.ts) — including indirect paths (payment-driven invoice status, credit-note apply, sample convert-to-quote/return, lead convert). When adding any new route that mutates a status column, instrument it too or the KPI history view silently misses it.
- **Migration convention:** `drizzle-kit generate` is broken here (meta snapshots stop at 0005 while sql files go beyond). New schema = hand-write `lib/db/migrations/NNNN_*.sql` (idempotent: IF NOT EXISTS / duplicate_object guards) + append entry to `meta/_journal.json` (idx, version "7", when=now ms, tag). Dev applies via `pnpm --filter @workspace/db run push`; prod applies via startup migrate().
- Order-processing form step dates in `order_processing_forms.formData` are date-only strings (YYYY-MM-DD); compare on calendar days, never `new Date(str)` vs timestamptz directly (timezone off-by-one).
