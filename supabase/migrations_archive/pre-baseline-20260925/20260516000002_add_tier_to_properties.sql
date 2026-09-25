-- Add tier column to properties table for premium feature gating
-- Story 27.4: Premium SaaS Feature - Google Distribution Dashboard

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'enterprise'));

-- Create index for tier-based filtering
CREATE INDEX IF NOT EXISTS idx_properties_tier
  ON public.properties(tier);

-- Backfill existing properties with 'free' tier (default value already set above during ALTER)
UPDATE public.properties SET tier = 'free' WHERE tier IS NULL;
