---
name: ERP module audit results
description: Results of full 35-page audit of Customize Duniya ERP; which pages needed fixes and what was done
---

## Audit outcome (July 2026)

All 35 pages audited. 23 confirmed complete; 6 fixed with DB+API+UI changes.

## Pages confirmed complete (no changes needed)
sales-orders, sales-order-detail, invoices, quotes, leads, opportunities, inventory, vendors, clients, contacts, users, companies, settings, reports, dashboard, followups, grn, purchase-orders, purchase-order-detail, bundles, locations, item-ledger, pdf-extractor, sample-orders, production-orders, transfers, fixed-assets

## Pages fixed

### payments.tsx
- Added `paymentMode` (UPI/NEFT/RTGS/IMPS/Cash/Cheque/Bank Transfer) + `referenceNo` (UTR)
- DB: `payment_mode`, `reference_no` columns added to `paymentsTable`
- UI: 3 stats cards (total collected, count, avg); Mode badge column; UTR/Ref# column
- **Why**: Bank reconciliation in India requires knowing exact payment channel and transaction ID

### shipments.tsx
- Added `estimatedDelivery`, `numberOfBoxes`, `totalWeight`
- DB: 3 new columns in `shipmentsTable`
- UI: new form fields; new table columns; print delivery challan button
- **Why**: Logistics requires est. delivery for tracking; boxes+weight for couriers and loading

### assembly.tsx
- Added `notes` field to create form (column existed in DB, just wasn't in UI)
- Added kits-completed quick-update dialog (gauge icon on In Progress rows, calls PATCH /v1/assembly/:id)
- **Why**: Notes were silently dropped on create; no way to track partial kit completion without binary status change

### artwork.tsx
- Replaced raw number input for `salesOrderId` with proper Select dropdown using `useListSalesOrders`
- **Why**: Users had to know the SO ID by heart — unusable UX

### categories.tsx
- Added `hsnCode` (HSN/SAC) field to form and card display
- DB: `hsn_code` column added to `categoriesTable`
- **Why**: Indian GST compliance requires HSN/SAC codes on invoices per product category

### credit-notes.tsx
- Replaced reason free-text with predefined Select (Product Return / Price Dispute / Defective+Damaged / Short Supply / Wrong Product / Other)
- Added Status column to the table
- **Why**: Free text for reason makes reporting impossible; status was stored but not visible
