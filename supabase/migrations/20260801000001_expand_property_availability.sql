-- Epic 43: Expand property_availability with new fields
-- Adds support for:
-- - Last-minute booking allowance
-- - Availability window (in months)
-- - Beyond-window booking allowance

-- The legacy cleanup migration removed this table, but the calendar settings
-- API still uses it as the source of truth for availability rules. Recreate
-- the base shape here so a clean migration run remains valid.
CREATE TABLE IF NOT EXISTS property_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  min_nights INT DEFAULT 1 CHECK (min_nights >= 1),
  max_nights INT DEFAULT 365 CHECK (max_nights >= 1),
  advance_notice_days INT DEFAULT 0 CHECK (advance_notice_days >= 0),
  notice_for_same_day TIME DEFAULT '00:00',
  preparation_days INT DEFAULT 0 CHECK (preparation_days >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(property_id)
);

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
