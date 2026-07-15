# Customize Duniya ERP — Reconciled Upgrade Specification (v3.1)

> **Context:** The app is already substantially built (multi-tenant, full CRM pipeline, catalog with services/SAC, multi-location inventory, GRN, assembly with backflush, shipments with POD, GST invoicing, credit notes, fixed assets, analytics, modern shadcn UI). Roughly **60–65% of the target spec exists and works.**
> **This version is a reconciliation:** it locks the tech stack to what is actually in the repo, protects what already works, and concentrates all effort on a **Defect Register** of correctness gaps and missing deep-ERP modules.
> **Companion file:** `GAP_REPORT.md` (pre-seeded). Verify each row against the code, update its status, then execute phases in order.

---

## 0. Instructions to the AI Agent — READ FIRST

### 0.1 Verify, then fix

1. Read `GAP_REPORT.md` in the repo root. It is **pre-seeded** with findings from a documentation review. For each row: open the relevant code, confirm or correct the status (✅/⚠️/❌/🐞), and add the file path(s) involved.
2. Do **not** re-audit modules marked ✅ Protected beyond confirming they exist — they must not be rewritten.
3. Execute fixes strictly in phase order: **Phase A (correctness) → Phase B (operations) → Phase C (depth) → Phase 5 (growth)**. After each phase, run the acceptance tests for that phase (Section 8) and update `GAP_REPORT.md`.

### 0.2 Protected assets — extend, never rewrite

The following work well and are load-bearing. Extend them; do not replace, restructure, or restyle them:

- CRM pipeline: Leads (kanban + convert paths), Opportunities (weighted forecast), Quotes, Follow-ups/Activities, Contacts, Client detail with interaction timeline
- **Order Processing Form** (6-tab traveler: Order Info / Procurement / Designer / Production / Dispatch / Checklist) — integrate with new data (A5, B3), keep the form and its print output
- Dashboard + Reports analytics suite (revenue trend, pipeline, AR aging, leaderboard, vendor performance, top clients/products)
- Multi-company tenancy (`company_id` scoping, company switcher, per-company feature flags)
- Inventory foundations: multi-location stock, Item Ledger with running balance, Transfers (send/receive), Locations, GRN with accept/reject
- Assembly with backflush; Production Orders (feature-flagged) — fix their stock postings (A1), keep their UX
- Shipments with courier, freight, delivery challan print, per-address POD
- Invoicing (CGST/SGST/IGST + round-off), Payments, Credit Notes (apply/void), Fixed Assets with depreciation
- Sample Orders, Services catalog (SAC), Categories with icon picker, Vendors, CSV product import
- PDF Image/Excel Extractor tool
- UI system: shadcn + Tailwind v4, Cmd+K, dark mode, skeletons, empty states, AlertDialogs, toasts, amber `#d97706` accent, side sheets

### 0.3 API change workflow (mandatory)

The client consumes **Orval-generated hooks from the OpenAPI spec**. For every API change: update the OpenAPI source of truth → regenerate with Orval → consume the typed hooks. Never hand-write fetch calls or bypass the `api()` helper / generated hooks.

### 0.4 Hard rules

- **Drizzle ORM only.** All schema changes via `drizzle-kit` migrations. Never introduce Prisma or a second ORM. Never reset/drop data.
- No business logic in route handlers — introduce/extend a service layer; controllers validate (Zod/drizzle-zod) and delegate.
- All stock and money writes inside a DB transaction; inventory rows and `number_sequences` locked with `SELECT ... FOR UPDATE` (Drizzle `sql` fragment).
- After Phase A: no hard deletes on business records — soft delete only.
- Every status change goes through the central transition map (Section 4); invalid → `409 INVALID_TRANSITION`.
- No hardcoded secrets. **Remove the pre-filled demo credentials and the credentials hint from the Login page** (C5); demo seed users only when `SEED_DEMO=true`.
- Multi-tenancy: every new table gets `company_id`; every query stays company-scoped.
- No `TODO` left inside any Phase A item.

### 0.5 Environment (Replit)

