-- Add breakdown columns for guest counts (adults and children)
-- Tracks detailed guest composition for reservations

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS adults INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS children INTEGER DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN reservations.adults IS 'Number of adult guests';
COMMENT ON COLUMN reservations.children IS 'Number of child guests (typically up to 12 years)';
