-- Epic 43: Expand property_availability with new fields
-- Adds support for:
-- - Last-minute booking allowance
-- - Availability window (in months)
-- - Beyond-window booking allowance

ALTER TABLE property_availability
ADD COLUMN IF NOT EXISTS allow_last_minute_bookings BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS availability_window_months INT DEFAULT 12 CHECK (availability_window_months IN (3, 6, 9, 12, 24)),
ADD COLUMN IF NOT EXISTS allow_bookings_beyond_window BOOLEAN DEFAULT false;

-- Update any existing rows to have sensible defaults
UPDATE property_availability
SET allow_last_minute_bookings = false,
    availability_window_months = 12,
    allow_bookings_beyond_window = false
WHERE allow_last_minute_bookings IS NULL;

-- Create index for queries by availability window
CREATE INDEX IF NOT EXISTS idx_property_availability_window
  ON property_availability(property_id, availability_window_months);

COMMENT ON COLUMN property_availability.allow_last_minute_bookings IS
  'Flag to allow reservations with less than 1 day notice (requires approval)';

COMMENT ON COLUMN property_availability.availability_window_months IS
  'Number of months ahead that the property accepts bookings (3, 6, 9, 12, or 24)';

COMMENT ON COLUMN property_availability.allow_bookings_beyond_window IS
  'Flag to allow booking requests beyond the availability window (marked as pending)';

-- Verify migration
SELECT 'property_availability expanded' as status;
