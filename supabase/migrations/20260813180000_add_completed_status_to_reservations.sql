-- Add 'completed' status to reservations
-- Allows marking reservations as completed when they are finalized
-- Status values: pending, confirmed, cancelled, completed

-- Drop existing constraint
ALTER TABLE public.reservations
DROP CONSTRAINT IF EXISTS res_status_valid;

-- Add new constraint with 'completed' status
ALTER TABLE public.reservations
ADD CONSTRAINT res_status_valid
CHECK (reservation_status IN ('pending', 'confirmed', 'cancelled', 'completed'));

-- Log migration
COMMENT ON TABLE public.reservations IS 'Reservations table with support for completed status (added 2026-08-13)';
