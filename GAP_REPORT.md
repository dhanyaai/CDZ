# GAP REPORT — Corporate Gifting ERP vs Audit & Upgrade Spec v2

> Generated: 14 Jul 2026  
> Stack in use: React + Vite + shadcn/ui · Express 5 · Drizzle ORM + PostgreSQL · pnpm monorepo · TypeScript  
> Note: spec references Prisma — codebase uses **Drizzle ORM** (functionally equivalent; migration commands differ).

---

## Legend
- ✅ Implemented correctly
- ⚠️ Partially implemented
- ❌ Missing entirely
- 🐞 Implemented incorrectly / defect

---

## Section 1 — Tech Stack Alignment

| Layer | Spec | Current | Status |
|---|---|---|---|
| Language | TypeScript (frontend + backend) | TypeScript throughout | ✅ |
| Frontend | React + Tailwind + shadcn/ui | React + Tailwind + shadcn/ui | ✅ |
| State management | Zustand | Not found — React Query + local state | ⚠️ |
| Backend | Express.js | Express 5 | ✅ |
| ORM | Prisma | **Drizzle ORM** (equivalent, different API) | ⚠️ |
| Validation | Zod (shared client+server) | Zod present on some schemas via drizzle-zod; **not enforced on most API endpoints** | ⚠️ |
| Auth | JWT + RBAC | Basic JWT login; **no RBAC permissions model** | ⚠️ |
| Job queue | pg-boss | ❌ None — all automation is inline in HTTP handlers | ❌ |
| File storage | Local FS behind StorageProvider abstraction | Direct S3/DO Spaces SDK calls; **no abstraction interface** | ⚠️ |
| Excel parsing | SheetJS | Not found | ❌ |
| PDF generation | puppeteer / pdfkit | Print-to-PDF via browser window.print() only | ⚠️ |
| API style | REST `/api/v1/...` + standard envelope | REST `/v1/...` correct; **no standard `{ success, data, error, meta }` envelope** | 🐞 |
| Pagination | `?page&limit&sort&order&search` + meta | Most endpoints return raw arrays with no pagination | ❌ |
| OpenAPI / Swagger | Swagger at `/api/docs` (P2) | OpenAPI spec exists (`lib/api-spec/openapi.yaml`) + Orval codegen | ✅ (P2 ahead) |

---

## Section 2 — Global Architecture

| Requirement | Status | Notes |
|---|---|---|
| Service layer (routes → controllers → services → repos) | ❌ | Routes call `db.*` directly — no service abstraction |
| DB transactions for stock moves / payments / numbering | ❌ | No `db.transaction()` found; race conditions possible |
| State machine enforcement in service layer | ❌ | Status is just a text field; no transition validation |
| Standard response envelope | 🐞 | Endpoints return raw data; no `{ success, data, error, meta }` |
| Document number sequences (gapless, FY-scoped, concurrency-safe) | ❌ | `orderNumber` generated ad-hoc (e.g. `SO-XXXX`); no `NumberSequences` table |
| AuditLogs (entity, action, oldValues, newValues, userId, ip) | ❌ | `activities` table exists but captures only human-written notes, not automated audit trails |
| Soft deletes (`deletedAt`) on all business tables | ❌ | No `deletedAt` on any table; deletes are hard |
| Idempotency-Key header on confirm/payment/invoice | ❌ | Not implemented |
| CompanySettings with stateCode, bankDetails, fyStartMonth | ⚠️ | Table exists; has `legalName`, `gstNumber`, `invoicePrefix`; **missing `stateCode`, `bankDetails` JSON, `fyStartMonth`** |
| Global error middleware | ⚠️ | Basic Express error handler exists; not standardised to spec envelope |
| Request logging | ✅ | pino logger via `req.log` |
| Permissions/RolePermissions tables + `requirePermission()` middleware | ❌ | Only `role` text field on users table; no granular permission model |

---

## Section 3 — Module-by-Module Audit

### 3.1 Auth & User Management

