-- Migration: Property Images Schema with WebP Variants
-- Date: 2026-03-25
-- Purpose: Add property_images and image_variants tables for multi-tenant image storage with Supabase Storage integration
-- Breaking: None (backward compatible, properties.photos remains until deprecation period)
-- Rollback: Run 20260325_01_property_images_schema_rollback.sql

BEGIN;

-- ============================================================================
-- TABLE: property_images
-- ============================================================================
-- Stores metadata about property images, organized by organization/property
-- Each image has multiple variants (webp at different resolutions)

CREATE TABLE IF NOT EXISTS property_images (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id       UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Original file info
  original_filename TEXT NOT NULL,

  -- Metadata for gallery display
  display_order     INTEGER NOT NULL DEFAULT 0,
  alt_text          TEXT,
  is_primary        BOOLEAN NOT NULL DEFAULT FALSE,

  -- File info (from original upload)
  file_size_bytes   INTEGER,
  mime_type         TEXT DEFAULT 'image/jpeg',

  -- Dimensions (for aspect-ratio preservation in responsive design)
  width             INTEGER NOT NULL CHECK (width > 0),
  height            INTEGER NOT NULL CHECK (height > 0),

  -- Audit trail
  uploaded_by       UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Constraints
  CONSTRAINT fk_property FOREIGN KEY (property_id)
    REFERENCES properties(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT fk_organization FOREIGN KEY (organization_id)
    REFERENCES organizations(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT fk_uploader FOREIGN KEY (uploaded_by)
    REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT valid_order CHECK (display_order >= 0)
);

COMMENT ON TABLE property_images IS 'Metadata for property images. Each property can have multiple images with variants (WebP at different resolutions). Organized by organization for multi-tenancy.';
COMMENT ON COLUMN property_images.id IS 'Unique identifier (UUID v4)';
COMMENT ON COLUMN property_images.organization_id IS 'Organization owning the property (multi-tenancy isolation)';
COMMENT ON COLUMN property_images.property_id IS 'Property this image belongs to';
COMMENT ON COLUMN property_images.original_filename IS 'Original filename from upload (e.g., "living-room.jpg")';
COMMENT ON COLUMN property_images.display_order IS 'Display order in gallery (0-indexed, can reorder via API)';
COMMENT ON COLUMN property_images.alt_text IS 'Alternative text for accessibility and SEO';
COMMENT ON COLUMN property_images.is_primary IS 'Cover photo for property listing (only one per property)';
COMMENT ON COLUMN property_images.width IS 'Original image width in pixels';
COMMENT ON COLUMN property_images.height IS 'Original image height in pixels';
COMMENT ON COLUMN property_images.uploaded_by IS 'User who uploaded this image';

-- ============================================================================
-- TABLE: image_variants
-- ============================================================================
-- Stores generated variants of images (WebP at different resolutions)
-- One property_images can have multiple variants: thumb, mobile, tablet, desktop, original

CREATE TABLE IF NOT EXISTS image_variants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_image_id UUID NOT NULL REFERENCES property_images(id) ON DELETE CASCADE,

  -- Variant type (responsive breakpoint)
  variant_type      VARCHAR(20) NOT NULL CHECK (variant_type IN ('thumb', 'mobile', 'tablet', 'desktop', 'original')),

  -- Storage path in Supabase Storage bucket (gs://bucket/org-id/prop-id/image-id/variant.webp)
  storage_path      TEXT NOT NULL,

  -- Dimensions of this variant
  width             INTEGER NOT NULL CHECK (width > 0),
  height            INTEGER NOT NULL CHECK (height > 0),

  -- File info
  file_size_bytes   INTEGER,
  format            VARCHAR(10) NOT NULL CHECK (format IN ('webp', 'jpeg')),

  -- Audit
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Constraints
  CONSTRAINT fk_image FOREIGN KEY (property_image_id)
    REFERENCES property_images(id) ON DELETE CASCADE,
  CONSTRAINT unique_variant UNIQUE(property_image_id, variant_type, format),
  CONSTRAINT valid_path_format CHECK (storage_path LIKE '%/%')
);

COMMENT ON TABLE image_variants IS 'Generated image variants for responsive display. Each property_image can have multiple formats (WebP primary, JPEG fallback) at different resolutions (thumb, mobile, tablet, desktop).';
COMMENT ON COLUMN image_variants.variant_type IS 'Responsive breakpoint: thumb (300px), mobile (600px), tablet (1024px), desktop (1920px), original (full size)';
COMMENT ON COLUMN image_variants.storage_path IS 'Path in Supabase Storage bucket (e.g., "{org-id}/{prop-id}/{image-id}/desktop.webp")';
COMMENT ON COLUMN image_variants.format IS 'Image format: webp (primary, ~80% smaller) or jpeg (fallback)';

-- ============================================================================
-- INDEXES: Query Performance
-- ============================================================================

-- Ensure only one primary image per property
CREATE UNIQUE INDEX idx_property_images_one_primary_per_property
  ON property_images(property_id)
  WHERE is_primary = TRUE;

-- Most common query: Get all images for a property (ordered)
CREATE INDEX idx_property_images_property_order
  ON property_images(property_id, display_order)
  WHERE is_primary = FALSE;

-- Fast RLS checks: Get images by organization
CREATE INDEX idx_property_images_org_property
  ON property_images(organization_id, property_id);

-- Find primary image for property (OG image, metadata)
CREATE INDEX idx_property_images_primary
  ON property_images(property_id)
  WHERE is_primary = TRUE;

-- Variants by image (when fetching srcset)
CREATE INDEX idx_image_variants_property_image
  ON image_variants(property_image_id, variant_type, format);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS): Multi-Tenant Isolation
-- ============================================================================

ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_variants ENABLE ROW LEVEL SECURITY;

-- RLS POLICY: SELECT - Authenticated users can see images if they have property access
CREATE POLICY "property_images_select_with_access"
  ON property_images
  FOR SELECT
  USING (
    -- User's organization must match
    organization_id = get_user_organization_id()
    AND
    -- User must have access to this property (admin, manager, or explicit access)
    user_has_property_access(property_id)
  );

-- RLS POLICY: INSERT - Only authorized users can upload images (auth validated in API)
CREATE POLICY "property_images_insert_manager_or_admin"
  ON property_images
  FOR INSERT
  WITH CHECK (
    -- Must belong to user's organization
    organization_id = get_user_organization_id()
  );

-- RLS POLICY: UPDATE - Can reorder and edit metadata, but NOT storage path
CREATE POLICY "property_images_update_manager_or_admin"
  ON property_images
  FOR UPDATE
  USING (
    organization_id = get_user_organization_id()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND
    -- Cannot change original_filename or file_size (immutable)
    original_filename = (SELECT original_filename FROM property_images WHERE id = property_images.id)
    AND
    file_size_bytes = (SELECT file_size_bytes FROM property_images WHERE id = property_images.id)
  );

-- RLS POLICY: DELETE - Only admins can delete images (auth validated in API)
CREATE POLICY "property_images_delete_admin_only"
  ON property_images
  FOR DELETE
  USING (
    organization_id = get_user_organization_id()
  );

-- RLS POLICY: PUBLIC READ - Anyone can see images if property is public
CREATE POLICY "property_images_select_public"
  ON property_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_images.property_id
      AND p.is_public = TRUE
    )
  );

