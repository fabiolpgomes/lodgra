-- Story 11.4: Data Deletion — Right to Erasure (RGPD Art. 17 / LGPD Art. 18)
-- Creates deletion_requests table for tracking account deletion requests

CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deletion_requests_user ON deletion_requests(user_id);
CREATE INDEX idx_deletion_requests_status ON deletion_requests(status, scheduled_at);

-- RLS policies
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can read their own deletion requests
CREATE POLICY "deletion_requests_select_own"
  ON deletion_requests FOR SELECT
  USING (user_id = auth.uid());

-- Admin can read all deletion requests
CREATE POLICY "deletion_requests_select_admin"
  ON deletion_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );

-- Users can insert their own deletion requests
CREATE POLICY "deletion_requests_insert_own"
  ON deletion_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own deletion requests (cancel)
CREATE POLICY "deletion_requests_update_own"
  ON deletion_requests FOR UPDATE
  USING (user_id = auth.uid());
