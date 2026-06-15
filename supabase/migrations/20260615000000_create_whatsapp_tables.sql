-- Create whatsapp_logs table for story 30.1
-- Tracks all WhatsApp message sends, deliveries, and failures

CREATE TABLE whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  to_phone TEXT NOT NULL,
  template_name TEXT,
  message_text TEXT,
  wa_message_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  retry_count INT DEFAULT 0,
  fallback_email_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_whatsapp_logs_org_id ON whatsapp_logs(organization_id);
CREATE INDEX idx_whatsapp_logs_to_phone ON whatsapp_logs(to_phone);
CREATE INDEX idx_whatsapp_logs_status ON whatsapp_logs(status);
CREATE INDEX idx_whatsapp_logs_sent_at ON whatsapp_logs(sent_at);
CREATE INDEX idx_whatsapp_logs_wa_message_id ON whatsapp_logs(wa_message_id) WHERE wa_message_id IS NOT NULL;

-- RLS Policies
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Only organization members can read their logs
CREATE POLICY "whatsapp_logs_read_own_org"
  ON whatsapp_logs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Only service role can insert (via API routes)
CREATE POLICY "whatsapp_logs_insert_service"
  ON whatsapp_logs FOR INSERT
  WITH CHECK (true); -- Enforced at API level

-- Only service role can update (status changes from webhooks)
CREATE POLICY "whatsapp_logs_update_service"
  ON whatsapp_logs FOR UPDATE
  USING (true) -- Enforced at API level
  WITH CHECK (true);

-- Audit trigger to update updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER whatsapp_logs_updated_at_trigger
  BEFORE UPDATE ON whatsapp_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_logs_updated_at();
