# Customize Duniya — Corporate Gifting ERP
## Complete Detailed Application Documentation

---

## 1. Application Overview

**Customize Duniya ERP** is a full-stack, multi-tenant Enterprise Resource Planning system purpose-built for corporate gifting businesses. It manages the complete business lifecycle: lead capture → quoting → sales orders → procurement → production/assembly → logistics → invoicing → payments.

### Core Capabilities
- Multi-tenant: multiple companies / branches in one deployment
- Role-based access (Admin, Manager, Sales, Operations, Finance)
- Full CRM pipeline: leads → opportunities → quotes → sales orders
- Product catalog with bundles, variants, costing, and Smart Suggest
- Inventory management across multiple warehouse locations
- Production and assembly job tracking with BOM and backflushing
- Logistics with delivery challans, POD capture, courier tracking
- GST-compliant invoicing (CGST/SGST/IGST), payments, credit notes
- Analytics dashboard: AR aging, revenue trends, leaderboard, vendor performance
- Built-in browser-side PDF image and Excel extractor tool

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS v4, shadcn/ui (Radix UI primitives) |
| Routing | Wouter |
| Data fetching | TanStack Query (React Query) + Orval-generated hooks |
| Backend | Express 5, Node.js 24 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod v4, drizzle-zod |
| API contract | OpenAPI spec → Orval codegen (hooks + Zod schemas) |
| Build | esbuild (server), Vite (client) |
| File storage | DigitalOcean Spaces (`DO_SPACES_SECRET_KEY`) |
| Monorepo | pnpm workspaces |

---

## 3. Navigation Structure

Sidebar organized into functional groups (collapsible to icon-only mode):

| Group | Pages |
|---|---|
| Overview | Dashboard |
| CRM | Clients, Contacts, Leads, Opportunities, Quotes, Follow-ups |
| Catalog | Products, Bundles, Bundle Costing, Services, Categories |
| Orders | Sales Orders, Order Processing, Sample Orders, Purchase Orders, Vendors |
| Operations | Inventory, Item Ledger, Transfers, Locations, Goods Receipts, Assembly, Artwork, Production (conditional feature flag) |
| Logistics | Shipments |
| Finance | Invoices, Payments, Credit Notes, Fixed Assets, Reports |
| Admin | Users, Companies, Settings |
| Tools | PDF Image Extractor |

**Layout chrome:** company switcher (multi-tenant), global search (Cmd+K), light/dark theme toggle, notification bell.

---

## 4. Page-by-Page Detailed Reference

---

### 4.1 Login
**URL:** `/login`

**Layout:** Two-column split screen (desktop). Left: dark gradient brand panel. Right: sign-in form.

**Brand panel content:**
- Customize Duniya logo (amber gift icon + gradient wordmark)
- Headline: "The command center for your corporate gifting business"
- Three highlight bullets: End-to-end operations, Live analytics, Role-based access

**Form fields:**
| Field | Type | Validation |
|---|---|---|
| Email | email input (pre-filled: admin@gifterp.com) | Required |
| Password | password input (pre-filled: admin123) | Required, Enter key submits |

**Buttons:** "Sign in" (shows loading spinner when submitting)

**Auth flow:**
1. POST `/api/v1/auth/login` with `{ email, password }`
2. Response: `{ token, user, companyId }`
3. Token stored in `localStorage` via `setToken()`
4. User and companyId stored via `setStoredUser()` / `setStoredCompanyId()`
5. Navigate to `/dashboard`

**Demo credentials shown:** `admin@gifterp.com / admin123`

---

### 4.2 Dashboard
**URL:** `/dashboard`

**Header:** "Dashboard" with live date (en-IN locale). Time range selector: Last 3 / 6 / 12 / 24 months (controls revenue chart).

**KPI Cards (6 cards, 2-col on md, 3-col on lg, 6-col on xl):**
| Card | Value Source | Hint |
|---|---|---|
| Total Clients | `stats.totalClients` | Active accounts |
| Active Orders | `stats.activeOrders` | In progress |
| Pending Assembly | `stats.pendingAssembly` | Awaiting build |
| Overdue Invoices | `stats.overdueInvoices` | Need follow-up |
| Low Stock Items | `stats.lowStockItems` | Reorder soon |
| Pending POs | `stats.pendingPOs` | Open with vendors |

