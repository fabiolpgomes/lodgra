-- Story 36.8: AI-Driven Price Recommendations
-- Adds pricing_recommendations table with audit trigger and tracking

-- Create audit_trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create pricing_recommendations table
CREATE TABLE IF NOT EXISTS pricing_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  recommended_price DECIMAL(10, 2) NOT NULL CHECK (recommended_price >= 0),
  confidence DECIMAL(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1), -- 0.00-1.00
  reason TEXT NOT NULL,
  market_analysis JSONB, -- { median_price, market_trend, competitor_avg, sample_size }
  revenue_projection JSONB, -- { current_monthly, projected_monthly, difference, percentage_change }
  accepted BOOLEAN DEFAULT FALSE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_recommendation_price CHECK (recommended_price >= 0),
  CONSTRAINT check_acceptance_dates CHECK (
    (accepted = false AND accepted_at IS NULL AND rejected_at IS NULL) OR
    (accepted = true AND accepted_at IS NOT NULL AND rejected_at IS NULL) OR
    (accepted = false AND rejected_at IS NOT NULL AND accepted_at IS NULL)
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pricing_recommendations_property ON pricing_recommendations(property_id);
CREATE INDEX IF NOT EXISTS idx_pricing_recommendations_property_created ON pricing_recommendations(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_recommendations_accepted ON pricing_recommendations(property_id, accepted) WHERE accepted = true;
CREATE INDEX IF NOT EXISTS idx_pricing_recommendations_pending ON pricing_recommendations(property_id, accepted) WHERE accepted = false AND rejected_at IS NULL;

-- Enable RLS on pricing_recommendations
ALTER TABLE pricing_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pricing_recommendations
CREATE POLICY "Users can view own property recommendations"
ON pricing_recommendations FOR SELECT
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can create recommendations for own property"
ON pricing_recommendations FOR INSERT
WITH CHECK (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update own property recommendations"
ON pricing_recommendations FOR UPDATE
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

-- Create trigger for audit_trigger on update
DROP TRIGGER IF EXISTS pricing_recommendations_audit ON pricing_recommendations;

CREATE TRIGGER pricing_recommendations_audit
BEFORE UPDATE ON pricing_recommendations
FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Create table comments
COMMENT ON TABLE pricing_recommendations IS 'AI-generated price recommendations with market analysis and revenue projections (Story 36.8)';
COMMENT ON COLUMN pricing_recommendations.property_id IS 'Reference to the property';
COMMENT ON COLUMN pricing_recommendations.recommended_price IS 'AI-recommended nightly price (in EUR)';
COMMENT ON COLUMN pricing_recommendations.confidence IS 'Confidence score (0.00-1.00) based on data quality and pattern strength';
COMMENT ON COLUMN pricing_recommendations.reason IS 'Human-readable explanation of the recommendation (e.g., "High demand in July (20% above average)...")';
COMMENT ON COLUMN pricing_recommendations.market_analysis IS 'Market data: { median_price, market_trend (up/down/stable), competitor_avg, sample_size }';
COMMENT ON COLUMN pricing_recommendations.revenue_projection IS 'Projected revenue impact: { current_monthly, projected_monthly, difference, percentage_change }';
COMMENT ON COLUMN pricing_recommendations.accepted IS 'Whether the recommendation has been accepted';
COMMENT ON COLUMN pricing_recommendations.accepted_at IS 'Timestamp when recommendation was accepted';
COMMENT ON COLUMN pricing_recommendations.rejected_at IS 'Timestamp when recommendation was rejected';
