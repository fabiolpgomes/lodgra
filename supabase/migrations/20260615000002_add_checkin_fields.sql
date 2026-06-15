-- Add check-in fields to reservations (Story 30.3)

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS checkin_code TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS checkin_instructions TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS checkin_code_sent_at TIMESTAMPTZ;

-- Index for cron query (find reservations to send check-in to)
CREATE INDEX IF NOT EXISTS idx_reservations_checkin_date
  ON reservations(check_in_date, checkin_code_sent_at, status);

-- Add configuration table for check-in timing per organization
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  send_checkin_code BOOLEAN DEFAULT true,
  checkin_code_hours_before INT DEFAULT 24,
  send_checkout_reminder BOOLEAN DEFAULT true,
  checkout_reminder_hours_before INT DEFAULT 24,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for whatsapp_config
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_config_read_own_org"
  ON whatsapp_config FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "whatsapp_config_write_managers"
  ON whatsapp_config FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );
