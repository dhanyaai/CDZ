# GAP_REPORT.md — Customize Duniya ERP (agent-verified against code)

> **Agent instructions:** For each row, open the code, confirm or correct the Status, and fill **Code refs** with actual file paths. Do not rewrite ✅ Protected rows. Fix order: Phase A → B → C → 5 (see `ERP_AUDIT_UPGRADE_SPEC.md`).
> **Legend:** ✅ working/protected · ⚠️ partial · ❌ missing · 🐞 defect
> **Verified by agent:** 2026-07-15 · **Rows corrected vs pre-seed:** 4 (marked 🔄)

---

## Identity, Tenancy & Access

| # | Area | Status | Finding | Fix | Code refs |
|---|---|---|---|---|---|
| 1 | Multi-company tenancy + switcher + feature flags | ✅ | `company_id` scoping on all tables; `/v1/companies/:id/switch` issues new token; per-company feature flags via `PATCH /v1/companies/:id/features` | Protect | `lib/db/src/schema/companies.ts`, `lib/db/src/schema/userCompanies.ts`, `artifacts/api-server/src/routes/companies.ts` |
| 2 | Auth (JWT, login/logout/change-password) | ✅ | Works | Protect | `artifacts/api-server/src/routes/auth.ts` |
| 3 | Demo credentials pre-filled + shown on Login | 🐞 | State initialised with `email:"admin@gifterp.com"` / `password:"admin123"` at lines 14–15; literal hint text `"Demo access · admin@gifterp.com / admin123"` rendered at line 163 | C5 | `artifacts/gifting-erp/src/pages/login.tsx` lines 14–15, 163 |
| 4 | Granular permissions | ⚠️ | `permissions` table exists in schema (exported from index). But role-level middleware only; no per-route permission checks consistently applied | B5 | `lib/db/src/schema/permissions.ts`, `artifacts/api-server/src/middleware/` |
| 5 | Lockout / rate limit / helmet / optimistic locking | ❌ | No security hardening middleware found in `index.ts`; `nodemailer` dependency declared but not rate limiting, no helmet | C5 | `artifacts/api-server/src/index.ts` |

---

## CRM & Quotes

| # | Area | Status | Finding | Fix | Code refs |
|---|---|---|---|---|---|
| 6 | Leads → Opportunities → Quotes → SO pipeline, follow-ups, contacts | ✅ | Exceeds target spec | Protect | `artifacts/api-server/src/routes/` (leads, opportunities, quotes, activities, contacts) |
| 7 | Quote GST calculation | 🐞 | `gst = afterDisc * 0.18` hardcoded flat 18% on discounted subtotal. Quote totals will diverge from invoice totals on any mixed-rate order (e.g. product at 12% + product at 28%) | A4 | `artifacts/api-server/src/routes/quotes.ts` lines 88–89 |
| 8 | Quote versioning | ❌ | Edits overwrite in place; no `version_no` column; no lock preventing edits after status = "sent" | B4 | `lib/db/src/schema/quotes.ts` (lines 14–44) |
| 9 | Discount approval workflow | ❌ | `discount_pct` accepted 0–100 with no approval gate or threshold check | B4 | `artifacts/api-server/src/routes/quotes.ts` |
| 10 | Client credit limit / terms enforcement | ❌ | No `credit_limit` column on `clients`; SO confirm never blocked on outstanding balance | B4 | `lib/db/src/schema/clients.ts` |
| 11 | Client/company state codes for place of supply | ⚠️ | `clients.state_code` ✅ (line 14). `vendors.state_code` ✅. **But `companies` table has only `state TEXT`** — no `state_code` integer — so CGST/SGST vs IGST split cannot be driven by company state | A4 | `lib/db/src/schema/clients.ts` line 14, `lib/db/src/schema/companies.ts` (missing `state_code`) |

---

## Catalog

