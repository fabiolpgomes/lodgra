-- Public contact profile for direct booking pages.

CREATE TABLE IF NOT EXISTS public.organization_public_profile (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_email TEXT,
  contact_phone TEXT,
  whatsapp_number TEXT,
  website_url TEXT,
  instagram_url TEXT,
  public_contact_message TEXT,
  address_line TEXT,
  city TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT organization_public_profile_email_length CHECK (contact_email IS NULL OR length(contact_email) <= 254),
  CONSTRAINT organization_public_profile_phone_length CHECK (contact_phone IS NULL OR length(contact_phone) <= 40),
  CONSTRAINT organization_public_profile_whatsapp_length CHECK (whatsapp_number IS NULL OR length(whatsapp_number) <= 40),
  CONSTRAINT organization_public_profile_website_length CHECK (website_url IS NULL OR length(website_url) <= 500),
  CONSTRAINT organization_public_profile_instagram_length CHECK (instagram_url IS NULL OR length(instagram_url) <= 500),
  CONSTRAINT organization_public_profile_message_length CHECK (public_contact_message IS NULL OR length(public_contact_message) <= 180),
  CONSTRAINT organization_public_profile_address_length CHECK (address_line IS NULL OR length(address_line) <= 255),
  CONSTRAINT organization_public_profile_city_length CHECK (city IS NULL OR length(city) <= 120),
  CONSTRAINT organization_public_profile_country_length CHECK (country IS NULL OR length(country) <= 120)
);

ALTER TABLE public.organization_public_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_public_profile_select ON public.organization_public_profile;
DROP POLICY IF EXISTS org_public_profile_insert ON public.organization_public_profile;
DROP POLICY IF EXISTS org_public_profile_update ON public.organization_public_profile;

CREATE POLICY org_public_profile_select ON public.organization_public_profile
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.organization_id = organization_public_profile.organization_id
    )
  );

CREATE POLICY org_public_profile_insert ON public.organization_public_profile
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.organization_id = organization_public_profile.organization_id
        AND up.role = 'admin'
    )
  );

CREATE POLICY org_public_profile_update ON public.organization_public_profile
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.organization_id = organization_public_profile.organization_id
        AND up.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.organization_id = organization_public_profile.organization_id
        AND up.role = 'admin'
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.organization_public_profile TO authenticated;

NOTIFY pgrst, 'reload schema';
