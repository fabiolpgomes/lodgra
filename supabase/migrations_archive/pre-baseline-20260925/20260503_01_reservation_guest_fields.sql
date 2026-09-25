-- Story 16.1: Add adults and children columns to reservations
-- adults: number of adult guests (≥1), defaults to 1
-- children: number of child guests (≤12 years old), defaults to 0

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS adults integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS children integer NOT NULL DEFAULT 0;

-- Add check constraints to ensure non-negative values
ALTER TABLE reservations
  ADD CONSTRAINT reservations_adults_positive CHECK (adults >= 1),
  ADD CONSTRAINT reservations_children_non_negative CHECK (children >= 0);

COMMENT ON COLUMN reservations.adults IS 'Number of adult guests (>=1)';
COMMENT ON COLUMN reservations.children IS 'Number of child guests (up to 12 years old, >=0)';