| # | Area | Status | Finding | Fix | Code refs |
|---|---|---|---|---|---|
| 12 | Products (HSN, GST rate, types incl. Packaging, brandable, barcode, CSV import) | ✅ | Strong — `hsnCode`, `gstRate`, `brandable`, `barcode`, CSV import all present | Protect | `lib/db/src/schema/products.ts`, `artifacts/api-server/src/routes/products.ts` |
| 13 | Services catalog with SAC + GST | ✅ | `services` table with `sacCode`, `gstRate`, `type`, `unit` exported from schema index | Protect (make sellable → A3) | `lib/db/src/schema/services.ts`, `artifacts/api-server/src/routes/services.ts`, `artifacts/gifting-erp/src/pages/services.tsx` |
| 14 | Bundles + Bundle Costing + Smart Suggest | ✅ | Bundle CRUD, `/v1/bundles/costing`, `/v1/bundles/suggest` all exist | Protect (make sellable → A3) | `lib/db/src/schema/bundles.ts`, `artifacts/api-server/src/routes/bundles.ts` |
| 15 | Bundle GST mode (mixed-supply vs itemized) | ❌ | No `gst_mode` column on `bundles` table; bundle tax treatment undefined | A3 | `lib/db/src/schema/bundles.ts` |
| 16 | Perishable flag / shelf life | ❌ | `isPerishable` / `shelfLifeDays` not in `products` schema | C2 | `lib/db/src/schema/products.ts` |

---

## Orders

| # | Area | Status | Finding | Fix | Code refs |
|---|---|---|---|---|---|
| 17 | Sales Orders + detail + Order Processing 6-tab form | ✅ | 6-tab traveller form (Order Info / Procurement / Designer / Production / Dispatch / Checklist) is a genuine asset | Protect | `lib/db/src/schema/salesOrders.ts`, `lib/db/src/schema/orderProcessingForms.ts`, `artifacts/api-server/src/routes/salesOrders.ts`, `artifacts/api-server/src/routes/orderProcessing.ts`, `artifacts/gifting-erp/src/pages/order-processing.tsx` |
| 18 | Bundles/services on quote & SO lines (`item_type`) | 🐞 | `quote_items` and `sales_order_items` carry **only `product_id`** — no `item_type`, `bundle_id`, or `service_id` columns exist; bundles and services cannot be added to orders | A3 | `lib/db/src/schema/quotes.ts` lines 29–38, `lib/db/src/schema/salesOrders.ts` lines 30–36 |
| 19 | Reservation on confirm / release on cancel / consume on dispatch | ⚠️ 🔄 | **Corrected from ❌.** `products.reserved_qty` IS incremented on SO confirm and decremented on cancel inside a DB transaction (`soService.ts`). **Missing:** consume (decrement `reserved_qty`) on assembly completion and on dispatch of non-assembled lines; no per-location reservation granularity | A2 | `artifacts/api-server/src/services/soService.ts` lines 64–70 (confirm), 94–100 (cancel cancel) |
| 20 | Excel bulk address import + template | ❌ | Manual dynamic rows only; no bulk import endpoint | B3 | `artifacts/gifting-erp/src/pages/sales-orders.tsx` |
| 21 | Address-level status + partial dispatch | ❌ | `delivery_addresses` has no `status` column; SO status is order-level only | B3 | `lib/db/src/schema/salesOrders.ts` (`deliveryAddressesTable`) |
| 22 | Per-recipient personalization (name-on-gift, card msg) | ❌ | Not captured in schema or UI | B3 | `lib/db/src/schema/salesOrders.ts` |
| 23 | Sample Orders | ✅ | Status flow (Requested → Dispatched → Received → Converted / Rejected) exists with number sequence | Protect (cost posting → C3) | `lib/db/src/schema/sampleOrders.ts`, `artifacts/api-server/src/routes/sampleOrders.ts` |
| 24 | Sample stock/cost posting | ⚠️ | Dispatch status change does not post a `SAMPLE_OUT` inventory movement; no per-client sample-cost rollup | C3 | `artifacts/api-server/src/routes/sampleOrders.ts` |
| 25 | Central state-machine enforcement | ✅ 🔄 | **Corrected from ❌.** `stateMachine.ts` defines and enforces 6 transition maps (SO, PO, Invoice, Assembly, Shipment, Artwork) via `assertTransition()`. Invalid transition throws `StatusError(400, …)` with allowed transitions in payload. | Protect | `artifacts/api-server/src/services/stateMachine.ts` (all 6 `*_TRANSITIONS` constants + `assertTransition` function) |
| 26 | Advance payment at SO (pre-invoice) | 🐞 | `payments.invoice_id` is `notNull()` in schema — a payment row cannot exist without an invoice. The Order-Processing Tab 1 "Advance Received" is a plain text field inside JSONB `form_data`, completely disconnected from financial records | A5 | `lib/db/src/schema/invoices.ts` line 56 (`invoiceId: …notNull()`), `lib/db/src/schema/orderProcessingForms.ts` |

---

## Procurement & Inventory