PostgreSQL via `DATABASE_URL`; **pg-boss** for background jobs (Postgres-backed, manages its own schema — coexists with Drizzle); file storage stays on **DigitalOcean Spaces**; SSE for any live progress views; secrets via Replit Secrets, `.env.example` lists names only.

---

## 1. Locked Tech Stack (matches the repo — do not "align" it to anything else)

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives) |
| Routing | **Wouter** |
| Data fetching | **TanStack Query + Orval-generated hooks** (OpenAPI → codegen) |
| Backend | **Express 5, Node.js 24** |
| ORM / DB | **Drizzle ORM + PostgreSQL** (drizzle-kit migrations) |
| Validation | Zod v4 + drizzle-zod (shared schemas) |
| Jobs | **pg-boss** (new) |
| File storage | DigitalOcean Spaces |
| Logging | pino + request IDs (new) |
| Monorepo | pnpm workspaces |
| Docs/print | Print-ready A4 HTML (`window.print()`), existing pattern |

---

## 2. Defect Register — Phase A: Correctness (P0)

### A1 — Single source of truth for stock 🐞
`products.stock_level` exists alongside `inventory.quantity` (per location). Two writable sources will drift.
- `inventory` (product × location, company-scoped) becomes the **only writable authority**. Product-level stock is always `SUM(inventory.quantity)`; available is `SUM(quantity − reserved_qty)`.
- Migration: for products with `stock_level > 0` and no inventory rows, create an opening-balance movement into the default location, then stop writing `stock_level` (keep as derived/cached column updated by service, or drop reads entirely — choose one and be consistent).
- CSV product import: `stockLevel` column now creates an **opening-stock movement** at the default location instead of setting a column.
- GRN, assembly backflush, production `produce`, transfers, and manual movements must all post `inventory_movements` and update `inventory` in one transaction — audit each existing path and fix any that writes `products.stock_level`.
- Products page and Order-Processing Checklist ("Inhouse Avail. QTY") read the aggregate.

### A2 — Reservation lifecycle ❌ (column exists, logic doesn't)
`inventory.reserved_qty` exists and the Products table even displays Avail/Res/Total — but nothing reserves, consumes, or releases.
- **On SO confirm** (draft → confirmed), in one transaction: for each stock-item line, check `available = Σ(quantity − reserved_qty)`; reserve against locations (default-location-first strategy); record per-line shortfall (drives B2 auto-PO). Insufficient stock is **not** a hard block — reserve what exists, shortfall goes to procurement.
- **Consume** reservation on assembly allocation/backflush and on dispatch of non-assembled lines. **Release** on SO cancel and on line reduction.
- Concurrency: lock touched inventory rows `FOR UPDATE`. Acceptance test 8.6 (two parallel confirms cannot oversell) must pass.

### A3 — Bundles and services are not sellable 🐞 (the itemType gap)
`quote_items` and `sales_order_items` only carry `product_id`, so the Bundles catalog can't be ordered as a bundle and the Services catalog is decorative.
- Add to both tables: `item_type` (`product | bundle | service`), `bundle_id`, `service_id`, per-line `gst_rate` + `hsn_or_sac_code` **snapshot**, `description`. Quote→SO conversion copies lines faithfully.
- **Assembly:** `assembly_jobs` gets `bundle_id` (+ optional `sales_order_item_id`). Backflush explodes `bundle_items` × kits and posts component consumption. "Total kits" now means kits of a known BOM.
- **Bundle GST mode:** `bundles.gst_mode` (`mixed_supply` default | `itemized`). `mixed_supply`: single bundle line taxed at the **highest component GST rate** (Indian mixed-supply treatment). `itemized`: invoice explodes components as lines at their own HSN/rate.
- **Service lines:** carry SAC + the service's GST rate; add `service_status` (`pending | in_progress | completed`) on SO service lines; order-level status derivation includes service lines (Section 4).
- Invoice generation (A4) consumes `item_type` and produces GOODS (HSN) and SERVICE (SAC) lines on one invoice for mixed orders.

