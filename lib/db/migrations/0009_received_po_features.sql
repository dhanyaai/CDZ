-- advance_receipts: pre-invoice advance payments at the opportunity stage
CREATE TABLE IF NOT EXISTS advance_receipts (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL DEFAULT 1 REFERENCES companies(id) ON DELETE CASCADE,
  opportunity_id INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  amount NUMERIC(14, 2) NOT NULL,
  payment_mode TEXT,
  reference_no TEXT,
  receipt_date TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- allow custom quote items (no product) to be converted to SO items
ALTER TABLE sales_order_items ALTER COLUMN product_id DROP NOT NULL;

-- track which quote generated a sales order
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL;
