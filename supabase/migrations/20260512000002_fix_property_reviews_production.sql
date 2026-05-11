-- Fix: ensure property_reviews table exists in production (idempotent re-apply)
-- The 20260510_01 migration was tracked but the table appears missing from PostgREST schema cache.

CREATE TABLE IF NOT EXISTS property_reviews (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid         NOT NULL REFERENCES organizations(id),
  property_id     uuid         NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  source          text         NOT NULL CHECK (source IN ('booking', 'airbnb', 'google', 'tripadvisor', 'direct', 'other')),
  reviewer_name   text         NOT NULL,
  rating          numeric(3,1) NOT NULL CHECK (rating >= 1.0 AND rating <= 10.0),
  review_text     text         CHECK (review_text IS NULL OR char_length(review_text) <= 500),
  review_date     date         NOT NULL,
  is_featured     boolean      NOT NULL DEFAULT false,
  created_at      timestamptz  DEFAULT now(),
  updated_at      timestamptz  DEFAULT now()
);

ALTER TABLE property_reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'property_reviews' AND policyname = 'property_reviews_select'
  ) THEN
    CREATE POLICY "property_reviews_select" ON property_reviews
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'property_reviews' AND policyname = 'property_reviews_insert'
  ) THEN
    CREATE POLICY "property_reviews_insert" ON property_reviews
      FOR INSERT WITH CHECK (
        organization_id = (
          SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'property_reviews' AND policyname = 'property_reviews_update'
  ) THEN
    CREATE POLICY "property_reviews_update" ON property_reviews
      FOR UPDATE USING (
        organization_id = (
          SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'property_reviews' AND policyname = 'property_reviews_delete'
  ) THEN
    CREATE POLICY "property_reviews_delete" ON property_reviews
      FOR DELETE USING (
        organization_id = (
          SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_property_reviews_property_featured
  ON property_reviews (property_id, is_featured);

CREATE INDEX IF NOT EXISTS idx_property_reviews_org_id
  ON property_reviews (organization_id);

-- Reload PostgREST schema cache so the table becomes immediately accessible
NOTIFY pgrst, 'reload schema';
