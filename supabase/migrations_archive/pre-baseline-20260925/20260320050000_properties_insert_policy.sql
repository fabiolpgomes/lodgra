-- ============================================================
-- Add INSERT policy for properties table
-- ============================================================

-- Policy: Allow admin/manager to insert properties in their organization
DROP POLICY IF EXISTS "properties_insert" ON public.properties;

CREATE POLICY "properties_insert"
  ON public.properties FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Property must belong to user's organization
    organization_id = get_user_organization_id()
    -- User must be admin or manager
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Policy: Allow admin/manager to update properties in their organization
DROP POLICY IF EXISTS "properties_update" ON public.properties;

CREATE POLICY "properties_update"
  ON public.properties FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Policy: Allow admin to delete properties in their organization
DROP POLICY IF EXISTS "properties_delete" ON public.properties;

CREATE POLICY "properties_delete"
  ON public.properties FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
