# Corporate Gifting ERP — Audit & Upgrade Specification (v3)

> **Purpose:** This project already contains a partially built Corporate Gifting ERP.
> Your job is to **audit the existing codebase against this specification, produce a gap report, and then fix/upgrade the code phase by phase** — not to rebuild from scratch.
> **v3 adds:** Service Orders & Job Work, Sample Management, packaging-as-BOM, per-recipient personalization, barcode workflows, multi-tenancy readiness, security & test hardening, master-data import, and a Growth phase (client portal, Razorpay, WhatsApp, Tally/GSTR-1).

---

## 0. Instructions to the AI Agent — READ FIRST

### 0.1 Audit before you code

1. Scan the entire repository (schema, backend, frontend, config, seed data).
2. Create a file **`GAP_REPORT.md`** at the repo root. For **every section of this spec**, mark one of:
   - ✅ Implemented correctly
   - ⚠️ Partially implemented (state what is missing)
   - ❌ Missing entirely
   - 🐞 Implemented incorrectly (state the defect)
3. Include a **UI/UX Audit** subsection in `GAP_REPORT.md`: list every screen, score it against **Section 11**, and record every occurrence of the Legacy Kill-List (11.10) found in the current frontend.
4. Only after the gap report is written, begin fixing in the **priority order** below (P0 → P1 → P2), following the **Phased Fix Plan** in Section 8.

### 0.2 Refactor rules (do not break working code)

- **Incremental refactor, not rewrite.** Preserve working modules; extend and correct them.
- **Prisma migrations for every schema change.** Never drop/reset the database in a way that loses seed or user data. Use `prisma migrate dev` with named migrations.
- If the existing codebase is JavaScript, do **not** do a big-bang TypeScript rewrite. Enable incremental TS (`allowJs: true`) and write **all new and all modified files in TypeScript**.
- Extend existing Prisma models — do not create duplicate/parallel models for the same concept.
- After completing each phase, run the seed + the End-to-End Acceptance Test (Section 9) and report pass/fail per step.

### 0.3 Hard rules (never violate)

- No hardcoded credentials, API keys, or GSTINs — all via environment variables / Replit Secrets.
- No business logic inside route handlers — service layer only.
- No raw stock/finance writes outside a database transaction.
- No hard deletes on business records (clients, orders, invoices, payments) — soft delete only.
- No invalid state transitions — reject at service layer with a clear error (see Section 4).
- Client-supplied (custody) stock must **never** enter company stock valuation or availability for other orders.
- No `TODO` left inside any P0 item.

### 0.4 Environment notes (Replit)

- **Database:** Replit's built-in PostgreSQL (Neon). `DATABASE_URL` from Replit Secrets.
- **Background jobs:** use **pg-boss** (PostgreSQL-backed job queue — no Redis needed on Replit). If Redis is available, BullMQ is an acceptable alternative; pg-boss is the default.
- **File storage:** local `./uploads` behind a `StorageProvider` interface (`save`, `get`, `delete`, `getSignedUrl`) so S3/Replit Object Storage can be swapped in without touching business code.
- **Real-time (Simulation Mode & dashboards):** Server-Sent Events (SSE). WebSockets acceptable if already present.
- **Secrets:** Replit Secrets panel; `.env.example` committed with variable names only.

### 0.5 Priority tiers

| Tier | Meaning | Items |
|---|---|---|
| **P0 — Blockers** | ERP is not correct/legal without these | HSN + GST fields & tax engine; stock reservation; BOM backflush in transactions; GRN + 3-way match; document number sequences; state machine enforcement; DB transactions & row locking; Zod validation on all endpoints; **`orgId` multi-tenancy scoping on every table** |
| **P1 — Core ERP** | Needed for real operations | Audit logs; soft deletes; quotation versioning; discount approval; address-level order status; partial dispatch; warehouses; batch expiry + FEFO; vendor bills & payments; credit/debit notes; POD; freight cost in margin; artwork versioning; job-queue notifications; credit limits; **Service Orders & job-work custody stock; SAC invoicing; Sample Management; packaging-as-BOM; per-recipient personalization; clone/repeat order + seasonal reminders; barcode label generation; master-data import wizard; security hardening + optimistic locking; money/stock automated tests; structured logging; UI/UX modernization (Section 11)** |
| **P2 — Advanced & Growth** | Competitive features | E-way bill / e-invoice fields & stubs; TDS on vendor payments; AI (Claude) bundle reasoning layer; Simulation Mode (SSE); forecasting charts; courier API abstraction; idempotency keys; Swagger/OpenAPI docs; **scan-based GRN/kitting/dispatch; dispatch capacity calendar; client portal; Razorpay payment links; WhatsApp notification channel; Tally export; GSTR-1 export; recurring gifting programs** |

---

## 1. Locked Tech Decisions (no alternatives — verify & align)

| Layer | Technology |
|---|---|
| Language | **TypeScript** (frontend + backend; incremental adoption allowed per 0.2) |
| Frontend | React + Tailwind CSS + shadcn/ui |
| State management | **Zustand** (single choice — remove/avoid Redux) |
| Backend | Node.js + Express.js |
| ORM / DB | Prisma + PostgreSQL |
| Validation | **Zod** — shared schemas used by both client and server |
| Auth | JWT (access + refresh) + RBAC (roles → permissions) |
| Job queue | **pg-boss** (Postgres-backed) |
| File storage | Local FS behind `StorageProvider` abstraction |
| Excel parsing | SheetJS (`xlsx`) — parsed inside a background job |
| PDF / print documents | Print-ready HTML + server PDF (puppeteer or pdfkit) for invoices, challans & shipping labels |
| Barcodes | Code-128 / QR generation lib (e.g. `bwip-js`); scanners as keyboard-wedge input |
| Logging | pino with request IDs |
| API style | REST, versioned `/api/v1/...` |

**Standard response envelope (every endpoint):**

```json
{ "success": true, "data": {}, "error": null, "meta": {} }
```

Error form: `{ "success": false, "data": null, "error": { "code": "STOCK_INSUFFICIENT", "message": "...", "details": [] }, "meta": {} }`

**Pagination standard:** `?page=&limit=&sort=&order=&search=` + module filters; `meta = { page, limit, total, totalPages }`.

---

## 2. Global Architecture Requirements

1. **Service layer:** `routes → controllers → services → repositories(Prisma)`. Controllers only validate + call services.
2. **Transactions & locking:** All stock movements, reservations, backflush, payment postings, and number generation run inside `prisma.$transaction`. Number sequences and stock rows use `SELECT ... FOR UPDATE` (Prisma raw query) to prevent race conditions.
3. **State machines:** Every status field has an explicit allowed-transition map (Section 4) enforced in the service layer. Invalid transition → `409 INVALID_TRANSITION`.
4. **Document numbering:** `NumberSequences` table. Formats (Indian financial year, April–March):
   - Quotation `QTN/2026-27/0001`, Sales/Service Order `SO/2026-27/0001`, Purchase Order `PO/2026-27/0001`, GRN `GRN/2026-27/0001`, **Delivery Challan `DC/2026-27/0001`**, Invoice `INV/2026-27/0001`, Credit Note `CN/2026-27/0001`, Shipment `SHP/2026-27/0001`, **Sample Dispatch `SMP/2026-27/0001`**.
   - Sequential, gapless per FY, concurrency-safe.
