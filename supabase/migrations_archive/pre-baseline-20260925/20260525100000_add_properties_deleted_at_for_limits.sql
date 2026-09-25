-- Ensure property limit checks can ignore soft-deleted properties.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_properties_organization_active_count
  ON public.properties (organization_id)
  WHERE deleted_at IS NULL;
