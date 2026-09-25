-- Epic 43: Add requires_approval flag to reservations
-- Used to mark reservations that need owner approval:
-- - Bookings with less than minimum notice
-- - Bookings beyond availability window
-- - Other special conditions

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approval_reason TEXT,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Create index for queries finding reservations pending approval
CREATE INDEX IF NOT EXISTS idx_reservations_requires_approval
  ON reservations(property_id, requires_approval)
  WHERE requires_approval = true;

-- Create index for owner approval queries
CREATE INDEX IF NOT EXISTS idx_reservations_approval_status
  ON reservations(property_id, requires_approval, status);

COMMENT ON COLUMN reservations.requires_approval IS
  'Flag indicating reservation requires owner approval before confirmation (e.g., last-minute booking, beyond window)';

COMMENT ON COLUMN reservations.approval_reason IS
  'Reason why approval is required (e.g., "Less than 1 day notice", "Beyond availability window")';

COMMENT ON COLUMN reservations.approved_at IS
  'Timestamp when reservation was approved by property owner';

-- Verify migration
SELECT 'requires_approval added to reservations' as status;