5. **Audit trail:** `AuditLogs` (userId, entity, entityId, action, oldValues JSON, newValues JSON, ip, timestamp) written automatically by the service layer for create/update/delete/status-change on all business entities.
6. **Soft delete:** `deletedAt` on all business tables; default Prisma queries exclude deleted rows (middleware/extension).
7. **Idempotency:** `Idempotency-Key` header honored on order confirmation, payment recording, and invoice generation endpoints.
8. **Company settings:** `CompanySettings` table — legal name, GSTIN, address, **state code** (first 2 digits of GSTIN), FY start, invoice prefix, bank details, logo, assembly capacity (kits/day). Required for CGST/SGST vs IGST determination and invoice printing.
9. **Multi-tenancy readiness (P0 structural):** `Organizations` table; **`orgId` column on every business table**, injected from the JWT into every query via Prisma client extension/middleware. Seed one default organization and run single-tenant today — the column costs nothing now, but retrofitting tenancy later is a rewrite. All number sequences, settings, and uploads are org-scoped.
10. **Security hardening (P1):** helmet, CORS allowlist, rate limiting (strict on `/auth`), login lockout after N failed attempts, bcrypt/argon2 password hashing, upload type/size validation, and **optimistic locking** — integer `version` on business documents; stale write → `409 STALE_WRITE` so two users cannot silently overwrite the same order.
11. **Structured logging (P1):** pino, request IDs on every log line; log every state transition and every job run (start/success/fail).
12. **Automated tests (P1):** unit/integration tests for the money and stock logic — GST engine (intra/inter-state, mixed-supply, SAC), reservation under two concurrent SO confirmations, backflush atomicity, gapless number sequences under parallel calls, custody-stock exclusion from valuation. `npm test` must pass at the end of every phase. The E2E demo alone will not catch race conditions.
13. **Global error middleware**, request logging, and consistent HTTP codes (`201` create, `409` conflict/transition/stale, `422` validation).
14. **Frontend:** feature-based folders (`/features/sales-orders/...`). The complete, mandatory UI/UX standard — design tokens, app shell, page templates, tables, forms, states — is defined in **Section 11**.

---

## 3. Module Specifications

Each module lists **Base requirements** (may already exist — verify) and **Upgrades** (likely missing — implement).

### 3.1 Auth & User Management

**Base:** Roles — Admin, Sales, Purchase Manager, Warehouse, Production, Finance. Login, logout, password reset, session management.
**Upgrades:**
- Permissions modeled in DB: `Permissions` (e.g. `sales_order.confirm`, `invoice.create`) + `RolePermissions`. Middleware `requirePermission('...')` on every route.
- JWT access (short-lived) + refresh token rotation; hashed passwords; account deactivation (not deletion).
- New role: **Portal** (client-side users, Section 3.2 portal — P2).
- Seed one user per role.

### 3.2 CRM (Client Management) & Client Portal

**Base:** Client profiles (company, contact, GSTIN, billing/shipping addresses), interaction log (calls/emails/meetings), requirement document uploads, tags by industry & occasion.
**Upgrades:**
- **Multiple contact persons** per client (name, designation, phone, email, isPrimary).
- **GSTIN validation:** regex `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`; derive client state code from first 2 digits.
- **Credit limit & payment terms** per client (e.g. 50% advance / Net 15). Block SO confirmation beyond credit limit unless Admin overrides (audit-logged).
- **Lead/opportunity stage** before "Active Client": `Lead → Qualified → Proposal Sent → Won/Lost`. A client becomes Active only on first confirmed SO — conversion counts must reflect **actual confirmed orders**, not manual tags.
- Client page shows: lifetime revenue, margin, **sample cost to date** (3.7), open orders, receivables.
- **Client Portal (P2 — Phase 5):** separate portal login for client contacts (Portal role, server-side scoping by clientId): view their orders with per-address delivery status, **approve/reject artwork versions online** (drives the 3.11 state machine), download invoices, pay via Razorpay link (3.13). Read-only everywhere else.

### 3.3 Product & Service Catalog

**Base:** SKU items — name, category, cost price, selling price, vendor, stock level, images. Bundles — composed of items with quantities, bundle images.
**Upgrades (P0/P1):**
- Per product: **`hsnCode`**, **`gstRate`** (0/5/12/18/28), `uom`, `reorderLevel`, `reorderQty`, `isPerishable`, optional `shelfLifeDays`, `brandable`, **`isPackaging`**, `barcode`, multiple vendor mappings via `VendorProducts` (price tiers + lead time days).
- **Packaging as BOM (P1 correctness):** boxes, ribbons, fillers, tissue, cards are real SKUs (`isPackaging = true`) and **must be components inside every bundle BOM** — procured, stocked, consumed in backflush, and costed into margin. A bundle without packaging components fails a lint check.
- **Services catalog (NEW):** `Services` table — name, type (`BRANDING / KITTING_JOBWORK / DESIGN / EVENT / OTHER`), **`sacCode`** (services use SAC, not HSN; job-work manufacturing services fall under the 9988 series), `gstRate` (typically 18% — stored, never hardcoded), unit, unitPrice, cost estimate.
- Bundles: computed component cost (including packaging), target selling price, margin %, occasion tags.
- **Bundle GST mode** (configurable per bundle, default `MIXED_SUPPLY`):
  - `MIXED_SUPPLY`: single hamper price taxed at the **highest GST rate** among components (Indian GST treatment of mixed supply).
  - `ITEMIZED`: invoice lists components as separate lines, each at its own HSN/rate.

### 3.4 Smart Gift Bundle Builder (implement exactly)

**Inputs:** budget per gift, occasion, optional client industry, quantity, optional constraints (must-include category, exclude perishables, min/max item count).
**Hard constraints:** total suggested selling price ≤ budget; 3–7 items (+ packaging components auto-added); ≥3 distinct categories; occasion-tag match; no duplicate SKUs; every item either in available stock (Section 3.9 definition) for the required quantity **or** procurable within lead time.
**Objective — score each candidate combination:**
`score = 0.5·marginPct + 0.3·budgetUtilization + 0.2·occasionRelevance`
where `marginPct = (sellPrice − cost)/sellPrice` (cost includes packaging), `budgetUtilization = sellPrice/budget` (target 0.90–1.00), `occasionRelevance` = fraction of items tagged with the occasion.
**Algorithm:** greedy seed by margin-per-rupee + local-search swaps (bounded knapsack acceptable). Return **top 3** combinations with margin breakdown.
**Manual override:** user can add/remove/swap items; totals, margin, and budget check recompute live; final selection saved as a Bundle linked to the quotation.
**Optional AI layer (P2):** Claude API call to rank/name the top 3 and write a one-line pitch per bundle (occasion + industry fit). Deterministic algorithm must work standalone if the API is unavailable.

### 3.5 Quotations & Sales Order Management (goods & mixed orders)

**Base:** create/send quotations; convert approved quotation → sales order; multi-address delivery; Excel import of addresses; lifecycle `Draft → Confirmed → In Production → Ready → Dispatched → Delivered`.
**Upgrades:**
- **Unified order model:** `SalesOrders.orderType = GOODS | SERVICE | MIXED`; `SalesOrderItems.itemType = PRODUCT | BUNDLE | SERVICE` (service lines per Section 3.6). One number series, one invoice flow.
- **Quotation versioning:** `Quotations` + `QuotationVersions` (v1, v2 …). Statuses `Draft → Sent → Approved / Rejected / Revised`. Only an Approved version converts to an SO; earlier versions locked read-only.
- **Discount approval workflow:** Sales may discount up to `SALES_DISCOUNT_LIMIT_PCT` (env, default 5%). Beyond limit → SO enters `Pending Approval`; only Admin/Finance can approve (audit-logged).
- **Address-level status:** each `DeliveryAddress` has its own status `Pending → Kitted → Dispatched → Delivered / Failed / Returned`. **Order-level status is derived.** Support **partial dispatch**.
- **Per-recipient personalization (P1):** Excel import gains optional columns — name-on-gift, card message, variant choice — stored as `personalization` JSON per delivery address; kitting labels (3.10) print these per recipient.
- **Excel bulk address import:** background job (pg-boss) — parse with SheetJS → validate rows (name, phone format, address, 6-digit pincode, state) → row-level error report → save valid rows. Downloadable XLSX template endpoint.
- **Clone / repeat order (P1):** one-click "Clone last order" (copies items + optionally addresses, fresh numbers, draft status). **Seasonal reminder job:** at a configurable lead time (default: 8 weeks before each occasion), auto-create Sales notifications/tasks from last year's occasion orders per client — gifting is an annual-cycle business.
- **Cancellation & returns:** cancel before dispatch (releases reservations, cancels/flags linked POs); post-delivery returns via RMA linked to a Credit Note.
- On **confirmation** (single transaction): reserve stock (3.9), compute shortfall, enqueue auto-PO job (3.8), validate credit limit.

### 3.6 Service Orders & Job Work (NEW — P1)

The business sells **services**, not only goods: branding/printing on client-supplied items (job work), kitting-only jobs on client goods, design/curation, and on-site event gifting execution. Modeled inside the unified order (3.5), with the pieces below.

- **Service lines:** `SalesOrderItems` with `itemType = SERVICE`, linked `serviceId`, qty, rate. Fulfillment status per service line: `Pending → In Progress → Completed`. Order-level status derives across goods + service lines; pure-SERVICE orders skip shipment unless goods are being returned/dispatched.
- **Job work — client-supplied material (the critical part):**
  - Material comes in via **Delivery Challan In** (`DC/2026-27/xxxx`, printable document) — item descriptions or linked SKUs, quantities, client reference.
  - Received goods become **custody stock**: `ownership = CLIENT` on inventory rows/batches/movements, warehouse-scoped, **excluded from company stock valuation and from availableQty** for any other order. Hard rule 0.3 applies.
  - A **Job Work Register** screen per client/order: received − consumed − returned = balance; the register must always balance.
  - Consumption is posted per assembly/branding job; damaged client material is logged with a remark for client sign-off.
  - Finished/unused material goes back via **Delivery Challan Out**; capture **e-way bill number** when consignment value > ₹50,000 (challans, not invoices, accompany job-work movements).
- **Service costing:** service cost = labor estimate (from Services catalog) + company-owned consumables actually used (ink, packaging SKUs consumed via movements) → feeds the true margin bridge (3.13).
- **Invoicing:** service lines invoice under **SAC** with the service's GST rate; **MIXED orders produce one invoice with HSN lines + SAC lines together**, tax computed per line; place of supply = recipient's registered state (B2B default).
- **Recurring gifting programs (P2 — Phase 5):** subscription-style service orders (e.g. monthly employee gifts) — recurrence rule spawns draft orders via a pg-boss scheduled job.

### 3.7 Sample Management (NEW — P1)

Every corporate gifting deal starts with samples, and sample cost silently eats margin.

- Sample request linked to client/opportunity: items + quantities; statuses `Requested → Approved → Dispatched → Feedback Received → Converted / Closed`.
- Dispatch generates `SMP/2026-27/xxxx`, consumes stock as a `SAMPLE_OUT` movement **at cost**, with a printable sample challan.
- **Sample cost accumulates on the client record** and is shown against converted revenue (sample-to-order conversion funnel on the dashboard).
- One-click **Convert**: create a quotation pre-filled from the sample selection.

### 3.8 Procurement (PO → GRN → Vendor Bill)

**Base:** auto-generate POs from confirmed SO demand; vendor management with pricing tiers & lead times; PO status tracking.
**Upgrades (P0 — payables side is mandatory):**
- **Demand = shortfall after reservation:** `required − available` per SKU (packaging SKUs included). Aggregate multiple SOs; choose vendor by price tier + lead time; group PO lines per vendor. Auto-created POs start as `Draft` for Purchase Manager review → `Ordered`.
- **GRN (Goods Receipt Note):** receiving happens only via GRN against a PO — quantities received, batch number, expiry (perishables), QC accept/reject counts. GRN posting increases stock **in a transaction** and moves PO to `Partially Received`/`Fully Received` automatically. Scan-based receiving (P2): scan SKU barcode to select the line.
- **Vendor Bills:** record vendor invoice against PO/GRN; **3-way match** (PO qty/price vs GRN qty vs bill) — mismatches flagged for Finance.
- **Vendor Payments:** payments against vendor bills; **TDS fields** (`tdsSection`, `tdsRate`, `tdsAmount`) (P2); vendor ledger and outstanding view.
- **Vendor performance data capture:** on-time delivery %, QC rejection rate, price variance (feeds dashboard 3.14).

### 3.9 Inventory Management

