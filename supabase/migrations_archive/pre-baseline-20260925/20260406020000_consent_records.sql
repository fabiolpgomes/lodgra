-- Story 11.1: Cookie Consent — RGPD/LGPD Compliant
-- Creates consent_records table for server-side consent registration

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('analytics', 'marketing', 'essential', 'terms', 'privacy_policy')),
  consent_value BOOLEAN NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consent_records_user ON consent_records(user_id);
CREATE INDEX idx_consent_records_type ON consent_records(consent_type, created_at DESC);

-- RLS policies
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anonymous consent registration)
CREATE POLICY "consent_records_insert_anyone"
  ON consent_records FOR INSERT
  WITH CHECK (true);

-- Users can read their own consent records
CREATE POLICY "consent_records_select_own"
  ON consent_records FOR SELECT
  USING (user_id = auth.uid());

-- Admin can read all consent records (for compliance dashboard)
CREATE POLICY "consent_records_select_admin"
  ON consent_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );
