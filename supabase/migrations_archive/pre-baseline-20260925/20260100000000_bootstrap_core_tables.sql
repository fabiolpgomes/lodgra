-- ============================================
-- Bootstrap: Core tables that predate the migration system
-- These tables existed before migrations were introduced
-- ============================================

-- Platforms (lookup table)
CREATE TABLE IF NOT EXISTS platforms (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name VARCHAR NOT NULL,
  code VARCHAR NOT NULL UNIQUE,
  api_endpoint TEXT,
  requires_oauth BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  display_name TEXT
);

-- Properties (minimal — later migrations add: owner_id, organization_id, slug, description, etc.)
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name VARCHAR NOT NULL,
  address TEXT,
  city VARCHAR,
  country VARCHAR,
  postal_code VARCHAR,
  bedrooms INTEGER,
  bathrooms INTEGER,
  max_guests INTEGER,
  property_type VARCHAR,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  currency VARCHAR DEFAULT 'EUR'
);

-- Property Listings (minimal — organization_id added later)
CREATE TABLE IF NOT EXISTS property_listings (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  platform_id UUID REFERENCES platforms(id),
  external_listing_id VARCHAR,
  listing_url TEXT,
  sync_enabled BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP,
  ical_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Reservations (minimal — stripe, guest, booking_source, organization_id added later)
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  property_listing_id UUID REFERENCES property_listings(id) ON DELETE SET NULL,
  guest_id UUID,
  external_reservation_id VARCHAR,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  number_of_guests INTEGER,
  total_amount NUMERIC,
  currency VARCHAR DEFAULT 'EUR',
  platform_fee NUMERIC,
  net_amount NUMERIC,
  status VARCHAR DEFAULT 'confirmed',
  synced_at TIMESTAMP,
  source VARCHAR,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  external_id TEXT,
  internal_notes TEXT
);

-- Expenses (minimal — organization_id added later)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency VARCHAR DEFAULT 'EUR',
  category VARCHAR,
  expense_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sync Logs
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  property_listing_id UUID REFERENCES property_listings(id),
  sync_type VARCHAR,
  direction VARCHAR,
  status VARCHAR,
  error_message TEXT,
  records_processed INTEGER,
  records_created INTEGER,
  records_updated INTEGER,
  records_failed INTEGER,
  synced_at TIMESTAMP DEFAULT now()
);

-- Financial Transactions
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  property_id UUID REFERENCES properties(id),
  reservation_id UUID REFERENCES reservations(id),
  transaction_type VARCHAR,
  category VARCHAR,
  amount NUMERIC,
  currency VARCHAR DEFAULT 'EUR',
  description TEXT,
  transaction_date DATE,
  created_at TIMESTAMP DEFAULT now()
);

-- Calendar Blocks
CREATE TABLE IF NOT EXISTS calendar_blocks (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  block_type VARCHAR,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Seed default platforms
INSERT INTO platforms (name, code, display_name) VALUES
  ('Booking.com', 'booking.com', 'Booking.com'),
  ('Airbnb', 'airbnb', 'Airbnb'),
  ('Expedia', 'expedia', 'Expedia'),
  ('VRBO', 'vrbo', 'VRBO'),
  ('Direct', 'direct', 'Direct Booking')
ON CONFLICT (code) DO NOTHING;

-- Basic RLS on core tables
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read platforms
CREATE POLICY "Authenticated users can read platforms"
  ON platforms FOR SELECT
  TO authenticated
  USING (true);

-- Service role bypass for all tables (for cron/sync operations)
CREATE POLICY "Service role full access properties" ON properties FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access property_listings" ON property_listings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access reservations" ON reservations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access expenses" ON expenses FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access sync_logs" ON sync_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access financial_transactions" ON financial_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access calendar_blocks" ON calendar_blocks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Note: unified_calendar and commission_summary views are created in later migrations
-- after all required columns (guest_name, commission_amount, etc.) are added

-- Indexes (only on columns that exist in this bootstrap)
CREATE INDEX IF NOT EXISTS idx_property_listings_property ON property_listings(property_id);
CREATE INDEX IF NOT EXISTS idx_reservations_listing ON reservations(property_listing_id);
CREATE INDEX IF NOT EXISTS idx_reservations_checkin ON reservations(check_in);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_expenses_property ON expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
