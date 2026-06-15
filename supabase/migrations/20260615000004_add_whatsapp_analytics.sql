-- WhatsApp Analytics & Enhanced Logging (Story 30.7-30.6 Enhancement)

-- Extend whatsapp_logs with analytics fields
ALTER TABLE whatsapp_logs
ADD COLUMN IF NOT EXISTS message_type TEXT, -- 'confirmation', 'alert', 'reminder', 'notification'
ADD COLUMN IF NOT EXISTS recipient_type TEXT, -- 'guest', 'manager', 'cleaner'
ADD COLUMN IF NOT EXISTS delivery_time_seconds INT,
ADD COLUMN IF NOT EXISTS template_version TEXT DEFAULT '1.0';

-- Create analytics aggregation table
CREATE TABLE IF NOT EXISTS whatsapp_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  message_type TEXT NOT NULL,
  recipient_type TEXT NOT NULL,
  total_sent INT DEFAULT 0,
  successful INT DEFAULT 0,
  failed INT DEFAULT 0,
  bounced INT DEFAULT 0,
  read_count INT DEFAULT 0,
  avg_delivery_time_seconds INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, date, message_type, recipient_type)
);

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_org_date
ON whatsapp_analytics(organization_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_message_type
ON whatsapp_logs(organization_id, message_type);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_recipient_type
ON whatsapp_logs(organization_id, recipient_type);

-- RLS Policy: Users can only see their organization's analytics
ALTER TABLE whatsapp_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_analytics_select_own_org" ON whatsapp_analytics
FOR SELECT
USING (organization_id = (SELECT organization_id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "whatsapp_analytics_update_own_org" ON whatsapp_analytics
FOR UPDATE
USING (organization_id = (SELECT organization_id FROM auth.users WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM auth.users WHERE id = auth.uid()));

-- Audit trigger
CREATE OR REPLACE TRIGGER whatsapp_analytics_updated_at
BEFORE UPDATE ON whatsapp_analytics
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
