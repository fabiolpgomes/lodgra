-- Add review fields to reservations table for manual review workflow
ALTER TABLE reservations ADD COLUMN review_token TEXT UNIQUE;
ALTER TABLE reservations ADD COLUMN review_token_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reservations ADD COLUMN manual_review_notes TEXT;
ALTER TABLE reservations ADD COLUMN reviewed_by UUID REFERENCES auth.users(id);
ALTER TABLE reservations ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;

-- Index for token lookups
CREATE INDEX idx_reservations_review_token ON reservations(review_token, review_token_expires_at);

-- Allow manager access to review data (RLS policy)
CREATE POLICY "Managers can review reservations"
  ON reservations
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT owner_id FROM properties WHERE id = property_id
    )
  );
