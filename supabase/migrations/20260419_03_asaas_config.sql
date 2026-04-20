-- Add Asaas configuration to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS asaas_api_key TEXT,
  ADD COLUMN IF NOT EXISTS asaas_environment TEXT DEFAULT 'sandbox';

-- Allow members to update their own organization settings (admin only)
DROP POLICY IF EXISTS "org_members_update" ON public.organizations;
CREATE POLICY "org_members_update" ON public.organizations
  FOR UPDATE USING (
    id = get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