| Item | Status | Notes |
|---|---|---|
| Roles (Admin, Sales, Purchase, Warehouse, Production, Finance) | ⚠️ | `role` field on users; roles not in DB; no seed per role |
| Login / logout / session management | ✅ | JWT auth implemented |
| Password reset | ❌ | Not found |
| Permissions model in DB (RolePermissions) | ❌ | Missing |
| JWT access + refresh token rotation | ⚠️ | Access token only; no refresh rotation |
| bcrypt/argon2 password hashing | ✅ | hashPassword utility found |
| Account deactivation (not deletion) | ⚠️ | `isActive` field exists; no enforcement in middleware |
| One seed user per role | ❌ | No seed script found |

### 3.2 CRM

| Item | Status | Notes |
|---|---|---|
| Client profiles (company, GSTIN, billing/shipping addresses) | ⚠️ | `clients` table exists; GSTIN stored but **not validated against regex** |
| Multiple contacts per client | ✅ | `contacts` table with clientId |
| Interaction log (calls/emails/meetings) | ✅ | `activities` / ClientInteractions implemented |
| Requirement document uploads | ⚠️ | File upload API exists; not linked to client records specifically |
| Tags by industry & occasion | ⚠️ | `industry` field on clients; no tagging system |
| GSTIN validation (regex + state code derivation) | ❌ | Stored as plain text only |
| Credit limit & payment terms per client | ❌ | No `creditLimit` field on clients |
| SO confirmation blocked beyond credit limit | ❌ | No credit check logic |
| Lead/opportunity stage (Lead → Won) | ✅ | `leads` + `opportunities` tables; stage field present |
| Client → Active only on first confirmed SO (not manual tag) | ❌ | Stage is manually set |

### 3.3 Product Catalog

| Item | Status | Notes |
|---|---|---|
| SKU, name, category, cost/selling price, vendor, stock, images | ✅ | All present |
| **`hsnCode`** | ❌ | Missing from products table |
| **`gstRate`** (0/5/12/18/28) | ❌ | Missing; `defaultGstPct` on CompanySettings only |
| `uom` (unit of measure) | ❌ | Missing |
| `reorderLevel`, `reorderQty` | ⚠️ | `lowStockThreshold` exists; `reorderQty` missing |
| `isPerishable`, `shelfLifeDays` | ❌ | Missing |
| `brandable` flag | ❌ | Missing |
| VendorProducts (price tiers + lead time per vendor) | ❌ | `vendorId` only (single vendor); no VendorProducts table |
| Bundles with component cost, margin %, occasion tags | ⚠️ | Bundles exist; margin % computed from selling price only, not from components |
| Bundle GST mode (MIXED_SUPPLY / ITEMIZED) | ❌ | Missing |
| ProductCategories as proper table | ⚠️ | `categories` table exists; products use free-text `category` field not FK |

### 3.4 Smart Gift Bundle Builder

| Item | Status | Notes |
|---|---|---|
| Budget + occasion + constraints input | ❌ | Not implemented |
| Score function (margin, budget utilization, occasion relevance) | ❌ | Not implemented |
| Top-3 combination algorithm | ❌ | Not implemented |
| Manual override with live recompute | ❌ | Not implemented |
| AI layer (Claude API, P2) | ❌ | Not implemented |

### 3.5 Quotations & Sales Orders

| Item | Status | Notes |
|---|---|---|
| Create quotations + convert to SO | ✅ | quotes → sales_orders conversion exists |
| Multi-address delivery | ✅ | delivery_addresses table exists |
| Lifecycle status `Draft → Confirmed → ... → Delivered` | ⚠️ | Status field exists; **no state machine enforcement** — any value accepted |
| **Quotation versioning** (QuotationVersions table) | ❌ | Single quotes table only; no version history |
| Discount approval workflow (> limit → Pending Approval) | ❌ | `discountPct` stored but no approval routing |
| Address-level status per delivery address | ❌ | Delivery addresses have no `status` field |
| **Stock reservation on SO confirmation** | ❌ | `stockLevel` on products is a single integer; no `reservedQty`; no reservation logic |
| Excel bulk address import (background job) | ❌ | Not implemented |
| Cancellation releasing reservations | ❌ | No reservation model to release |
| `quotationVersionId` FK on SO | ❌ | SOs not linked back to specific quotation version |

### 3.6 Procurement (PO → GRN → Vendor Bill)

