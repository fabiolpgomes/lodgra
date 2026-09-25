-- Add phone and country columns to guests table
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT;

-- Add indexes for phone lookups (useful for finding duplicate guests)
CREATE INDEX IF NOT EXISTS idx_guests_phone_organization
  ON public.guests(phone, organization_id)
  WHERE phone IS NOT NULL;