**Charts (Row 1):**
- **Revenue Overview** (4/7 cols): Recharts `AreaChart` with gradient fill. X-axis: month label. Y-axis: `₹Xk` format. Tooltip shows exact `₹X,XX,XXX`. Color: amber (#d97706). Data: `GET /v1/analytics/revenue-trend?months=N`
- **Sales Pipeline** (3/7 cols): Recharts `BarChart` horizontal bars by SO status. X-axis: `₹Xk`. Data: `GET /v1/analytics/sales-pipeline`

**Charts (Row 2):**
- **AR Aging** (4/7 cols): Progress bars for each aging bucket: Current (green), 1–30 days (amber), 31–60 days (orange), 61–90 days (red), 90+ days (purple). Shows ₹ amount + % bar for each bucket. Data: `GET /v1/analytics/ar-aging`
- **Inventory Status** (3/7 cols): Recharts `PieChart` (donut) showing In Stock / Low Stock / Out of Stock counts. Data: `GET /v1/analytics/inventory-status`

**Bottom Row (3 cards):**
- **Sales Leaderboard**: Ranked list of salespeople (gold/silver/bronze rank badges). Shows pipeline value, won count, open count. Data: `GET /v1/analytics/sales-leaderboard`
- **Top Products**: Top 5 by revenue. Shows rank, product name, units sold, revenue. Data: `GET /v1/analytics/top-products`
- **Vendor Performance**: Top 5 vendors. Shows on-time rate % as a colored progress bar (green ≥90%, amber ≥70%, red <70%), PO count, total value. Data: `GET /v1/analytics/vendor-performance`

**Top Clients by Revenue** (4/7 cols): Ranked list with horizontal progress bars. Shows rank, client name, order count, total revenue. Data: `useGetTopClients()`

**Quick Actions** (3/7 cols): 5 colored shortcut links:
- New Sales Order → `/sales-orders`
- Create Invoice → `/invoices`
- Record Inventory → `/inventory`
- Add Lead → `/leads`
- New Purchase Order → `/purchase-orders`

---

### 4.3 Clients
**URL:** `/clients`

**Header:** "Clients" · subtitle: `N accounts · N industries`. Button: "New Client".

**Filters:**
- Search input (left icon) — queries `search` param on API
- Industry dropdown — dynamically built from unique industries in data
- View toggle: Table | Cards

**Table columns (Table view):**
| Column | Notes |
|---|---|
| Company | Avatar initials (gradient colored) + name (clickable → client detail) |
| Contact Person | Text |
| Email | Clickable `mailto:` link |
| Phone | Text or "—" |
| Industry | Badge (outline) |
| GST | Monospace font |
| Actions | Eye (view detail), Edit (pencil), Delete (trash, red) |

**Card view:** 3-column grid. Each card shows gradient avatar, company name, contact person, industry badge, email, phone. Whole card is clickable → detail.

**New/Edit Client dialog fields:**
| Field | Type | Required |
|---|---|---|
| Company Name | text input | ✓ |
| Contact Person | text input | ✓ |
| Industry | Select: Retail, Technology, Finance, Healthcare, Education, Manufacturing, FMCG, Pharma, Automotive, Other | |
| Email | email input | ✓ |
| Phone | text input | |
| GST Number | text input (monospace) | |
| Tags | text input (comma separated, e.g. "VIP, Bulk, Corporate") | |
| Billing Address | text input (full width) | |
| Shipping Address | text input (full width) | |

**Delete flow:** AlertDialog "Delete client?" with destructive confirm.

**API calls:** `useListClients({search})`, `useCreateClient`, `useUpdateClient`, `useDeleteClient`

---

### 4.4 Client Detail
**URL:** `/clients/:id`

**Header:** Company name + industry badge. Contact person subheading. "Log Interaction" button (top right). Back link → `/clients`.

**Left column (1/3 width):**
- **Contact Details card:** Email (mailto link), Phone, Billing Address (with MapPin icon)
- **Tags card** (if any): Badge list from comma-separated tags
- **Contacts card** (via `ContactsCard` component): lists linked contact persons

**Right column (2/3 width):**
- **Activities card** (via `ActivitiesCard` component): recent activities
- **Interaction Log card:** Timeline of logged interactions
  - Each entry: type badge (Call/Email/Meeting), date (MMM d, yyyy format), notes text
  - Left-border timeline with primary-colored dot markers

**Log Interaction dialog fields:**
| Field | Type | Options | Required |
|---|---|---|---|
| Type | Select | Call, Email, Meeting | ✓ |
| Notes | Textarea (4 rows) | | ✓ |

**API calls:** `useGetClient(id)`, `useListClientInteractions(id)`, `useCreateClientInteraction`

---

### 4.5 Contacts
**URL:** `/contacts`

**Header:** "Contacts" · subtitle: `N contacts across N clients`. Button: "New Contact".

**Filters:** Search by name / email / designation / client name. Client dropdown filter.

**View:** Card grid (3 columns). Each card:
- Gradient circular avatar with initials
- Full name + "Primary" badge (if `isPrimary`)
- Designation (smaller text)
- Department (with briefcase icon)
- Client company name (with building icon)
- Edit/Delete buttons (appear on hover)
- Divider line: email (mailto link), phone, notes (line-clamp-2)

**New/Edit Contact dialog fields:**
| Field | Type | Required |
|---|---|---|
| Client | Select dropdown (shown only on New, not Edit) | ✓ |
| First Name | text input | ✓ |
| Last Name | text input | |
| Designation / Title | text input (placeholder: "e.g. CFO, Procurement Head") | |
| Department | text input (placeholder: "e.g. Finance, Procurement") | |
| Email | email input | |
| Phone | text input | |
| Notes | Textarea (2 rows) | |
| Mark as primary contact | Checkbox | |

**API calls:** `GET /v1/contacts`, `POST /v1/contacts`, `PATCH /v1/contacts/:id`, `DELETE /v1/contacts/:id`

---

### 4.6 Leads
**URL:** `/leads`

**Header:** "Leads Pipeline". Button: "New Lead".

**KPI cards (4):**
| Card | Value |
|---|---|
| Total Pipeline | ₹ sum of all `estimatedValue` |
| Won Value | ₹ sum of won leads |
| Active Leads | Count of non-won/lost leads |
| Win Rate | won count / total × 100% |

**Filters:** Search (title, company, contact name). Source dropdown (Web, Referral, Cold call, LinkedIn, Event — dynamically built). View toggle: Kanban | List.

**Stages:** New → Qualified → Proposal → Negotiation → Won / Lost
- Colors: slate / blue / violet / amber / emerald / red
- Each column shows stage label, count badge, and total ₹ value

**Kanban cards show:** Title, company (building icon), estimated value (primary color), source badge, owner avatar initials. Click → detail drawer.

**List view columns:**
| Column | Notes |
|---|---|
| Lead | Title + email below |
| Company | Building icon + name |
| Contact | Name + phone |
| Stage | Colored badge |
| Source | Colored pill |
| Value (₹) | Right-aligned, tabular |
| Owner | Avatar + name |

**New Lead dialog fields:**
| Field | Type | Notes |
|---|---|---|
| Lead Title | text input | Required. Placeholder: "e.g. Diwali Gifting - Infosys 2025" |
| Link to Existing Client | Select | "__none__" sentinel for "None / New prospect" |
| Company Name | text input | Free text if not in client list |
| Contact Name | text input | |
| Assigned To | Select (users list with role) | |
| Email | email input | |
| Phone | text input | |
| Source | Select: Web, Referral, Cold call, LinkedIn, Event, Other | |
| Estimated Value (₹) | number input | |
| Notes | Textarea (2 rows) | |

**Lead detail drawer (Sheet):** Shows all fields read-only, stage select (updates inline), estimated value highlighted box, convert actions:
- "Convert to Opportunity" — POST `/v1/leads/:id/convert`
- "Convert to Client" — POST `/v1/leads/:id/convert-to-client` (smart: shows "Already linked" if exists)
- Schedule Follow-up mini-form (subject, due date, description)
- "Create Quote" link
- Delete button

**API calls:** `GET /v1/leads`, `POST /v1/leads`, `PATCH /v1/leads/:id`, `DELETE /v1/leads/:id`, `POST /v1/leads/:id/convert`, `POST /v1/leads/:id/convert-to-client`, `POST /v1/activities`

---

### 4.7 Opportunities
**URL:** `/opportunities`

**Header:** "Opportunities" · "Sales pipeline with probability-weighted forecast". Button: "New Opportunity".

**KPI cards (4):**
| Card | Calculation |
|---|---|
| Total Pipeline | Sum of non-closed opportunity values |
| Weighted Forecast | Sum of (value × probability / 100) |
| Closed Won | Sum of won opportunity values |
| Win Rate | won count / total × 100% |

**Kanban board (6 stages):** Prospect → Qualified → Proposal → Negotiation → Won / Lost
- Column header: stage label, count badge, total ₹ value
- Each card: title, client name, value (primary), probability % bar (`Progress` component, colored: emerald ≥75%, amber ≥50%, blue ≥25%, slate <25%), days to close (red if late, amber if <7 days), owner name

**New Opportunity dialog fields:**
| Field | Type | Required |
|---|---|---|
| Title | text input | ✓ |
| Client | Select dropdown | |
| Source Lead | Select dropdown | |
| Value (₹) | number input | |
| Probability % | number input (0–100) | |
| Expected Close Date | date input | |
| Assigned To | Select (users) | |
| Notes | Textarea (2 rows) | |

**Detail drawer (Sheet):** Deal value box with probability bar and weighted value calc. Expected close date. Notes box. Stage dropdown (inline update). Delete button.

**API calls:** `GET /v1/opportunities`, `POST /v1/opportunities`, `PATCH /v1/opportunities/:id`, `DELETE /v1/opportunities/:id`

---

### 4.8 Quotes
**URL:** `/quotes`

**Header:** "Quotes". Button: "New Quote".

**KPI cards (4):** Total Quoted ₹, Accepted Value ₹, Pending count, Conversion Rate %.

**Status tab bar:** All | Draft | Sent | Accepted | Rejected | Expired (with count per tab)

**Table columns:**
| Column | Notes |
|---|---|
| Quote # | Auto-generated (e.g. QT-0001) |
| Subject | Optional title |
| Client | Company name |
| Status | Colored badge |
| Payment Terms | Immediate / Net 7 / Net 15 / Net 30 / Net 45 / Net 60 / 50% Advance / 100% Advance |
| Valid Until | Date; red + "(expired)" if past and status=sent |
| Subtotal | ₹ |
| GST | ₹ |
| Total | ₹ bold |
| Actions | Trash icon (delete) |

**New Quote dialog fields:**
| Field | Type | Required |
|---|---|---|
| Client | Select | ✓ |
| Subject / title | text input | |
| Valid Until | date input | |
| Discount % | number input (0–100) | |
| Payment Terms | Select: Immediate / Net 7 / 15 / 30 / 45 / 60 / 50% Advance / 100% Advance | |
| Line items (dynamic rows): | | |
| — Product | Select from catalog (shows image + name + price) or "Custom description" | |
| — Description | text input (6/12 cols) | |
| — Qty | number (2/12 cols, min 1) | |
| — Unit Price ₹ | number (4/12 cols) | |
| — Line total | Calculated, shown below | |
| Notes | Textarea (2 rows, internal) | |
| Terms & Conditions | Textarea (2 rows) | |

**Live summary box:** Subtotal → Discount (amber) → GST 18% → Total (bold, larger).

**Product picker:** Each dropdown option shows product image (5×5), name, selling price right-aligned.

**Quote detail drawer (Sheet):** Quote number, subject, status badge, client name. Financial box (total, subtotal, discount, GST). "Bill To" panel (contact person, email, phone, GSTIN, address). Valid Until + Payment Terms. Items list (with product images). Status change buttons (Sent, Accepted, Rejected, Expired). "Convert to Sales Order" button. Print button (calls `printQuote()`).

**API calls:** `GET /v1/quotes`, `GET /v1/quotes/:id`, `POST /v1/quotes`, `PATCH /v1/quotes/:id`, `DELETE /v1/quotes/:id`, `POST /v1/quotes/:id/convert`

---

### 4.9 Follow-ups
**URL:** `/follow-ups`

**Header:** "Follow-ups" · subtitle shows overdue count in red. Button: "Schedule Follow-up".

**Grouped sections (only shown if items exist):**
| Section | Icon | Color |
|---|---|---|
| Overdue | AlertCircle | red-400 |
| Due Today | Clock | amber-400 |
| Upcoming | CalendarClock | blue-400 |
| No Due Date | Clock | muted |

**Each follow-up row:**
- ✓ circle button (mark done)
- Type badge (follow-up/call/email/meeting/task — each a different color)
- Subject (bold)
- Context: client name (building icon), lead title (target icon), owner (user icon), due date (red if overdue)
- Description (line-clamp-2)
- Delete (trash) button

**"Show completed" toggle:** Expands a faded completed list showing strikethrough subjects and "Done MMM d" timestamps.

**Schedule Follow-up dialog fields:**
| Field | Type | Required |
|---|---|---|
| Type | Select: follow-up, call, email, meeting, task | |
| Subject | text input | ✓ |
| Client | Select (link to client) | |
| Lead | Select (link to lead) | |
| Assigned To | Select (users) | |
| Due Date | date input | |
| Notes | Textarea (2 rows) | |

**API calls:** `GET /v1/activities?pending=true`, `GET /v1/activities`, `POST /v1/activities`, `PATCH /v1/activities/:id/complete`, `DELETE /v1/activities/:id`

---

### 4.10 Products
**URL:** `/products`

**Header:** "Products". Buttons: Download Template CSV, Export CSV, Import CSV, New Product.

**KPI cards (4):** Total SKUs, Stock Value (₹), Low Stock count, Avg. Margin %.

**Filters:**
- Search by name/SKU
- Category dropdown (dynamically built from data; fallback list: Electronics, Stationery, Drinkware, Apparel, Bags, Other)
- "Low Stock Only" toggle switch

**Table columns:**
| Column | Notes |
|---|---|
| Product | 9×9 image thumbnail or Package icon + name |
| Category | Secondary badge |
| HSN | Monospace, small |
| GST% | Center-aligned, small |
| Cost | ₹, right-aligned, muted |
| Price | ₹, right-aligned, medium weight |
| Margin | % colored: emerald ≥30%, amber ≥15%, red <15% |
| Stock (Avail / Res / Total) | Badge (red=out, amber=low, secondary=ok); reserved qty + total shown small below |
| Vendor | Vendor name or "—" |
| Actions | Settings2 (variants/pricing/customizations), Edit, Delete |

**Rows highlighted:** Red background if out of stock, amber if low stock.

**CSV Import:** Parses CSV client-side, POSTs to `/v1/products/import`. Returns `{ imported, updated, errors }`. Template columns: name, sku, brand, productType, category, hsnCode, gstRate, uom, costPrice, sellingPrice, stockLevel, lowStockThreshold, reorderQty, brandable, barcode.

**New/Edit Product dialog fields:**
| Field | Type | Options | Required |
|---|---|---|---|
| Product Image | File upload → `/v1/uploads/image` (stored in DO Spaces) | JPG/PNG/WebP | |
| Name | text | | ✓ |
| SKU | text | | |
| Brand | text | | |
| Product Type | Select | Raw Material, Finished Good, Semi-Finished, Packaging, Other | |
| Category | text | | ✓ |
| HSN Code | text | | |
| GST Rate | Select | 0, 5, 12, 18, 28 | |
| UOM | text (default: PCS) | | |
| Cost Price | number | | |
| Selling Price | number | | |
| Stock Level | number (default 0) | | |
| Low Stock Threshold | number (default 10) | | |
| Reorder Qty | number (default 0) | | |
| Brandable | Switch | | |
| Vendor | Select dropdown | | |

**Product Manager** (Settings2 button): Opens `ProductManager` component for managing variants, pricing tiers, and customization options.

**API calls:** `useListProducts({search, category, lowStock})`, `useCreateProduct`, `useUpdateProduct`, `useDeleteProduct`, `useListVendors`, `GET /v1/products/import`, `GET /v1/uploads/image`

---

### 4.11 Bundles
**URL:** `/bundles`

**Header:** "Bundles". Smart Suggest panel + New Bundle button.

**Smart Suggest panel:** Min Budget ₹ / Max Budget ₹ inputs + category pills (toggleable) + "Suggest Bundle" button. Results shown as a card with suggested items, total cost, and "Use This Bundle" button (pre-fills the create form).

**Table columns:** Bundle (image + name), Occasion, Items (count), Total Price (₹), Edit / Delete buttons.

**New/Edit Bundle dialog fields:**
| Field | Type | Required |
|---|---|---|
| Bundle Image | File upload → DO Spaces | |
| Name | text | ✓ |
| Description | text | |
| Occasion | text | |
| Items (dynamic rows): | | |
| — Product | Select from catalog | ✓ |
| — Quantity | number (min 1) | ✓ |
| Add/Remove item buttons | | |

**Validation (Zod):** `name` min 1, `items` array min 1, each item `productId` min 1 and `quantity` min 1.

**API calls:** `useListBundles`, `useCreateBundle`, `useUpdateBundle`, `useDeleteBundle`, `POST /v1/bundles/suggest` (Smart Suggest), `useListProducts`, `POST /api/v1/uploads/image`

---

### 4.12 Bundle Costing
**URL:** `/bundle-costing`

**Header:** "Bundle Costing". Smart Suggest (same Min/Max budget + category filter panel as Bundles page).

**Main table (expandable rows):**
| Column | Notes |
|---|---|
| (Expand toggle) | Click to show product breakdown |
| Bundle | Name |
| Occasion | Tag |
| Items | Count |
| Cost Price | ₹ sum of (component cost × qty) |
| Selling Price | ₹ bundle selling price |
| Gross Margin ₹ | Selling − Cost |
| Margin % | % colored |

**Expanded breakdown table (per bundle):**
- Product name, Category, Qty, Cost/Unit ₹, Sell/Unit ₹, Line Cost ₹, Line Selling ₹, Item Margin %

**API calls:** `GET /v1/bundles/costing`, `POST /v1/bundles/suggest-costing`, `useListProducts`

---

### 4.13 Services
**URL:** `/services`

**Header:** "Services". Button: "New Service".

**Table columns:** Name, Type, SAC Code, Unit, GST %, Unit Price (₹), Cost Est. (₹), Margin %, Actions (Edit, Delete).

**Margin** is calculated: `(unitPrice - costEstimate) / unitPrice × 100`.

**New/Edit Service dialog fields:**
| Field | Type | Options |
|---|---|---|
| Name | text | Required |
| Type | Select | Branding, Design, Packing, Logistics, Installation, Consultation, Other |
| SAC Code | text | |
| GST Rate | Select | 0%, 5%, 12%, 18%, 28% |
| Unit | Select | PCS, Hour, Day, Sqft, Meter, Job |
| Unit Price | number | |
| Cost Estimate | number | |
| Description | textarea | |

**API calls:** `GET /v1/services`, `POST /v1/services`, `PATCH /v1/services/:id`, `DELETE /v1/services/:id`

---

### 4.14 Categories
**URL:** `/categories`

**Header:** "Categories". Button: "New Category".

**View:** Card grid. Each card shows: colored icon (from icon picker), name, slug, description, HSN Code, product count badge, sub-category badge. Edit/Delete on each card.

**New/Edit Category dialog fields:**
| Field | Type | Required |
|---|---|---|
| Name | text | ✓ |
| Slug | text (URL-friendly) | ✓ |
| Description | text | |
| HSN Code | text | |
| Icon | Visual icon picker grid (Lucide icons selectable) | |

**API calls:** `GET /v1/categories`, `POST /v1/categories`, `PATCH /v1/categories/:id`, `DELETE /v1/categories/:id`

---

### 4.15 Vendors
**URL:** `/vendors`

**Header:** "Vendors". Button: "New Vendor" (opens side sheet).

**Table columns:** Vendor (name + city), Contact Person, Email / Phone, GST No. (monospace), Location, Payment Terms, Lead Time (days), Actions (Edit).

**New/Edit Vendor side sheet (Sheet) fields:**
| Field | Type | Options | Required |
|---|---|---|---|
| Name | text | | ✓ |
| Contact Person | text | | |
| Email | email | | |
| Phone | text | | |
| GST Number | text (monospace) | | |
| Address | text | | |
| City | text | | |
| State | Select | All Indian states | |
| Pincode | text | | |
| Payment Terms | Select | Net 7 / 15 / 30 / 45 / 60, Immediate, Custom | |
| Bank Account | text | | |
| Lead Time Days | number (min 0) | | |

**Validation (Zod):** `name` required, `email` format, `leadTimeDays` min 0.

**API calls:** `useListVendors`, `useCreateVendor`(?), `POST /v1/vendors`, `PATCH /v1/vendors/:id`

---

### 4.16 Artwork
**URL:** `/artwork`

**Header:** "Artwork Approvals". Button: "New Artwork".

**Status filter tabs:** All | Pending | Client Approved | Sent to Vendor | Completed

**Table columns:** Asset Name, Client, Order # (linked SO), Status (badge), Date Added, Notes, Actions (Update Status button).

**New Artwork dialog fields:**
| Field | Type | Required |
|---|---|---|
| Client | Select | ✓ |
| Sales Order | Select (filtered by client) | |
| Asset Name | text | ✓ |
| Asset URL | text (logo / design file link) | |
| Notes | textarea | |

**Update Status dialog fields:**
| Field | Type | Options |
|---|---|---|
| Status | Select | Pending, Client Approved, Sent to Vendor, Completed |
| Additional Notes | textarea | |

**API calls:** `GET /v1/artwork-approvals`, `POST /v1/artwork-approvals`, `PATCH /v1/artwork-approvals/:id/status`, `GET /v1/clients`, `GET /v1/sales-orders`

---

### 4.17 Assembly
**URL:** `/assembly`

**Header:** "Assembly Jobs". Button: "New Job".

**Status filter tabs:** All | Pending | In Progress | Completed | Rejected

**Table columns:** Job # (mono), Sales Order (linked), Status (badge), Progress (bar: kits completed / total kits), Notes, Created date, Actions (status transition buttons).

**Status transition buttons (per current status):**
- Pending → "Start" button
- In Progress → "Complete (Backflush)" button + "Update Kits" (gauge icon) + "Reject" button
- Completed → no transitions
- Rejected → "Re-open" button

**New Assembly Job dialog fields:**
| Field | Type | Required |
|---|---|---|
| Sales Order | Select | ✓ |
| Total Kits | number (min 1) | ✓ |
| Notes | Textarea | |

Warning shown: "Completing this job will automatically deduct component stock (backflush)."

**Update Kits dialog:** Number input for partial kits completed (0 to totalKits).

**Reject AlertDialog:** Confirmation prompt.

**API calls:** `GET /v1/assembly`, `POST /v1/assembly`, `PATCH /v1/assembly/:id/status`, `PATCH /v1/assembly/:id` (kit count), `GET /v1/sales-orders`

---

### 4.18 Production Orders
**URL:** `/production`

**Header:** "Production Orders". Button: "New Production Order".

**Status filter tabs:** All | Draft | In Progress | Completed | Cancelled

**Table (expandable rows):**
| Column | Notes |
|---|---|
| (Expand) | Shows BOM table when expanded |
| Order # | Auto-generated |
| Product | Finished product being made |
| Progress | Bar (qty produced / qty planned) |
| Status | Badge |
| Planned Date | Date |
| Actions | "Produce" button, status transition buttons |

**Expanded BOM table:** Material product, required qty per order, unit.

**New Production Order dialog fields:**
| Field | Type | Required |
|---|---|---|
| Product | Select from catalog | ✓ |
| Quantity | number | ✓ |
| Planned Date | date | |
| Notes | textarea | |
| Materials (BOM, dynamic rows): | | |
| — Material Product | Select | ✓ if listed |
| — Required Qty | number | ✓ if listed |
| Add / Remove material buttons | | |

**Record Production dialog:** Qty produced now (max: remaining qty). POST `/v1/production-orders/:id/produce`.

**Status transitions:** Draft → In Progress → Completed | Cancelled (via `PATCH /v1/production-orders/:id/status`)

**API calls:** `GET /v1/production-orders`, `GET /v1/production-orders/:id`, `POST /v1/production-orders`, `PATCH /v1/production-orders/:id/status`, `POST /v1/production-orders/:id/produce`, `GET /v1/products`

---

### 4.19 Sample Orders
**URL:** `/sample-orders`

**Header:** "Sample Orders". Button: "New Sample Order".

**Status filter tabs:** All | Requested | Dispatched | Received | Converted | Rejected

**Table (expandable rows):**
| Column | Notes |
|---|---|
| (Expand) | Shows product list |
| Sample # | Monospace |
| Customer | Name + "CRM" badge if linked to a client |
| Status | Badge |
| Date | MMM d, yyyy format |
| Notes | Truncated |
| Actions | Status transition buttons (Dispatched, Received, Converted, Rejected) |

**New Sample Order dialog:**

**Toggle:** CRM Client vs Manual Entry

*CRM Client mode:*
- Client Select dropdown

*Manual Entry mode:*
- Customer Name (Required), Phone, Email

*Both modes:*
| Field | Type | Required |
|---|---|---|
| Line items (dynamic): | | |
| — Product | Select (shows stock level) | ✓ |
| — Quantity | number (min 1) | ✓ |
| — Line Notes | text | |
| General Notes | Textarea | |

**Validation:** At least 1 line item, all lines must have product + qty, must have client or customer name.

**API calls:** `GET /v1/sample-orders`, `POST /v1/sample-orders`, `PATCH /v1/sample-orders/:id/status`, `GET /v1/sample-orders/:id`, `GET /v1/clients`, `GET /v1/products`

---

### 4.20 Sales Orders
**URL:** `/sales-orders`

**Header:** "Sales Orders". Button: "New Order".

**Status filter tabs:** All | Draft | Confirmed | In Production | Ready | Shipped | Delivered | Cancelled

**Table columns:**
| Column | Notes |
|---|---|
| Order # | Auto-generated (SO-YYYYNNN) |
| Client | Company name |
| Status | Colored badge |
| PO # | Client's purchase order reference |
| Occasion | Text |
| Delivery Date | Date |
| Payment Terms | Text |
| Grand Total | ₹ bold |
| Actions | Eye icon → detail page |

**New Sales Order dialog fields:**
| Field | Type | Required |
|---|---|---|
| Client | Select | ✓ |
| Customer PO Number | text | |
| Occasion | text | |
| Delivery Date | date | |
| Payment Terms | Select: Immediate / Net 7 / Net 15 / Net 30 / Net 45 / Net 60 / 50% Advance / 100% Advance | |
| Discount % | number (0–100) | |
| Line Items (dynamic): | | |
| — Product | Select from catalog | ✓ |
| — Qty | number (min 1) | ✓ |
| — Unit Price ₹ | number | |
| Delivery Addresses (dynamic): | | |
| — Recipient Name | text | ✓ |
| — Phone | text | |
| — Address | text | ✓ |
| — City | text | |
| — Pincode | text | |
| Notes | Textarea | |

**Validation (Zod):** `clientId` required, items array length ≥ 1, address name + address required.

**API calls:** `useListSalesOrders`, `useCreateSalesOrder`, `useListClients`, `useListProducts`

---

### 4.21 Sales Order Detail
**URL:** `/sales-orders/:id`

**Header:** SO number + status badge. Back link → `/sales-orders`. Action buttons row.

**Action buttons:**
| Button | Condition |
|---|---|
| Print | Always shown |
| Process | Link → `/order-processing/:id` |
| Status transition button | Based on current status (Confirm Order, Start Production, Mark Ready, Ship, Deliver) |
| Cancel Order | AlertDialog confirmation (destructive) |

**Order info section:** Client name, order date, delivery date, PO number, payment terms, occasion, notes.

**Line items table:**
| Column | Notes |
|---|---|
| Product | 36px image/icon + name + UOM |
| HSN | Monospace |
| Qty | Number |
| Unit Price | ₹ |
| Total | ₹ |

**Financial summary:** Subtotal, Discount (if any), GST breakdown (CGST+SGST or IGST), Grand Total.

**Delivery addresses:** List of all delivery addresses with recipient name, phone, full address.

**API calls:** `useGetSalesOrder`, `useUpdateSalesOrderStatus`

---

### 4.22 Order Processing List
**URL:** `/order-processing`

**Header:** "Order Processing". Search input.

**Two sections:**
1. **Pending Processing Form** — confirmed SOs without a form yet
2. **Form in Progress** — SOs where form has been started

**Each row shows:** Order number (mono), status badge, form status badge, client name, delivery date, grand total.

**Action button:** "Start Form" (pending) or "View Form" (in progress) → navigates to `/order-processing/:salesOrderId`.

**API calls:** `GET /v1/order-processing/list`

---

### 4.23 Order Processing (Form)
**URL:** `/order-processing/:salesOrderId`

**Header:** "Order Processing Form" + SO number. Back link → `/order-processing`. Print + Save/Update buttons.

**6 tabs:**

---

#### Tab 1: Order Info
**Left section — Order details:**
| Field | Type | Notes |
|---|---|---|
| Confirmed Order Date | Read-only text | Auto-filled from `salesOrder.createdAt` |
| Order By | Select (users list) | |
| Firm / Company Name | text input | |
| POC Name | text input | |
| POC Contact | text input | |
| Logo Files Received | Checkbox | |
| CD Tape | Checkbox | |
| CD Sticker | Checkbox | |
| Thank You Card | Checkbox | |
| Branding Required | Checkbox | |
| Branding Position & Size | text input (visible if branding checked) | |
| Production Type | Select: In-House, Out-Source | |
| Invoice Method | Select: Invoice, Cash | |
| Total Amount | number input | |
| Advance Received | number input | |
| Balance Amount | number input | |
| More Information | Textarea | |

**Right section — SO Items table:**
| Column | Notes |
|---|---|
| Product image | Clickable thumbnail → lightbox |
| Product Name | Text (from SO) |
| Qty | Text (from SO) |
| Branding | Select: Screen Print, Digital Print, Embroidery, Laser Engraving, None, Other |
| Product Source | Select: In Stock, Purchase, Other |
| Production Source | Select: In-House, Vendor, Other |

**Lightbox modal:** Fullscreen overlay on image click. Shows enlarged image, product name, qty, unit price, total price.

---

#### Tab 2: Procurement
| Field | Type |
|---|---|
| Procurement Date | date input |
| Procurement Time | time input |
| Material Received | Checkbox |
| Material Received Date | date input |
| Material Received Time | time input |
| Procurement Signed By | text input |
| Procurement Remarks | Textarea |

---

#### Tab 3: Designer
| Field | Type |
|---|---|
| Design Start Date | date input |
| Design Start Time | time input |
| Designer Attachments | File upload (drag-and-drop + file picker, multiple files) |
| Mockup Approval End Date | date input |
| Mockup Approval End Time | time input |
| Mockup Approval Signed By | text input |
| Pre-Production Approval End Date | date input |
| Pre-Production Approval End Time | time input |
| Pre-Production Approval Signed By | text input |
| Designer Remarks | Textarea |

**Attachments list:** Shows uploaded file name, type icon (image/file), download link, remove button.

---

#### Tab 4: Production
| Field | Type |
|---|---|
| Production Initiate Date | date input |
| Production Initiate Time | time input |
| QC 1 End Date | date input |
| QC 1 End Time | time input |
| QC 1 Signed By | text input |
| QC 2 End Date | date input |
| QC 2 End Time | time input |
| QC 2 Signed By | text input |
| Production Remarks | Textarea |
| Stock Update Date | date input |
| Stock Update Time | time input |
| Stock Update Signed By | text input |

---

#### Tab 5: Dispatch
| Field | Type |
|---|---|
| Dispatch Payment Status | text input |
| Dispatch Date | date input |
| Dispatch Time | time input |
| Dispatch Signed By | text input |
| Dispatch Incharge | text input |
| Dispatch Incharge Date | date input |
| Dispatch Incharge Time | time input |
| Dispatch Incharge Signed By | text input |

---

#### Tab 6: Check List
**Dynamic rows** (Add Row / Remove Row buttons):

| Column | Notes |
|---|---|
| Product Image | 32px thumbnail auto-loaded from product catalog by name |
| Product Name | Select dropdown (linked to product catalog) |
| Inhouse Avail. QTY | text (auto-filled from `stockLevel` when product selected) |
| Procure QTY | text input |
| Total Receive or Not & Date | text input |

---

**Print function:** Generates a print-ready A4 HTML page with:
- Header: company name, SO number, client, date
- Order info section: all Tab 1 fields
- SO items table with inline product images (36px), correct column order (Branding → Product Source → Production Source)
- Checklist table with product images
- Uses `window.print()` with print-specific CSS

**Save/Update:** POST or PATCH `/v1/order-processing` with full `formData` JSON.

**API calls:** `GET /v1/order-processing/:salesOrderId`, `GET /v1/sales-orders/:id` (items + createdAt), `GET /v1/products`, `GET /v1/users`, `POST /v1/order-processing`, `PATCH /v1/order-processing/:id`, `POST /v1/uploads/file` (attachments)

---

### 4.24 Purchase Orders
**URL:** `/purchase-orders`

**Header:** "Purchase Orders". Button: "New PO".

**Status filter tabs:** All | Draft | Sent | Partial | Received | Cancelled

**Table columns:**
| Column | Notes |
|---|---|
| PO # | Auto-generated |
| Vendor | Vendor name |
| Status | Colored badge |
| Expected Delivery | Date; red if overdue |
| Total | ₹ |
| Actions | Eye icon → detail page |

**New PO dialog fields:**
| Field | Type | Required |
|---|---|---|
| Vendor | Select | ✓ |
| Expected Delivery | date | |
| Linked Sales Order | Select (optional) | |
| Line Items (dynamic): | | |
| — Product | Select from catalog | |
| — Qty | number | |
| — Unit Price | number | |

**Validation (Zod):** `vendorId` required, items array ≥ 1.

**API calls:** `useListPurchaseOrders`, `useCreatePurchaseOrder`, `useListVendors`, `useListProducts`, `useListSalesOrders`

---

### 4.25 Purchase Order Detail
**URL:** `/purchase-orders/:id`

**Header:** PO number + status badge. Back link → `/purchase-orders`. Print + "Post GRN" link.

**Vendor info:** Name, contact, GST, address.

**Line items table:**
| Column | Notes |
|---|---|
| Product | Name |
| HSN | Monospace |
| Unit Price | ₹ |
| Received / Ordered | Progress bar (received qty / ordered qty) |
| Pending | Checkmark (if fully received) or remaining count |
| Line Total | ₹ |

**Status transitions:** Send to Vendor → Mark Full/Partial → Cancel PO.

**API calls:** `useGetPurchaseOrder`, `useUpdatePurchaseOrderStatus`

---

### 4.26 Goods Receipts (GRN)
**URL:** `/grn`

**Header:** "Goods Receipts". Button: "New GRN".

**Table columns:** GRN # (mono), PO # (linked), Received Date, Status badge, Notes, Print icon button.

**New GRN dialog fields:**
| Field | Type | Required |
|---|---|---|
| Purchase Order | Select | ✓ |
| Notes | text input | |
| Line Items (dynamic): | | |
| — Product | Select | |
| — Quantity Received | number | |
| — Quantity Rejected | number | |
| — Remarks | text input | |
| Add Line button | | |

**On save:** Stock levels automatically updated via the GRN API.

**API calls:** `GET /v1/grn`, `GET /v1/grn/:id`, `POST /v1/grn`, `useListPurchaseOrders`, `useListProducts`

---

### 4.27 Inventory
**URL:** `/inventory`

**Header:** "Inventory". Buttons: "Transfer Stock", "Record Movement".

**3 tabs:**

**Tab 1: Stock**
- Filters: search, "Low Stock Only" toggle
- Table: Product, Category, Stock (bold), Threshold, Fill Level (Progress bar — green/amber/red), Status badge (In Stock / Low Stock / Out of Stock)

**Tab 2: Locations**
- Cards per location: Location Name, Code, SKU count, list of items with name + qty

**Tab 3: Movements**
- Filters: search, type filter
- Table: Date, Product, Type badge (Inward/Outward/Transfer — different colors + +/- qty), Batch, Reference

**Record Movement dialog fields:**
| Field | Type |
|---|---|
| Product | Select |
| Type | Select: Inward, Outward |
| Quantity | number |
| Batch Number | text |
| Reference / Notes | text |

**Transfer Stock dialog fields:**
| Field | Type |
|---|---|
| Product | Select |
| From Location | Select |
| To Location | Select |
| Quantity | number |
| Reference | text |

**API calls:** `useListInventory`, `useListInventoryMovements`, `useCreateInventoryMovement`, `GET /v1/inventory/by-location`, `GET /v1/locations`, `POST /v1/inventory/transfer`

---

### 4.28 Item Ledger
**URL:** `/item-ledger`

**Header:** "Item Ledger".

**Controls:**
| Field | Type | Notes |
|---|---|---|
| Product | Select | Required; query disabled until selected |
| From Date | date input | |
| To Date | date input | |
| Type | Select: All, GRN, Assembly In/Out, Transfer In/Out, etc. | |
| Search | text input | Searches location, batch, reference |

**Summary cards (3):** Total Received (In), Total Dispatched (Out), Closing Balance for selected period.

**Ledger table columns:** Date & Time, Type (badge), Location, Reference / Batch, Qty In, Qty Out, Balance (running total).

**API calls:** `GET /v1/products`, `GET /v1/inventory/ledger?productId=N&from=X&to=Y`

---

### 4.29 Locations
**URL:** `/locations`

**Header:** "Locations". Button: "New Location".

**Table columns:** Code, Name, Zone / Bin, Type badge (storage/receiving/shipping), Capacity, Stock (SKU count + unit count), Delete button.

**New Location dialog fields:**
| Field | Type | Required |
|---|---|---|
| Name | text | ✓ |
| Code | text | ✓ |
| Zone | text | |
| Bin | text | |
| Type | text (default: storage) | |
| Capacity | number | |
| Notes | text | |

**Create button disabled** if Name or Code is empty.

**API calls:** `GET /v1/locations`, `GET /v1/inventory/by-location`, `POST /v1/locations`, `DELETE /v1/locations/:id`

---

### 4.30 Transfers
**URL:** `/transfers`

**Header:** "Transfers".

**2 tabs:** In Transit | Completed

**Table (expandable rows):** Batch ID, From Location → To Location, Product count, Total qty, Reference, Date, Status, Receive button (if in transit).

**Expanded detail table:** Product name, qty per item.

**New Transfer dialog fields:**
| Field | Type | Required |
|---|---|---|
| From Location | Select | ✓ |
| To Location | Select (different from From) | ✓ |
| Reference | text | |
| Line Items (dynamic): | | |
| — Product | Select (shows available stock at From) | |
| — Quantity | number (> 0) | |

**Validation:** Cannot transfer to same location. Qty must be > 0. Stock availability checked in UI.

**Receive Transfer dialog:** Confirmation prompt. POST `/v1/inventory/receive-transfer`.

**API calls:** `GET /v1/inventory/transfers`, `GET /v1/inventory`, `GET /v1/locations`, `POST /v1/inventory/send-transfer`, `POST /v1/inventory/receive-transfer`

---

### 4.31 Shipments
**URL:** `/shipments`

**Header:** "Shipments". Button: "New Shipment".

**Status filter tabs:** All | Pending | Dispatched | In Transit | Delivered

**Table columns:** Shipment #, Order # (linked), Courier, Tracking #, Status, Freight ₹, Dispatch Date, Actions (View detail sheet).

**New Shipment dialog fields:**
| Field | Type |
|---|---|
| Sales Order | Select |
| Courier Partner | Select: BlueDart, Delhivery, DTDC, FedEx, Ekart, Hand Delivery |
| Tracking # (AWB) | text |
| Est. Delivery Date | date |
| Freight Cost | number |
| # of Boxes | number |
| Total Weight | number |

**Detail sheet:** Shipment header, status transition buttons (Dispatch → In Transit → Delivered), "Print Delivery Challan" button, "Confirm Delivery (POD)" button per delivery address.

**POD capture:** Enter receiver name for each delivery address. PATCH `/v1/shipments/:id/items/:itemId/pod`.

**API calls:** `GET /v1/shipments`, `GET /v1/sales-orders`, `GET /v1/shipments/:id`, `POST /v1/shipments`, `PATCH /v1/shipments/:id/status`, `PATCH /v1/shipments/:id/items/:itemId/pod`

---

### 4.32 Invoices
**URL:** `/invoices`

**Header:** "Invoices". Button: "New Invoice".

**Status filter tabs:** All | Draft | Issued | Partially Paid | Paid | Overdue | Cancelled

**Table columns:** Invoice #, Client, Status badge, Due Date (red if overdue), Total ₹, Paid ₹, Actions (View detail).

**New Invoice dialog fields:**
| Field | Type |
|---|---|
| Sales Order | Select (auto-populates line items) |
| Due Date | date |
| Payment Terms | Select |
| Notes | textarea |

**Detail view:** Subtotal, CGST/SGST or IGST (based on supply type), Round Off, Grand Total. Line item breakdown (product, HSN, Rate, Taxable amount, GST). Payment history list.

**Action buttons:** Issue, Mark Paid, Cancel, Print Tax Invoice.

**API calls:** `GET /v1/invoices`, `GET /v1/sales-orders`, `GET /v1/invoices/:id`, `POST /v1/invoices`, `PATCH /v1/invoices/:id/status`

---

### 4.33 Payments
**URL:** `/payments`

**Header:** "Payments". Button: "New Payment". Filter by invoice.

**Table columns:** Receipt #, Invoice # (linked), Client, Amount ₹, Type, Mode, UTR/Ref #, Payment Date.

**New Payment dialog fields:**
| Field | Type | Options |
|---|---|---|
| Invoice | Select | |
| Amount | number | |
| Type | Select | Advance, Full Payment, Partial |
| Mode | Select | UPI, NEFT, RTGS, Cheque, Cash, Card |
| Reference No (UTR) | text | |
| Payment Date | date | |
| Notes | textarea | |

**API calls:** `GET /v1/payments`, `GET /v1/invoices`, `POST /v1/payments`

---

### 4.34 Credit Notes
**URL:** `/credit-notes`

**Header:** "Credit Notes". Button: "New Credit Note".

**Table columns:** CN # (auto-generated), Invoice # (linked), Client, Amount ₹, Reason, Status, Actions (Apply to invoice, Void, Print, Delete).

**New Credit Note dialog fields:**
| Field | Type |
|---|---|
| Client | Select |
| Invoice | Select (optional) |
| Amount | number |
| Reason | Select: Product Return, Price Dispute, Damaged Goods, Duplicate Invoice, Other |

**Actions per credit note:**
- "Apply to invoice" → PATCH `/v1/credit-notes/:id/apply`
- "Void" → AlertDialog + PATCH `/v1/credit-notes/:id/void`
- "Print credit note" → print function
- "Delete" → AlertDialog + DELETE `/v1/credit-notes/:id`

**API calls:** `GET /v1/credit-notes`, `POST /v1/credit-notes`, `PATCH /v1/credit-notes/:id/apply`, `PATCH /v1/credit-notes/:id/void`, `DELETE /v1/credit-notes/:id`

---

### 4.35 Fixed Assets
**URL:** `/fixed-assets`

**Header:** "Fixed Assets". Button: "Register Asset".

**KPI summary:** Gross Block ₹, Net Block ₹ (from `GET /v1/fixed-assets/summary`).

**Category tab filter:** All + dynamic category tabs.

**Table (expandable rows):**
| Column | Notes |
|---|---|
| Asset Code | Auto-generated |
| Name | |
| Category | |
| Location | |
| Status | Badge |
| Purchase Cost | ₹ |
| Book Value | ₹ (cost − accumulated depreciation) |
| Depreciated | Progress bar % |

**Expanded row:** Serial number, purchase date, useful life, depreciation method, residual value, accumulated depreciation to date.

**New Asset dialog fields:**
| Field | Type |
|---|---|
| Name | text (required) |
| Category | Select: IT Equipment, Furniture, Machinery, Vehicle, Other |
| Serial Number | text |
| Purchase Date | date |
| Cost | number |
| Useful Life (years) | number |
| Depreciation Method | Select: Straight Line, Reducing Balance |
| Residual Value | number |
| Location | text |

**Record Depreciation dialog:** Amount input. POST `/v1/fixed-assets/:id/depreciate`.

**Status update:** PATCH `/v1/fixed-assets/:id` (e.g. "Under Maintenance").

**API calls:** `GET /v1/fixed-assets`, `GET /v1/fixed-assets/summary`, `POST /v1/fixed-assets`, `POST /v1/fixed-assets/:id/depreciate`, `PATCH /v1/fixed-assets/:id`

---

### 4.36 Reports
**URL:** `/reports`

**Header:** "Reports". Date range preset selector.

**5 tabs:**

**Tab 1: Overview**
- KPI cards (Revenue, Orders, etc.)
- Revenue Trend — Recharts `LineChart`
- Sales Pipeline — progress bars by SO status

**Tab 2: Sales**
- Top Clients table (name, order count, revenue, % of total)
- Top Products table (name, qty sold, revenue)
- Monthly Revenue Breakdown

**Tab 3: Finance**
- AR Aging — Recharts `BarChart` (bucket vs ₹ value)
- Overdue Invoice Detail table (invoice #, client, amount, days overdue)

**Tab 4: Inventory**
- SKU count, Total Stock Value
- Low Stock report table (product, stock, threshold)

**Tab 5: Fixed Assets**
- Asset register summary
- Category breakdown chart

**Date range presets:** This Month, Last 3 Months, Last 6 Months, This Year, Custom.

**API calls:** `/v1/analytics/dashboard`, `/v1/analytics/revenue-trend`, `/v1/analytics/sales-pipeline`, `/v1/analytics/top-clients`, `/v1/analytics/ar-aging`, and more.

---

### 4.37 Users
**URL:** `/users`

**Header:** "Users". Button: "New User".

**Table columns:** Name, Email, Role badge, Status (Active/Inactive), Actions (Edit, Manage Company Access).

**New/Edit User dialog fields:**
| Field | Type | Options |
|---|---|---|
| Name | text | Required |
| Email | email | Required |
| Password | password | Required for new |
| Role | Select | Admin, Manager, Sales, Operations, Finance |
| Is Active | Switch | |

**Manage Company Access (side sheet):** List of companies with "Add Access" / "Remove Access" buttons.

**API calls:** `GET /v1/users`, `POST /v1/users`, `PATCH /v1/users`, `GET /v1/users/:id/companies`, `POST /v1/users/:id/companies/:cid`, `DELETE /v1/users/:id/companies/:cid`

---

### 4.38 Companies
**URL:** `/companies`

**Header:** "Companies". Button: "New Company".

**Card grid:** Each card shows company logo (if any), name, GSTIN, city, state. "Switch to" button, "Edit" button. Feature flag toggle: "Production Module" (PATCH `/v1/companies/:id/features`).

**New/Edit Company dialog fields:**
| Field | Type |
|---|---|
| Name | text (required) |
| GSTIN | text |
| Address | text |
| City | text |
| State | text |
| Pincode | text |
| Logo URL | text |

**Switch company:** POST `/v1/companies/:id/switch` → updates active session token and `companyId` in storage.

**API calls:** `GET /v1/companies`, `POST /v1/companies`, `PATCH /v1/companies/:id`, `POST /v1/companies/:id/switch`, `PATCH /v1/companies/:id/features`

---

### 4.39 Settings
**URL:** `/settings`

**3 tabs:**

**Tab 1: Profile**
- Read-only: Name, Email, Role

**Tab 2: Security**
| Field | Type |
|---|---|
| Current Password | password |
| New Password | password |
| Confirm New Password | password |
- POST `/v1/auth/change-password`

**Tab 3: Company**
| Field | Type |
|---|---|
| Legal Name | text |
| GSTIN | text |
| Bank Details | textarea |
| Currency | text |
| Invoice Number Prefix | text (e.g. "INV-") |
| SO Number Prefix | text (e.g. "SO-") |
| PO Number Prefix | text (e.g. "PO-") |
- GET/PATCH `/v1/settings/company`

---

### 4.40 PDF Image Extractor
**URL:** `/pdf-extractor`

**Header:** "PDF Image Extractor". Mode toggle: Images | Excel.

**Drag-and-drop zone:** Upload PDF. Shows filename once loaded.

**Image Mode controls:**
- Resolution scale selector
- Format: PNG / JPG
- Quality slider (JPG only)
- "Download All as ZIP" button
- Individual "Download" per page image

**Process:** `pdfjs-dist` renders each page to a `<canvas>`, extracts as image. No server upload — runs 100% in browser.

**Excel Mode controls:**
- "Download Excel" button

**Process:** `pdfjs-dist` extracts text content positions. Attempts to detect image placeholders by matching PDF image operator positions to text rows. Writes `[Photo]` sentinel in the Excel cell where an image was found. Uses `xlsx` library to generate `.xlsx` file.

**State variables:** `mode`, `images[]`, `sheets[]`, `progress`, `pdfName`, `format`, `scale`.

---

## 5. API Endpoints Reference

All endpoints prefixed `/api/v1/` (except `/health`). Bearer token required via `Authorization: Bearer <token>` header.

### Auth
| Method | Endpoint | Body / Params | Response |
|---|---|---|---|
| POST | `/v1/auth/login` | `{ email, password }` | `{ token, user, companyId }` |
| GET | `/v1/auth/me` | — | Current user profile |
| POST | `/v1/auth/logout` | — | Invalidates session |
| POST | `/v1/auth/change-password` | `{ current, new, confirm }` | 200 OK |

### Companies
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/v1/companies` | All companies for user |
| POST | `/v1/companies` | Create company |
| PATCH | `/v1/companies/:id` | Update company |
| POST | `/v1/companies/:id/switch` | Switch active company (new token) |
| PATCH | `/v1/companies/:id/features` | Toggle feature flags |

### CRM
| Method | Endpoint | Notes |
|---|---|---|
| GET/POST | `/v1/clients` | List (`?search=`) / Create |
| GET/PATCH/DELETE | `/v1/clients/:id` | Detail / Update / Delete |
| GET/POST | `/v1/clients/:id/interactions` | Interaction log |
| GET/POST | `/v1/contacts` | List / Create |
| PATCH/DELETE | `/v1/contacts/:id` | Update / Delete |
| GET/POST | `/v1/leads` | List / Create |
| PATCH/DELETE | `/v1/leads/:id` | Update / Delete |
| POST | `/v1/leads/:id/convert` | Convert to opportunity |
| POST | `/v1/leads/:id/convert-to-client` | Convert to client |
| GET/POST | `/v1/opportunities` | List / Create |
| PATCH/DELETE | `/v1/opportunities/:id` | Update / Delete |
| GET/POST | `/v1/quotes` | List / Create |
| GET | `/v1/quotes/:id` | Detail with items + client info |
| PATCH/DELETE | `/v1/quotes/:id` | Update / Delete |
| POST | `/v1/quotes/:id/convert` | Convert to Sales Order |
| GET/POST | `/v1/activities` | Follow-ups list / Create |
| PATCH | `/v1/activities/:id/complete` | Mark done |
| DELETE | `/v1/activities/:id` | Delete |

### Catalog
| Method | Endpoint | Notes |
|---|---|---|
| GET/POST | `/v1/products` | List (`?search=&category=&lowStock=`) / Create |
| PATCH/DELETE | `/v1/products/:id` | Update / Delete |
| POST | `/v1/products/import` | CSV batch import |
| GET/POST | `/v1/bundles` | List / Create |
| PATCH/DELETE | `/v1/bundles/:id` | Update / Delete |
| GET | `/v1/bundles/costing` | Cost + margin for all bundles |
| POST | `/v1/bundles/suggest` | Smart Suggest by budget |
| POST | `/v1/bundles/suggest-costing` | Smart Suggest for costing page |
| GET/POST | `/v1/services` | List / Create |
| PATCH/DELETE | `/v1/services/:id` | Update / Delete |
| GET/POST | `/v1/categories` | List / Create |
| PATCH/DELETE | `/v1/categories/:id` | Update / Delete |
| GET/POST | `/v1/vendors` | List / Create |
| PATCH | `/v1/vendors/:id` | Update |

### Orders
| Method | Endpoint | Notes |
|---|---|---|
| GET/POST | `/v1/sales-orders` | List (`?status=`) / Create |
| GET/PATCH | `/v1/sales-orders/:id` | Detail / Update |
| PATCH | `/v1/sales-orders/:id/status` | Transition status |
| GET/POST | `/v1/purchase-orders` | List (`?status=`) / Create |
| GET/PATCH | `/v1/purchase-orders/:id` | Detail / Update |
| PATCH | `/v1/purchase-orders/:id/status` | Transition status |
| GET/POST | `/v1/sample-orders` | List / Create |
| PATCH | `/v1/sample-orders/:id/status` | Transition status |
| GET | `/v1/order-processing/list` | All processing forms list |
| GET | `/v1/order-processing/:salesOrderId` | Get form for SO |
| POST | `/v1/order-processing` | Save new form |
| PATCH | `/v1/order-processing/:id` | Update existing form |

### Operations
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/v1/inventory` | Stock balances |
| GET | `/v1/inventory/by-location` | Stock grouped by location |
| GET | `/v1/inventory/transfers` | Transfer history |
| POST | `/v1/inventory/transfer` | Create transfer (old) |
| POST | `/v1/inventory/send-transfer` | Initiate transfer |
| POST | `/v1/inventory/receive-transfer` | Complete transfer |
| GET | `/v1/inventory/movements` | Movement history |
| POST | `/v1/inventory/movements` | Record movement (inward/outward) |
| GET | `/v1/inventory/ledger` | Item ledger (`?productId=&from=&to=`) |
| GET/POST | `/v1/locations` | List / Create |
| DELETE | `/v1/locations/:id` | Delete |
| GET/POST | `/v1/grn` | GRN list / Create |
| GET | `/v1/grn/:id` | GRN detail |
| GET/POST | `/v1/assembly` | Assembly jobs list / Create |
| PATCH | `/v1/assembly/:id` | Update kit count |
| PATCH | `/v1/assembly/:id/status` | Transition status (start/complete/reject) |
| GET/POST | `/v1/artwork-approvals` | List / Create |
| PATCH | `/v1/artwork-approvals/:id/status` | Update approval status |
| GET/POST | `/v1/production-orders` | List / Create |
| GET | `/v1/production-orders/:id` | Detail + BOM |
| PATCH | `/v1/production-orders/:id/status` | Transition status |
| POST | `/v1/production-orders/:id/produce` | Record produced quantity |

### Logistics & Finance
| Method | Endpoint | Notes |
|---|---|---|
| GET/POST | `/v1/shipments` | List (`?status=`) / Create |
| GET | `/v1/shipments/:id` | Detail |
| PATCH | `/v1/shipments/:id/status` | Transition status |
| PATCH | `/v1/shipments/:id/items/:itemId/pod` | Capture POD receiver name |
| GET/POST | `/v1/invoices` | List / Create |
| GET | `/v1/invoices/:id` | Detail with GST lines + payment history |
| PATCH | `/v1/invoices/:id/status` | Issue / Mark Paid / Cancel |
| GET/POST | `/v1/payments` | List / Create |
| GET/POST | `/v1/credit-notes` | List / Create |
| PATCH | `/v1/credit-notes/:id/apply` | Apply to invoice |
| PATCH | `/v1/credit-notes/:id/void` | Void |
| DELETE | `/v1/credit-notes/:id` | Delete |
| GET/POST | `/v1/fixed-assets` | List / Register |
| GET | `/v1/fixed-assets/summary` | Gross Block / Net Block KPIs |
| POST | `/v1/fixed-assets/:id/depreciate` | Record depreciation |
| PATCH | `/v1/fixed-assets/:id` | Update status |

### System / Analytics
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/v1/analytics/dashboard` | 6 KPI values for dashboard |
| GET | `/v1/analytics/revenue-trend` | Monthly revenue (`?months=N`) |
| GET | `/v1/analytics/sales-pipeline` | Value by SO status |
| GET | `/v1/analytics/top-clients` | Top N clients by revenue |
| GET | `/v1/analytics/top-products` | Top 5 products by revenue |
| GET | `/v1/analytics/ar-aging` | AR aging buckets |
| GET | `/v1/analytics/sales-leaderboard` | Sales rep performance |
| GET | `/v1/analytics/vendor-performance` | Vendor on-time rates |
| GET | `/v1/analytics/inventory-status` | Stock status counts |
| GET/POST | `/v1/users` | List / Create |
| PATCH | `/v1/users/:id` | Update user |
| GET | `/v1/users/:id/companies` | User's company access |
| POST/DELETE | `/v1/users/:id/companies/:cid` | Grant / Revoke company access |
| GET/PATCH | `/v1/settings/company` | Company settings |
| POST | `/v1/uploads/image` | Image upload → DO Spaces |
| POST | `/v1/uploads/file` | File attachment upload |
| GET | `/health` | Server health check |

---

## 6. Database Schema

All tables include `company_id` for multi-tenancy (except `users` and `companies`).

### Identity & Access
| Table | Key Columns |
|---|---|
| `users` | id, name, email, password_hash, role (admin/manager/sales/operations/finance), is_active, created_at |
| `companies` | id, name, gst_number, address, city, state, pincode, logo_url |
| `user_companies` | user_id, company_id, role |

### CRM
| Table | Key Columns |
|---|---|
| `clients` | id, company_id, company_name, contact_person, email, phone, gst_number, industry, tags, billing_address, shipping_address |
| `client_interactions` | id, client_id, type (call/email/meeting), notes, created_at |
| `contacts` | id, company_id, client_id, first_name, last_name, designation, department, email, phone, is_primary, notes |
| `leads` | id, company_id, title, client_id, company_name, contact_name, email, phone, source, status (new/qualified/proposal/negotiation/won/lost), estimated_value, owner_id, notes |
| `opportunities` | id, company_id, title, client_id, lead_id, stage (prospect/qualified/proposal/negotiation/closed_won/closed_lost), value, probability, expected_close_date, owner_id, notes |
| `quotes` | id, company_id, quote_number, subject, client_id, status (draft/sent/accepted/rejected/expired), discount_pct, gst_amount, total_amount, valid_until, payment_terms, notes, terms_and_conditions |
| `quote_items` | id, quote_id, product_id, description, quantity, unit_price, image_url |
| `activities` | id, company_id, type (follow-up/call/email/meeting/task), subject, description, due_date, completed_at, client_id, lead_id, owner_id |

### Catalog
| Table | Key Columns |
|---|---|
| `products` | id, company_id, name, sku, brand, product_type, category, hsn_code, gst_rate, uom, cost_price, selling_price, stock_level, low_stock_threshold, reorder_qty, brandable, vendor_id, image_url |
| `bundles` | id, company_id, name, description, occasion, image_url, is_active |
| `bundle_items` | id, bundle_id, product_id, quantity |
| `services` | id, company_id, name, type, sac_code, gst_rate, unit, unit_price, cost_estimate, description |
| `categories` | id, company_id, name, slug, description, hsn_code, icon, parent_id |
| `vendors` | id, company_id, name, contact_person, email, phone, gst_number, address, city, state, pincode, payment_terms, bank_account, lead_time_days |

### Sales & Orders
| Table | Key Columns |
|---|---|
| `sales_orders` | id, company_id, order_number, client_id, status, customer_po_number, occasion, delivery_date, payment_terms, discount_pct, subtotal, gst_amount, grand_total, notes |
| `sales_order_items` | id, sales_order_id, product_id, quantity, unit_price, total_price |
| `delivery_addresses` | id, sales_order_id, name, phone, address, city, pincode |
| `order_processing_forms` | id, company_id, sales_order_id, form_data (JSONB), created_at, updated_at |
| `purchase_orders` | id, company_id, po_number, vendor_id, sales_order_id, status (draft/sent/partial/received/cancelled), expected_delivery, total_amount |
| `purchase_order_items` | id, purchase_order_id, product_id, quantity, unit_cost, received_qty |
| `sample_orders` | id, company_id, sample_number, client_id, customer_name, customer_phone, customer_email, status, notes |
| `sample_order_items` | id, sample_order_id, product_id, quantity, notes |

### Warehouse & Inventory
| Table | Key Columns |
|---|---|
| `warehouses` | id, company_id, name, address |
| `warehouse_locations` | id, company_id, name, code, zone, bin, type, capacity, notes |
| `inventory` | id, company_id, product_id, location_id, quantity, reserved_qty |
| `inventory_movements` | id, company_id, product_id, location_id, type (grn/outward/transfer_in/transfer_out/assembly_in/assembly_out/adjustment), quantity, batch_number, reference, created_at |
| `inventory_transfers` | id, company_id, from_location_id, to_location_id, reference, status (in_transit/completed) |
| `inventory_transfer_items` | id, transfer_id, product_id, quantity |
| `goods_receipts` | id, company_id, grn_number, purchase_order_id, vendor_id, received_date, notes, status |
| `goods_receipt_items` | id, grn_id, product_id, quantity_received, quantity_rejected, remarks |

### Operations
| Table | Key Columns |
|---|---|
| `assembly_jobs` | id, company_id, sales_order_id, status (pending/in_progress/completed/rejected), total_kits, kits_completed, notes |
| `artwork_approvals` | id, company_id, client_id, sales_order_id, asset_name, asset_url, status (Pending/Client Approved/Sent to Vendor/Completed), notes |
| `production_orders` | id, company_id, production_number, product_id, quantity, quantity_produced, status (draft/in_progress/completed/cancelled), planned_date, notes |
| `production_materials` | id, production_order_id, product_id, required_qty |

### Logistics & Finance
| Table | Key Columns |
|---|---|
| `shipments` | id, company_id, shipment_number, sales_order_id, courier, tracking_number, status (pending/dispatched/in_transit/delivered), freight_cost, boxes_count, total_weight, estimated_delivery |
| `shipment_items` | id, shipment_id, delivery_address_id, pod_receiver_name, pod_captured_at |
| `invoices` | id, company_id, invoice_number, client_id, sales_order_id, status (draft/issued/partially_paid/paid/overdue/cancelled), due_date, payment_terms, subtotal, cgst, sgst, igst, round_off, total_amount, paid_amount |
| `invoice_lines` | id, invoice_id, product_id, description, hsn_code, quantity, unit_price, gst_rate, taxable_amount, gst_amount |
| `payments` | id, company_id, receipt_number, invoice_id, client_id, amount, type (advance/full/partial), mode (UPI/NEFT/RTGS/Cheque/Cash/Card), reference_number, payment_date, notes |
| `credit_notes` | id, company_id, cn_number, invoice_id, client_id, amount, reason, status (open/applied/voided) |
| `fixed_assets` | id, company_id, asset_code, name, category, serial_number, purchase_date, purchase_cost, useful_life, depreciation_method (straight_line/reducing_balance), residual_value, accumulated_depreciation, status (active/under_maintenance/disposed), location |

### System
| Table | Key Columns |
|---|---|
| `number_sequences` | company_id, doc_type (SO/PO/INV/GRN/CN/SAMPLE/QUOTE), fy_label, last_number |
| `audit_logs` | id, user_id, action, entity_type, entity_id, created_at |
| `company_settings` | company_id, key, value |

---

## 7. Key Business Workflows

### End-to-End Order Lifecycle
```
Lead captured (Leads page)
  → Converted to Opportunity
    → Quote created + sent to client
      → Quote accepted → Sales Order auto-created
        → Order Processing Form filled:
            Tab 1: Order Info + SO Items (branding, sources)
            Tab 2: Procurement details
            Tab 3: Designer attachments + approvals
            Tab 4: Production QC sign-offs
            Tab 5: Dispatch details
            Tab 6: Checklist (stock check per product)
          → Artwork uploaded and approved
            → Assembly Job created (backflushes stock on completion)
            → Purchase Order raised if stock needed
              → GRN received → inventory updated
            → Shipment dispatched → Delivery Challan printed
              → POD captured per delivery address
                → Invoice raised → Payment recorded
```

### Inventory Flow
```
Vendor → Purchase Order → GRN → Inventory inward
Inventory → Assembly Job → Bundle stock (backflush on complete)
Inventory → Production Order → Finished good added
Inventory → Transfer → Another location (in transit → received)
Inventory → Sales/Dispatch → Outward movement
```

### Lead Conversion Paths
```
Lead (Leads page)
  → "Convert to Opportunity" → creates an Opportunity
  → "Convert to Client" → creates a Client (or links to existing)
  → "Create Quote" → navigates to Quotes with client pre-selected
  → "Schedule Follow-up" → creates an Activity
```

---

## 8. Default Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@gifterp.com | admin123 |
| Manager | manager@gifterp.com | manager123 |
| Sales | sales@gifterp.com | sales123 |
| Operations | ops@gifterp.com | ops123 |
| Finance | finance@gifterp.com | finance123 |

---

## 9. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✓ | PostgreSQL connection string |
| `SESSION_SECRET` | ✓ | Secret for signing JWT sessions |
| `DO_SPACES_SECRET_KEY` | For uploads | DigitalOcean Spaces secret key (image/file uploads) |
| `PORT` | Auto-assigned | Port for each artifact service (Replit assigns per-artifact) |
| `BASE_PATH` | Auto-assigned | URL base path for the frontend artifact |

---

## 10. UI Patterns & Conventions

| Pattern | Implementation |
|---|---|
| Empty state | Icon (muted, 30% opacity) + message + "Add first X" button |
| Skeleton loading | `Skeleton` component placeholders matching final layout |
| Confirmation dialogs | `AlertDialog` for destructive actions (delete, cancel, void) |
| Side sheets | `Sheet` for detail views and edit forms that benefit from context |
| Toasts | Success/error toasts via `useToast()` after every mutation |
| Radix Select empty value | `"__none__"` sentinel (never `""` — crashes Radix UI) |
| Navigation | `useLocation()` from wouter; `navigate("/path")` for programmatic nav |
| Auth header | All API calls via `api()` helper in `src/lib/api.ts` which adds `Authorization: Bearer <token>` |
| Multi-tenant scoping | All DB queries filter by `companyId` from the active session |
| Print | `window.print()` with inline A4 HTML; print CSS hides UI chrome |

---

*Generated: July 2026 — Customize Duniya Corporate Gifting ERP v1.0*
