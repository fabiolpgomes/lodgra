-- Story 16.2: Add notes column to reservations (guest observations)
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN reservations.notes IS 'Free-text guest observations or special requests';
