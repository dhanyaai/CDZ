---
name: Gifting ERP change workflow
description: Correct order of operations when making schema + API + UI changes in this monorepo
---

**Rule:** When making end-to-end changes that touch DB schema, API routes, and UI:

1. Edit `lib/db/src/schema/*.ts`
2. Run `pnpm run typecheck:libs` (catches lib errors before push)
3. Run `pnpm --filter @workspace/db run push` (applies migration)
4. Edit API route in `artifacts/api-server/src/routes/`
5. Update `lib/api-spec/openapi.yaml` with all new fields
6. Run `pnpm --filter @workspace/api-spec run codegen` (regenerates hooks + Zod schemas + rebuilds libs)
7. Edit UI pages in `artifacts/gifting-erp/src/pages/`
8. Run `pnpm --filter @workspace/gifting-erp run typecheck` and `pnpm --filter @workspace/api-server run typecheck` to verify

**Why:** Skipping codegen after OpenAPI spec changes leaves generated types stale — the UI will work via `as any` casts but typed hooks won't reflect new fields, causing future type errors.

**Key pitfall:** `salesOrdersTable.totalAmount` stores the post-discount subtotal (before GST). If you need the original pre-discount subtotal for display, sum line items directly from the items array rather than back-calculating from totalAmount + discountPct.
