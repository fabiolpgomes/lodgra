-- Create organization branding table using the current user_profiles model.

CREATE TABLE IF NOT EXISTS public.organization_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#1E40AF',
  secondary_color TEXT DEFAULT '#6B7280',
  accent_color TEXT DEFAULT '#FFC000',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organization_branding_org_id
  ON public.organization_branding(organization_id);

ALTER TABLE public.organization_branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_branding_select ON public.organization_branding;
DROP POLICY IF EXISTS org_branding_update ON public.organization_branding;
DROP POLICY IF EXISTS org_branding_insert ON public.organization_branding;

CREATE POLICY org_branding_select ON public.organization_branding
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.organization_id = organization_branding.organization_id
    )
  );

CREATE POLICY org_branding_update ON public.organization_branding
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.organization_id = organization_branding.organization_id
        AND up.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.organization_id = organization_branding.organization_id
        AND up.role = 'admin'
    )
  );

CREATE POLICY org_branding_insert ON public.organization_branding
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.organization_id = organization_branding.organization_id
        AND up.role = 'admin'
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.organization_branding TO authenticated;

NOTIFY pgrst, 'reload schema';
