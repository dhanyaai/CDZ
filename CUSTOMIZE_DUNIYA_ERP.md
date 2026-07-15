# Customize Duniya — Corporate Gifting ERP
## Complete Application Documentation

---

## 1. Application Overview

**Customize Duniya ERP** is a full-stack, multi-tenant Enterprise Resource Planning system purpose-built for corporate gifting businesses. It covers the entire order lifecycle — from lead capture and quoting through production, fulfillment, logistics, and invoicing — in a single unified workspace.

### Core Capabilities
- Multi-tenant (multiple companies / branches in one system)
- Role-based access control (Admin, Manager, Sales, Operations, Finance)
- Full CRM: leads → opportunities → quotes → sales orders
- Product catalog with bundles, variants, and smart costing
- Inventory management across multiple warehouse locations
- Production and assembly job tracking
- Logistics with delivery challans and courier tracking
- GST-compliant invoicing, payments, and credit notes
- Analytics and reporting dashboard
- Built-in PDF tools for vendor invoice extraction

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS v4, shadcn/ui (Radix UI) |
| Routing | Wouter |
| Data fetching | TanStack Query (React Query) |
| Backend | Express 5, Node.js 24 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod (v4), drizzle-zod |
| API contract | OpenAPI spec + Orval codegen |
| Build | esbuild (server), Vite (client) |
| Monorepo | pnpm workspaces |

---

## 3. Navigation Structure

The left sidebar is organized into functional modules:

| Group | Pages |
|---|---|
| Overview | Dashboard |
| CRM | Clients, Contacts, Leads, Opportunities, Quotes, Follow-ups |
| Catalog | Products, Bundles, Bundle Costing, Services, Categories |
| Orders | Sales Orders, Order Processing, Sample Orders, Purchase Orders, Vendors |
| Operations | Inventory, Item Ledger, Transfers, Locations, Goods Receipts, Assembly, Artwork, Production |
| Logistics | Shipments |
| Finance | Invoices, Payments, Credit Notes, Fixed Assets, Reports |
| Admin | Users, Companies, Settings |
| Tools | PDF Image Extractor |

The layout includes:
- Collapsible sidebar with icon-only mode
- Company switcher (multi-tenant)
- Global search (Cmd+K)
- Light / dark theme toggle
- Notification bell

---

## 4. Page-by-Page Reference

---

### 4.1 Login
**URL:** `/login`

The secure entry point. Features a split-screen layout with a branded hero panel on the left and the sign-in form on the right.

**Features:**
- Email + password authentication
- JWT token stored in `localStorage`
- Auto-redirect to dashboard after login
- Demo credentials shown on screen (`admin@gifterp.com / admin123`)

---

### 4.2 Dashboard
**URL:** `/dashboard`

High-level business health overview for owners and managers.

**Features:**
- KPI cards: Total Revenue, Active Leads, Pending Orders, Open Invoices
- Revenue trend chart (line graph, monthly)
- Sales pipeline summary
- Recent activity feed
- Quick-action buttons to common workflows

---

### 4.3 Clients
**URL:** `/clients`

Central CRM hub for managing corporate gifting client accounts.

**Features:**
- Searchable, filterable client list
- Client cards showing company name, contact person, phone, GST number, city
- New Client dialog (company name, contact, email, phone, billing address, GST, segment)
- Edit / delete existing clients
- Click-through to Client Detail page

---

### 4.4 Client Detail
**URL:** `/clients/:id`

Full 360° view of a single client account.

**Features:**
- Client profile header (name, GST, address, segment)
- Tabbed sections:
  - **Overview** — key contacts, recent interactions, total order value
  - **Sales Orders** — all orders placed by this client with status badges
  - **Contacts** — individual contact persons linked to this company
  - **Interactions** — call/email/meeting log with timestamps
- Add interaction button (type, notes, date)

---

### 4.5 Contacts
**URL:** `/contacts`

Flat list of individual contact persons across all client companies.

**Features:**
- Search by name, email, phone
- Shows linked client company
- Add / edit / delete contacts
- Contact role and department fields

