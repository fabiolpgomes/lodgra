-- Epic 9 — Add base_price to properties (used by public availability/pricing API)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS base_price NUMERIC(10,2) DEFAULT 0;
