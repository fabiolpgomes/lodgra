-- Add notification tracking fields to reservations (Story 30.7 & 30.8)

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS manager_notified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_confirm_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS auto_notify_manager BOOLEAN DEFAULT TRUE;

-- Create indexes for efficiency
CREATE INDEX IF NOT EXISTS idx_reservations_confirmation_sent ON reservations(organization_id, confirmation_sent_at);
CREATE INDEX IF NOT EXISTS idx_reservations_manager_notified ON reservations(organization_id, manager_notified_at);

-- Audit trigger for updated_at
CREATE OR REPLACE TRIGGER reservations_updated_at
BEFORE UPDATE ON reservations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS Policy: Users can only update their own organization's reservations
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservations_update_own_org" ON reservations
FOR UPDATE
USING (organization_id = (SELECT organization_id FROM auth.users WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM auth.users WHERE id = auth.uid()));