---

### 4.6 Leads
**URL:** `/leads`

Sales pipeline management for prospective clients.

**Features:**
- **Kanban board** with swim lanes: New → Contacted → Qualified → Proposal → Won / Lost
- Drag-and-drop cards between stages
- Lead cards show: company name, estimated budget, source (Referral, LinkedIn, etc.)
- Create lead dialog with full fields
- Convert lead to Client with one click
- Filter by assigned salesperson

---

### 4.7 Opportunities
**URL:** `/opportunities`

Tracks high-probability deals with detailed requirement fields.

**Features:**
- List view with probability %, estimated value, expected close date
- Linked to a client and a lead (optional)
- Notes and requirement description fields
- Status badges (Open, Won, Lost)
- Editable inline or via side sheet

---

### 4.8 Quotes
**URL:** `/quotes`

Quotation management — create, version, and convert quotes to sales orders.

**Features:**
- Quote list with client, total value, status (Draft, Sent, Accepted, Rejected)
- Line-item editor: add products/services with qty and unit price
- GST calculation (CGST + SGST or IGST based on supply type)
- Discount percentage field
- Convert accepted quote to Sales Order in one click
- Print / PDF export of quote

---

### 4.9 Follow-ups
**URL:** `/follow-ups`

Task manager for tracking sales activities (calls, emails, meetings).

**Features:**
- Three sections: **Overdue**, **Today**, **Upcoming**
- Each follow-up linked to a client or lead
- Type indicator: Call, Email, WhatsApp, Meeting, Visit
- Mark as Done / Snooze
- Create new follow-up with due date and note
- Filter by assigned user

---

### 4.10 Products
**URL:** `/products`

Master product catalog for all giftable items.

**Features:**
- Product list with image thumbnail, SKU, category, stock level, unit price
- Search by name or SKU
- Filter by category
- Create / edit product dialog:
  - Name, SKU, HSN code, UOM (PCS, SET, BOX, etc.)
  - GST rate (0%, 5%, 12%, 18%, 28%)
  - Buying price, MRP, selling price
  - Image URL upload
  - Brand, product type, vendor link
- Import products via CSV
- Stock level badge (In Stock / Low Stock / Out of Stock)

---

### 4.11 Bundles
**URL:** `/bundles`

Management of pre-configured gift sets composed of multiple products.

**Features:**
- Bundle list with component count and total cost
- Create / edit bundle with line-item product picker
- **Smart Suggest** — enter a target budget; AI-style engine suggests products that fit
- Quantity per bundle for each component
- Link to Bundle Costing for margin analysis
- Active / Inactive toggle

---

### 4.12 Bundle Costing
**URL:** `/bundle-costing`

Financial breakdown and margin analysis for all bundles.

**Features:**
- Cost summary table: item cost, packaging, branding, overhead
- Selling price input → auto-calculated margin %
- GST impact view
- Compare multiple bundles side by side
- Export costing sheet

---

### 4.13 Services
**URL:** `/services`

Catalog of non-inventory billable services (printing, embroidery, logistics, design).

**Features:**
- Service list with name, unit, rate per unit
- Create / edit / delete services
- Services are selectable as line items in Quotes and Invoices

---

### 4.14 Categories
**URL:** `/categories`

Hierarchical product category management.

**Features:**
- Tree view of parent → child categories
- Create / rename / delete categories
- Used as filters across the Products and Bundles pages

---

### 4.15 Artwork
**URL:** `/artwork`

Tracking of client branding assets and approval workflows.

**Features:**
- Approval list per Sales Order
- Status pipeline: **Pending → Client Review → Approved / Revision Required**
- Upload logo / design file URL
- Link to specific client and order
- Notes / revision comments
- Timestamps for each status change

---

### 4.16 Assembly
**URL:** `/assembly`

Production floor management for physically assembling bundle gift sets.

**Features:**
- Assembly Job list with linked Sales Order, bundle, target quantity
- Status: Pending → In Progress → Completed
- Component requirement checklist (auto-generated from bundle BOM)
- Mark individual components as picked
- Notes and completion date fields

