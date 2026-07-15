---
name: number_sequences schema
description: Real DB column names for the number_sequences table (differ from intuitive names)
---

## Columns

| Column | Type | Notes |
|--------|------|-------|
| id | serial | PK |
| company_id | integer | FK → companies |
| doc_type | text | e.g. 'SO', 'PO', 'INV', 'GRN', 'QT', 'SHP', 'DC', 'SMP' |
| fy_label | text | e.g. '2026-27' — part of UNIQUE key |
| last_number | integer | last number issued (start at 0) |

Unique constraint: `(company_id, doc_type, fy_label)`

**Why:** The table was built before this memory was written; the column names `fy_label` and `last_number` do not match what a reader might guess (`next_number`, `prefix`, `padding`). Seed and API code must use these exact names or the INSERT/UPDATE will fail.

**How to apply:** Always check with `psql … \d number_sequences` or read the schema file before writing any seed or route that touches this table.
