-- Fix four more RLS issues found during the pre-launch security audit
-- (same audit that produced 20260919125720 and 20260919125730).
--
-- 1) calendar_blocks: the table had accumulated 8 policies for 4 commands
--    (2 per command) from incremental migrations that never dropped the
--    old ones. Since permissive policies OR together, the loosest one
--    always won:
--      - calendar_blocks_delete checked ONLY role IN ('admin','gestor'),
--        with no organization_id or property check at all. Any admin/
--        gestor from ANY organization could delete ANY other
--        organization's calendar blocks (sabotage: open up a competitor's
--        availability, cause overbooking).
--      - org_members_can_view_blocks checked only organization_id, no
--        property-level access check, letting any org member see every
--        property's calendar blocks regardless of assignment (same-tenant
--        over-exposure, not cross-tenant).
--    Consolidated down to 4 clean policies (select/insert/update/delete),
--    each requiring organization_id match + user_has_property_access +
--    the appropriate role for writes, matching the pattern already used
--    by reservations/property_listings.
--
-- 2) user_properties: "Admins can manage user_properties" checked only
--    role = 'admin', with no organization scoping. Any admin from any
--    organization could view, insert, update or delete the
--    user<->property assignment rows of every other organization —
--    exposing which staff have access to which properties platform-wide,
--    and letting a malicious admin delete another organization's
--    assignments to lock their own staff out of their own properties.
--    user_properties has no organization_id column of its own, so the
--    fix scopes through both sides of the relationship: the admin's
--    organization must match the organization of the target user AND
--    the organization of the target property.
--
-- 3) platforms: "Permitir tudo em platforms" was PERMISSIVE ALL for
--    {public} (i.e. anon included) with qual/with_check both `true` —
--    anyone, authenticated or not, could insert/update/delete rows in
--    this table. It is a shared reference table (channel names/codes),
--    not tenant data, so public SELECT is fine and kept; mutations are
--    now restricted to service_role.
--
-- 4) sync_logs: same "Permitir tudo" ALL-for-public pattern. Unlike
--    platforms this IS tenant-sensitive operational data (per-listing
--    sync status/errors), so it is now scoped to the owning
--    organization for SELECT via property_listings, and mutations are
--    restricted to service_role (rows are written by the sync worker,
--    not by end users).
--
-- Verified on staging and production via pg_policies before and after.

-- (1) calendar_blocks
DROP POLICY IF EXISTS admins_can_delete_blocks ON public.calendar_blocks;
DROP POLICY IF EXISTS calendar_blocks_delete ON public.calendar_blocks;
DROP POLICY IF EXISTS admins_can_create_blocks ON public.calendar_blocks;
DROP POLICY IF EXISTS calendar_blocks_insert ON public.calendar_blocks;
DROP POLICY IF EXISTS calendar_blocks_select ON public.calendar_blocks;
DROP POLICY IF EXISTS org_members_can_view_blocks ON public.calendar_blocks;
DROP POLICY IF EXISTS admins_can_update_blocks ON public.calendar_blocks;
DROP POLICY IF EXISTS calendar_blocks_update ON public.calendar_blocks;

CREATE POLICY calendar_blocks_tenant_select
ON public.calendar_blocks FOR SELECT
USING (
  organization_id = public.get_user_organization_id()
  AND public.user_has_property_access(property_id)
);

CREATE POLICY calendar_blocks_tenant_insert
ON public.calendar_blocks FOR INSERT
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND public.user_has_property_access(property_id)
  AND EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = ANY (ARRAY['admin', 'gestor']))
);

CREATE POLICY calendar_blocks_tenant_update
ON public.calendar_blocks FOR UPDATE
USING (
  organization_id = public.get_user_organization_id()
  AND public.user_has_property_access(property_id)
  AND EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = ANY (ARRAY['admin', 'gestor']))
);

CREATE POLICY calendar_blocks_tenant_delete
ON public.calendar_blocks FOR DELETE
USING (
  organization_id = public.get_user_organization_id()
  AND public.user_has_property_access(property_id)
  AND EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
);

-- (2) user_properties
DROP POLICY IF EXISTS "Admins can manage user_properties" ON public.user_properties;

CREATE POLICY user_properties_tenant_admin_manage
ON public.user_properties FOR ALL
USING (
  public.is_admin()
  AND public.get_user_organization_id() = (SELECT organization_id FROM public.user_profiles WHERE id = user_properties.user_id)
  AND public.get_user_organization_id() = (SELECT organization_id FROM public.properties WHERE id = user_properties.property_id)
)
WITH CHECK (
  public.is_admin()
  AND public.get_user_organization_id() = (SELECT organization_id FROM public.user_profiles WHERE id = user_properties.user_id)
  AND public.get_user_organization_id() = (SELECT organization_id FROM public.properties WHERE id = user_properties.property_id)
);

-- (3) platforms
DROP POLICY IF EXISTS "Permitir tudo em platforms" ON public.platforms;

CREATE POLICY platforms_select_all
ON public.platforms FOR SELECT
USING (true);

CREATE POLICY platforms_service_role_all
ON public.platforms FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- (4) sync_logs
DROP POLICY IF EXISTS "Permitir tudo em sync_logs" ON public.sync_logs;

CREATE POLICY sync_logs_tenant_select
ON public.sync_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.property_listings pl
    WHERE pl.id = sync_logs.property_listing_id
      AND pl.organization_id = public.get_user_organization_id()
      AND public.user_has_property_access(pl.property_id)
  )
);

CREATE POLICY sync_logs_service_role_all
ON public.sync_logs FOR ALL TO service_role
USING (true) WITH CHECK (true);
