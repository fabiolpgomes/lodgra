-- Cover the composite tenant foreign keys introduced by the RLS hardening.
-- The reservations index also covers the pre-existing property_id-only FK.
CREATE INDEX IF NOT EXISTS idx_property_listings_property_organization
  ON public.property_listings (property_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_reservations_property_organization
  ON public.reservations (property_id, organization_id);

-- Keep anonymous public access separate while consolidating authenticated
-- property visibility into a single permissive SELECT policy.
DROP POLICY IF EXISTS properties_public_select ON public.properties;
DROP POLICY IF EXISTS properties_tenant_select ON public.properties;

CREATE POLICY properties_public_select
ON public.properties FOR SELECT TO anon
USING (is_public = TRUE AND deleted_at IS NULL);

CREATE POLICY properties_authenticated_select
ON public.properties FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  AND (
    is_public = TRUE
    OR (
      organization_id = public.get_user_organization_id()
      AND public.user_has_property_access(id)
    )
  )
);