**Base:** real-time stock, inward/outward movements, batch-level tracking, low-stock alerts with thresholds.
**Upgrades (P0/P1):**
- **Reservation model:** per product per warehouse — `onHandQty`, `reservedQty`, **`availableQty = onHand − reserved`**. SO confirmation reserves; dispatch/backflush consumes reservation; cancellation releases. All checks use `availableQty`, never raw on-hand.
- **Ownership dimension (P1, for job work):** `ownership = COMPANY | CLIENT` (+ `clientId` when CLIENT) on inventory rows, batches, and movements. Valuation, availability, and reorder logic use **COMPANY stock only**; CLIENT stock is visible solely through the Job Work Register (3.6).
- **Warehouses:** `Warehouses` table; all stock rows and movements are warehouse-scoped (seed one default warehouse; model supports many).
- **Movements ledger:** every change is an `InventoryMovements` row — type (`PURCHASE_IN, SALES_OUT, ASSEMBLY_CONSUME, ASSEMBLY_PRODUCE, ADJUSTMENT, RETURN_IN, SCRAP, SAMPLE_OUT, JOBWORK_IN, JOBWORK_CONSUME, JOBWORK_RETURN`), qty, batchId, ownership, reference (GRN/SO/AssemblyJob/Challan/Sample id), userId. Stock is never edited directly.
- **Batches:** batch number, mfg/expiry dates; **FEFO picking** (first-expiry-first-out) for perishables during assembly allocation; near-expiry alert (configurable days).
- **Barcode/QR (labels P1, scanning P2):** every SKU and finished kit gets a Code-128/QR label (printable from the list page); scan-input fields (USB scanner = keyboard wedge) on GRN receive, assembly allocation, and dispatch confirmation.
- **Stock adjustments** with mandatory reason codes (physical count, damage, theft) — permission-gated, audit-logged.
- **Valuation:** weighted-average cost maintained per product per warehouse (COMPANY stock); used for margin and inventory-value dashboard.
- Low-stock alert job → notification when `availableQty < reorderLevel`.

### 3.10 Kitting / Assembly (critical)

**Base:** assembly jobs linked to SOs (input: SO line items; output: gift kits); statuses Pending / In Progress / Completed / Rejected; QC with restart of failed units.
**Upgrades (P0/P1):**
- Assembly job = SO + bundle + `plannedQty`; auto-created by the automation engine when all component stock for that SO is available (see Section 4 triggers).
- **Component allocation:** starting a job allocates components from reserved stock, batch-wise (FEFO). **Packaging components are part of the BOM and are allocated/consumed like any other item.**
- **Job-work assembly:** jobs on SERVICE orders may source **CLIENT-owned components** — allocation and backflush respect the ownership dimension and post `JOBWORK_CONSUME` movements against the Job Work Register.
- **Backflush on completion (atomic transaction):** decrement component stock (`ASSEMBLY_CONSUME` / `JOBWORK_CONSUME` by ownership) and increment finished-kit stock (`ASSEMBLY_PRODUCE`) for the completed quantity. Partial completions post partial backflush.
- **QC & wastage:** per-unit QC pass/fail. Failed unit → components inspected: reusable ones return to stock, damaged ones posted as `SCRAP` with cost impact (client-owned damage logged for sign-off, not costed to company). Track `completedQty`, `rejectedQty`, `scrapCost` per job.
- **Kit labels:** per-kit label with SO number, delivery-address linkage, kit barcode, and **per-recipient personalization** (name-on-gift, card message) from 3.5.

### 3.11 Customisation & Branding

**Base:** upload/manage client logos & brand assets; artwork lifecycle `Pending → Client Approved → Sent to Vendor → Completed`.
**Upgrades:**
- **Artwork versioning:** rejection creates the next version (v1 rejected → v2 …); full history retained; only one Approved version per SO item. (Portal approval — 3.2 — drives the same state machine.)
- **Branding cost as a cost line** on the SO item (printing/engraving/embroidery cost per unit) — included in order margin.
- **Branding vendors:** vendor type = `BRANDING`; branding jobs generate their own service POs to those vendors.
- Blocker rule: an SO with `brandable` items cannot move to `Ready` until all its artworks are `Completed`.

### 3.12 Logistics & Delivery

**Base:** shipments linked to SOs; courier partner assignment; per-address tracking; multi-location delivery; shipping label generation.
**Upgrades:**
- Shipment lifecycle: `Created → Label Generated → Picked Up → In Transit → Delivered / RTO`. One shipment covers one or many delivery addresses; per-address AWB/tracking number.
- **Freight cost per shipment** — flows into order margin.
- **POD capture:** receiver name, timestamp, photo/signature upload per delivered address.
- **Scan-to-dispatch (P2):** scanning a kit barcode marks its delivery address `Dispatched` and attaches it to the shipment.
- **Dispatch calendar & capacity view (P2):** calendar of committed kits/day vs assembly capacity (CompanySettings) so Sales cannot promise dates Production cannot hit; overbooked days highlighted.
- **E-way bill fields (P2):** `ewayBillNo`, `ewayBillDate`, validity on shipments **and job-work challans** — required capture when consignment value > ₹50,000 (validate & warn); generation API stubbed behind an interface.
- **Courier abstraction (P2):** `CourierProvider` interface (`createShipment`, `track`, `label`) with a manual/mock provider now; Shiprocket/Delhivery can plug in later.
- Label output: print-ready HTML/PDF with SO no., kit contents summary, address, AWB barcode.

### 3.13 Finance & India Compliance

**Base:** GST-compliant invoices; payment tracking (advance, balance, dates); profit margin per order; payment status dashboard.
**Upgrades (P0 unless marked):**
- **GST engine:** company state (CompanySettings) vs place of supply (client shipping/registered state) → **intra-state = CGST + SGST (rate split), inter-state = IGST**. Per line: `lineType (GOODS/SERVICE)`, **`hsnOrSacCode`**, taxable value, rate, tax amounts; invoice-level HSN/SAC summary; rounding to 2 decimals per line + invoice `roundOff`; **amount in words**; sequential invoice number (Section 2.4). Bundle tax per 3.3 mode; service lines per 3.6.
- **Invoice document:** print-ready HTML/PDF with all mandatory fields (supplier name/GSTIN/address, invoice no & date, client name/GSTIN, place of supply, line items with HSN/SAC, tax breakup table, totals, bank details, terms).
- **Payments & reconciliation:** payments recorded against client, allocated to one or more invoices; advance received on SO auto-adjusts against its invoices. Order payment status derived: `Unpaid → Advance Received → Partially Paid → Fully Paid`.
- **Credit / Debit Notes (P1):** for returns/adjustments, linked to original invoice, own number sequence.
- **True margin per order:** revenue − (component cost at weighted avg, incl. packaging + branding cost + service labor/consumables + freight + scrap + allocated sample cost where converted). Show the margin bridge on the order page.
- **Razorpay payment links (P2 — Phase 5):** generate a payment link per invoice (shown on the invoice PDF and portal); webhook receiver auto-creates the Payment and allocation. Keys via Secrets; provider behind a `PaymentGateway` interface.
- **Tally export (P2 — Phase 5):** sales, purchase, receipt, and payment vouchers exportable as Tally-importable XML (or Excel fallback) for a selected period — the accountant will ask for this in week one.
- **GSTR-1 export (P2 — Phase 5):** B2B invoice section export (Excel/CSV per the GSTR-1 B2B format) for a selected month from issued invoices and credit notes.
- **E-invoicing fields (P2):** `irn`, `ackNo`, `ackDate`, `qrCodeData` on invoices; generation stubbed behind an interface (mandatory only above notified turnover threshold — ₹5 Cr currently).
- Receivables aging (0–30/31–60/61–90/90+) and vendor payables view.