| Item | Status | Notes |
|---|---|---|
| Auto-generate POs from SO demand | ⚠️ | POs can be created; no auto-generation from SO shortfall |
| Vendor management + pricing tiers | ⚠️ | vendors table + pricing_tiers; not linked to VendorProducts properly |
| PO status tracking | ✅ | Status field on purchase_orders |
| PO shortfall calculation (required − reserved available) | ❌ | No reservation model |
| GRN with batch number, expiry, QC accept/reject | ⚠️ | GRN table exists; `batch`, `qtyReceived`, `qtyRejected` present; **no expiry date** |
| GRN posting increases stock in transaction | 🐞 | Stock updated via direct `stockLevel` edit, not via movements ledger + transaction |
| Vendor Bills (3-way match PO/GRN/bill) | ❌ | No VendorBills table |
| Vendor Payments against bills | ❌ | No vendor payment tracking separate from client payments |
| Vendor performance data (on-time %, rejection rate) | ❌ | Not tracked |

### 3.7 Inventory Management

| Item | Status | Notes |
|---|---|---|
| Real-time stock via movements ledger | ⚠️ | `inventory_movements` table exists; but `stockLevel` on products is also maintained separately and used as source of truth — two diverging sources |
| **Reservation model** (onHand, reserved, available) | ❌ | Entirely missing; stock = single `stockLevel` integer |
| Warehouses table (stock scoped per warehouse) | ❌ | `warehouse_locations` table exists for bin/picking locations; no `Warehouses` parent table; inventory not warehouse-scoped |
| Movement types (PURCHASE_IN, SALES_OUT, ASSEMBLY_CONSUME, etc.) | ⚠️ | `type` text field; no enforced enum or typed constants |
| Batch tracking (mfg date, expiry date) | ❌ | `batch` text on movements only; no InventoryBatches table |
| FEFO picking | ❌ | Not implemented |
| Low-stock alerts (configurable threshold) | ⚠️ | `lowStockThreshold` field exists; alert logic not found |
| Stock adjustments with reason codes | ❌ | Not implemented |
| Weighted-average cost valuation | ❌ | Not implemented |

### 3.8 Kitting / Assembly

| Item | Status | Notes |
|---|---|---|
| Assembly jobs linked to SOs with status tracking | ✅ | `assembly_jobs` + `assembly_items` tables |
| Statuses (Pending/In Progress/Completed/Rejected) | ✅ | Present |
| Component allocation (FEFO, from reserved stock) | ❌ | No FEFO, no reservation consumption |
| **Backflush on completion (atomic transaction)** | ❌ | No transaction; no `ASSEMBLY_CONSUME` + `ASSEMBLY_PRODUCE` movement pair |
| QC pass/fail per unit; failed unit → re-assembly | ❌ | `rejectedQty` field exists; no unit-level QC workflow |
| `scrapCost` tracking | ❌ | Missing |

### 3.9 Customisation & Branding

| Item | Status | Notes |
|---|---|---|
| Upload client logos & brand assets | ✅ | DO Spaces upload implemented |
| Artwork lifecycle `Pending → Approved → Sent → Completed` | ✅ | `artwork_approvals` table with status |
| **Artwork versioning** (rejection spawns next version) | ❌ | Single record per SO item; no version history |
| Branding cost as SO item line cost | ❌ | No `brandingCostPerUnit` on SO items |
| Branding vendors (type = BRANDING) | ❌ | No vendor type distinction |
| SO blocked from Ready until artworks Completed | ❌ | No state machine to enforce this |

### 3.10 Logistics & Delivery

| Item | Status | Notes |
|---|---|---|
| Shipments linked to SOs | ✅ | `shipments` + `shipment_items` tables |
| Courier partner assignment | ⚠️ | Courier name field; no Courier abstraction interface |
| Per-address tracking | ⚠️ | Shipment items link to delivery addresses; no per-address AWB |
| Shipment lifecycle states | ⚠️ | Status field; no state machine enforcement |
| **Freight cost** flowing into margin | ❌ | No `freightCost` field on shipments |
| **POD capture** (receiver name, timestamp, photo) | ❌ | No `podName`, `podAt`, `podFileKey` on delivery addresses |
| Partial dispatch (some addresses dispatched, SO shows Dispatched) | ❌ | Address-level status missing |
| E-way bill fields (P2) | ❌ | Not implemented |
| Label PDF generation | ⚠️ | browser print only; no proper PDF |

### 3.11 Finance & India Compliance

| Item | Status | Notes |
|---|---|---|
| GST-compliant invoices | ⚠️ | Invoices exist; `gstAmount` stored as a total only |
| **GST engine** (CGST+SGST intra-state vs IGST inter-state) | ❌ | No `stateCode` comparison logic; no CGST/SGST/IGST split |
| Per-line HSN code + tax breakup | ❌ | No `invoice_lines` table; no HSN on lines |
| **Invoice number sequential** (`INV/2026-27/0001`) | ❌ | No NumberSequences table; format likely `INV-XXXX` |
| Amount in words | ❌ | Not implemented |
| Payment tracking (advance, balance, allocation) | ✅ | payments table exists |
| Credit Notes | ✅ | credit_notes table exists |
| Invoice payment status derived (Unpaid → Fully Paid) | ⚠️ | status field exists; derived logic unclear |
| True margin bridge (revenue − component cost − branding − freight − scrap) | ❌ | Basic margin = selling − cost only |
| Receivables aging (0–30/31–60/61–90/90+) | ❌ | Not implemented |
| Vendor payables view | ❌ | Not implemented |
| E-invoicing fields (IRN, ackNo, QR code) (P2) | ❌ | Not implemented |

### 3.12 Dashboards & Analytics

| Item | Status | Notes |
|---|---|---|
| Sales performance (revenue, margin, orders by month) | ✅ | Dashboard + analytics routes exist |
| Inventory status (low stock, stock value) | ⚠️ | Low stock list present; weighted-avg valuation missing |
| Order pipeline view | ⚠️ | Present as list; no kanban board |
| Vendor performance | ❌ | Not tracked |
| Receivables aging + payables due | ❌ | Missing |
| Seasonal demand forecast (3-month moving avg) | ❌ | Missing |

### 3.13 Workflow Automation & Notifications

| Item | Status | Notes |
|---|---|---|
| Notifications table + in-app bell | ✅ | Notifications table + bell component implemented |
| Email outbox (pending/sent/failed) | ❌ | No EmailOutbox table |
| pg-boss background job queue | ❌ | No job queue; automation would be inline |
| SO Confirmed → reserve stock → create Draft POs → notify PM | ❌ | None of these automation triggers exist |
| GRN posted → auto-create Assembly Job → notify Production | ❌ | Missing |
| Assembly done → notify Logistics | ❌ | Missing |
| Low stock / near expiry → notify PM | ❌ | Missing |

---

## Section 4 — State Transition Matrix

| Entity | Spec | Status |
|---|---|---|
| Sales Order | Full transition map with guards & side-effects | ❌ No enforcement; any status value accepted |
| Purchase Order | `Draft → Ordered → Partially Received → Fully Received` | ❌ Not enforced |
| Assembly Job | `Pending → In Progress → QC → Completed` | ❌ Not enforced |
| Artwork Version | `Pending → Client Approved → Sent to Vendor → Completed` | ❌ Not enforced |
| Shipment | `Created → Label Generated → ... → Delivered` | ❌ Not enforced |
| Invoice | `Draft → Issued → Partially Paid → Paid` | ❌ Not enforced |
| Quotation Version | `Draft → Sent → Approved / Rejected / Revised` | ❌ No versioning |

**Overall: No state machine enforcement exists anywhere in the codebase.**

---

## Section 5 — Database Schema Gaps

