-- Migration: Add storage_path to property_images
-- Purpose: Store the Supabase Storage path for uploaded images
-- Date: 2026-03-25

BEGIN;

ALTER TABLE property_images
ADD COLUMN storage_path TEXT;

COMMENT ON COLUMN property_images.storage_path IS 'Path in Supabase Storage bucket (e.g., "org-id/prop-id/filename.jpg")';

COMMIT;
