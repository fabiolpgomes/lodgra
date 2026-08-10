-- Add error tracking fields to property_listings table
-- Purpose: Track sync errors and failed URL validations
-- Added in Story 44.1 - Phase 1 iCal Data Repair

ALTER TABLE property_listings
ADD COLUMN last_sync_error TEXT NULL,
ADD COLUMN sync_error_count INT DEFAULT 0;

-- Create index for finding failed syncs
CREATE INDEX idx_property_listings_sync_error
ON property_listings(sync_error_count DESC)
WHERE sync_enabled = true AND sync_error_count > 0;

-- Add comment for documentation
COMMENT ON COLUMN property_listings.last_sync_error
IS 'Error message from last failed sync attempt (NULL if success)';

COMMENT ON COLUMN property_listings.sync_error_count
IS 'Number of consecutive sync failures (reset to 0 on success)';
