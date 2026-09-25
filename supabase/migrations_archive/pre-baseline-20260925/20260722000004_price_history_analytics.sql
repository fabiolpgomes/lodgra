-- Story 36.7: Price History & Analytics
-- Adds price_history and price_analytics tables with audit trail and statistics

-- Create price_history table for audit trail
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  date_applied DATE NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  change_reason TEXT,
  is_revert BOOLEAN DEFAULT false,
  previous_price_record_id UUID REFERENCES price_history(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_price_positive CHECK (price >= 0)
);

-- Create price_analytics table for cached statistics
CREATE TABLE IF NOT EXISTS price_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  min_price DECIMAL(10, 2),
  max_price DECIMAL(10, 2),
  avg_price DECIMAL(10, 2),
  change_count INTEGER DEFAULT 0,
  revenue_impact DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_period_dates CHECK (period_end >= period_start)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_price_history_property_date ON price_history(property_id, date_applied DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_created ON price_history(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_property_not_deleted ON price_history(property_id)
  WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_price_analytics_property ON price_analytics(property_id);
CREATE INDEX IF NOT EXISTS idx_price_analytics_period ON price_analytics(property_id, period_start, period_end);

-- Enable RLS on price_history
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for price_history
CREATE POLICY "Users can view own property price history"
ON price_history FOR SELECT
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can create price history for own property"
ON price_history FOR INSERT
WITH CHECK (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update own property price history"
ON price_history FOR UPDATE
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

-- Enable RLS on price_analytics
ALTER TABLE price_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for price_analytics
CREATE POLICY "Users can view own property price analytics"
ON price_analytics FOR SELECT
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can manage own property price analytics"
ON price_analytics FOR ALL
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

-- Add comments to document tables
COMMENT ON TABLE price_history IS 'Audit trail for price changes (Story 36.7)';
COMMENT ON COLUMN price_history.property_id IS 'Reference to the property';
COMMENT ON COLUMN price_history.price IS 'Price value (in EUR)';
COMMENT ON COLUMN price_history.date_applied IS 'Date when price was applied (YYYY-MM-DD)';
COMMENT ON COLUMN price_history.changed_by IS 'User ID who made the change';
COMMENT ON COLUMN price_history.change_reason IS 'Reason for price change (e.g., "seasonal", "manual override")';
COMMENT ON COLUMN price_history.is_revert IS 'Whether this is a revert to a previous price';
COMMENT ON COLUMN price_history.is_deleted IS 'Soft delete flag for audit compliance';

COMMENT ON TABLE price_analytics IS 'Cached price statistics and analytics (Story 36.7)';
COMMENT ON COLUMN price_analytics.property_id IS 'Reference to the property';
COMMENT ON COLUMN price_analytics.period_start IS 'Start of analysis period (YYYY-MM-DD)';
COMMENT ON COLUMN price_analytics.period_end IS 'End of analysis period (YYYY-MM-DD)';
COMMENT ON COLUMN price_analytics.min_price IS 'Minimum price in period (in EUR)';
COMMENT ON COLUMN price_analytics.max_price IS 'Maximum price in period (in EUR)';
COMMENT ON COLUMN price_analytics.avg_price IS 'Average price in period (in EUR)';
COMMENT ON COLUMN price_analytics.change_count IS 'Number of price changes in period';
COMMENT ON COLUMN price_analytics.revenue_impact IS 'Estimated revenue impact of price changes';

-- Create function to refresh analytics for a property
CREATE OR REPLACE FUNCTION refresh_price_analytics(p_property_id UUID)
RETURNS void AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Default to last 30 days
  v_period_end := CURRENT_DATE;
  v_period_start := v_period_end - INTERVAL '30 days';

  DELETE FROM price_analytics
  WHERE property_id = p_property_id
    AND period_start >= v_period_start
    AND period_end <= v_period_end;

  INSERT INTO price_analytics (
    property_id,
    period_start,
    period_end,
    min_price,
    max_price,
    avg_price,
    change_count,
    created_at,
    updated_at
  )
  SELECT
    p_property_id,
    v_period_start,
    v_period_end,
    MIN(price),
    MAX(price),
    ROUND(AVG(price)::NUMERIC, 2),
    COUNT(*),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM price_history
  WHERE property_id = p_property_id
    AND is_deleted = false
    AND date_applied BETWEEN v_period_start AND v_period_end;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically refresh analytics after price_history insert/update
CREATE OR REPLACE FUNCTION trigger_refresh_price_analytics()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM refresh_price_analytics(NEW.property_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS price_history_refresh_analytics ON price_history;

CREATE TRIGGER price_history_refresh_analytics
AFTER INSERT OR UPDATE ON price_history
FOR EACH ROW
EXECUTE FUNCTION trigger_refresh_price_analytics();
