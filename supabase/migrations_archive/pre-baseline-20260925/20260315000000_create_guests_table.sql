-- Create guests table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  organization_id UUID REFERENCES public.organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, organization_id)
);

-- Enable RLS
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "guests_select"
  ON public.guests FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "guests_insert"
  ON public.guests FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "guests_update"
  ON public.guests FOR UPDATE
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_guests_organization_id ON public.guests(organization_id);
CREATE INDEX IF NOT EXISTS idx_guests_email_organization ON public.guests(email, organization_id);
