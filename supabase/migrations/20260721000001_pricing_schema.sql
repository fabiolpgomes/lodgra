-- 36.1: Dynamic Pricing Schema Foundation
-- Creates 4 tables for pricing configuration management

-- property_prices: Base and weekend prices
CREATE TABLE IF NOT EXISTS property_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  base_price DECIMAL(10, 2) NOT NULL CHECK (base_price >= 0),
  weekend_price DECIMAL(10, 2) CHECK (weekend_price IS NULL OR weekend_price >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(property_id)
);

-- property_discounts: Discount rules (weekly, monthly, etc)
CREATE TABLE IF NOT EXISTS property_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('weekly', 'monthly', 'excellent_guest', 'last_minute', 'advance')),
  percentage INT NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  min_nights INT DEFAULT 1,
  conditions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- property_availability: Min/max nights and advance notice rules
CREATE TABLE IF NOT EXISTS property_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  min_nights INT DEFAULT 1 CHECK (min_nights >= 1),
  max_nights INT DEFAULT 365 CHECK (max_nights >= 1),
  advance_notice_days INT DEFAULT 0 CHECK (advance_notice_days >= 0),
  notice_for_same_day TIME DEFAULT '00:00',
  preparation_days INT DEFAULT 0 CHECK (preparation_days >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(property_id)
);

-- property_daily_prices: Daily price overrides
CREATE TABLE IF NOT EXISTS property_daily_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(property_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_prices_property_id ON property_prices(property_id);
CREATE INDEX IF NOT EXISTS idx_property_discounts_property_id ON property_discounts(property_id);
CREATE INDEX IF NOT EXISTS idx_property_discounts_type ON property_discounts(property_id, discount_type);
CREATE INDEX IF NOT EXISTS idx_property_availability_property_id ON property_availability(property_id);
CREATE INDEX IF NOT EXISTS idx_property_daily_prices_property_id ON property_daily_prices(property_id);
CREATE INDEX IF NOT EXISTS idx_property_daily_prices_date ON property_daily_prices(date);

-- RLS (Row Level Security) Policies
ALTER TABLE property_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_daily_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own properties
CREATE POLICY "Users can view own property prices"
ON property_prices FOR SELECT
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update own property prices"
ON property_prices FOR UPDATE
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own property prices"
ON property_prices FOR INSERT
WITH CHECK (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

-- Apply same RLS policies to other tables
CREATE POLICY "Users can view own property discounts"
ON property_discounts FOR SELECT
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can manage own property discounts"
ON property_discounts FOR ALL
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can view own property availability"
ON property_availability FOR SELECT
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update own property availability"
ON property_availability FOR ALL
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can view own property daily prices"
ON property_daily_prices FOR SELECT
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can manage own property daily prices"
ON property_daily_prices FOR ALL
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);
