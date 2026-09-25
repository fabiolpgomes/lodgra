-- Fix critical cross-tenant data leak in properties_authenticated_select.
--
-- Root cause: migration 20260813172949_optimize_core_tenant_rls.sql
-- consolidated the authenticated SELECT policy but placed the
-- organization_id check only inside the second branch of an OR:
--
--   USING (
--     deleted_at IS NULL
--     AND (
--       is_public = TRUE
--       OR (organization_id = get_user_organization_id() AND user_has_property_access(id))
--     )
--   )
--
-- Any property with is_public = TRUE satisfied the whole condition on its
-- own, so ANY authenticated user in ANY organization could see every other
-- organization's public properties (and, downstream, their reservations
-- and expenses, since those policies join back to properties). Confirmed
-- empirically: a freshly created, isolated test organization could see all
-- 10 public properties belonging to Algarve Home Stay's organization.
--
-- Fix: require organization_id to match unconditionally. is_public now
-- only grants extra visibility *within* the user's own organization.
-- Public, unauthenticated access to public properties (guest booking pages)
-- is unaffected — that is handled entirely by properties_public_select,
-- a separate policy scoped to the anon role.
--
-- Verified on staging and production via pg_policies before and after.

ALTER POLICY properties_authenticated_select ON public.properties
USING (
  deleted_at IS NULL
  AND organization_id = public.get_user_organization_id()
  AND (is_public = TRUE OR public.user_has_property_access(id))
);
