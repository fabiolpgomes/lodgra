-- Fix google_merchant_sync_logs table schema
-- Drop the incorrectly named table
DROP TABLE IF EXISTS google_merchant_sync_logs CASCADE;

-- Recreate with correct column names
CREATE TABLE google_merchant_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sync_job_id VARCHAR(255),
  action VARCHAR(50), -- 'manual' or 'scheduled'
  status VARCHAR(50), -- 'success', 'partial', 'failed'
  properties_count INTEGER DEFAULT 0,
  properties_synced INTEGER DEFAULT 0,
  properties_failed INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  error_message TEXT,
  api_quota_used INTEGER DEFAULT 0,
  sync_details JSONB, -- Store details of each property sync
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_google_merchant_sync_logs_org_id
  ON google_merchant_sync_logs(organization_id);
CREATE INDEX idx_google_merchant_sync_logs_created_at
  ON google_merchant_sync_logs(created_at);

-- Enable RLS
ALTER TABLE google_merchant_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their organization's sync logs"
  ON google_merchant_sync_logs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert sync logs"
  ON google_merchant_sync_logs
  FOR INSERT
  WITH CHECK (true);
