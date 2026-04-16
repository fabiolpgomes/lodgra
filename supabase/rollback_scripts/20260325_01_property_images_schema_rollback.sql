-- Rollback: Property Images Schema
-- Date: 2026-03-25
-- Purpose: Reverse 20260325_01_property_images_schema.sql
-- Usage: Run only if migration needs to be reversed
-- Safety: Check no production data exists before running

BEGIN;

-- ============================================================================
-- SAFETY CHECKS
-- ============================================================================
-- Uncomment these checks before running rollback in production
/*
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM property_images) > 0 THEN
    RAISE EXCEPTION 'Cannot rollback: property_images table contains % rows. Please migrate data first.',
      (SELECT COUNT(*) FROM property_images);
  END IF;
END $$;
*/

-- ============================================================================
-- DROP RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "property_images_select_with_access" ON property_images;
DROP POLICY IF EXISTS "property_images_insert_manager_or_admin" ON property_images;
DROP POLICY IF EXISTS "property_images_update_manager_or_admin" ON property_images;
DROP POLICY IF EXISTS "property_images_delete_admin_only" ON property_images;
DROP POLICY IF EXISTS "property_images_select_public" ON property_images;

DROP POLICY IF EXISTS "image_variants_select_with_access" ON image_variants;
DROP POLICY IF EXISTS "image_variants_select_public" ON image_variants;

-- ============================================================================
-- DROP INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_property_images_property_order;
DROP INDEX IF EXISTS idx_property_images_org_property;
DROP INDEX IF EXISTS idx_property_images_primary;
DROP INDEX IF EXISTS idx_image_variants_property_image;

-- ============================================================================
-- DROP TABLES
-- ============================================================================

-- image_variants depends on property_images
DROP TABLE IF EXISTS image_variants;

-- property_images depends on properties and organizations
DROP TABLE IF EXISTS property_images;

-- ============================================================================
-- VERIFY RLS DISABLED
-- ============================================================================

ALTER TABLE IF EXISTS property_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS image_variants DISABLE ROW LEVEL SECURITY;

COMMIT;