---

### 4.17 Production Orders
**URL:** `/production`

High-level manufacturing planning for custom-produced items.

**Features:**
- Production order list with product, quantity, target date
- Material requirement tracking
- Status: Planned → In Production → Quality Check → Done
- Link to Sales Order for traceability

---

### 4.18 Sample Orders
**URL:** `/sample-orders`

Specialized workflow for sending product samples to prospective clients.

**Features:**
- Sample order list with client, products, dispatch date
- Status: Requested → Dispatched → Received → Approved / Rejected
- Courier tracking number field
- Linked to Lead or Opportunity
- Follow-up action trigger on rejection

---

### 4.19 Sales Orders
**URL:** `/sales-orders`

The central hub for all confirmed client orders.

**Features:**
- Order list with SO number, client, order value, status badge, delivery date
- Filter by status (Draft, Confirmed, In Production, Ready, Shipped, Delivered, Cancelled)
- Create new Sales Order:
  - Client selection
  - Add multiple product line items (qty, unit price)
  - Delivery date, payment terms, PO number
  - Multiple delivery addresses
  - Discount %, GST calculation, grand total
- Click-through to Sales Order Detail

---

### 4.20 Sales Order Detail
**URL:** `/sales-orders/:id`

Full view of a single Sales Order with lifecycle management.

**Features:**
- Order header: SO number, client, dates, totals, GST breakdown
- Line items table with product thumbnails, qty, unit price, total
- Delivery addresses list
- **Status transition buttons** — move order through lifecycle stages:
  - Draft → Confirm → In Production → Ready → Ship → Deliver
- Link to create Purchase Order from this SO
- Link to Order Processing form
- Link to create Invoice
- Link to create Shipment

---

### 4.21 Order Processing List
**URL:** `/order-processing`

Operational queue for the fulfillment team showing orders that need processing.

**Features:**
- List of confirmed SOs with processing status
- Filter: pending forms vs. completed
- Quick-access link to open the processing form for each order
- Shows delivery date, client name, and order total

---

### 4.22 Order Processing (Form)
**URL:** `/order-processing/:salesOrderId`

The main operational workspace for preparing a specific order for fulfillment.

**Tabs:**

#### Order Info
- **Confirmed Order Date** — auto-filled from the SO creation date (read-only)
- **Order By** — salesperson dropdown
- **Firm / Company Name**, POC Name, POC Contact
- Checkboxes: Logo Files Received, CD Tape, CD Sticker, Thank You Card, Branding Required
- Branding Position & Size text field
- Production Type: In-House / Out-Source
- Invoice Method: Invoice / Cash
- Total Amount, Advance Received, Balance Amount
- More Information free-text field
- **Sales Order Items table** — product thumbnail (clickable for lightbox), product name, qty, branding method dropdown, product source dropdown, production source dropdown

#### Procurement
- Procurement date and time
- Material Received checkbox
- Supplier name, contact, address

#### Designer
- Designer attachment uploads (drag-and-drop / file picker)
- Notes for the design team

#### Production
- Production start date, expected completion
- Production notes
- Quality check fields

#### Dispatch
- Courier partner, AWB number
- Dispatch date, delivery date
- Driver / delivery partner details

#### Checklist (Check List)
- Dynamic rows, each with:
  - **Product image thumbnail** (auto-shows from catalog)
  - Product Name dropdown (linked to product catalog)
  - Inhouse Avail. QTY (auto-filled from stock level)
  - Procure QTY
  - Total Receive or Not & Date
- Add Row / Remove Row
- "+ Add Row" button

**Actions:**
- **Print** — generates a print-ready A4 HTML page with all form data, SO items with product images, and the checklist
- **Save Form / Update Form** — saves all tab data to the database

**Lightbox:** Clicking any product image in the SO Items table opens a fullscreen modal showing the enlarged image, product name, quantity, unit price, and total price.

---

### 4.23 Purchase Orders
**URL:** `/purchase-orders`

Procurement tracking for ordering stock from vendors.

