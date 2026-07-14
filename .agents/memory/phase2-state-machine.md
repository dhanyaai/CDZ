---
name: Phase 2 state machine & GRN design
description: Key design decisions for SO/PO state machines, stock reservation, gapless numbers, GRN flow
---

## SO number assignment
SO number is assigned at **creation** time (in the POST /sales-orders transaction using nextDocNumber).
`confirmSO` must NOT regenerate the number — doing so created a bug where confirmation overwrote the creation number.

**Why:** Gapless sequences matter most for GST invoices. SO gaps (from draft→cancelled) are acceptable. Simpler to assign at creation and never change it.

## Stock reservation
- `confirmSO`: reserves stock per item in a DB transaction (UPDATE products SET reservedQty = reservedQty + qty)
- `cancelSO`: releases stock in a DB transaction (UPDATE products SET reservedQty = reservedQty - qty), floored at 0
- Products API returns `reservedQty` and `availableQty` (stockLevel - reservedQty)

## GRN atomic posting (grnService.postGRN)
All steps happen in ONE transaction:
1. nextDocNumber → GRN/FY/NNNN
2. INSERT grn + grnItems
3. UPDATE products.stockLevel += quantityReceived per item
4. UPDATE po_items.receivedQty += quantityReceived per item
5. Re-check all PO items: if all fully received → "Fully Received", else → "Partially Received"

## numberSequence
`nextDocNumber(txOrDb, companyId, docType, prefix, fyStartMonth)` — accepts a Drizzle tx or db instance.
Must always be called **inside** the same transaction as the document INSERT to prevent gaps on rollback.

## validTransitions
Both SO list and SO detail routes return `validTransitions: string[]` derived from the state machine transition map.
Frontend uses this array to render action buttons (no free-form status dropdowns).

## GRN route path
GRN endpoint is at `/api/v1/grn` (operations router registers `/v1/grn`), NOT `/api/v1/operations/grn`.
