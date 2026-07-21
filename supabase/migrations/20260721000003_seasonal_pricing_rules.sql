-- Story 36.6: Seasonal Pricing Rules & Pricing Constraints
-- Adds seasonal pricing rules table and constraint columns to property_prices

-- Add constraint columns to property_prices
ALTER TABLE property_prices
ADD COLUMN IF NOT EXISTS min_nightly_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS max_nightly_price DECIMAL(10, 2);

-- Add constraints validation
ALTER TABLE property_prices
ADD CONSTRAINT check_min_max_nightly_prices
CHECK (
  min_nightly_price IS NULL OR
  max_nightly_price IS NULL OR
  min_nightly_price <= max_nightly_price
);

-- Create seasonal_pricing_rules table
CREATE TABLE IF NOT EXISTS seasonal_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date_start DATE NOT NULL,
  date_end DATE NOT NULL,
  price_per_night DECIMAL(10, 2) NOT NULL CHECK (price_per_night >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_seasonal_dates CHECK (date_end >= date_start)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_seasonal_rules_property ON seasonal_pricing_rules(property_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_rules_dates ON seasonal_pricing_rules(property_id, date_start, date_end);
CREATE INDEX IF NOT EXISTS idx_seasonal_rules_active ON seasonal_pricing_rules(property_id, is_active);

-- Enable RLS on seasonal_pricing_rules
ALTER TABLE seasonal_pricing_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seasonal_pricing_rules
CREATE POLICY "Users can view own property seasonal rules"
ON seasonal_pricing_rules FOR SELECT
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can manage own property seasonal rules"
ON seasonal_pricing_rules FOR ALL
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

-- Add comment to document the table
COMMENT ON TABLE seasonal_pricing_rules IS 'Seasonal pricing rules for properties (Story 36.6)';
COMMENT ON COLUMN seasonal_pricing_rules.name IS 'Human-readable name for the rule (e.g., "Summer Peak", "Winter Discount")';
COMMENT ON COLUMN seasonal_pricing_rules.date_start IS 'Start date of the seasonal rule (inclusive, YYYY-MM-DD)';
COMMENT ON COLUMN seasonal_pricing_rules.date_end IS 'End date of the seasonal rule (inclusive, YYYY-MM-DD)';
COMMENT ON COLUMN seasonal_pricing_rules.price_per_night IS 'Price per night during this seasonal period (in EUR)';
COMMENT ON COLUMN seasonal_pricing_rules.is_active IS 'Whether this rule is currently active and should be applied';
COMMENT ON COLUMN property_prices.min_nightly_price IS 'Minimum allowed price per night (soft constraint, shows warning)';
COMMENT ON COLUMN property_prices.max_nightly_price IS 'Maximum allowed price per night (soft constraint, shows warning)';