| # | Area | Status | Finding | Fix | Code refs |
|---|---|---|---|---|---|
| 27 | POs + GRN (accept/reject) + stock inward | ✅ | Full CRUD at `/v1/purchase-orders` and `/v1/grn`; accept/reject qty columns on GRN items | Protect | `lib/db/src/schema/purchaseOrders.ts`, `lib/db/src/schema/grn.ts`, `artifacts/api-server/src/routes/purchaseOrders.ts`, `artifacts/api-server/src/routes/grn.ts` |
| 28 | Auto-PO from confirmed-SO shortfall | ❌ | POs are manual only; SO → PO link is optional (field exists but no auto-generation logic) | B2 (needs A2) | `artifacts/api-server/src/routes/purchaseOrders.ts` |
| 29 | Vendor bills / vendor payments / 3-way match / ledger | ❌ | No `vendor_bills` or `vendor_payments` tables anywhere in `lib/db/src/schema/index.ts` | B1 | `lib/db/src/schema/index.ts` (absent) |
| 30 | Single source of truth for stock | 🐞 | `products.stock_level` is the runtime writable authority. Assembly backflush reads `products.stock_level` directly, deducts, and writes back — AND posts an `inventory_movements` row. But a separate `inventory` schema file also exists (`lib/db/src/schema/inventory.ts`) that may define its own quantity columns. If any path writes both, they drift. | A1 | `artifacts/api-server/src/services/assemblyService.ts` lines 57–75, `lib/db/src/schema/inventory.ts`, `lib/db/src/schema/products.ts` |
| 31 | Multi-location inventory, transfers, item ledger, locations | ✅ | Strong: `warehouse_locations`, transfers (send/receive), item ledger endpoint, per-location stock API all present | Protect | `lib/db/src/schema/locations.ts`, `lib/db/src/schema/warehouses.ts`, `artifacts/api-server/src/routes/inventory.ts` |
| 32 | Batches with expiry + FEFO | ⚠️ | `inventory_movements` carries a `batch` string field; no dedicated `inventory_batches` table, no `expiry_date`, no FEFO picking logic | C2 | `lib/db/src/schema/inventory.ts` (`inventoryMovementsTable`) |
| 33 | Weighted-average cost / stock valuation | ❌ | Only `products.cost_price` (static); no per-location weighted-avg cost computation | C3 | `lib/db/src/schema/products.ts` |
| 34 | Ownership dimension (client custody) | ❌ | No `ownership` column on inventory or batches | C1 | — |

---

## Production & Assembly

| # | Area | Status | Finding | Fix | Code refs |
|---|---|---|---|---|---|
| 35 | Assembly jobs + backflush + partial kits | ✅ | Backflush runs inside `db.transaction()` with `FOR UPDATE` lock on product rows; posts `ASSEMBLY_CONSUME` movement; `completedKits` tracked | Protect | `artifacts/api-server/src/services/assemblyService.ts` lines 50–91 |
| 36 | Assembly linked to a BOM (bundle_id) | 🐞 | `assembly_jobs` has `sales_order_id` but **no `bundle_id`**. Backflush resolves components from `assembly_items` rows manually attached to the job — not from a bundle's BOM — so the BOM source is ambiguous | A3 | `lib/db/src/schema/assembly.ts` (missing `bundle_id`), `artifacts/api-server/src/services/assemblyService.ts` lines 37–48 |
| 37 | QC rejects / scrap cost on assembly | ⚠️ | `completed_kits` column exists; no `rejected_kits` or `scrap_cost` columns | C3 | `lib/db/src/schema/assembly.ts` |
| 38 | Production Orders (feature flag) with BOM + produce | ✅ | Exists; `PATCH /v1/production-orders/:id/status` + `POST /v1/production-orders/:id/produce` | Protect (stock postings audited in A1) | `lib/db/src/schema/productionOrders.ts`, `artifacts/api-server/src/routes/productionOrders.ts` |
| 39 | Artwork approvals lifecycle | ✅ | 4-state flow (Pending Approval → Client Approved → Sent to Vendor → Completed; Rejected → Pending Approval) fully enforced via `ARTWORK_TRANSITIONS` in `stateMachine.ts` | Protect (versioning + portal later) | `artifacts/api-server/src/services/stateMachine.ts` lines 44–50, `artifacts/api-server/src/routes/artwork.ts` |
| 40 | Artwork versioning on rejection | ⚠️ | No `version_no` on `artwork` records; rejection cycles to Pending Approval but creates no version history | C-phase minor | `lib/db/src/schema/artwork.ts` |

