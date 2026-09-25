-- Add bidirectional iCal sync support
-- This migration adds columns to track outbound synchronization to platforms

-- 1. Add columns to reservations table for outbound sync tracking
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS synced_to_platforms BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS synced_platforms_at TIMESTAMP NULL;

-- 2. Add columns to sync_logs table for reservation-specific tracking
ALTER TABLE sync_logs
ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES reservations(id),
ADD COLUMN IF NOT EXISTS message TEXT NULL;

-- 3. Create indexes for performance
-- Index for checking availability (most common query)
CREATE INDEX IF NOT EXISTS idx_reservations_property_status_dates
ON reservations(property_listing_id, status, check_in, check_out)
WHERE status IN ('confirmed', 'pending');

-- Index for sync tracking
CREATE INDEX IF NOT EXISTS idx_sync_logs_reservation_id
ON sync_logs(reservation_id);

CREATE INDEX IF NOT EXISTS idx_sync_logs_property_listing_direction
ON sync_logs(property_listing_id, direction, synced_at);

-- Index for synced_platforms tracking
CREATE INDEX IF NOT EXISTS idx_reservations_synced_platforms
ON reservations(synced_to_platforms, synced_platforms_at);

-- 4. Add comment for documentation
COMMENT ON COLUMN reservations.synced_to_platforms
IS 'Tracks if this direct reservation was registered with outbound platforms (Booking, Airbnb, Flatio)';

COMMENT ON COLUMN reservations.synced_platforms_at
IS 'Timestamp when the reservation was marked as synced to platforms';

COMMENT ON COLUMN sync_logs.reservation_id
IS 'Reference to the reservation being synced (for outbound syncs)';

COMMENT ON COLUMN sync_logs.message
IS 'Human-readable message about the sync operation (e.g., awaiting platform polling)';