### A4 — GST engine unification 🐞
Quotes hardcode **18% GST** in the live summary while products carry per-line rates — quote totals won't match invoice totals on mixed-rate orders.
- One shared tax service used by Quotes, SOs, and Invoices: per-line taxable value × line `gst_rate`; intra vs inter-state split (CGST+SGST vs IGST) from **company state code vs client place of supply** — add `state_code` (derived from GSTIN first 2 digits, editable) to `companies` and `clients`; invoice stores `place_of_supply_state_code`.
- Quote live summary shows tax **by rate bucket**, not a flat 18% line.
- Invoice additions: **amount in words**, HSN/SAC summary table on the printed tax invoice, per-line + invoice rounding (round-off column exists — keep).
- "Overdue" is **derived** from `due_date` at read time, not a stored status transition.
- Acceptance test: same lines through Quote and Invoice produce identical totals.

### A5 — Advances are not real payments 🐞
`payments.invoice_id` is required, but gifting collects 50% advance at SO confirmation — before any invoice exists. The Order-Processing "Advance Received" is a typed number in JSONB, disconnected from money.
- Make `payments.invoice_id` nullable; add `payments.sales_order_id`. New table `payment_allocations` (payment_id, invoice_id, amount).
- Invoice `paid_amount` and status (`issued → partially_paid → paid`) are **derived from allocations**. Replace "Mark Paid" shortcut with "Record payment" (a real payment + allocation); status PATCH can no longer bypass money records.
- On invoice creation for an SO: auto-allocate that SO's unallocated advances.
- Order-Processing Tab 1: "Advance Received" and "Balance" become **read-only derived** from payments (with a "Record advance" shortcut that creates a payment).

### A6 — Soft delete + real audit trail ⚠️
Hard DELETEs exist (clients, products, locations, credit notes…); `audit_logs` lacks old/new values.
- Add `deleted_at` to all business tables; central Drizzle helper excludes soft-deleted rows; DELETE endpoints become soft.
- `audit_logs`: add `company_id`, `old_values` JSONB, `new_values` JSONB, `ip`. Service layer writes an entry on every create/update/soft-delete/status transition.
- Detail pages later render an activity timeline from audit logs (C-phase UI delta).

### A7 — Central state machines ❌
Status PATCH endpoints accept arbitrary values.
- One transition map module (Section 4) consumed by every `/status` endpoint and by internal services. Invalid transition → `409 INVALID_TRANSITION` with current/attempted states in the error payload.

---

## 3. Defect Register — Phase B: Operations (P1)

### B1 — Payables side ❌
GRN exists; vendor bills/payments do not.
- New: `vendor_bills` (vendor_id, po_id, bill_number, bill_date, amount, match_status `matched|mismatch`), `vendor_payments` (vendor_bill_id, amount, mode, paid_at, tds_section/tds_rate/tds_amount — TDS fields now, UI in C).
- **3-way match** on bill entry: PO price/qty vs GRN received vs bill; mismatches flagged for review, not blocked.
- Vendor detail: ledger + outstanding. Reports: payables due alongside AR aging.