| Missing table / field | Spec ref | Priority |
|---|---|---|
| `NumberSequences` (gapless FY-scoped doc numbers) | 2.4 | P0 |
| `AuditLogs` (userId, entity, entityId, action, oldValues, newValues, ip) | 2.5 | P0/P1 |
| `Permissions` + `RolePermissions` | 3.1 | P0 |
| `EmailOutbox` | 3.13 | P1 |
| `Warehouses` (parent of warehouse_locations) | 3.7 | P0 |
| `InventoryBatches` (batchNo, mfgDate, expiryDate, qty) | 3.7 | P1 |
| `Inventory` table (productId, warehouseId, onHandQty, reservedQty, avgCost) | 3.7 | P0 |
| `VendorProducts` (vendorId, productId, priceTiers, leadTimeDays) | 3.3 | P0 |
| `VendorBills` + `VendorPayments` | 3.6 | P1 |
| `QuotationVersions` | 3.5 | P1 |
| `GoodsReceiptItems.expiryDate` | 3.6 | P1 |
| `StockAdjustments` (reasonCode, approvedById) | 3.7 | P1 |
| `InvoiceLines` (invoiceId, hsnCode, qty, rate, gstRate, cgst, sgst, igst) | 3.11 | P0 |
| Products: `hsnCode`, `gstRate`, `uom`, `reorderQty`, `isPerishable`, `shelfLifeDays`, `brandable` | 3.3 | P0 |
| SalesOrderItems: `brandingCostPerUnit` | 3.9 | P1 |
| DeliveryAddresses: `status`, `awbNumber`, `podName`, `podAt`, `podFileKey` | 3.5/3.10 | P1 |
| Clients: `creditLimit`, `paymentTerms`, `stateCode` | 3.2 | P0/P1 |
| Clients: `stage` values enforced (Lead/Qualified/Proposal/Won/Active/Lost) | 3.2 | P1 |
| CompanySettings: `stateCode`, `bankDetails` JSON, `fyStartMonth` | 3.11 | P0 |
| Shipments: `freightCost`, `ewayBillNo`, `ewayBillDate` | 3.10 | P1/P2 |
| Invoices: `cgst`, `sgst`, `igst`, `placeOfSupplyStateCode`, `amountInWords`, `roundOff`, `irn`, `ackNo` | 3.11 | P0/P2 |
| AssemblyJobs: `scrapCost` | 3.8 | P1 |
| `deletedAt` on ALL business tables | 2.6 | P1 |

---

## Section 6 — API Structure

| Spec endpoint | Current status |
|---|---|
| `/v1/auth` | ✅ |
| `/v1/users` | ✅ |
| `/v1/clients` | ✅ |
| `/v1/products` | ✅ |
| `/v1/bundles` | ✅ |
| `/v1/bundle-builder` | ❌ |
| `/v1/quotations` | ⚠️ (as `/v1/quotes`) |
| `/v1/sales-orders` | ✅ |
| `/v1/purchase-orders` | ✅ |
| `/v1/grns` | ✅ (as `/v1/grn`) |
| `/v1/vendor-bills` | ❌ |
| `/v1/vendor-payments` | ❌ |
| `/v1/inventory` | ✅ |
| `/v1/warehouses` | ❌ |
| `/v1/assembly` | ✅ |
| `/v1/artworks` | ✅ |
| `/v1/shipments` | ✅ |
| `/v1/invoices` | ✅ |
| `/v1/credit-notes` | ✅ |
| `/v1/payments` | ✅ |
| `/v1/notifications` | ✅ |
| `/v1/analytics` | ✅ |
| `/v1/settings` | ✅ |
| `/v1/simulation` | ❌ |
| Standard `{ success, data, error, meta }` envelope | ❌ |
| Pagination meta on all list endpoints | ❌ |
| Zod validation on all endpoints | ❌ (partial) |
| Permission middleware on all routes | ❌ |

---

## Section 7 — RBAC

| Item | Status |
|---|---|
| Roles stored in DB | ❌ (role = text on users table) |
| Permissions table (e.g. `sales_order.confirm`) | ❌ |
| RolePermissions join table | ❌ |
| `requirePermission()` middleware | ❌ |
| Per-route permission guards | ❌ |

---

## Section 8 — Phased Fix Plan — Current Position

**Phase 1 (Foundations):** ~30% done. App shell and design tokens exist but are inconsistent. CompanySettings exists but is incomplete. No NumberSequences, AuditLogs, soft-delete middleware, or Permissions tables. Zod used in schema definitions but not consistently enforced on endpoints.

**Phase 2 (Order-to-Procure):** ~20% done. Basic SO + PO + GRN routes exist. Quotation versioning, reservation, state machines, 3-way match, vendor bills — all missing.

**Phase 3 (Make-to-Deliver & Money):** ~25% done. Assembly, artwork, shipments, invoices exist at basic level. Backflush, POD, GST engine, InvoiceLines, freight cost, branding cost — all missing.

**Phase 4 (Automation & Advanced):** ~5% done. Notifications bell exists. No pg-boss, no automation triggers, no Simulation Mode.

---

## Section 11 — UI / UX Audit

### Screen Scores

| Screen | Status | Issues |
|---|---|---|
| Dashboard | ⚠️ | KPI cards good; no delta vs previous period; charts present but tokens not consistent |
| Sales Orders list | ⚠️ | Table present; no server-side pagination; no column filters |
| Sales Order detail | ⚠️ | Shows items & addresses; no tabbed layout; no activity timeline from audit logs |
| Clients list | ⚠️ | Basic table; no searchable async select; no column visibility menu |
| Products list | ⚠️ | Table works; no HSN/GST columns (fields don't exist) |
| Invoices | ⚠️ | List works; no CGST/SGST split; print via window.print() |
| Order Processing form | ✅ | Custom multi-tab form; well structured; file uploads working |
| Assembly | ⚠️ | Basic CRUD; no backflush; no QC workflow |
| Inventory | ⚠️ | Movements ledger + transfers; no warehouse scoping; no batch view |
| GRN | ⚠️ | Present; no expiry date; no 3-way match display |
| Artwork | ⚠️ | Status tracking; no versioning |
| Purchase Orders | ⚠️ | CRUD works; no auto-generation from shortfall |
| Shipments | ⚠️ | Basic list; no address-level status; no POD |
| Bundles | ⚠️ | Manual bundle builder; no smart algorithm |
| Settings | ⚠️ | Company settings form; missing stateCode, bankDetails |

### Legacy Kill-List Occurrences

| Kill-list item | Found? | Where |
|---|---|---|
| `alert()` / `confirm()` / `prompt()` | Likely — check toasts | Need code grep |
| Unstyled HTML `<table>` in main flows | ❌ | Some pages use native table markup — need audit |
| Spinner-only loading (no skeletons) | ⚠️ | Skeleton used in some pages; inconsistent |
| Ad-hoc badge colors | ⚠️ | Likely; no single `statusConfig` map confirmed |
| Mixed date formats | ⚠️ | `format()` from date-fns used; consistency unknown |
| Mixed currency formats | ⚠️ | No global `formatINR()` utility found |
| Gradient header bars / heavy shadows | Likely none | shadcn defaults are clean |
| Modal-inside-modal | Not found | |
| Full-page reloads on form submit | ❌ | SPA; React Query mutations used |

---

## Summary — Priority List

### P0 — Must fix for legal/correct ERP operation (11 items)

1. **GST engine** — add `hsnCode` + `gstRate` to products; `stateCode` to CompanySettings + clients; CGST/SGST/IGST split on invoices; InvoiceLines table
2. **Stock reservation model** — `Inventory` table (onHand, reserved, available per product+warehouse); reservation on SO confirm; release on cancel
3. **NumberSequences table** — gapless, FY-scoped, concurrency-safe document numbers for SO/PO/INV/GRN/QTN/SHP
4. **State machine enforcement** — service-layer transition map for SO, PO, Assembly, Artwork, Shipment, Invoice
5. **DB transactions** — stock movements, reservation, payment posting, number generation all inside transactions with row locking
6. **Zod validation** on every API endpoint (request body + query params)
7. **Standard response envelope** `{ success, data, error, meta }` on all endpoints
8. **Permissions/RBAC** — Permissions + RolePermissions tables + `requirePermission()` middleware
9. **Service layer** — extract business logic out of route handlers into services
10. **VendorProducts** table — multi-vendor per product with price tiers + lead times
11. **AuditLogs** — automated trail on every status change and business mutation

### P1 — Core ERP gaps (10 items)

1. Soft deletes (`deletedAt`) on all business tables
2. Quotation versioning (QuotationVersions table)
3. Discount approval workflow on SOs
4. Address-level delivery status + partial dispatch + POD
5. Vendor Bills + 3-way match + Vendor Payments
6. Artwork versioning + branding cost on SO items
7. Batch tracking (InventoryBatches with expiry, FEFO picking)
8. Stock adjustments with reason codes
9. Freight cost on shipments → margin bridge
10. Credit limits on clients + credit check on SO confirmation

### P2 — Advanced features (not blocking)

1. Smart Gift Bundle Builder algorithm
2. Simulation Mode (SSE)
3. AI (Claude) bundle layer
4. E-way bill / e-invoice stubs
5. TDS on vendor payments
6. Receivables aging + payables view
7. Seasonal demand forecasting
8. Courier abstraction interface
9. Idempotency keys
10. Swagger at `/api/docs`
