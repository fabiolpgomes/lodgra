-- Epic 9 — Public property pages
-- Adds slug, description, photos, amenities, is_public to properties

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_properties_slug ON properties(slug);
CREATE INDEX IF NOT EXISTS idx_properties_is_public ON properties(is_public);

-- Allow unauthenticated reads for public properties
-- (used by /p/[slug] page and public availability API)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read for is_public properties' AND tablename = 'properties') THEN
    CREATE POLICY "Public read for is_public properties" ON properties FOR SELECT USING (is_public = true);
  END IF;
END $$;
