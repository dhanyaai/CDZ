CREATE TABLE IF NOT EXISTS catalogue_shares (
  id SERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  opportunity_title TEXT NOT NULL,
  client_name TEXT,
  catalogue_type TEXT NOT NULL,
  product_ids TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