**Features:**
- PO list with PO number, vendor, total, status, expected delivery
- Filter by status (Draft, Sent, Partial, Received, Cancelled)
- Create PO: select vendor, add line items (product, qty, unit cost), link to SO (optional)
- Status progression buttons
- Click-through to Purchase Order Detail

---

### 4.24 Purchase Order Detail
**URL:** `/purchase-orders/:id`

Tracks the receiving status of items in a PO.

**Features:**
- PO header with vendor details and totals
- Line item table showing: product, ordered qty, received qty, pending qty
- Status per line: Pending, Partial, Fully Received
- Link to create GRN for this PO

---

### 4.25 Vendors
**URL:** `/vendors`

Supplier / vendor management.

**Features:**
- Vendor list with name, contact person, phone, email, GST number
- Payment terms (Net 7 / 15 / 30 / 45 / 60), lead time in days
- Bank details fields (for NEFT payments)
- Create / edit / delete vendors
- Linked products view (which products this vendor supplies)

---

### 4.26 Goods Receipts (GRN)
**URL:** `/grn`

Official recording of incoming stock from vendors.

**Features:**
- GRN list with GRN number, linked PO, vendor, date
- Create GRN against a PO:
  - Auto-populated line items from PO
  - Enter actually received quantities per item
  - Batch / lot number, expiry date (if applicable)
- On save, stock levels are automatically updated in inventory
- Print GRN document

---

### 4.27 Inventory
**URL:** `/inventory`

Real-time stock tracking across all warehouse locations.

**Features:**
- Stock balance table: product, location, current stock, reserved stock, available stock
- Filter by product or location
- **Inward movement** — add stock manually (with reason and reference)
- **Outward movement** — reduce stock manually
- Movement history log with timestamps and references
- Low-stock alerts (highlighted rows)

---

### 4.28 Item Ledger
**URL:** `/item-ledger`

Chronological audit trail for a specific product's stock movements.

**Features:**
- Product selector
- Date range filter
- Movement table: date, type (GRN / Sale / Transfer / Adjustment), qty in, qty out, running balance
- Reference links (click to open the originating document)

---

### 4.29 Transfers
**URL:** `/transfers`

Inter-location inventory movement management.

**Features:**
- Transfer list with source location, destination, products, date, status
- Create transfer: pick source warehouse, destination, product, qty
- Status: Pending → In Transit → Received
- Stock automatically adjusts at both locations on completion

---

### 4.30 Locations
**URL:** `/locations`

Management of physical storage locations (warehouses, racks, bins).

**Features:**
- Location list with name, type (Warehouse, Rack, Bin), parent location
- Hierarchical structure support
- Create / edit / delete locations
- Inventory balance shown per location

---

### 4.31 Shipments
**URL:** `/shipments`

End-to-end logistics management.

**Features:**
- Shipment list with shipment number, linked SO, courier, AWB, status
- Courier partners: BlueDart, Delhivery, DTDC, FedEx, Ekart, Hand Delivery
- Status: Pending → Dispatched → In Transit → Delivered
- **Delivery Challan** generation (print-ready PDF with product list, delivery address, driver details)
- POD (Proof of Delivery) upload URL
- Multiple delivery addresses from the SO

---

### 4.32 Invoices
**URL:** `/invoices`

GST-compliant tax invoice management.

**Features:**
- Invoice list with invoice number, client, amount, due date, payment status
- Status: Draft, Sent, Partially Paid, Paid, Overdue, Cancelled
- Create invoice: link to SO, auto-populate line items, apply GST rates
- CGST / SGST / IGST breakdown
- Due date and payment terms
- **Tax Invoice PDF** generation (print-ready)
- Link to record a payment against an invoice

---

### 4.33 Payments
**URL:** `/payments`

Recording and tracking of client payment receipts.

**Features:**
- Payment list with date, client, amount, mode, reference number
- Payment modes: UPI, NEFT, RTGS, Cheque, Cash, Card
- Link payment to one or more invoices
- Running outstanding balance per client
- Bank reconciliation reference fields

---

### 4.34 Credit Notes
**URL:** `/credit-notes`

