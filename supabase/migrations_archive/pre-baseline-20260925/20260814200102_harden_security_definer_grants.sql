-- SECURITY DEFINER routines are deny-by-default. Trigger functions are never
-- directly executable by API roles; authenticated helpers remain available
-- only to signed-in users and still derive identity from auth.uid().

REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_manager() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_manager() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_manager_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_storage_upload() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_compliance_organization_id() FROM PUBLIC, anon, authenticated;