-- RLS POLICY: image_variants SELECT - Same as property_images
CREATE POLICY "image_variants_select_with_access"
  ON image_variants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM property_images pi
      WHERE pi.id = property_image_id
      AND pi.organization_id = get_user_organization_id()
      AND user_has_property_access(pi.property_id)
    )
  );

-- RLS POLICY: image_variants PUBLIC READ
CREATE POLICY "image_variants_select_public"
  ON image_variants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM property_images pi
      JOIN properties p ON p.id = pi.property_id
      WHERE pi.id = property_image_id
      AND p.is_public = TRUE
    )
  );

-- Note: INSERT/UPDATE/DELETE for image_variants handled by server-side (Edge Function)
-- No direct user access to image_variants

-- ============================================================================
-- STORAGE BUCKET STRUCTURE (Reference - created in Supabase Dashboard or CLI)
-- ============================================================================
/*
Bucket: property-images
Layout:
  {organization_id}/
    {property_id}/
      {property_image_id}/
        original.jpg                 -- Original uploaded file
        thumb.webp    (300x300)      -- Mobile gallery thumbnail
        mobile.webp   (600x600)      -- Mobile view
        mobile.jpeg   (600x600)      -- JPEG fallback for mobile
        tablet.webp   (1024x1024)    -- Tablet view
        tablet.jpeg   (1024x1024)    -- JPEG fallback for tablet
        desktop.webp  (1920x1920)    -- Desktop view
        desktop.jpeg  (1920x1920)    -- JPEG fallback for desktop

Edge Function Responsibilities:
  1. Receive uploaded original.jpg from client
  2. Store in correct path
  3. Generate all variants (thumb, mobile, tablet, desktop)
  4. Convert to WebP (primary) and JPEG (fallback)
  5. Insert records into property_images and image_variants
  6. Return URLs for all variants
*/

-- ============================================================================
-- MIGRATION SAFETY
-- ============================================================================
-- This migration creates new tables without modifying existing data
-- Backward compatibility maintained: properties.photos remains unchanged
-- Deprecation period: 6 months before removing properties.photos

COMMIT;
