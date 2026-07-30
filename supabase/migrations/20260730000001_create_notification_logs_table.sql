-- Create notification_logs table for tracking email and SMS sends
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(10) NOT NULL CHECK (type IN ('email', 'sms')),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  guest_email VARCHAR(255),
  guest_phone VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  message_id VARCHAR(100),
  error_message TEXT,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notification_logs_reservation_id
  ON notification_logs(reservation_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_type
  ON notification_logs(type);

CREATE INDEX IF NOT EXISTS idx_notification_logs_status
  ON notification_logs(status);

CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at
  ON notification_logs(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_type_status
  ON notification_logs(type, status);

-- Enable Row Level Security
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can view notification logs
CREATE POLICY notification_logs_admin_view ON notification_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY notification_logs_admin_insert ON notification_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND (role = 'admin' OR role = 'system')
    )
  );
