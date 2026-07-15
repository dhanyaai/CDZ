# Corporate Gifting ERP — Gap Report (v3 Spec Audit)

> Audited: 15 Jul 2026  
> Spec: ERP_AUDIT_UPGRADE_SPEC v3  
> Codebase: pnpm monorepo — Express 5 + Drizzle ORM + React/Vite  

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Implemented correctly |
| ⚠️ | Partially implemented — gap described |
| ❌ | Missing entirely |
| 🐞 | Implemented incorrectly — defect described |

---

## 0. Global Architecture Requirements (Section 2)

| Requirement | Status | Notes |
|---|---|---|
| Service layer (routes → controllers → services → repos) | 🐞 | Business logic sits directly in route handlers; no separate service or repository layer |
| Transactions & row locking for stock/number writes | ⚠️ | `numberSequence.ts` uses `FOR UPDATE`; stock mutations in routes do NOT use transactions |
| State machines (stateMachine.ts) | ⚠️ | `SO_TRANSITIONS`, `PO_TRANSITIONS`, Assembly, Shipments, Artwork defined; `canTransition` helper exists but NOT enforced on every PATCH — routes bypass it |
| Document numbering (`NumberSequences` table) | ✅ | `number_sequences` table + `numberSequence.ts` with FY-aware, row-locked sequences |
| DC/SMP number types in sequences | ❌ | Only SO/PO/INV/GRN types seeded; `DC` and `SMP` are missing |
| Audit trail (`AuditLogs`) | ⚠️ | Table exists, `/v1/audit-logs` route exists; NOT written automatically by service layer — must be called manually per route |
| Soft delete (`deletedAt`) | ⚠️ | Present on: products, vendors, clients, salesOrders, purchaseOrders, invoices, quotes, leads, contacts, creditNotes. Missing on: bundles, assembly, shipments, artworks, GRN, payments, notifications |
| Idempotency keys | ❌ | Not implemented |
| `CompanySettings` with `stateCode` | ⚠️ | `companies` table has `gstNumber` (stateCode derivable); no dedicated `CompanySettings` table; bank details, `assemblyCapacityPerDay`, FY start, logo URL — all missing |
| Multi-tenancy (`orgId` on every table) | 🐞 | Uses `companyId` (equivalent concept) on most tables — column name diverges from spec but functionally similar. Missing on: notifications, audit_logs, email_outbox, import_jobs |
| Optimistic locking (`version` integer) | ❌ | No `version` column on any business document |
| Security: helmet, CORS allowlist, rate limiting | ❌ | Not found in app.ts or middleware |
| Login lockout after N failures | ❌ | Not implemented |
| bcrypt/argon2 password hashing | ⚠️ | Sessions use token lookup; no evidence of bcrypt — needs verification |
| Pino structured logging with request IDs | ❌ | Uses `console.log`/`req.log` ad-hoc; no pino setup found |
| Zod validation on every API endpoint | 🐞 | Frontend Zod schemas exist; backend routes do manual `req.body` property checks — not Zod-validated |
| Standard response envelope `{ success, data, error, meta }` | 🐞 | Inconsistent — some routes return bare objects, some return `{ success, data }`, not uniformly structured |
| Standard pagination (`page/limit/sort/order/search + meta`) | ⚠️ | Some list routes accept `search`; consistent pagination meta missing |
| Global error middleware with consistent HTTP codes | ⚠️ | `StatusError` class exists; no centralized error handler verified |
| Automated tests | ❌ | No test suite found (`npm test` not configured) |

---

## 1. Auth & User Management (Section 3.1)

| Item | Status | Notes |
|---|---|---|
| Roles: Admin, Sales, Purchase, Warehouse, Production, Finance | ✅ | Defined in `requirePermission.ts` ROLE_PERMISSIONS map |
| Login / logout / me endpoints | ✅ | `/v1/auth/login`, `/v1/auth/logout`, `/v1/auth/me` |
| Permissions in DB (`Permissions`, `RolePermissions` tables) | ❌ | Permissions hardcoded in `requirePermission.ts` — not stored in DB |
| `requirePermission('...')` middleware on every route | ⚠️ | Middleware exists but not applied to all routes uniformly |
| JWT access + refresh token rotation | ❌ | Session-token system only; no refresh token rotation |
| Account deactivation (not deletion) | ❌ | Not implemented |
| Portal role (P2) | ❌ | Not implemented |
| Seed one user per role | ✅ | Seed users: admin, priya/arjun (Sales), vikram (Warehouse), anita (Finance), sunil (Purchase), kavita (Production) |

---

## 2. CRM — Client Management (Section 3.2)

| Item | Status | Notes |
|---|---|---|
| Client profiles (company, contact, GSTIN, addresses) | ✅ | `clients` table with name, email, gstNumber |
| Multiple contact persons per client (`ClientContacts`) | ⚠️ | `contacts` table exists but `isPrimary`, `designation`, `portalAccess` missing |
| GSTIN validation regex | ❌ | No server-side GSTIN regex validation |
| Credit limit & payment terms per client | ❌ | Not in `clients` schema |
| Credit limit block on SO confirmation | ❌ | Not implemented |
| Lead/opportunity stage on client record | ⚠️ | `leads` table exists separately; client `stage` field not on `clients` table |
| Interaction log (`ClientInteractions`) | ⚠️ | `activities` table may partially cover this |
| Requirement document uploads | ⚠️ | `uploads` route exists; not linked to client records |
| Tags by industry & occasion | ⚠️ | Industry field on clients — occasion tags missing |
| Lifetime revenue, margin, sample cost on client page | ❌ | Client detail page does not show these derived fields |
| Client Portal (P2) | ❌ | Not implemented |

---

## 3. Product & Service Catalog (Section 3.3)

| Item | Status | Notes |
|---|---|---|
| Products: name, category, cost, selling price, vendor, stock | ✅ | Basic fields present |
| `hsnCode` on products | ✅ | Present in schema |
| `gstRate` on products (0/5/12/18/28) | ✅ | Present in schema |
| `uom` | ✅ | Present |
| `reorderLevel` | ✅ | Present |
| `reorderQty` | ❌ | Not confirmed in schema |
| `isPerishable`, `shelfLifeDays` | ❌ | Not in schema |
| `brandable` | ❌ | Not in schema |
| `isPackaging` | ❌ | Not in schema — **critical for BOM/backflush** |
| `barcode` | ❌ | Not in schema |
| VendorProducts (price tiers + lead time days) | ⚠️ | `vendorProducts` table exists; price tiers JSON and `leadTimeDays` not confirmed |
| **Services catalog** (`Services` table: sacCode, gstRate, type) | ❌ | No `Services` table; SAC codes not modeled anywhere |
| Bundle `gstMode` (MIXED_SUPPLY / ITEMIZED) | ❌ | Not in `bundles` schema |
| Packaging components inside every bundle BOM | ❌ | `isPackaging` flag missing; no lint/validation rule |
| Product images / Attachments (polymorphic) | ⚠️ | `uploads` route exists; polymorphic attachment table not confirmed |

---

## 4. Smart Gift Bundle Builder (Section 3.4)

| Item | Status | Notes |
|---|---|---|
| Budget/occasion/quantity inputs | ❌ | No bundle builder algorithm found |
| Greedy seed + local-search scoring | ❌ | Not implemented |
| Top-3 combinations with margin breakdown | ❌ | Not implemented |
| Manual override & live margin recompute | ❌ | Not implemented |
| Claude AI layer (P2) | ❌ | Not implemented |

---

## 5. Quotations & Sales Order Management (Section 3.5)

| Item | Status | Notes |
|---|---|---|
| Quotation creation & conversion to SO | ⚠️ | `quotes` table and routes exist; full lifecycle unclear |
| Quotation versioning (`QuotationVersions`) | ❌ | No version history; single quote record only |
| `SalesOrders.orderType` (GOODS/SERVICE/MIXED) | ❌ | Not in `sales_orders` schema |
| `SalesOrderItems.itemType` (PRODUCT/BUNDLE/SERVICE) | ❌ | Not in `sales_order_items`; only productId present |
| Discount approval workflow (`Pending Approval` state) | ❌ | Not implemented |
| Address-level delivery status (separate `DeliveryAddresses` table) | ❌ | Delivery addresses not a separate table; no per-address status |
| Partial dispatch support | ❌ | Not implemented |
| Per-recipient personalization (Excel import columns) | ❌ | Not implemented |
| Excel bulk address import via pg-boss background job | ❌ | Not implemented |
| Clone / repeat order | ❌ | Not implemented |
| Seasonal reminder job | ❌ | Not implemented |
| Cancellation with reservation release | ⚠️ | Cancel transition exists; reservation release not confirmed |
| SO confirmation atomic transaction (reserve + shortfall + enqueue PO) | ❌ | No atomic confirmation transaction found |

---

## 6. Service Orders & Job Work (Section 3.6) — NEW

| Item | Status | Notes |
|---|---|---|
| Service lines in SalesOrderItems (`itemType=SERVICE`) | ❌ | Not implemented |
| Service line fulfillment status (Pending → In Progress → Completed) | ❌ | Not implemented |
| Delivery Challan In (DC-In) for client material | ❌ | `ClientMaterialChallans` table missing entirely |
| Custody stock (`ownership=CLIENT` on inventory) | ❌ | No ownership dimension on inventory |
| Job Work Register (received − consumed − returned = balance) | ❌ | Not implemented |
| Consumption posting (`JOBWORK_CONSUME` movement) | ❌ | Movement type not defined |
| Delivery Challan Out (DC-Out) | ❌ | Not implemented |
| E-way bill number on challans | ❌ | Not implemented |
| Service costing (labor + consumables) | ❌ | Not implemented |
| SAC invoicing for service lines | ❌ | Not implemented |
| Recurring gifting programs (P2) | ❌ | Not implemented |

---

## 7. Sample Management (Section 3.7)

| Item | Status | Notes |
|---|---|---|
| Sample request linked to client | ⚠️ | `sampleOrders` table + `/v1/sample-orders` route exist |
| Status lifecycle (Requested → Approved → Dispatched → Feedback → Converted/Closed) | ⚠️ | Basic statuses may exist; full lifecycle not confirmed |
| SMP number sequence | ❌ | Not in number_sequences seed |
| `SAMPLE_OUT` inventory movement | ❌ | Movement type not defined |
| Printable sample challan | ❌ | Not found |
| Sample cost accumulated on client record (`sampleCostToDate`) | ❌ | Not in clients schema |
| One-click Convert → pre-filled quotation | ❌ | Not implemented |
| Sample funnel on dashboard | ❌ | Not implemented |

---

## 8. Procurement (Section 3.8)

| Item | Status | Notes |
|---|---|---|
| Purchase Orders (CRUD, status) | ✅ | Full CRUD at `/v1/purchase-orders` |
| Auto-generate POs from SO shortfall | ❌ | Not implemented as atomic transaction/job |
| GRN with batch, expiry, QC accept/reject counts | ⚠️ | GRN table exists; QC reject count and batch/expiry columns not confirmed |
| GRN posting increases stock in transaction | ❌ | Not confirmed as atomic |
| PO status auto-update on GRN post | ⚠️ | Likely manual |
| Vendor Bills + 3-way match (PO qty/price vs GRN qty vs bill) | ❌ | No `VendorBills` table found |
| Vendor Payments with TDS fields | ❌ | `paymentsTable` linked to client invoices, not vendor bills |
| Vendor performance data (on-time %, QC rejection %, price variance) | ❌ | Not captured |

---

## 9. Inventory Management (Section 3.9)

| Item | Status | Notes |
|---|---|---|
| Real-time stock, movements, low-stock alerts | ⚠️ | `inventory` + `inventory_movements` tables exist; alert job missing |
| Reservation model (`onHandQty`, `reservedQty`, `availableQty`) | ⚠️ | `onHandQty` + `reservedQty` in schema; `availableQty` computed not stored; reservation logic on SO confirm missing |
| Ownership dimension (COMPANY/CLIENT) on inventory | ❌ | Not in inventory or batch schema |
| Warehouses (stock scoped per warehouse) | ✅ | `warehouses` + `warehouse_locations` tables exist |
| Movements ledger (all types incl. SAMPLE_OUT, JOBWORK_*) | ⚠️ | `inventory_movements` exists; SAMPLE_OUT, JOBWORK_IN/CONSUME/RETURN types missing |
| Batch tracking with expiry (`InventoryBatches`) | ❌ | No `inventory_batches` table found |
| FEFO picking (first-expiry-first-out) | ❌ | Not implemented |
| Barcode/QR on SKUs | ❌ | Not in schema |
| Stock adjustments with reason codes (permission-gated, audit-logged) | ⚠️ | Movement POST exists; reason codes / approval not confirmed |
| Weighted-average cost valuation (COMPANY stock only) | ❌ | Not implemented |

---

## 10. Kitting / Assembly (Section 3.10)

| Item | Status | Notes |
|---|---|---|
| Assembly jobs linked to SOs | ✅ | `assembly` table + `/v1/assembly` routes exist |
| Status machine (Pending → In Progress → QC → Completed) | ⚠️ | Transitions in stateMachine.ts; QC step not confirmed |
| Component allocation (batch-wise, FEFO) | ❌ | No FEFO; atomic allocation logic not confirmed |
| Packaging components as BOM | ❌ | `isPackaging` flag missing |
| Job-work assembly with CLIENT ownership | ❌ | Not implemented |
| Backflush on completion (atomic CONSUME + PRODUCE transaction) | ❌ | No confirmed atomic backflush |
| QC pass/fail per unit; scrap cost posting | ❌ | Not implemented |
| Per-kit label with recipient personalization | ❌ | Not implemented |

---

## 11. Customisation & Branding (Section 3.11)

| Item | Status | Notes |
|---|---|---|
| Artwork lifecycle (Pending → Approved → Vendor → Completed) | ✅ | `artwork` table + `/v1/artwork-approvals` with status PATCH |
| Artwork versioning (rejection spawns next version) | ❌ | Single record per SO item; no version history |
| Branding cost as line on SO item (`brandingCostPerUnit`) | ❌ | Not in `sales_order_items` schema |
| Branding vendors (`vendorType=BRANDING`) | ⚠️ | `vendorType` on vendors exists; BRANDING value may be present |
| SO blocked from `Ready` until all artworks Completed | ❌ | Guard not enforced in state machine |

---

## 12. Logistics & Delivery (Section 3.12)

| Item | Status | Notes |
|---|---|---|
| Shipments linked to SOs, courier, per-address tracking | ✅ | `shipments` + `shipment_items` + `/v1/shipments` routes |
| Full shipment lifecycle (Created → Label → Picked Up → In Transit → Delivered/RTO) | ⚠️ | Statuses exist in stateMachine; Label Generated / Picked Up steps not confirmed |
| Freight cost per shipment | ❌ | Not in shipments schema |
| POD capture (name, timestamp, photo) | ⚠️ | `/:id/items/:itemId/pod` PATCH endpoint exists |
| E-way bill fields (`ewayBillNo`, `ewayBillDate`) | ❌ | Not in shipments schema |
| Shipping label (print-ready HTML/PDF) | ❌ | Not found |
| Scan-to-dispatch, courier abstraction (P2) | ❌ | Not implemented |

---

## 13. Finance & India Compliance (Section 3.13)

| Item | Status | Notes |
|---|---|---|
| GST engine (intra/inter-state, CGST+SGST vs IGST) | ✅ | `gstEngine.ts` with state-code logic and `amountInWords` |
| Invoice with all mandatory Indian GST fields | ⚠️ | Invoices exist; HSN summary table, `roundOff`, `placeOfSupplyStateCode` need confirmation |
| `lineType` (GOODS/SERVICE) + `hsnOrSacCode` on invoice lines | ❌ | `invoice_lines` has `hsnCode`; no `lineType` or SAC |
| Sequential invoice number via NumberSequences | ✅ | Uses `numberSequence.ts` |
| Payments & reconciliation | ⚠️ | `payments` table exists; advance auto-allocation not implemented |
| Payment status derived (Unpaid → Advance → Partial → Paid) | ❌ | Not confirmed as derived state |
| Credit Notes | ⚠️ | `creditNotes` table + `/v1/credit-notes` exists |
| Debit Notes | ❌ | Not found |
| True margin bridge per order | ❌ | Not implemented |
| Receivables aging view (0–30/31–60/61–90/90+) | ⚠️ | AR aging bar in dashboard; full aging report not confirmed |
| GSTR-1 export | ⚠️ | `/v1/reports/gstr1` stub exists |
| Razorpay, Tally export, e-invoicing (`irn`, `ackNo`) | ❌ | Not implemented |

---

## 14. Dashboards & Analytics (Section 3.14)

| Item | Status | Notes |
|---|---|---|
| Revenue, margin, orders by month | ⚠️ | Revenue chart exists; margin not included |
| Top clients / occasions | ⚠️ | Top clients partially shown; occasions missing |
| Goods vs service revenue split | ❌ | No service order concept yet |
| Inventory value (weighted avg), low-stock, near-expiry alerts | ⚠️ | Stock levels shown; weighted avg value and near-expiry alerts missing |
| Order pipeline as kanban board | ⚠️ | Sales pipeline bar chart exists; not a kanban |
| Assembly capacity planning (kits/day vs capacity) | ❌ | Not implemented |
| Sample funnel (dispatched → feedback → converted) | ❌ | Not implemented |
| Vendor performance dashboard | ⚠️ | Placeholder section; no real data |
| Receivables aging + payables due | ⚠️ | AR aging partial; payables view missing |
| Seasonal demand trend + 3-month moving-average forecast | ❌ | Not implemented |

---

## 15. Automation, Notifications & Data Import (Section 3.15)

| Item | Status | Notes |
|---|---|---|
| pg-boss job queue | ❌ | No background job infrastructure; all automation inline in HTTP handlers |
| Auto-PO on SO confirm | ❌ | Not implemented as background job |
| Auto-assembly job on stock available | ❌ | Not implemented |
| Notifications table + in-app bell (unread count + popover) | ⚠️ | `notifications` route exists; bell UI not confirmed |
| Email channel (SMTP, outbox pattern with retry) | ❌ | Not implemented |
| WhatsApp channel stub (P2) | ❌ | Not implemented |
| Seasonal reminder job | ❌ | Not implemented |
| **Master-data import wizard** (Products / Services / Clients / Vendors / Opening Stock) | ❌ | Not implemented |
| `ImportJobs` table | ❌ | Not in schema |
| Template download per import type | ❌ | Not implemented |

---

## 16. UI / UX Audit (Section 11)

### Per-Screen Scores