### 3.14 Dashboards & Analytics

- Sales performance (revenue, margin, orders by month; top clients/occasions; **goods vs service revenue split**).
- Inventory: stock value (weighted avg, COMPANY only), low-stock list, near-expiry batches, fast/slow movers.
- Order pipeline board by status & expected dispatch date.
- **Assembly capacity planning:** committed kits/day vs capacity by date (feeds 3.12 calendar).
- **Sample funnel:** samples dispatched → feedback → converted; sample cost vs converted revenue per client.
- Vendor performance: on-time %, rejection %, price variance.
- Receivables aging + payables due.
- Seasonal demand trend (monthly qty by occasion/category) + simple forecast (3-month moving average with seasonal uplift is sufficient — label it as an estimate).

### 3.15 Automation, Notifications & Data Import

All triggers run as **pg-boss jobs** (never inline in HTTP handlers):

| Event | Automated action |
|---|---|
| SO Confirmed | Reserve stock → compute shortfall → create Draft POs per vendor → notify Purchase Manager |
| GRN posted, all components for an SO available | Auto-create Assembly Job → notify Production |
| Assembly Job completed | Notify Logistics; SO → `Ready` when all jobs done (and artworks completed) |
| Service line completed | Notify Sales; order status re-derived |
| Shipment dispatched | Notify Sales + client with tracking |
| Low stock / near expiry | Notify Purchase Manager |
| Artwork pending > X days / delivery due in Y days | Reminder notifications |
| Seasonal occasion approaching (configurable lead time) | Create Sales tasks from last year's occasion orders (3.5) |
| Recurrence rule due (P2) | Spawn draft recurring service order (3.6) |

**Notifications system:** `Notifications` table (userId, type, title, body, entityRef, readAt) + in-app bell. **Channel abstraction (P1 interface, P2 WhatsApp):** `NotificationChannel` interface with implementations — InApp, Email (SMTP, outbox pattern via `EmailOutbox` with retry), and a **WhatsApp provider stub** (Gupshup/Twilio pluggable later — in India this channel matters more than email). Log-only transports acceptable in dev.

**Master-data import wizard (P1 — required before go-live):** Excel upload flows for **Products (with HSN/GST), Services (with SAC), Clients, Vendors, and Opening Stock (with batches & ownership)** — template download per type, row-level validation report, dry-run preview, commit as a background job (`ImportJobs` table tracks status + report). Without this, go-live is weeks of manual entry.

---

## 4. State Transition Matrix (authoritative — enforce in service layer)

**Sales / Service Order (unified)**

| From | To | Actor/Trigger | Guards & side-effects |
|---|---|---|---|
| Draft | Pending Approval | Sales | discount > limit |
| Pending Approval | Confirmed | Admin/Finance | approval logged |
| Draft | Confirmed | Sales | credit limit OK; addresses valid (goods lines); **reserve stock; enqueue auto-PO** |
| Confirmed | In Production | auto | first assembly job **or** first service line starts |
| In Production | Ready | auto | all assembly jobs Completed **and** all service lines Completed **and** all artworks Completed |
| Ready | Dispatched | Warehouse | ≥1 shipment dispatched (derived; supports partial); pure-SERVICE orders may skip to Delivered/Closed on completion |
| Dispatched | Delivered | auto | all delivery addresses Delivered |
| Draft/Confirmed | Cancelled | Admin | release reservations; cancel/flag linked POs; client material (if any) must be returned via DC-Out first |

**Service line:** `Pending → In Progress → Completed` (Production/Sales).

**Delivery Address:** `Pending → Kitted → Dispatched → Delivered`; `Dispatched → Failed → Returned` (RTO restocks via `RETURN_IN`).

**Client Material (job work):** `Received (DC-In) → In Custody → Consumed | Returned (DC-Out)`. Register invariant: received = consumed + returned + balance; order cannot Close with a non-zero unexplained balance.

**Sample:** `Requested → Approved → Dispatched → Feedback Received → Converted | Closed`.

**Quotation Version:** `Draft → Sent → Approved | Rejected | Revised` (Revised spawns next version; Approved is terminal and convertible).

**Purchase Order:** `Draft → Ordered → Partially Received → Fully Received`; `Draft/Ordered → Cancelled`. Received states change **only via GRN posting**.

**Assembly Job:** `Pending → In Progress → QC → Completed`; QC fail on a unit → unit back to In Progress; job `Rejected` only if entire job scrapped (Admin). Completion posts backflush.

**Artwork Version:** `Pending → Client Approved → Sent to Vendor → Completed`; `Pending → Rejected` (spawns next version).

**Shipment:** `Created → Label Generated → Picked Up → In Transit → Delivered | RTO`.

**Invoice:** `Draft → Issued → Partially Paid → Paid`; `Issued → Cancelled` only via Credit Note.

Any transition not listed → reject with `409 INVALID_TRANSITION`.

---

## 5. Database Schema — complete table list (verify existing models against this; add missing fields via migrations)

Every table: `id`, **`orgId`**, `createdAt`, `updatedAt`, `deletedAt`, `createdById` where relevant; business documents also carry `version` (optimistic locking).