---

## Job Work (Service Orders on client material)

| # | Area | Status | Finding | Fix | Code refs |
|---|---|---|---|---|---|
| 41 | Delivery challan IN/OUT for client material | ❌ | Not present; shipment challan print ≠ custody of client-owned material | C1 | — |
| 42 | Job Work Register (received/consumed/returned balance) | ❌ | Not present | C1 | — |
| 43 | Service-line fulfillment status | ❌ | No service lines on SO yet (A3 is prerequisite) | A3 → C1 | — |

---

## Logistics

| # | Area | Status | Finding | Fix | Code refs |
|---|---|---|---|---|---|
| 44 | Shipments (courier, freight, challan print, per-address POD) | ✅ | `SHIPMENT_TRANSITIONS` enforced; `PATCH /v1/shipments/:id/items/:itemId/pod` captures POD receiver name | Protect | `lib/db/src/schema/shipments.ts`, `artifacts/api-server/src/services/stateMachine.ts` lines 36–42, `artifacts/api-server/src/routes/shipments.ts` |
| 45 | Freight → order margin | ⚠️ | `freight_cost` stored on shipment table; never rolled into SO/invoice margin computation | C3 | `lib/db/src/schema/shipments.ts` |
| 46 | E-way bill fields | ❌ | No `eway_bill_no` / `eway_bill_date` columns on shipments or challans | C4 | `lib/db/src/schema/shipments.ts` |

---

## Finance

| # | Area | Status | Finding | Fix | Code refs |
|---|---|---|---|---|---|
| 47 | GST invoices (CGST/SGST/IGST + round-off) + credit notes + AR aging | ✅ | Works | Protect | `lib/db/src/schema/invoices.ts`, `artifacts/api-server/src/routes/invoices.ts`, `artifacts/api-server/src/routes/creditNotes.ts` |
| 48 | Invoice paid via allocations only | 🐞 | `INVOICE_TRANSITIONS` allows `Issued → Paid` directly via status PATCH, bypassing payment recording entirely. No `payment_allocations` table. | A5 | `artifacts/api-server/src/services/stateMachine.ts` lines 21–27, `artifacts/api-server/src/routes/invoices.ts` |
| 49 | Amount in words / place of supply / HSN-SAC summary on tax invoice | ⚠️ | Missing from printed tax invoice document | A4 | `artifacts/gifting-erp/src/pages/invoices.tsx` (print function) |
| 50 | "Overdue" as stored status | ✅ 🔄 | **Corrected from 🐞.** "Overdue" is **not** stored in `invoice.status`. Valid stored values (from `INVOICE_TRANSITIONS`): Draft / Issued / Partially Paid / Paid / Cancelled. Overdue is correctly **derived at read-time** in `notifications.ts` by checking `status != 'Paid' AND due_date ≤ now()`. No fix required. | Protect | `artifacts/api-server/src/services/stateMachine.ts` lines 21–27, `artifacts/api-server/src/routes/notifications.ts` lines 12–25 |
| 51 | Fixed assets + depreciation | ✅ | Bonus module beyond spec | Protect | `lib/db/src/schema/fixedAssets.ts`, `artifacts/api-server/src/routes/fixedAssets.ts` |
| 52 | TDS on vendor payments | ❌ | Payables absent entirely (B1); no TDS fields anywhere | B1 fields / C UI | — |
| 53 | Tally export / GSTR-1 export / Razorpay links | ❌ | Not present | Phase 5 | — |

---

## Platform

