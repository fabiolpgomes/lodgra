-- Migration: pricing_rules table for dynamic pricing per period
-- Story 9.3

CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                          -- e.g. "Época Alta Verão 2026"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_per_night NUMERIC(10,2) NOT NULL,
  min_nights INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

-- Public read for public properties (no auth needed)
CREATE POLICY "Public read pricing_rules for public properties"
  ON pricing_rules FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM properties WHERE id = property_id AND is_public = true)
  );

-- Org admin/manager can manage their own rules
CREATE POLICY "Org admin/manager manage pricing_rules"
  ON pricing_rules FOR ALL
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_pricing_rules_property_id ON pricing_rules(property_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_dates ON pricing_rules(property_id, start_date, end_date);
