---
name: Print template escaping
description: Rule for interpolating values into print-window HTML templates in the ERP frontend
---
Print utilities build HTML strings via template literals and write them into a same-origin window (document.write + window.print). Any user-controlled value interpolated there is a stored-XSS vector.

**Rule:** wrap every string field in the `esc()` helper (defined in the print utils file) when adding or editing print templates. Numbers should go through `Number()`.

**Why:** an authenticated user can store HTML/script in free-text fields (PO number, client name, notes, addresses); the print window is same-origin, so injected script could act with the app's session.

**How to apply:** printSalesOrder is fully escaped (reference example). Older templates (GST/quote/PO/challan builders) predate the rule — apply esc() opportunistically when touching them.