| Screen | Score | Issues |
|---|---|---|
| Dashboard | ⚠️ | Hardcoded hex chart colors (`#10b981`, `#f59e0b`, `#ef4444`, `#8b5cf6`). Inline `style` for progress bar widths/colors. Pipeline is bar chart, not kanban. No sample funnel, no capacity chart. |
| Clients list | ⚠️ | `window.confirm()` for delete (Kill-List #1). No credit limit / stage fields. |
| Client detail | ❌ | No lifetime revenue, margin, sample cost, open receivables panel. |
| Contacts | ⚠️ | Missing `isPrimary`, `designation`, `portalAccess` fields. |
| Leads / Opportunities | ⚠️ | Separate from client record; spec requires stage on the client record itself. |
| Products | ⚠️ | `window.confirm()` for delete (Kill-List #1). Missing `isPackaging`, `barcode`, `brandable`, `isPerishable`, `shelfLifeDays` fields. |
| Bundles | ⚠️ | `window.confirm()` for delete (Kill-List #1). No `gstMode` field. |
| Categories | ⚠️ | `window.confirm()` for delete (Kill-List #1). |
| Sales Orders | ⚠️ | No `orderType`, no service lines, no address-level status, no discount approval flow, no wizard. |
| Order Processing | 🐞 | Native `<select>` for status (Kill-List #2). Native `<table>` in print area. Hardcoded hex `#4338ca` in print CSS (Kill-List #5). |
| Vendors | 🐞 | Native `<select>` for State and Payment Terms (Kill-List #2). |
| Purchase Orders | ⚠️ | No vendor bill / 3-way match flow. |
| GRN | ⚠️ | No batch/expiry capture confirmed. |
| Inventory | ⚠️ | No ownership dimension, no batch view, no FEFO indicator, no weighted avg cost. |
| Assembly | ⚠️ | No backflush confirmation, no QC per-unit flow, no kit labels, no packaging components. |
| Artwork | ⚠️ | No version history UI; single record per SO item. |
| Shipments | ⚠️ | No freight cost field, no e-way bill field, no label print. |
| Invoices | ⚠️ | No SAC lines, no HSN summary table, no `amountInWords` confirmation, no PDF export button. |
| Reports | ⚠️ | Hardcoded hex palette (Kill-List #5). No sample funnel, no capacity chart. |
| Settings | ⚠️ | Missing `stateCode`, bank details, `assemblyCapacityPerDay`. |
| **Services** | ❌ | Page does not exist. |
| **Job Work Register** | ❌ | Page does not exist. |
| Sample Management | ⚠️ | Basic list may exist; challan print, convert-to-quote, sample cost accumulation missing. |
| **Import Wizard** | ❌ | Page does not exist. |
| Notifications bell | ⚠️ | Route exists; unread count + popover UI not confirmed. |
| ⌘K Command Palette | ❌ | Not implemented. |
| Dark mode toggle | ❌ | Not found. |

### Legacy Kill-List Occurrences (Section 11.10)

| # | Kill-List Item | Count / Location |
|---|---|---|
| 1 | `window.confirm()` / `window.alert()` | **≥4** — clients.tsx, products.tsx, bundles.tsx, categories.tsx |
| 2 | Native HTML `<select>` / unstyled elements in main flows | **≥2** — vendors.tsx, order-processing.tsx |
| 3 | Full-page reloads on actions | Not observed |
| 4 | Spinner-only / blank loading (no skeletons on all pages) | ⚠️ — not audited for every page |
| 5 | Ad-hoc badge/status colors; inline hex in components | **≥3 files** — dashboard.tsx, reports.tsx, order-processing.tsx print CSS |
| 6 | Mixed icon sets / emoji-as-icons | Not observed |
| 7 | Dense "Excel-look" tables with zero padding | ⚠️ — order-processing.tsx print area |
| 8 | Gradient headers, bevels, heavy shadows | Not observed |
| 9 | Fixed-width non-responsive layouts | ⚠️ — not fully audited |
| 10 | Modal-inside-modal / modals for full CRUD | ⚠️ — client creation is a Dialog (borderline) |
| 11 | Mixed date or currency formats | ⚠️ — `formatINR()` / `formatDate()` not confirmed as universal utils |
| 12 | Missing focus states / keyboard traps | ⚠️ — not fully audited |

**Confirmed Kill-List violations: ≥9 occurrences across ≥5 files.**

---

## Summary — Priority Gap Matrix

### P0 Blockers (ERP not legally/operationally correct without these)

| Ref | Gap |
|---|---|
| P0-01 | `companyId` → `orgId` naming alignment; add `companyId/orgId` to notifications, audit_logs, import_jobs |
| P0-02 | `version` (optimistic lock integer) on all business documents |
| P0-03 | Zod validation on every API endpoint (currently manual/missing) |
| P0-04 | Standard response envelope `{ success, data, error, meta }` on every endpoint |
| P0-05 | State machine enforced in service layer — not bypassable via route PATCH |
| P0-06 | DB transactions for all stock + payment + number-sequence writes |
| P0-07 | `Services` table with `sacCode`, `gstRate`, `type` (needed for service invoicing) |
| P0-08 | Product fields: `isPackaging`, `barcode`, `brandable`, `isPerishable`, `shelfLifeDays`, `reorderQty` |
| P0-09 | `orderType` on sales_orders; `itemType` + `serviceId` + `brandingCostPerUnit` on sales_order_items |
| P0-10 | Inventory `ownership` (COMPANY/CLIENT) + `InventoryBatches` table |
| P0-11 | SO confirmation atomic transaction (reserve stock + shortfall calc + enqueue auto-PO) |
| P0-12 | GRN posting in transaction (stock increase + PO status update) |
| P0-13 | `DC` and `SMP` number sequence types seeded |
| P0-14 | `CompanySettings` with `stateCode`, bank details JSON, `assemblyCapacityPerDay`, logo |
| P0-15 | Credit limit + payment terms on clients; GSTIN regex validation (server-side) |
| P0-16 | Permissions stored in DB (`Permissions` / `RolePermissions` tables) |
| P0-17 | `DeliveryAddresses` as separate table with per-address `status` and `personalization` JSON |
| P0-18 | Backflush transaction on assembly completion (atomic ASSEMBLY_CONSUME + ASSEMBLY_PRODUCE) |
| P0-19 | `lineType` (GOODS/SERVICE) + `hsnOrSacCode` on invoice_lines; SAC invoice rendering |

### P1 Core ERP

| Ref | Gap |
|---|---|
| P1-01 | Quotation versioning (`QuotationVersions` table) |
| P1-02 | Discount approval workflow (`Pending Approval` → Admin/Finance confirms) |
| P1-03 | `ClientMaterialChallans` (DC-In/Out) + Job Work Register screen |
| P1-04 | Samples: SMP number, SAMPLE_OUT movement, convert-to-quote, sample cost on client |
| P1-05 | Assembly: FEFO batch allocation, QC per unit, scrap cost, kit labels |
| P1-06 | Artwork versioning (version history, rejection spawns next version) |
| P1-07 | `VendorBills` + 3-way match |
| P1-08 | `VendorPayments` + vendor ledger / outstanding view |
| P1-09 | Weighted-average cost valuation per product per warehouse |
| P1-10 | True margin bridge per order (revenue − components − branding − freight − scrap − samples) |
| P1-11 | Per-recipient personalization (Excel import columns; kit label printing) |
| P1-12 | Clone order action |
| P1-13 | Soft delete on remaining tables (bundles, assembly, shipments, artworks, GRN) |
| P1-14 | Master-data import wizard (5 types: Products, Services, Clients, Vendors, Opening Stock) |
| P1-15 | pg-boss job queue (move all automation off inline HTTP handlers) |
| P1-16 | Notifications bell UI (unread count + popover) |
| P1-17 | Pino structured logging with request IDs |
| P1-18 | Security hardening: helmet, CORS allowlist, rate limiting, login lockout |
| P1-19 | UI: Kill-List violations eliminated; ⌘K command palette; dark mode toggle |
| P1-20 | `bundle gstMode` (MIXED_SUPPLY/ITEMIZED); bundle builder algorithm |
| P1-21 | `freight cost` + `ewayBillNo` on shipments; shipping label print |
| P1-22 | `brandingCostPerUnit` on SO items; artwork version history UI |
| P1-23 | `reorderQty`, near-expiry alert job, low-stock alert job |

### P2 Growth (after P0 + P1 are green)

| Ref | Gap |
|---|---|
| P2-01 | E-way bill / e-invoice fields & stubs (`irn`, `ackNo`, `qrCodeData`) |
| P2-02 | Scan-based GRN / kitting / dispatch (barcode scanner input) |
| P2-03 | Claude AI layer in bundle builder |
| P2-04 | Simulation Mode (SSE, `/api/v1/simulation/*`) |
| P2-05 | Client Portal (Portal role, scoped views, artwork approve/reject online) |
| P2-06 | Razorpay payment links + webhook auto-allocation |
| P2-07 | WhatsApp notification channel (Gupshup/Twilio) |
| P2-08 | Tally voucher export |
| P2-09 | GSTR-1 B2B export (full implementation beyond current stub) |
| P2-10 | Recurring gifting programs (pg-boss scheduled orders) |
| P2-11 | Dispatch capacity calendar |
| P2-12 | Courier abstraction (`CourierProvider` interface) |
| P2-13 | TDS on vendor payments |
| P2-14 | Idempotency keys on confirm/payment/invoice endpoints |
| P2-15 | Swagger/OpenAPI docs at `/api/docs` |

---

## Technology Stack Notes

| Spec says | Codebase uses | Status |
|---|---|---|
| Prisma + PostgreSQL | **Drizzle ORM** + PostgreSQL | 🐞 — spec says Prisma; Drizzle retained (schema changes via `drizzle-kit generate` + SQL migrations) |
| Zustand (no Redux) | Not confirmed | ⚠️ |
| JWT access + refresh | Session token only | ❌ |
| pg-boss | Not installed | ❌ |
| `StorageProvider` interface | Direct FS / no abstraction | ❌ |
| SheetJS for Excel parsing | Not installed | ❌ |
| pino logging | console.log ad-hoc | ❌ |
| REST versioned `/api/v1/...` | ✅ | ✅ |
| shadcn/ui + Tailwind | ✅ | ✅ |

---

*Gap report last updated: 15 Jul 2026 (v3 spec). Will be updated after each implementation phase.*
