-- Harden the four Multi-OTA core tables exposed through PostgREST.
-- Policies are tenant-scoped and property-scoped; service_role keeps its
-- intentional RLS bypass for background synchronization jobs.

-- Repair pre-foundation listing tenancy before enforcing the composite FK.
UPDATE public.property_listings AS pl
SET organization_id = p.organization_id
FROM public.properties AS p
WHERE p.id = pl.property_id
  AND pl.organization_id IS DISTINCT FROM p.organization_id;

ALTER TABLE public.property_listings
  ADD CONSTRAINT property_listings_property_org_fk
  FOREIGN KEY (property_id, organization_id)
  REFERENCES public.properties (id, organization_id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.property_listings
  VALIDATE CONSTRAINT property_listings_property_org_fk;

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_property_org_fk
  FOREIGN KEY (property_id, organization_id)
  REFERENCES public.properties (id, organization_id)
  ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE public.reservations
  VALIDATE CONSTRAINT reservations_property_org_fk;

-- SECURITY DEFINER helpers are required to avoid recursive RLS lookups.
-- Pin their search path and remove anonymous/public execution.
ALTER FUNCTION public.get_user_organization_id()
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.user_has_property_access(uuid)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.is_admin()
  SET search_path = pg_catalog, public;

REVOKE EXECUTE ON FUNCTION public.get_user_organization_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_has_property_access(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_property_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- properties
DROP POLICY IF EXISTS "Public read for is_public properties" ON public.properties;
DROP POLICY IF EXISTS properties_delete ON public.properties;
DROP POLICY IF EXISTS properties_insert ON public.properties;
DROP POLICY IF EXISTS properties_select ON public.properties;
DROP POLICY IF EXISTS properties_update ON public.properties;

CREATE POLICY properties_public_select
ON public.properties FOR SELECT TO anon, authenticated
USING (is_public = TRUE AND deleted_at IS NULL);

CREATE POLICY properties_tenant_select
ON public.properties FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  AND organization_id = public.get_user_organization_id()
  AND public.user_has_property_access(id)
);

CREATE POLICY properties_tenant_insert
ON public.properties FOR INSERT TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.organization_id = properties.organization_id
      AND up.role = ANY (ARRAY['admin', 'gestor'])
  )
);

CREATE POLICY properties_tenant_update
ON public.properties FOR UPDATE TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.user_has_property_access(id)
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.role = ANY (ARRAY['admin', 'gestor'])
  )
)
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND public.user_has_property_access(id)
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.role = ANY (ARRAY['admin', 'gestor'])
  )
);

CREATE POLICY properties_tenant_delete
ON public.properties FOR DELETE TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.user_has_property_access(id)
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
  )
);

-- property_listings
DROP POLICY IF EXISTS property_listings_delete ON public.property_listings;
DROP POLICY IF EXISTS property_listings_insert ON public.property_listings;
DROP POLICY IF EXISTS property_listings_select ON public.property_listings;
DROP POLICY IF EXISTS property_listings_update ON public.property_listings;

CREATE POLICY property_listings_tenant_select
ON public.property_listings FOR SELECT TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.user_has_property_access(property_id)
);

CREATE POLICY property_listings_tenant_insert
ON public.property_listings FOR INSERT TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND public.user_has_property_access(property_id)
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.role = ANY (ARRAY['admin', 'gestor'])
  )
);

CREATE POLICY property_listings_tenant_update
ON public.property_listings FOR UPDATE TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.user_has_property_access(property_id)
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.role = ANY (ARRAY['admin', 'gestor'])
  )
)
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND public.user_has_property_access(property_id)
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.role = ANY (ARRAY['admin', 'gestor'])
  )
);

CREATE POLICY property_listings_tenant_delete
ON public.property_listings FOR DELETE TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.user_has_property_access(property_id)
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
  )
);

-- reservations
DROP POLICY IF EXISTS res_isolation ON public.reservations;

CREATE POLICY reservations_tenant_select
ON public.reservations FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  AND organization_id = public.get_user_organization_id()
  AND public.user_has_property_access(property_id)
);

CREATE POLICY reservations_tenant_insert
ON public.reservations FOR INSERT TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND public.user_has_property_access(property_id)
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.role = ANY (ARRAY['admin', 'gestor'])
  )
);

CREATE POLICY reservations_tenant_update
ON public.reservations FOR UPDATE TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.user_has_property_access(property_id)
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.role = ANY (ARRAY['admin', 'gestor', 'manager', 'owner'])
  )
)
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND public.user_has_property_access(property_id)
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.role = ANY (ARRAY['admin', 'gestor', 'manager', 'owner'])
  )
);

CREATE POLICY reservations_tenant_delete
ON public.reservations FOR DELETE TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.user_has_property_access(property_id)
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
  )
);

-- channel_connections. Historical OTA connections are shared; authenticated
-- users may read a shared connection only when it is referenced by one of
-- their accessible reservations. Mutations remain restricted to own-tenant
-- connections.
DROP POLICY IF EXISTS cc_isolation ON public.channel_connections;

CREATE POLICY channel_connections_tenant_select
ON public.channel_connections FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  AND (
    organization_id = public.get_user_organization_id()
    OR EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.channel_connection_id = channel_connections.id
        AND r.organization_id = public.get_user_organization_id()
        AND public.user_has_property_access(r.property_id)
        AND r.deleted_at IS NULL
    )
  )
);

CREATE POLICY channel_connections_tenant_insert
ON public.channel_connections FOR INSERT TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.role = ANY (ARRAY['admin', 'gestor'])
  )
);

CREATE POLICY channel_connections_tenant_update
ON public.channel_connections FOR UPDATE TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.role = ANY (ARRAY['admin', 'gestor'])
  )
)
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.role = ANY (ARRAY['admin', 'gestor'])
  )
);

CREATE POLICY channel_connections_tenant_delete
ON public.channel_connections FOR DELETE TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
  )
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