| Table | Key fields (beyond obvious) |
|---|---|
| Organizations | name, isActive (single default org seeded) |
| CompanySettings | orgId, legalName, gstin, address, **stateCode**, fyStartMonth, bankDetails JSON, logoUrl, assemblyCapacityPerDay |
| Users / Roles / Permissions / RolePermissions | user: email, passwordHash, roleId, isActive, clientId (Portal users) |
| Clients | companyName, gstin, stateCode, industry, creditLimit, paymentTerms, stage(Lead/Qualified/Proposal/Won/Active/Lost), billingAddress, sampleCostToDate (derived/cached) |
| ClientContacts | clientId, name, designation, phone, email, isPrimary, portalAccess |
| ClientInteractions | clientId, type(call/email/meeting), notes, followUpAt |
| Occasions | name (Diwali, New Year, Anniversary …) |
| Products | sku, name, categoryId, **hsnCode, gstRate**, uom, costPrice, sellingPrice, reorderLevel, reorderQty, isPerishable, shelfLifeDays, brandable, **isPackaging, barcode** |
| **Services** | name, type(BRANDING/KITTING_JOBWORK/DESIGN/EVENT/OTHER), **sacCode, gstRate**, unit, unitPrice, costEstimate |
| ProductCategories | name |
| ProductImages / Attachments | polymorphic: entityType, entityId, storageKey, fileName |
| Vendors | name, gstin, type(GOODS/BRANDING/COURIER), paymentTerms |
| VendorProducts | vendorId, productId, price tiers JSON, leadTimeDays |
| ProductBundles | name, occasionIds, targetPrice, **gstMode(MIXED_SUPPLY/ITEMIZED)** |
| BundleItems | bundleId, productId, qty (packaging SKUs included) |
| Warehouses | name, address |
| Inventory | productId, warehouseId, **ownership(COMPANY/CLIENT), clientId?**, **onHandQty, reservedQty**, avgCost (COMPANY only) |
| InventoryBatches | productId, warehouseId, ownership, clientId?, batchNo, qty, mfgDate, expiryDate |
| InventoryMovements | type (incl. SAMPLE_OUT, JOBWORK_IN/CONSUME/RETURN), productId, warehouseId, batchId, ownership, qty(+/−), refType, refId, userId |
| StockAdjustments | reasonCode, notes, approvedById |
| Quotations / QuotationVersions | clientId; version: versionNo, status, QuotationLines, validUntil |
| SalesOrders | soNumber, **orderType(GOODS/SERVICE/MIXED)**, clientId, quotationVersionId, status, discountPct, approvalStatus, advanceRequiredPct, expectedDispatchDate, clonedFromId? |
| SalesOrderItems | soId, **itemType(PRODUCT/BUNDLE/SERVICE)**, bundleId/productId/**serviceId**, qty, unitPrice, brandingCostPerUnit, **serviceStatus(Pending/InProgress/Completed)** |
| DeliveryAddresses | soId, recipientName, phone, address, city, state, pincode, **status**, **personalization JSON**, awbNumber, podName, podAt, podFileKey |
| **ClientMaterialChallans** | dcNumber, direction(IN/OUT), soId, clientId, date, **ewayBillNo?**, notes |
| **ClientMaterialChallanItems** | challanId, productId?/description, qty, batchNo? |
| **Samples / SampleItems** | smpNumber, clientId, status, feedback; item: productId, qty, unitCost |
| PurchaseOrders | poNumber, vendorId, status, expectedDate, soRefIds JSON |
| PurchaseOrderItems | poId, productId, qty, unitCost |
| GoodsReceipts / GoodsReceiptItems | grnNumber, poId; item: qtyReceived, qtyRejected, batchNo, expiryDate |
| VendorBills | vendorId, poId, billNumber, amount, matchStatus(MATCHED/MISMATCH) |
| VendorPayments | vendorBillId, amount, tdsSection, tdsRate, tdsAmount, paidAt, mode |
| AssemblyJobs | soId, bundleId, plannedQty, completedQty, rejectedQty, scrapCost, status |
| AssemblyItems | jobId, productId, batchId, ownership, qtyAllocated, qtyConsumed |
| ArtworkApprovals | soItemId, versionNo, status, fileKey, vendorId, clientComment, approvedVia(INTERNAL/PORTAL) |
| Shipments / ShipmentItems | shpNumber, soId, courierVendorId, status, freightCost, **ewayBillNo**, ewayBillDate; item: deliveryAddressId, kitQty, awbNumber |
| Invoices | invNumber, soId, clientId, placeOfSupplyStateCode, taxableTotal, cgst, sgst, igst, roundOff, grandTotal, amountInWords, status, **irn, ackNo, qrCodeData** |
| InvoiceLines | invoiceId, **lineType(GOODS/SERVICE)**, description, **hsnOrSacCode**, qty, rate, taxableValue, gstRate, cgst, sgst, igst |
| CreditNotes / DebitNotes | number, invoiceId, reason, amounts |
| Payments / PaymentAllocations | clientId, amount, mode, receivedAt, gatewayRef?; allocation: paymentId, invoiceId, amount |
| **PaymentLinks (P2)** | invoiceId, provider(RAZORPAY), linkId, url, status, webhookPayload |
| NumberSequences | docType (QTN/SO/PO/GRN/DC/SMP/SHP/INV/CN), fyLabel, lastNumber (row-locked) |
| AuditLogs | userId, entity, entityId, action, oldValues, newValues, ip |
| Notifications | userId, type, channelPrefs, title, body, entityRef, readAt |
| EmailOutbox | to, channel(EMAIL/WHATSAPP), subject, body, status, attempts, lastError |
| **ImportJobs** | type(PRODUCTS/SERVICES/CLIENTS/VENDORS/OPENING_STOCK), fileKey, status, dryRun, reportJSON |

---

## 6. API Structure

```
/api/v1/auth            /api/v1/users            /api/v1/clients
/api/v1/products        /api/v1/services         /api/v1/bundles
/api/v1/bundle-builder  /api/v1/quotations       /api/v1/sales-orders
/api/v1/client-materials /api/v1/samples         /api/v1/purchase-orders
/api/v1/grns            /api/v1/vendor-bills     /api/v1/vendor-payments
/api/v1/inventory       /api/v1/warehouses       /api/v1/assembly
/api/v1/artworks        /api/v1/shipments        /api/v1/invoices
/api/v1/credit-notes    /api/v1/payments         /api/v1/payment-links (P2)
/api/v1/imports         /api/v1/exports/tally (P2) /api/v1/exports/gstr1 (P2)
/api/v1/notifications   /api/v1/analytics        /api/v1/settings
/api/v1/simulation      /api/v1/portal/* (P2)
```

All versioned, permission-guarded, Zod-validated, org-scoped, standard envelope. **Swagger/OpenAPI docs at `/api/docs` (P2).**

---

## 7. RBAC Permission Matrix (summary — implement granularly)

| Module | Admin | Sales | Purchase Mgr | Warehouse | Production | Finance | Portal |
|---|---|---|---|---|---|---|---|
| Clients/CRM | CRUD | CRUD | R | – | – | R | own profile R |
| Products/Services/Bundles | CRUD | R | CRUD | R | R | R | – |
| Quotations/SO (incl. service orders) | CRUD + approve discounts | CRUD | R | R | R | R + approve | own orders R |
| Samples | CRUD | CRUD | – | dispatch | – | R | – |
| Job-work challans / register | CRUD | R | – | CRUD | R | R | own R |
| PO / GRN / Vendor bills | CRUD | – | CRUD | GRN post | – | Bills/Payments | – |
| Inventory adjustments | CRUD | – | R | CRUD | R | R | – |
| Assembly | CRUD | R | – | R | CRUD | – | – |
| Artworks | CRUD | CRUD | – | – | R | – | approve/reject own |
| Shipments | CRUD | R | – | CRUD | R | R | own tracking R |
| Invoices/Payments | CRUD | R | – | – | – | CRUD | own invoices R + pay |
| Imports / Settings / Users / Audit | CRUD | – | – | – | – | R (audit) | – |

---

## 8. Phased Fix Plan (execute in order; each phase ends green)

**Phase 1 — Foundations & Masters (P0 core)**
Gap report (incl. UI audit) → **design system + app shell first** (theme tokens, layout, sidebar, topbar, page templates, statusConfig — Sections 11.2–11.5) → Organizations + `orgId` scoping middleware, security middleware (helmet/rate-limit/lockout), pino logging, CompanySettings, NumberSequences (incl. DC/SMP), AuditLogs, soft-delete middleware, optimistic-lock `version`, Zod validation, response envelope, permissions tables + middleware → Product HSN/GST + packaging flag + barcode, **Services catalog with SAC**, VendorProducts, Warehouses, Inventory reservation + ownership columns → migrations + seed (org, roles, users, 30+ products incl. packaging SKUs with real HSN/GST, 5+ services with SAC, 5 vendors, 3 clients, occasions).
*Exit:* auth + RBAC works; catalog CRUD (products, services, bundles with packaging) rendered on the new UI shell; gap report committed.

**Phase 2 — Order-to-Procure (P0)**
Quotation versioning → unified order model (orderType/itemType) → SO confirmation transaction (credit check, reservation, shortfall) → clone-order action → Sample Management module → auto-PO job → GRN posting with batches → 3-way match + vendor bills → inventory movements ledger → state machine enforcement for QTN/SO/PO/Sample.
*Exit:* Steps 1–8 and 19–20 of Section 9 pass; unit tests for reservation concurrency green.

**Phase 3 — Make-to-Deliver & Money (P0/P1)**
Assembly with allocation + backflush + QC/scrap (packaging consumed) → **job work: DC-In/Out challans, custody stock, Job Work Register, service-line fulfillment** → artwork versioning + branding costs → per-recipient kit labels → shipments with address-level status, freight, POD, labels → **GST invoice engine (HSN + SAC, mixed orders)** + PDF + payments/allocations → margin bridge (incl. services & samples) → credit notes.
*Exit:* full Section 9 flow (steps 1–18) passes end-to-end; GST engine unit tests green.

**Phase 4 — Automation, Ops Hardening & Advanced (P1/P2)**
pg-boss triggers per 3.15 → notifications + channel abstraction (Email live, WhatsApp stub) → seasonal reminder job → **master-data import wizard (all 5 types)** → barcode label generation (+ scan inputs, P2) → Bundle Builder algorithm (+ optional Claude layer) → dashboards incl. capacity + sample funnel → Simulation Mode (SSE) → e-way/e-invoice stub fields → TDS → idempotency keys → Swagger → **full automated test suite green** → **final UI polish pass: every screen re-checked against Section 11; Legacy Kill-List count must be zero**.
*Exit:* Simulation Mode runs; dashboards populated; `npm test` green; UI audit re-run shows all screens ✅.

**Phase 5 — Growth Features (P2, build only after Phases 1–4 are green)**
Client Portal (orders, artwork approve/reject, invoices) → Razorpay payment links + webhook auto-allocation → WhatsApp channel live behind the existing interface → Tally voucher export → GSTR-1 B2B export → recurring gifting programs → dispatch capacity calendar → scan-to-dispatch.
*Exit:* portal user can approve artwork and pay an invoice end-to-end; Tally XML imports cleanly; GSTR-1 export matches issued invoices for the period.

---

## 9. Acceptance Test — the E2E flow that must pass

Provide a seed/script (`npm run e2e-demo`) that executes and verifies:

1. Create client (valid GSTIN, credit limit, 2 contacts) — stage moves Lead → Won.
2. Smart Bundle Builder: budget ₹1,500, occasion Diwali → top-3 suggestions → manually swap one item → save bundle (margin recomputed; packaging components present).
3. Quotation v1 → client negotiates → v2 (revised) → v2 Approved; v1 locked.
4. Confirm SO for 50 kits to 10 addresses (Excel import incl. personalization columns; 2 bad rows rejected with row-level errors). Discount 8% → routes to approval → Admin approves.
5. Verify reservation: availableQty drops; second SO for same items sees reduced availability.
6. Auto-PO drafts created only for shortfall quantities (packaging included), grouped per vendor.
7. GRN partial receive (PO → Partially Received) → second GRN completes (Fully Received); batch + expiry recorded; stock in via movements.
8. Vendor bill entered → 3-way match passes; a deliberately wrong-price bill flags MISMATCH.
9. Assembly job auto-created → allocate (FEFO) → QC-fail 1 unit (1 component scrapped, cost posted) → reassemble → complete → **backflush verified** (components + packaging down, finished kits up, atomic); kit labels carry recipient personalization.
10. Artwork v1 rejected → v2 approved → sent to vendor → completed; SO blocked from `Ready` until then.
11. Shipments per address → labels generated → e-way bill number captured (value > ₹50k) → dispatch 6 addresses (partial) → SO shows Dispatched with 6/10 → deliver all with POD.
12. Invoice: sequential number `INV/2026-27/xxxx`; intra-state client → CGST+SGST; change client state → IGST; bundle taxed per MIXED_SUPPLY (highest component rate); amount in words; PDF renders.
13. Advance recorded at confirmation auto-allocates; balance payment → status Fully Paid.
14. Margin bridge on order = revenue − components (weighted avg, incl. packaging) − branding − freight − scrap; matches manual calculation.
15. AuditLogs contain entries for every status change above; cancelling a draft SO releases reservations.
16. Invalid transition attempt (Draft → Dispatched) returns `409 INVALID_TRANSITION`; a stale-version update returns `409 STALE_WRITE`.
17. **Service order (job work):** client material inward via DC-In (`DC/2026-27/xxxx`) → Job Work Register shows custody balance; **company stock valuation unchanged** → branding service line In Progress → consume client material + a company-owned consumable SKU → line Completed → DC-Out returns finished goods with e-way bill number → **SAC invoice at the service's GST rate** → register balances to zero; order closes.
18. **Mixed order:** 100 kits + one design-service line → single invoice with HSN lines + SAC line, tax computed per line type.
19. **Sample flow:** dispatch 3 samples (`SMP/…`, `SAMPLE_OUT` at cost) → record feedback → Convert creates a pre-filled quotation; client page shows accumulated sample cost.
20. **Clone & reminder:** clone last order → new Draft SO with fresh number; seasonal-reminder job over a backdated seed order creates the Sales notification.
21. **Concurrency:** two parallel SO confirmations cannot oversell the same stock; parallel invoice creation yields gapless sequential numbers.

---

## 10. Simulation Mode (P2)

`POST /api/v1/simulation/diwali-bulk` — simulates a 1,000-kit Diwali order end-to-end using real services (flagged `isSimulation` data): time-compressed progression through procurement → GRN → assembly → dispatch → invoicing. SSE stream (`/api/v1/simulation/:id/events`) drives a live dashboard: procurement %, assembly completion %, dispatch count, invoice status. Reset endpoint purges simulation-flagged data.

---

## 11. UI / UX Modernization (mandatory — current UI reads as a legacy app; bring it to a modern standard)

The frontend must look and feel like a contemporary SaaS product (Linear / Notion / modern shadcn-dashboard class), **not a 2015-era admin panel**. shadcn/ui + Tailwind are already the stack — the problem is inconsistent, dated usage. Fix by rebuilding screens onto the shared system below, not by patching CSS on old markup.

### 11.1 UI audit first
Complete the UI/UX Audit in `GAP_REPORT.md` (Section 0.1) before restyling anything: every screen scored ✅ / ⚠️ / ❌ against this section, plus a count of Legacy Kill-List occurrences (11.10) in the codebase.

### 11.2 Design tokens & theme (single source of truth)
- All colors, radii, spacing, shadows via CSS variables + Tailwind theme config. **No hardcoded hex values inside components.**
- **Theme direction (light default) — clean premium white:** background `#FFFFFF`, surface `#F8FAFC`, ink `#0F172A` (dark navy/slate), muted text `#64748B`, borders `#E2E8F0`, **accent amber `#D97706`** (hover `#B45309`), success `#059669`, warning `#D97706`, danger `#DC2626`, info `#2563EB`.
- **Dark mode** via shadcn class-strategy theming, persistent toggle in the user menu.
- Radius `0.5rem` inputs/buttons, `0.75rem` cards; one subtle shadow scale (`sm` cards, `md` popovers). No gradients as decoration, no heavy drop shadows.
- Spacing on a 4px grid; page gutter 24px desktop / 16px mobile; card padding 20–24px.

### 11.3 Typography & data formatting
- One UI face — **Inter** (or Geist) — everywhere. Working size `14px` for tables/forms, `16px` body; heading scale 18 / 24 / 30px, semibold (never bold-everything).
- **Financial figures: tabular numerals** (`font-variant-numeric: tabular-nums`), right-aligned in tables.
- Single `formatINR()` util with Indian digit grouping (`₹12,34,567.00`) used app-wide; single `formatDate()` util (`14 Jul 2026`). Mixed formats anywhere = defect.

### 11.4 App shell & navigation
- **Sidebar:** modules grouped (Sales / Procurement / Operations / Finance / Admin) with lucide icons, collapsible to an icon rail with tooltips, active-state highlight; becomes a drawer on mobile.
- **Topbar:** global search, notification bell (unread count + popover fed by `Notifications`), user menu (profile, theme toggle, logout); breadcrumbs beneath.
- **⌘K command palette** (shadcn `Command`): navigate to any module, jump to a record by document number (SO/PO/INV/DC/SMP…), quick actions ("New Quotation", "Receive GRN", "New Sample").

### 11.5 Page templates — every module uses these; consistency is the feature
- **ListPage:** header (title, record count, primary action) → filter bar → DataTable → pagination.
- **DetailPage:** header (document number + client, `StatusBadge`, action buttons gated by state machine + permissions) → tabbed body (Overview / Items / Linked documents) → **activity timeline rendered from `AuditLogs`**.
- **FormPage:** card-sectioned fields, sticky footer (Cancel / Save), unsaved-changes guard. Long flows (SO creation) are **multi-step wizards** with progress: Client → Items/Bundle/Services → Delivery addresses → Review.
- **StatusBadge:** one shared `statusConfig` map (status → label, color, icon) drives every badge, kanban column, and chart legend. Ad-hoc badge colors are forbidden.
- New modules (Samples, Job Work Register, Imports) use the same templates — no bespoke layouts.

### 11.6 Data tables (replace every legacy table)
TanStack Table + shadcn on all lists: sticky header, column sorting, per-column filters + global keyword search, server-side pagination, column-visibility menu, density toggle, row click → detail, checkbox selection with bulk-actions bar, CSV export, right-aligned tabular-num money columns. Loading = **skeleton rows**; empty = short explanation + CTA ("No purchase orders yet — Create PO").

### 11.7 Forms & inputs
react-hook-form + the shared Zod schemas; inline field errors (never browser alerts); required-field marks; searchable async selects for clients/products/services/vendors (debounced); proper date pickers; ₹-prefixed number inputs; drag-drop file upload with progress; scan-friendly inputs (auto-submit on scanner Enter) where barcodes apply; state-gated buttons disabled **with a tooltip explaining why**.

### 11.8 Dashboards & visualization
KPI stat cards (value, label, delta vs previous period with ▲/▼ color), recharts themed from the tokens (line/bar/donut), global date-range picker, order **pipeline as a kanban board** with `statusConfig` colors. Charts get skeletons too.

### 11.9 Feedback, motion & states
- Toasts (sonner) on every mutation, action-consistent copy ("Invoice INV/2026-27/0042 issued").
- Destructive actions (cancel SO, delete) → shadcn `AlertDialog` stating the consequence — never `window.confirm`.
- Transitions 150–200ms ease on hover/expand/page fade; **respect `prefers-reduced-motion`**; no gratuitous animation.
- Every screen implements all four states: **loading (skeleton), empty (explain + CTA), error (what failed + retry), populated.**

### 11.10 Legacy Kill-List — eliminate every occurrence
1. Browser `alert()` / `confirm()` / `prompt()`
2. Unstyled/default HTML `<table>`, `<select>`, or native date inputs in main flows
3. Full-page reloads on actions; raw `<form>` posts without client handling
4. Spinner-only or blank-screen loading (no skeletons)
5. Ad-hoc badge/status colors; inline hex styles in components
6. Mixed icon sets or emoji-as-icons
7. Dense bordered "Excel-look" tables with zero padding
8. Gradient header bars, bevels, heavy shadows (2015 admin-template look)
9. Fixed-width non-responsive layouts; horizontal page scroll on mobile (intentional wide tables excepted)
10. Modal-inside-modal; modals used for full CRUD forms that deserve pages
11. Mixed date or currency formats
12. Missing focus states / keyboard traps

### 11.11 Accessibility & responsive floor
WCAG AA contrast on text and badges, labels tied to inputs, core flows keyboard-completable with visible focus rings, 44px touch targets on mobile, tables collapse to card lists below the `md` breakpoint, wizard forms usable at ~380px width.

---

## 12. Definition of Done — final checklist

- [ ] `GAP_REPORT.md` committed and updated after each phase
- [ ] All P0 items implemented; no P0 TODOs
- [ ] `npm run e2e-demo` passes all 21 acceptance steps (incl. service order, mixed order, samples, concurrency)
- [ ] `npm test` green — GST engine, reservation concurrency, backflush atomicity, gapless sequences, custody-stock exclusion
- [ ] All schema changes via named Prisma migrations; every business table carries `orgId` and (documents) `version`
- [ ] Zod validation on every endpoint; standard envelope everywhere; org scoping enforced
- [ ] All state transitions enforced; invalid ones rejected with 409; stale writes rejected with 409
- [ ] Job Work Register balances; client custody stock never appears in valuation or availability
- [ ] Stock/finance writes only inside transactions; number sequences gapless under concurrency
- [ ] Master-data import wizard works for all 5 types with dry-run + row-level errors
- [ ] No hardcoded secrets; `.env.example` complete; Replit Secrets documented in README
- [ ] UI: every screen uses the shared ListPage / DetailPage / FormPage templates and the single `statusConfig` map
- [ ] Design tokens applied app-wide; dark mode toggle and ⌘K command palette working
- [ ] Legacy Kill-List (11.10): **zero occurrences remain** — verified by re-running the UI audit
- [ ] Mobile verified on key flows: sidebar → drawer, tables → card lists, forms usable at ~380px
- [ ] README updated: setup, secrets, seed, e2e-demo, tests, imports, simulation instructions
