-- Add min_nights (minimum stay requirement) to properties table
-- Default to 1 night, acts as fallback when no pricing rules apply
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS min_nights INTEGER NOT NULL DEFAULT 1
    CHECK (min_nights >= 1);

-- Index for filtering by minimum night requirements
CREATE INDEX IF NOT EXISTS idx_properties_min_nights ON public.properties(min_nights);