| # | Area | Status | Finding | Fix | Code refs |
|---|---|---|---|---|---|
| 54 | Job queue + automation triggers | ❌ | No pg-boss or any queue. `nodemailer` declared as external in `build.mjs` line 52 but no SMTP transporter configured. No SO→PO or GRN→assembly triggers. | B2 | `artifacts/api-server/build.mjs` line 52 |
| 55 | Notifications (table, endpoints, bell) | ⚠️ 🔄 | **Corrected from ❌.** `/v1/notifications` endpoint EXISTS and computes 5 alert categories on-the-fly: overdue invoices, low stock, due activities, draft quotes, partial GRNs. **But:** no persistent `notifications` table, no per-user targeting, no read/unread state, bell unread count not wired to this endpoint. | B2 | `artifacts/api-server/src/routes/notifications.ts` (117 lines) |
| 56 | Email outbox / channels (WhatsApp stub) | ❌ | No `email_outbox` table in schema; `nodemailer` dependency declared but no transporter or service class | B2 / Phase 5 | `artifacts/api-server/build.mjs` line 52 |
| 57 | Soft deletes | 🐞 | **Inconsistent across tables.** `clients`: schema has `deleted_at` ✅ but route calls `db.delete()` (hard delete) 🐞. `products`: schema has `deleted_at` ✅ and route soft-deletes (`set({ deletedAt: new Date() })`) ✅. `locations`: schema has **no** `deleted_at` and no delete route implemented. `credit_notes`: schema has **no** `deleted_at`. | A6 | `lib/db/src/schema/clients.ts` (has `deleted_at`), `artifacts/api-server/src/routes/clients.ts` line 76 (hard `db.delete()`), `artifacts/api-server/src/routes/products.ts` line 242 (soft), `lib/db/src/schema/locations.ts` (missing), `lib/db/src/schema/creditNotes.ts` (missing) |
| 58 | Audit logs with old/new values | ⚠️ | `audit_logs` has `company_id` ✅, `old_values` JSON ✅, `new_values` JSON ✅ — better than pre-seeded. **Still missing:** `ip` column; type is `json` not `jsonb` (no GIN index or operators); unclear if all mutating routes actually write to it | A6 | `lib/db/src/schema/auditLogs.ts` lines 6, 11–12 |
| 59 | Number sequences (FY, per doc type) | ✅ | `number_sequences` (company_id, doc_type, fy_label, last_number); generation uses `SELECT … FOR UPDATE` | Protect (add DC type; check FOR UPDATE → A7/C4) | `lib/db/src/schema/numberSequences.ts`, `artifacts/api-server/src/lib/numberSequence.ts` line 33 |
| 60 | Structured logging (pino + request IDs) | ❌ | Not present; ad-hoc logging | C7 | `artifacts/api-server/src/index.ts` |
| 61 | Automated tests for money/stock logic | ❌ | No test suite (`npm test` not configured) | C7 | — |
| 62 | Master-data import beyond products (clients/vendors/services/opening stock) | ⚠️ | Products CSV import ✅; clients, vendors, services, opening stock import absent | C6 | `artifacts/api-server/src/routes/products.ts` |
| 63 | Modern UI system (Cmd+K, dark mode, skeletons, empty states, toasts, sheets) | ✅ | Meets baseline: shadcn/Radix, Tailwind v4, dark mode toggle, skeleton loading, AlertDialogs for destructive actions, toasts, sheets | Protect (deltas only) | `artifacts/gifting-erp/src/components/layout/AppLayout.tsx`, `artifacts/gifting-erp/src/components/ui/` |
| 64 | Single `formatINR`/`formatDate` + `statusConfig` consolidation | ⚠️ | Not verified — likely ad-hoc `.toLocaleString()` calls scattered across pages; needs grep audit | Sec. 9 | `artifacts/gifting-erp/src/` (grep `toLocaleString`, `format(`, inline hex badge colors) |
| 65 | PDF Image/Excel Extractor tool | ✅ | Client-side only (`pdfjs-dist` + `xlsx`); no server load | Protect | `artifacts/gifting-erp/src/pages/pdf-extractor.tsx` |

---

## Corrections summary

| # | Pre-seed | Verified | Evidence |
|---|---|---|---|
| 19 | ❌ | ⚠️ | `products.reserved_qty` written on confirm/cancel in `soService.ts` lines 64–70, 94–100; missing consume on dispatch/assembly |
| 25 | ❌ | ✅ | `stateMachine.ts` has 6 full transition maps with `assertTransition()` enforced on all status routes |
| 50 | 🐞 | ✅ | Overdue derived at read-time from `due_date` in `notifications.ts`; never stored as status |
| 55 | ❌ | ⚠️ | `/v1/notifications` endpoint is real (117 lines, 5 alert types); no persistent table or read/unread |

---

## Execution order reminder

```
Phase A (correctness / P0): A1→A2→A3→A4→A5→A6→A7
Phase B (operations  / P1): B1→B2→B3→B4→B5
Phase C (depth       / P2): C1→C2→C3→C4→C5→C6→C7
Phase 5 (growth)           : Tally / GSTR-1 / Razorpay / WhatsApp / portal
```

Hard rules per spec: Drizzle only · all stock+money writes in DB transactions · `FOR UPDATE` on inventory and number_sequences · soft delete after Phase A · 409 on invalid transition · no hardcoded secrets · every new table gets `company_id`.