### B2 — Automation engine + real notifications ❌
No job queue; the notification bell appears decorative (no table/endpoints).
- Add **pg-boss**. Triggers: SO confirmed → per-line shortfall → **draft POs grouped per vendor** (product's vendor + lead time) → notify; GRN completes all components reserved for an SO → **auto-create assembly job** (with bundle_id) → notify; assembly completed → notify + SO status re-derivation; low stock (`available < low_stock_threshold`) daily; invoice due / follow-up due reminders.
- New: `notifications` (user_id, type, title, body, entity_ref, read_at) + list/mark-read endpoints; wire the existing bell (unread count + popover).
- `email_outbox` (to, subject, body, status, attempts, last_error) + SMTP env config; log-only transport in dev. Channel abstraction interface now; WhatsApp implementation in Phase 5.

### B3 — Bulk addresses, address-level status, personalization ❌
Addresses are manual rows; unusable for 1,000-recipient orders; `delivery_addresses` has no status.
- **Excel import** (SheetJS, pg-boss job): template download; columns recipient, phone, address, city, state, 6-digit pincode + optional **name-on-gift, card message, variant**; row-level validation report; valid rows saved. Store extras in `delivery_addresses.personalization` JSONB; add `status` (`pending|kitted|dispatched|delivered|failed|returned`) and `state`.
- Address status driven by kitting/dispatch/POD; **SO status derived** (shipped when ≥1 dispatched; delivered when all delivered) → true **partial dispatch**.
- Kit/dispatch labels print per-recipient personalization.

### B4 — Quote versioning, discount approval, credit limits ❌
- Quote edits after `sent` create a **new revision** (`revision_no`, parent link); accepted revisions lock read-only; only accepted converts.
- `SALES_DISCOUNT_LIMIT_PCT` env (default 5): SO above limit → `pending_approval`; approve permission = admin/finance; audit-logged.
- `clients.credit_limit` + `payment_terms` default: confirm blocked past limit unless admin override (logged).

### B5 — Permissions table ⚠️ (role enum only today)
- New `permissions` + `role_permissions`; seed maps existing five roles to granular keys (`sales_order.confirm`, `invoice.create`, `payment.record`, `po.approve`…); `requirePermission()` middleware on every route. Keep the role field; it becomes the default permission bundle.

---

## 4. Defect Register — Phase C: Depth (P1/P2)

### C1 — Job work / client-material custody ❌
- New `client_material_challans` (dc_number `DC/FY/0001` via number_sequences, direction `in|out`, client_id, sales_order_id, eway_bill_no?, date, notes) + items (product_id or free description, qty, batch?).
- **Ownership dimension**: `ownership` (`company|client`) + `client_id?` on `inventory`, `inventory_movements` (+ new types `jobwork_in`, `jobwork_consume`, `jobwork_return`), and batches (C2). Client-owned stock is **excluded from valuation, availability, reorder, and Smart Suggest** — visible only in the **Job Work Register** screen (received − consumed − returned = balance; must balance to close the order).
- Assembly on service orders may consume client-owned components; backflush respects ownership. Damaged client material logged for client sign-off, not costed to company.

### C2 — Batches, expiry, FEFO ⚠️ (movements carry a batch string only)
- New `inventory_batches` (product, location, ownership, batch_no, qty, mfg/expiry). GRN captures batch+expiry for perishables (`products.is_perishable`, `shelf_life_days` new). Assembly allocation picks **FEFO**; near-expiry notification job.

### C3 — True costing & margin bridge ⚠️
- **Weighted-average cost** per product-location (company stock) maintained on every inward; used for stock value and COGS.
- `assembly_jobs`: add `kits_rejected`, `scrap_cost` + a QC step; scrap posts a movement with cost.
- **Margin bridge per SO**: revenue − components at avg cost (incl. packaging) − branding cost (new `branding_cost_per_unit` on SO items) − freight (roll up from shipments) − scrap − converted-sample cost. Shown on SO detail; feeds reports.
- Sample orders: dispatch posts `sample_out` movement **at cost**; accumulate sample cost per client; show on client page + conversion funnel.

### C4 — Compliance fields ⚠️
- Shipments + DC-out: `eway_bill_no`, `eway_bill_date` (warn when consignment > ₹50,000). Invoices: `irn`, `ack_no`, `ack_date`, `qr_code_data` (stub interface; mandatory only above notified turnover — ₹5 Cr currently). Gapless sequential invoice numbers verified under parallel creation (lock `number_sequences` row).

### C5 — Security hardening ⚠️
- **Remove pre-filled demo credentials + hint from Login** (production); seed demo users only when `SEED_DEMO=true`. helmet, CORS allowlist, rate limit on `/auth`, lockout after N failures, upload type/size validation, **optimistic locking** (`version` int on quotes/SOs/POs/invoices; stale write → `409 STALE_WRITE`).

### C6 — Master-data import wizard ⚠️ (products CSV exists)
- Extend the pattern to **Clients, Vendors, Services, Opening Stock (location + batch + ownership)**: template per type, dry-run preview, row-level error report, commit as pg-boss job; `import_jobs` table (type, file_key, status, dry_run, report JSONB).

### C7 — Tests + logging ❌
- pino + request IDs; log every transition and job run. Automated tests (must run via `pnpm test`): GST engine (rates, intra/inter, mixed-supply, quote=invoice), reservation under two concurrent confirms, backflush atomicity (bundle explode), gapless sequences under parallel calls, custody-stock exclusion, allocation math (A5).

---

## Phase 5 — Growth (build only after A–C green)

Client Portal (portal role scoped by client_id: orders + per-address tracking, **artwork approve/reject online** driving the existing artwork states, invoices + pay) → **Razorpay payment links** per invoice + webhook auto-payment/allocation (behind a `PaymentGateway` interface) → WhatsApp channel live behind the B2 interface → **Tally voucher export** (sales/purchase/receipt/payment XML for a period) → **GSTR-1 B2B export** (monthly, from issued invoices + credit notes) → recurring gifting programs (recurrence rule spawns draft SOs) → dispatch capacity calendar (committed kits/day vs `company_settings` capacity) → scan-to-dispatch + scan-based GRN (barcode field already in product import; add label generation) → courier API abstraction (manual provider now).

---

## 4. State Transition Matrix (adopt existing status vocabularies; enforce centrally)

**Sales Order:** `draft → confirmed → in_production → ready → shipped → delivered`; `draft → pending_approval → confirmed` (discount > limit); `draft|confirmed → cancelled` (release reservations; open job-work material must be returned via DC-out first).
Derivations: `in_production` when first assembly job or service line starts; `ready` when all assembly jobs completed **and** all service lines completed **and** all artworks completed (for brandable lines); `shipped` when ≥1 address dispatched; `delivered` when all addresses delivered.

**Delivery address:** `pending → kitted → dispatched → delivered`; `dispatched → failed → returned` (RTO restocks `return_in`).
**Service line:** `pending → in_progress → completed`.
**Quote (per revision):** `draft → sent → accepted | rejected | expired`; editing after `sent` spawns next revision; `accepted` is terminal + convertible.
**Purchase Order:** `draft → sent → partial → received`; `draft|sent → cancelled`; `partial/received` set **only via GRN posting**.
**Assembly:** `pending → in_progress → completed`; `in_progress → rejected` (admin) ; rejected → `in_progress` (re-open, existing). QC fail per unit stays in progress with `kits_rejected` incremented.
**Production order:** `draft → in_progress → completed | cancelled` (existing).
**Sample order:** `requested → dispatched → received → converted | rejected` (existing vocabulary).
**Artwork:** `pending → client_approved → sent_to_vendor → completed`; `pending → rejected` spawns next version (add `version_no`).
**Shipment:** `pending → dispatched → in_transit → delivered` (existing) + `rto`.
**Invoice:** `draft → issued → partially_paid → paid` (derived from allocations); `issued → cancelled` only via credit note; `overdue` = derived filter, never stored.
**Client material:** `received (DC-in) → in custody → consumed | returned (DC-out)`; register must balance.

Anything not listed → `409 INVALID_TRANSITION`.

---

## 5. Schema Deltas (Drizzle migrations — extend existing tables, never recreate)

**ALTER (add columns):**
- `companies`: `state_code`; `clients`: `state_code`, `credit_limit`, `deleted_at`
- `products`: `is_perishable`, `shelf_life_days`, `deleted_at` (+ decide `stock_level` derived-or-dropped per A1)
- `bundles`: `gst_mode`, `deleted_at`
- `quote_items` & `sales_order_items`: `item_type`, `bundle_id`, `service_id`, `gst_rate`, `hsn_or_sac_code`, (`service_status`, `branding_cost_per_unit` on SO items)
- `quotes`: `revision_no`, `parent_quote_id`, `version`, `deleted_at`; `sales_orders`: `approval_status`, `version`, `deleted_at`
- `payments`: `invoice_id` → nullable, `sales_order_id`
- `delivery_addresses`: `status`, `state`, `personalization` JSONB
- `assembly_jobs`: `bundle_id`, `sales_order_item_id?`, `kits_rejected`, `scrap_cost`
- `inventory` + `inventory_movements`: `ownership`, `client_id?` (+ new movement types `sample_out`, `jobwork_in`, `jobwork_consume`, `jobwork_return`, `scrap`, `opening_balance`)
- `invoices`: `place_of_supply_state_code`, `amount_in_words`, `irn`, `ack_no`, `ack_date`, `qr_code_data`, `version`, `deleted_at`; `invoice_lines`: `line_type`, `service_id`, `hsn_or_sac_code`
- `shipments`: `eway_bill_no`, `eway_bill_date`
- `audit_logs`: `company_id`, `old_values`, `new_values`, `ip`
- `users`: `failed_attempts`, `locked_until`
- `number_sequences`: add doc types `DC`, keep FY pattern; access always `FOR UPDATE`
- All business tables: `deleted_at` (+ `version` on documents) where missing

**NEW tables:** `payment_allocations` · `vendor_bills` · `vendor_payments` · `permissions` · `role_permissions` · `notifications` · `email_outbox` · `client_material_challans` + `client_material_challan_items` · `inventory_batches` · `import_jobs`.

---

## 6. API Deltas (OpenAPI first → Orval regenerate)

New/changed: `POST /v1/sales-orders/:id/confirm` (transactional reserve+shortfall; replaces bare status PATCH for this transition) · `POST /v1/sales-orders/:id/addresses/import` + `GET .../import-template` · `PATCH /v1/delivery-addresses/:id/status` · `POST /v1/quotes/:id/revise` · vendor bills/payments CRUD + `POST /v1/vendor-bills/:id/match` · `GET/PATCH /v1/notifications` · `POST /v1/payments` (invoice optional, SO allowed) + `POST /v1/payment-allocations` · `client-material-challans` CRUD + `GET /v1/jobwork/register?clientId=&soId=` · `POST /v1/imports/:type` (+ dry-run) · `GET /v1/orders/:id/margin` (bridge) · Phase 5: `portal/*`, `payment-links`, `exports/tally`, `exports/gstr1`.
Conventions unchanged: bearer auth via `api()` helper, company scoping, existing envelope style, `?status=` filters.

---

## 7. Phased Plan & Exit Criteria

**Phase A (A1–A7):** stock single-source + reservations + sellable bundles/services + unified GST + advance payments/allocations + soft delete/audit + state machines. *Exit:* tests 8.1–8.8 pass; no hard deletes; quote total = invoice total.
**Phase B (B1–B5):** payables + automation/notifications + address import/status/personalization + quote revisions/approvals/credit limits + permissions. *Exit:* tests 8.9–8.14 pass; bell shows real notifications; auto-PO drafts appear on confirm.
**Phase C (C1–C7):** job work custody + batches/FEFO + costing/margin bridge + compliance fields + security (demo creds removed) + import wizard + test suite/logging. *Exit:* tests 8.15–8.20 pass; `pnpm test` green.
**Phase 5:** growth list above. *Exit:* portal artwork approval + Razorpay payment land end-to-end; Tally XML imports cleanly; GSTR-1 matches issued invoices.

---

## 8. Acceptance Tests (`pnpm e2e-demo` — seeded, self-verifying)

1. Opening stock migrated from `stock_level` → inventory movements; product totals = Σ locations everywhere (Products page, Checklist tab).
2. Confirm SO with mixed lines (product + **bundle** + **service**): reservation rows created; Avail/Res/Total on Products page reflects it; shortfall recorded.
3. Quote with 5%/12%/18% lines: live summary shows per-rate buckets; converting → SO → invoice yields **identical totals**; mixed invoice shows HSN lines + SAC line; bundle taxed per `mixed_supply` (highest rate); itemized mode explodes components.
4. Advance ₹X recorded against the SO (no invoice yet) → invoice created → advance auto-allocates → status `partially_paid`; final payment → `paid`; "Mark Paid" without payment record is impossible.
5. Assembly job carries `bundle_id`; completing 10 kits backflushes exact BOM ×10 atomically; partial kits post partial backflush; 1 QC reject increments `kits_rejected` + scrap cost.
6. **Concurrency:** two parallel confirms for the last 50 units — combined reservations ≤ stock; parallel invoice creation → gapless sequential numbers.
7. Cancel a confirmed SO → reservations released; audit log has old/new values for every transition above.
8. Deleting a client soft-deletes (row hidden, FK history intact); invalid transition (`draft → shipped`) returns 409; stale `version` write returns 409 (C5, verify in C).
9. SO confirm auto-creates draft POs grouped per vendor for shortfall only; GRN completing components auto-creates the assembly job; notifications appear in the bell.
10. Vendor bill with wrong price flags `mismatch` (3-way); correct bill matches; vendor ledger shows outstanding.
11. Excel address import: 1,000 rows with 2 bad rows → row-level errors; personalization stored; kit label prints name-on-gift.
12. Dispatch 6/10 addresses → SO `shipped` with 6/10; deliver all with POD → `delivered`.
13. Quote edited after `sent` → revision 2; revision 1 locked; only accepted converts.
14. 8% discount routes to `pending_approval`; finance approves (permission-gated, logged); over-credit-limit confirm blocked without admin override.
15. **Job work:** DC-in received → custody balance visible; **company valuation unchanged**; branding service line in_progress → consume client material + company consumable → completed → DC-out with e-way no. → SAC invoice → register balances to zero.
16. Perishable GRN captures batch+expiry; assembly picks FEFO; near-expiry notification fires.
17. Margin bridge on a finished SO = revenue − components(avg cost) − branding − freight − scrap − sample cost; matches manual calc.
18. Sample dispatch posts `sample_out` at cost; client page shows sample cost; convert → pre-filled quote.
19. Opening-stock import wizard: dry-run report → commit → ledger opening balances correct.
20. Login page shows **no** demo credentials; lockout after N failed attempts; rate limit on `/auth`.

---

## 9. UI Deltas (the app already meets most of the modern standard — deltas only)

Keep every existing pattern (Section 0.2). Add/verify only:
- Single `formatINR()` (Indian grouping `₹12,34,567.00`, `tabular-nums`, right-aligned) and `formatDate()` used everywhere — replace any ad-hoc formatting.
- One shared `statusConfig` map (status → label/color/icon) across badges, tabs, kanban, charts — consolidate if duplicated.
- New screens on existing templates: Vendor Bills/Payments, Job Work Register, Notifications popover content, Import wizard, Margin bridge panel on SO detail, address-status chips on SO detail + shipments.
- DetailPage activity timeline fed by the enriched `audit_logs`.
- Reservation visibility: Products Avail/Res/Total now truthful; SO detail shows reserved-vs-shortfall per line.
- Quote form: per-rate GST summary replaces the flat 18% line.
- Login: brand panel stays; demo credentials block removed.

---

## 10. Definition of Done

- [ ] `GAP_REPORT.md` fully verified (every row confirmed/corrected with file paths) and updated at each phase end
- [ ] All Phase A items shipped; acceptance tests 1–8 green
- [ ] Phases B & C shipped; tests 9–20 green; `pnpm test` green
- [ ] Single stock authority — no code path writes `products.stock_level` directly
- [ ] Quote/SO/Invoice totals identical for identical lines; SAC lines on service/mixed invoices
- [ ] Payments/allocations are the only way an invoice becomes paid
- [ ] Soft deletes everywhere; audit logs carry old/new values; transitions centrally enforced
- [ ] Job Work Register balances; client stock excluded from valuation/availability
- [ ] Orval workflow respected — OpenAPI updated first for every API change; no hand-rolled fetches
- [ ] Drizzle migrations named and reversible; no data loss
- [ ] Demo credentials removed from Login; seeds behind `SEED_DEMO=true`
- [ ] README updated: secrets, seeds, e2e-demo, tests, imports, job queue
