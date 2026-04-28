-- Fix: Remove recursive RLS policy on user_profiles
-- The "user_profiles_select_admin" policy references user_profiles itself,
-- causing infinite recursion on ALL queries to this table.
-- Admin reads should use the service_role client (admin client) which bypasses RLS.

DROP POLICY IF EXISTS "user_profiles_select_admin" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_admin" ON user_profiles;
