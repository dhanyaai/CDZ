-- Add missing columns to catalogue_shares (opportunity_id and client_id were omitted in 0008)
ALTER TABLE catalogue_shares ADD COLUMN IF NOT EXISTS opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE SET NULL;
ALTER TABLE catalogue_shares ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL;

-- Create lead_items table (was defined in schema but never migrated)
CREATE TABLE IF NOT EXISTS lead_items (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  sl_no INTEGER NOT NULL DEFAULT 1,
  product_name TEXT,
  custom_product TEXT,
  qty INTEGER,
  budget NUMERIC(12, 2),
  margin NUMERIC(5, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
