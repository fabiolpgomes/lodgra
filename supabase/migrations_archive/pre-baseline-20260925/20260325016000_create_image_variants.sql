-- Migration: Create image_variants table for storing responsive image metadata
-- Date: 2026-03-25
-- Purpose: Store metadata for generated image variants (thumb, mobile, tablet, desktop)

BEGIN;

-- Create image_variants table
CREATE TABLE IF NOT EXISTS image_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_image_id UUID NOT NULL REFERENCES property_images(id) ON DELETE CASCADE,
  variant_type TEXT NOT NULL CHECK (variant_type IN ('thumb', 'mobile', 'tablet', 'desktop', 'original')),
  storage_path TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  file_size_bytes INTEGER NOT NULL DEFAULT 0,
  format TEXT NOT NULL CHECK (format IN ('webp', 'jpeg')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (property_image_id, variant_type, format)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_image_variants_property_image_id
  ON image_variants(property_image_id);

CREATE INDEX IF NOT EXISTS idx_image_variants_variant_type
  ON image_variants(variant_type);

CREATE INDEX IF NOT EXISTS idx_image_variants_format
  ON image_variants(format);

-- Enable RLS
ALTER TABLE image_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view variants of images they have access to
-- (inherited from property_images via foreign key)
CREATE POLICY "view_image_variants_via_property_images"
  ON image_variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM property_images pi
      WHERE pi.id = property_image_id
      AND (
        -- User's organization matches property's organization
        (auth.jwt() ->> 'organization_id')::uuid = (
          SELECT p.organization_id FROM properties p WHERE p.id = pi.property_id
        )
        OR
        -- OR property is public (unauthenticated access)
        (
          SELECT p.is_public FROM properties p WHERE p.id = pi.property_id
        ) = true
      )
    )
  );

-- RLS Policy: Only admins can delete variants
CREATE POLICY "delete_image_variants_admin_only"
  ON image_variants FOR DELETE
  USING (
    auth.jwt() ->> 'role' = 'admin'
    AND (auth.jwt() ->> 'organization_id')::uuid = (
      SELECT p.organization_id
      FROM property_images pi
      JOIN properties p ON p.id = pi.property_id
      WHERE pi.id = property_image_id
    )
  );

-- Create or replace trigger for updated_at
CREATE OR REPLACE FUNCTION update_image_variants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER image_variants_updated_at_trigger
BEFORE UPDATE ON image_variants
FOR EACH ROW
EXECUTE FUNCTION update_image_variants_updated_at();

COMMIT;
