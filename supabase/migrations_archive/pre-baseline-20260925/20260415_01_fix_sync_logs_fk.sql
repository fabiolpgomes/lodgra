-- Fix foreign key constraint for sync_logs.reservation_id
-- Add ON DELETE CASCADE to allow proper cascade deletes

-- 1. Drop the existing foreign key constraint
ALTER TABLE sync_logs
DROP CONSTRAINT IF EXISTS sync_logs_reservation_id_fkey;

-- 2. Recreate with ON DELETE CASCADE
ALTER TABLE sync_logs
ADD CONSTRAINT sync_logs_reservation_id_fkey
FOREIGN KEY (reservation_id)
REFERENCES reservations(id)
ON DELETE CASCADE;

COMMENT ON CONSTRAINT sync_logs_reservation_id_fkey ON sync_logs
IS 'Foreign key to reservations with cascading delete for data cleanup';
