-- Google Vacation Rentals Performance Metrics
CREATE TABLE IF NOT EXISTS google_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Core metrics
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  conversions INT NOT NULL DEFAULT 0,

  -- Calculated metrics
  ctr DECIMAL(5, 2), -- Click-Through Rate %
  conversion_rate DECIMAL(5, 2), -- Conversion Rate %

  -- Additional data
  raw_data JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, property_id, date)
);

-- Daily aggregated metrics (for dashboards)
CREATE TABLE IF NOT EXISTS google_performance_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Aggregated across all properties
  total_impressions INT NOT NULL DEFAULT 0,
  total_clicks INT NOT NULL DEFAULT 0,
  total_conversions INT NOT NULL DEFAULT 0,

  -- Properties with data for this day
  properties_with_data INT NOT NULL DEFAULT 0,

  -- Calculated
  overall_ctr DECIMAL(5, 2),
  overall_conversion_rate DECIMAL(5, 2),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, date)
);

-- Index for fast lookups
CREATE INDEX idx_google_performance_metrics_org_date
  ON google_performance_metrics(organization_id, date DESC);

CREATE INDEX idx_google_performance_metrics_property_date
  ON google_performance_metrics(property_id, date DESC);

CREATE INDEX idx_google_performance_metrics_synced
  ON google_performance_metrics(synced_at DESC);

CREATE INDEX idx_google_performance_daily_summary_org_date
  ON google_performance_daily_summary(organization_id, date DESC);

-- Enable RLS
ALTER TABLE google_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_performance_daily_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for metrics
CREATE POLICY "org_isolation_google_performance_metrics"
  ON google_performance_metrics
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid()
  ));

-- RLS Policies for daily summary
CREATE POLICY "org_isolation_google_performance_daily_summary"
  ON google_performance_daily_summary
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid()
  ));

-- Trigger to auto-update updated_at for metrics
CREATE TRIGGER update_google_performance_metrics_updated_at
  BEFORE UPDATE ON google_performance_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at for daily summary
CREATE TRIGGER update_google_performance_daily_summary_updated_at
  BEFORE UPDATE ON google_performance_daily_summary
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to recalculate CTR and conversion rate
CREATE OR REPLACE FUNCTION calculate_performance_rates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clicks > 0 THEN
    NEW.ctr = ROUND((NEW.clicks::DECIMAL / NULLIF(NEW.impressions, 0) * 100)::NUMERIC, 2);
  END IF;

  IF NEW.conversions > 0 THEN
    NEW.conversion_rate = ROUND((NEW.conversions::DECIMAL / NULLIF(NEW.clicks, 0) * 100)::NUMERIC, 2);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_performance_rates_trigger
  BEFORE INSERT OR UPDATE ON google_performance_metrics
  FOR EACH ROW
  EXECUTE FUNCTION calculate_performance_rates();