Handling returns, adjustments, and financial corrections.

**Features:**
- Credit note list with CN number, linked invoice, client, amount
- Create credit note: select invoice, specify reason and amount
- Apply credit note to reduce outstanding on a future invoice
- Print credit note document

---

### 4.35 Fixed Assets
**URL:** `/fixed-assets`

Internal company asset tracking and depreciation management.

**Features:**
- Asset list: name, category, purchase date, purchase cost, current value
- Depreciation method (Straight Line / Written Down Value)
- Useful life and residual value fields
- Accumulated depreciation calculation
- Asset status: Active, Disposed, Under Repair

---

### 4.36 Reports
**URL:** `/reports`

Analytics and business intelligence.

**Features:**
- **Sales Report** — revenue by period, by client, by product
- **Inventory Report** — stock valuation, turnover rate
- **Financial Summary** — invoiced vs collected, outstanding receivables
- **GST Report** — CGST/SGST/IGST breakdowns for filing
- Date range filters
- Export to Excel

---

### 4.37 Users
**URL:** `/users`

System user management (Admin only).

**Features:**
- User list with name, email, role, status
- Roles: Admin, Manager, Sales, Operations, Finance
- Create / edit / deactivate users
- Assign users to companies (multi-tenant)
- Password reset trigger

---

### 4.38 Companies
**URL:** `/companies`

Multi-entity / branch management.

**Features:**
- Company list with name, GST number, state, logo
- Switch active company from the sidebar company picker
- Create new company (new tenant)
- Company-level settings and feature flags

---

### 4.39 Settings
**URL:** `/settings`

Company-level configuration.

**Features:**
- Company profile: name, GST number, address, logo URL
- Document number prefixes: SO-, PO-, INV-, GRN-, CN-
- Financial year label
- Default GST rates
- Currency and locale settings
- Branding / theme preferences

---

### 4.40 PDF Image Extractor
**URL:** `/pdf-extractor`

Built-in utility tool for processing vendor or client PDFs.

**Features:**
- Upload a PDF file
- **Image extraction mode** — extracts all embedded images from the PDF, shows them as a grid, allows individual download or bulk ZIP download
- **Excel conversion mode** — parses tables and text from the PDF, maps columns (product name, qty, price), exports to `.xlsx`
- `[Photo]` placeholder detection — identifies image positions in the PDF and marks them in the Excel output
- Powered by `pdfjs-dist` (runs entirely in the browser, no server upload required)

---

## 5. API Endpoints Summary

All endpoints are prefixed `/api/v1/` and require a Bearer token (except `/v1/auth/login`).

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/v1/auth/login` | Login with email + password, returns JWT |
| GET | `/v1/auth/me` | Get current user profile |
| POST | `/v1/auth/logout` | Invalidate session |

### Companies
| Method | Endpoint | Description |
|---|---|---|
| GET | `/v1/companies` | List all companies for current user |
| POST | `/v1/companies` | Create new company |
| PATCH | `/v1/companies/:id` | Update company details |
| POST | `/v1/companies/:id/switch` | Switch active company |

### CRM
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/v1/clients` | List / create clients |
| GET/PATCH/DELETE | `/v1/clients/:id` | Get / update / delete client |
| GET/POST | `/v1/clients/:id/interactions` | Client interaction log |
| GET/POST | `/v1/contacts` | Contacts list / create |
| GET/POST | `/v1/leads` | Leads list / create |
| PATCH | `/v1/leads/:id` | Update lead (including stage) |
| POST | `/v1/leads/:id/convert` | Convert lead to client |
| GET/POST | `/v1/opportunities` | Opportunities list / create |
| GET/POST | `/v1/quotes` | Quotes list / create |
| PATCH | `/v1/quotes/:id` | Update quote |

