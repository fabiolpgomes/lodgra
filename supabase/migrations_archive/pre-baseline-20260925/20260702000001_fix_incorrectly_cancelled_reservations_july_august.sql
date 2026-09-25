-- Fix: Restore reservations incorrectly marked as cancelled in July & August 2026
-- Issue: Calendar synchronization incorrectly updated reservation status to 'cancelled'
-- Solution: Restore to 'confirmed' status and clear cancellation fields for July-August bookings

BEGIN;

-- Update reservations with check-in dates in July 2026
UPDATE reservations
SET
  status = 'confirmed',
  cancelled_at = NULL,
  cancellation_reason = NULL,
  updated_at = now()
WHERE
  status = 'cancelled'
  AND EXTRACT(YEAR FROM check_in) = 2026
  AND EXTRACT(MONTH FROM check_in) IN (7, 8)
  AND cancellation_reason IS NULL
  AND cancelled_at IS NOT NULL;

-- Log the changes
CREATE TABLE IF NOT EXISTS reservation_corrections (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  reservation_id UUID NOT NULL,
  original_status VARCHAR,
  corrected_status VARCHAR,
  reason TEXT,
  corrected_at TIMESTAMPTZ DEFAULT now()
);

-- Create a record of this correction
INSERT INTO reservation_corrections (reservation_id, original_status, corrected_status, reason)
SELECT
  id,
  'cancelled',
  'confirmed',
  'Calendar sync error - July/August 2026'
FROM reservations
WHERE
  status = 'confirmed'
  AND EXTRACT(YEAR FROM check_in) = 2026
  AND EXTRACT(MONTH FROM check_in) IN (7, 8);

COMMIT;
