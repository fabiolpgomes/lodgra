-- Create google_merchant_sync_status table
CREATE TABLE IF NOT EXISTS google_merchant_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, synced, failed
  last_fetched TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  data JSONB, -- Store Google Merchant Center response
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, property_id)
);

-- Create google_merchant_sync_logs table
CREATE TABLE IF NOT EXISTS google_merchant_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id VARCHAR(255),
  status VARCHAR(50), -- completed, failed, partial
  properties_synced INTEGER DEFAULT 0,
  properties_failed INTEGER DEFAULT 0,
  total_duration_ms INTEGER DEFAULT 0,
  error_message TEXT,
  sync_details JSONB, -- Store details of each property sync
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_google_merchant_sync_status_org_id
  ON google_merchant_sync_status(organization_id);
CREATE INDEX IF NOT EXISTS idx_google_merchant_sync_status_prop_id
  ON google_merchant_sync_status(property_id);
CREATE INDEX IF NOT EXISTS idx_google_merchant_sync_logs_org_id
  ON google_merchant_sync_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_google_merchant_sync_logs_created_at
  ON google_merchant_sync_logs(created_at);

-- Enable RLS
ALTER TABLE google_merchant_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_merchant_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for google_merchant_sync_status
CREATE POLICY "Users can view their organization's sync status"
  ON google_merchant_sync_status
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert/update sync status"
  ON google_merchant_sync_status
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update sync status"
  ON google_merchant_sync_status
  FOR UPDATE
  USING (true);

-- Create RLS policies for google_merchant_sync_logs
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
