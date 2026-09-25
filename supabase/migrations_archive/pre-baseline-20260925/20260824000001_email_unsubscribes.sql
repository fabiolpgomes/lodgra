CREATE TABLE email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (organization_id, customer_email)
);

ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_unsubscribes_select ON email_unsubscribes
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members
      WHERE organization_id = email_unsubscribes.organization_id
    )
  );

CREATE POLICY email_unsubscribes_upsert ON email_unsubscribes
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY email_unsubscribes_update ON email_unsubscribes
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE INDEX idx_email_unsubscribes_org ON email_unsubscribes(organization_id);
CREATE INDEX idx_email_unsubscribes_email ON email_unsubscribes(customer_email);
