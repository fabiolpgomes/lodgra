-- Story 36.9: Revenue Forecasting
-- Adds revenue_forecasts and forecast_cache tables for time-series analysis and predictions

-- Create revenue_forecasts table to store forecast data
CREATE TABLE IF NOT EXISTS revenue_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  forecast_period_days INTEGER NOT NULL CHECK (forecast_period_days IN (30, 60, 90)),
  projected_revenue DECIMAL(12, 2) NOT NULL CHECK (projected_revenue >= 0),
  confidence_score DECIMAL(3, 2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  confidence_level VARCHAR(10) NOT NULL CHECK (confidence_level IN ('low', 'medium', 'high')),
  occupancy_rate_forecast DECIMAL(5, 2),
  seasonal_factor DECIMAL(5, 3),
  base_price_estimate DECIMAL(10, 2),
  data_points_count INTEGER DEFAULT 0,
  reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_valid_confidence CHECK (confidence_score BETWEEN 0 AND 1)
);

-- Create forecast_cache table for 24-hour cache
CREATE TABLE IF NOT EXISTS forecast_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  cache_key VARCHAR(255) NOT NULL,
  forecast_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT unique_cache_key UNIQUE (property_id, cache_key)
);

-- Create forecast_assumptions table to track methodology
CREATE TABLE IF NOT EXISTS forecast_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  analysis_date DATE NOT NULL,
  base_revenue_90days DECIMAL(12, 2),
  avg_occupancy_rate DECIMAL(5, 2),
  seasonal_pattern JSONB,
  day_of_week_pattern JSONB,
  holiday_events JSONB,
  last_90_days_bookings INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_revenue_forecasts_property_date ON revenue_forecasts(property_id, forecast_date DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_forecasts_property_period ON revenue_forecasts(property_id, forecast_period_days);
CREATE INDEX IF NOT EXISTS idx_forecast_cache_property ON forecast_cache(property_id);
CREATE INDEX IF NOT EXISTS idx_forecast_cache_expires ON forecast_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_forecast_assumptions_property_date ON forecast_assumptions(property_id, analysis_date DESC);

-- Enable RLS on revenue_forecasts
ALTER TABLE revenue_forecasts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for revenue_forecasts
CREATE POLICY "Users can view own property forecasts"
ON revenue_forecasts FOR SELECT
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can create forecasts for own property"
ON revenue_forecasts FOR INSERT
WITH CHECK (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Service role full access revenue_forecasts"
ON revenue_forecasts FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Enable RLS on forecast_cache
ALTER TABLE forecast_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own property forecast cache"
ON forecast_cache FOR SELECT
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Service role full access forecast_cache"
ON forecast_cache FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Enable RLS on forecast_assumptions
ALTER TABLE forecast_assumptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own property forecast assumptions"
ON forecast_assumptions FOR SELECT
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Service role full access forecast_assumptions"
ON forecast_assumptions FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Create function to clean expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_forecast_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM forecast_cache WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE revenue_forecasts IS 'Revenue forecasts for 30/60/90 day periods (Story 36.9)';
COMMENT ON TABLE forecast_cache IS '24-hour cache for forecast calculations';
COMMENT ON TABLE forecast_assumptions IS 'Methodology and assumptions used in forecasts';
