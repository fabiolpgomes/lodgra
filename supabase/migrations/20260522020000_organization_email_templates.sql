-- Organization Email Templates table
CREATE TABLE organization_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  confirmation_subject TEXT DEFAULT 'Booking Confirmation',
  confirmation_message TEXT,
  from_email TEXT DEFAULT 'noreply@lodgra.io',
  from_name TEXT,
  reply_to_email TEXT,
  include_company_logo BOOLEAN DEFAULT true,
  footer_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE organization_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_email_select ON organization_email_templates
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members
      WHERE organization_id = organization_email_templates.organization_id
    )
  );

CREATE POLICY org_email_update ON organization_email_templates
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members
      WHERE organization_id = organization_email_templates.organization_id
      AND role = 'admin'
    )
  );

CREATE POLICY org_email_insert ON organization_email_templates
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM organization_members
      WHERE organization_id = organization_email_templates.organization_id
      AND role = 'admin'
    )
  );

CREATE INDEX idx_email_templates_org ON organization_email_templates(organization_id);

-- Email Sent Tracking table
CREATE TABLE email_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id),
  customer_email TEXT NOT NULL,
  template_type TEXT DEFAULT 'confirmation',
  status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  retry_count INT DEFAULT 0
);

ALTER TABLE email_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_sent_select ON email_sent
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members
      WHERE organization_id = email_sent.organization_id
    )
  );

CREATE INDEX idx_email_sent_org ON email_sent(organization_id);
CREATE INDEX idx_email_sent_booking ON email_sent(booking_id);
CREATE INDEX idx_email_sent_status ON email_sent(status);
CREATE INDEX idx_email_sent_created ON email_sent(sent_at DESC);

-- Retention policy: auto-delete emails older than 90 days
-- (would be implemented via scheduled job - documented as TODO)