### Catalog
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/v1/products` | Products list / create |
| PATCH/DELETE | `/v1/products/:id` | Update / delete product |
| POST | `/v1/products/import` | CSV import |
| GET/POST | `/v1/bundles` | Bundles list / create |
| GET | `/v1/bundles/costing` | Bundle cost breakdown |
| GET | `/v1/bundles/suggest` | Smart bundle suggestion |
| GET/POST | `/v1/services` | Services list / create |
| GET/POST | `/v1/categories` | Categories list / create |

### Orders
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/v1/sales-orders` | SO list / create |
| GET/PATCH | `/v1/sales-orders/:id` | SO detail / update |
| PATCH | `/v1/sales-orders/:id/status` | Transition SO status |
| GET/POST | `/v1/purchase-orders` | PO list / create |
| GET/PATCH | `/v1/purchase-orders/:id` | PO detail / update |
| GET/POST | `/v1/sample-orders` | Sample order list / create |
| GET | `/v1/order-processing` | Get processing form for SO |
| POST | `/v1/order-processing` | Save / update processing form |
| GET | `/v1/order-processing/list` | List all processing forms |

### Operations
| Method | Endpoint | Description |
|---|---|---|
| GET | `/v1/inventory` | Stock balances |
| POST | `/v1/inventory/inward` | Record inward movement |
| POST | `/v1/inventory/outward` | Record outward movement |
| GET | `/v1/inventory/movements` | Movement history |
| GET | `/v1/inventory/ledger` | Item ledger |
| GET/POST | `/v1/grn` | GRN list / create |
| GET/POST | `/v1/assembly` | Assembly jobs list / create |
| PATCH | `/v1/assembly/:id` | Update assembly job |
| GET/POST | `/v1/artwork` | Artwork approvals list / create |
| PATCH | `/v1/artwork/:id` | Update artwork status |
| GET/POST | `/v1/production-orders` | Production orders list / create |

