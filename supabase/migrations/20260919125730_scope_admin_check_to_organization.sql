-- Fix critical cross-tenant leak in user_profiles RLS.
--
-- Root cause: is_admin() checks only role = 'admin' for the current user,
-- with no organization scoping at all:
--
--   CREATE FUNCTION is_admin() RETURNS boolean AS $$
--     SELECT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
--   $$;
--
-- Two policies on user_profiles used this bare check with no additional
-- organization filter:
--   admins_all        (ALL)    USING (is_admin())
--   users_select_own  (SELECT) USING (id = auth.uid() OR is_admin())
--
-- Any admin of any organization could therefore select, insert, update or
-- delete the user_profiles rows of every other organization on the
-- platform — reading other companies' staff data and, via UPDATE, editing
-- their roles or organization assignment.
--
-- Note: is_admin() itself is left unchanged. It is also used (correctly)
-- in guests_delete and owners_delete, always already ANDed with an
-- explicit organization_id = get_user_organization_id() check in those
-- policies, so it is not unscoped there. This migration only replaces the
-- two unscoped usages on user_profiles with a new, organization-aware
-- check.
--
-- These two policies were never captured in a migration file (patched
-- directly on staging/production at some point), so this migration is
-- also what brings them under version control for the first time.
--
-- Verified on staging and production via pg_policies before and after.

CREATE OR REPLACE FUNCTION public.is_org_admin(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin' AND organization_id = target_org_id
  );
$function$;

ALTER POLICY admins_all ON public.user_profiles
USING (public.is_org_admin(organization_id));

ALTER POLICY users_select_own ON public.user_profiles
USING ((id = auth.uid()) OR public.is_org_admin(organization_id));
