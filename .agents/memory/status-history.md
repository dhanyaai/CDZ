---
name: Status history tracking
description: How status/stage transitions are recorded and the migration convention for new tables.
---

- Every status/stage change must be recorded through the shared status-history helper — including indirect paths (payment-driven invoice status, credit-note apply, sample conversions, lead convert). **Why:** the KPI history view silently misses changes otherwise. **How to apply:** when adding any route that mutates a status column, instrument it too.
- **Migration convention:** auto-generation of migrations is broken in this repo (meta snapshots are stale). New schema changes need a hand-written idempotent SQL migration (IF NOT EXISTS / duplicate_object guards) plus a matching journal entry, so startup migrate() applies it cleanly in prod while dev uses push.
- Order-processing form step dates are date-only strings (YYYY-MM-DD); compare on calendar days, never directly against timestamptz values (timezone off-by-one).
