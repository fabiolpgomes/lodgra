-- Story 36.10: Competitor Price Monitoring
-- Adds competitor tracking, price history, and alert management tables

-- Create competitors table for tracked competitor properties
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  competitor_url TEXT NOT NULL,
  platform VARCHAR NOT NULL CHECK (platform IN ('airbnb', 'booking.com', 'vrbo', 'other')),
  competitor_name TEXT NOT NULL,
  competitor_property_type VARCHAR,
  is_active BOOLEAN DEFAULT true,
  monitoring_frequency VARCHAR DEFAULT 'daily' CHECK (monitoring_frequency IN ('daily', 'weekly', 'monthly')),
  price_alert_threshold DECIMAL(5, 2) DEFAULT 10,
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  last_scraped_price DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT limit_competitors_per_property CHECK (
    (SELECT COUNT(*) FROM competitors WHERE property_id = property_id) <= 10
  )
);

-- Create competitor_price_history table for tracking price changes over time
CREATE TABLE IF NOT EXISTS competitor_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  scrape_date DATE NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  scrape_source VARCHAR DEFAULT 'automated',
  is_valid BOOLEAN DEFAULT true
);

-- Create competitor_price_alerts table for price change notifications
CREATE TABLE IF NOT EXISTS competitor_price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  previous_price DECIMAL(10, 2) NOT NULL,
  new_price DECIMAL(10, 2) NOT NULL,
  price_change DECIMAL(10, 2) NOT NULL,
  percentage_change DECIMAL(5, 2) NOT NULL,
  alert_type VARCHAR NOT NULL CHECK (alert_type IN ('increase', 'decrease')),
  is_read BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create competitor_benchmark_cache table for cached market analysis
CREATE TABLE IF NOT EXISTS competitor_benchmark_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  cache_date DATE NOT NULL,
  market_average_price DECIMAL(10, 2),
  market_min_price DECIMAL(10, 2),
  market_max_price DECIMAL(10, 2),
  market_volatility DECIMAL(5, 3),
  confidence_score DECIMAL(3, 2),
  sample_size INTEGER DEFAULT 0,
  active_competitors INTEGER DEFAULT 0,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT unique_cache_per_day UNIQUE (property_id, cache_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_competitors_property_active ON competitors(property_id, is_active);
CREATE INDEX IF NOT EXISTS idx_competitors_last_scraped ON competitors(property_id, last_scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_competitor_price_history_date ON competitor_price_history(competitor_id, scrape_date DESC);
CREATE INDEX IF NOT EXISTS idx_competitor_price_history_competitor ON competitor_price_history(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_price_alerts_property ON competitor_price_alerts(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_competitor_price_alerts_read ON competitor_price_alerts(property_id, is_read);
CREATE INDEX IF NOT EXISTS idx_competitor_benchmark_cache_date ON competitor_benchmark_cache(property_id, cache_date DESC);

-- Enable RLS on competitors
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own property competitors"
ON competitors FOR SELECT
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can manage own property competitors"
ON competitors FOR INSERT
WITH CHECK (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update own property competitors"
ON competitors FOR UPDATE
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own property competitors"
ON competitors FOR DELETE
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Service role full access competitors"
ON competitors FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Enable RLS on competitor_price_history
ALTER TABLE competitor_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view competitor price history for own properties"
ON competitor_price_history FOR SELECT
USING (
  competitor_id IN (
    SELECT id FROM competitors WHERE property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Service role full access competitor_price_history"
ON competitor_price_history FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Enable RLS on competitor_price_alerts
ALTER TABLE competitor_price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own property competitor alerts"
ON competitor_price_alerts FOR SELECT
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update own property competitor alerts"
ON competitor_price_alerts FOR UPDATE
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Service role full access competitor_price_alerts"
ON competitor_price_alerts FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Enable RLS on competitor_benchmark_cache
ALTER TABLE competitor_benchmark_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own property benchmark cache"
ON competitor_benchmark_cache FOR SELECT
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Service role full access competitor_benchmark_cache"
ON competitor_benchmark_cache FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Create function to clean expired benchmark cache
CREATE OR REPLACE FUNCTION cleanup_expired_benchmark_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM competitor_benchmark_cache WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE competitors IS 'Tracked competitor properties for price monitoring (Story 36.10)';
COMMENT ON TABLE competitor_price_history IS 'Historical price records for competitors';
COMMENT ON TABLE competitor_price_alerts IS 'Price change alerts and notifications';
COMMENT ON TABLE competitor_benchmark_cache IS 'Cached market analysis data';