### Logistics & Finance
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/v1/shipments` | Shipments list / create |
| PATCH | `/v1/shipments/:id` | Update shipment (status, AWB) |
| GET/POST | `/v1/invoices` | Invoices list / create |
| PATCH | `/v1/invoices/:id` | Update invoice |
| GET/POST | `/v1/payments` | Payments list / create |
| GET/POST | `/v1/credit-notes` | Credit notes list / create |
| GET/POST | `/v1/fixed-assets` | Fixed assets list / create |
| GET | `/v1/reports` | Financial and sales reports |

### System
| Method | Endpoint | Description |
|---|---|---|
| GET | `/v1/analytics/dashboard` | KPI summary data |
| GET | `/v1/analytics/revenue-trend` | Monthly revenue chart data |
| GET | `/v1/users` | User list |
| POST | `/v1/users` | Create user |
| GET | `/v1/vendors` | Vendors list |
| POST | `/v1/vendors` | Create vendor |
| POST | `/v1/uploads/image` | Upload product image |
| POST | `/v1/uploads/file` | Upload attachment file |
| GET | `/health` | Server health check |

---

## 6. Database Schema Summary

All tables are scoped by `company_id` for multi-tenancy.

### Identity & Access
| Table | Key Columns |
|---|---|
| `users` | id, name, email, password_hash, role, created_at |
| `companies` | id, name, gst_number, address, state, logo_url |
| `user_companies` | user_id, company_id, role |

### CRM
| Table | Key Columns |
|---|---|
| `clients` | id, company_name, contact_person, email, phone, gst_number, billing_address, segment |
| `client_interactions` | id, client_id, type, notes, created_at |
| `contacts` | id, client_id, name, email, phone, designation |
| `leads` | id, company_name, contact_name, source, budget, stage, assigned_to |
| `opportunities` | id, client_id, title, value, probability, expected_close_date, status |
| `quotes` | id, client_id, status, discount_pct, gst_amount, grand_total |
| `quote_items` | id, quote_id, product_id, quantity, unit_price |

### Catalog
| Table | Key Columns |
|---|---|
| `products` | id, name, sku, hsn_code, uom, gst_rate, buying_price, mrp, selling_price, image_url, stock_level |
| `bundles` | id, name, description, is_active |
| `bundle_items` | id, bundle_id, product_id, quantity |
| `services` | id, name, unit, rate |
| `categories` | id, name, parent_id |
| `vendors` | id, name, contact_person, email, phone, gst_number, payment_terms, lead_time_days |

### Sales & Orders
| Table | Key Columns |
|---|---|
| `sales_orders` | id, order_number, client_id, status, total_amount, gst_amount, grand_total, delivery_date, po_number |
| `sales_order_items` | id, sales_order_id, product_id, quantity, unit_price |
| `delivery_addresses` | id, sales_order_id, name, address, city, pincode, phone |
| `order_processing_forms` | id, sales_order_id, form_data (JSONB), created_at, updated_at |
| `purchase_orders` | id, po_number, vendor_id, sales_order_id, status, total_amount |
| `purchase_order_items` | id, purchase_order_id, product_id, quantity, unit_cost, received_qty |
| `sample_orders` | id, client_id, status, dispatch_date, courier, tracking_number |

### Warehouse & Inventory
| Table | Key Columns |
|---|---|
| `warehouses` | id, name, address |
| `warehouse_locations` | id, warehouse_id, name, type, parent_id |
| `inventory` | id, product_id, location_id, quantity, reserved_qty |
| `inventory_movements` | id, product_id, location_id, type, quantity, reference, created_at |
| `goods_receipts` | id, grn_number, purchase_order_id, vendor_id, received_date |
| `goods_receipt_items` | id, grn_id, product_id, received_qty, batch_number |

### Operations
| Table | Key Columns |
|---|---|
| `assembly_jobs` | id, sales_order_id, bundle_id, quantity, status |
| `assembly_items` | id, job_id, product_id, required_qty, picked_qty |
| `artwork_approvals` | id, sales_order_id, client_id, status, file_url, notes |
| `production_orders` | id, product_id, quantity, start_date, end_date, status |

### Logistics & Finance
| Table | Key Columns |
|---|---|
| `shipments` | id, shipment_number, sales_order_id, courier, awb_number, status, dispatch_date |
| `invoices` | id, invoice_number, client_id, sales_order_id, status, due_date, total_amount, paid_amount |
| `invoice_lines` | id, invoice_id, product_id, description, quantity, unit_price, gst_rate |
| `payments` | id, invoice_id, client_id, amount, mode, reference_number, paid_at |
| `credit_notes` | id, cn_number, invoice_id, client_id, amount, reason |
| `fixed_assets` | id, name, category, purchase_date, purchase_cost, useful_life, depreciation_method |

### System
| Table | Key Columns |
|---|---|
| `number_sequences` | company_id, doc_type, fy_label, last_number |
| `audit_logs` | id, user_id, action, entity_type, entity_id, created_at |
| `company_settings` | company_id, key, value |

---

## 7. Key Workflows

### End-to-End Order Lifecycle
```
Lead captured
  → Opportunity created
    → Quote sent to client
      → Quote accepted → Sales Order created
        → Order Processing Form filled
          → Artwork approved
            → Assembly / Production started
              → Purchase Order raised (if stock needed)
                → GRN received → Stock updated
              → Shipment dispatched → Delivery Challan printed
                → Invoice raised → Payment collected
```

### Inventory Flow
```
Vendor → Purchase Order → GRN → Inventory (inward)
Inventory → Assembly Job → Bundle (stock added)
Inventory → Sales Order → Shipment (outward)
Inventory → Transfer → Another Location
```

### Order Processing Form Flow
```
Open Order Processing for SO
  → Fill Order Info tab (auto-confirmed date, branding, amounts)
  → Fill Procurement tab (supplier, materials)
  → Upload Designer attachments
  → Fill Production / Dispatch tabs
  → Complete Checklist tab (product images auto-shown)
  → Print form (generates A4 PDF with product images)
  → Save
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

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (required) |
| `SESSION_SECRET` | Secret for signing sessions |
| `DO_SPACES_SECRET_KEY` | DigitalOcean Spaces secret (for file uploads) |
| `PORT` | Port for each artifact service (auto-assigned by Replit) |
| `BASE_PATH` | URL base path for the frontend artifact |

---

*Generated: July 2026 — Customize Duniya Corporate Gifting ERP*
