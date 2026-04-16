-- Add ical_export_token to properties for secure export endpoint
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS ical_export_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT;

-- Create index for token lookups
CREATE INDEX IF NOT EXISTS idx_properties_ical_export_token
  ON public.properties(ical_export_token)
  WHERE ical_export_token IS NOT NULL;
