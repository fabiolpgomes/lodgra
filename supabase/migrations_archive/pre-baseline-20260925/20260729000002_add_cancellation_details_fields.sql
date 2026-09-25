-- Add cancellation details fields for Story 40.1 serious_issue workflow
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancellation_description TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancellation_evidence_url TEXT;
