-- Google Merchant Center API Sync Status Table
CREATE TABLE IF NOT EXISTS google_merchant_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('indexed', 'pending', 'rejected', 'error')),
  last_fetched TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  indexed_date TIMESTAMPTZ,
  error_message TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, property_id)
);

-- Index for fast lookups
CREATE INDEX idx_google_merchant_sync_status_org_prop
  ON google_merchant_sync_status(organization_id, property_id);

CREATE INDEX idx_google_merchant_sync_status_last_fetched
  ON google_merchant_sync_status(last_fetched);

CREATE INDEX idx_google_merchant_sync_status_status
  ON google_merchant_sync_status(status);

-- Google Merchant Center API Sync Logs (Audit Trail)
CREATE TABLE IF NOT EXISTS google_merchant_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sync_job_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('manual', 'scheduled', 'error-retry')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'success', 'failed', 'partial')),
  properties_count INT,
  properties_synced INT,
  properties_failed INT,
  duration_ms INT,
  error_message TEXT,
  api_quota_used INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast log lookups
CREATE INDEX idx_google_merchant_sync_logs_org
  ON google_merchant_sync_logs(organization_id);

CREATE INDEX idx_google_merchant_sync_logs_created_at
  ON google_merchant_sync_logs(created_at DESC);

CREATE INDEX idx_google_merchant_sync_logs_status
  ON google_merchant_sync_logs(status);

-- Enable RLS (Row Level Security)
ALTER TABLE google_merchant_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_merchant_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sync_status
CREATE POLICY "org_isolation_google_merchant_sync_status"
  ON google_merchant_sync_status
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid()
  ));

-- RLS Policies for sync_logs
CREATE POLICY "org_isolation_google_merchant_sync_logs"
  ON google_merchant_sync_logs
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid()
  ));

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_google_merchant_sync_status_updated_at
  BEFORE UPDATE ON google_merchant_sync_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_merchant_sync_logs_updated_at
  BEFORE UPDATE ON google_merchant_sync_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
