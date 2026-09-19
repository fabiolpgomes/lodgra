-- Fix: on_auth_user_created trigger was missing on auth.users in both
-- staging and production, even though the handle_new_user() function
-- existed (correctly written, matching the live DB — it had already been
-- patched directly against the database at some point, without a matching
-- migration file, which is why this drift wasn't visible here). With the
-- trigger missing, no organization or user_profiles row was ever created
-- on signup — silently, since the function's own EXCEPTION handler (kept
-- below) would have hidden even a real insert failure.
--
-- Root cause found 2026-09-19 while creating an E2E test user directly via
-- the Supabase Auth admin panel on staging: no organization/profile got
-- created. Confirmed the same trigger was also missing in production via
-- `SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created'`
-- returning zero rows there too. 4 orphaned auth.users rows (no matching
-- user_profiles) were found in production, all synthetic/test-looking
-- accounts unrelated to real customers, and were removed manually.
--
-- This migration restates the function (as verified against the live
-- database) and (re)creates the trigger, so a fresh environment built from
-- these migrations reproduces the actual, working behavior.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  new_org_id UUID;
  base_slug TEXT;
  unique_slug TEXT;
BEGIN
  base_slug := lower(left(split_part(COALESCE(NEW.email, 'user'), '@', 1), 20));
  base_slug := regexp_replace(base_slug, '[^a-z0-9-]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  unique_slug := COALESCE(NULLIF(base_slug, ''), 'empresa') || '-' || left(NEW.id::TEXT, 8);

  INSERT INTO public.organizations (
    name,
    slug,
    subscription_status,
    subscription_plan,
    plan
  )
  VALUES (
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, 'Nova organização'),
    unique_slug,
    'trialing',
    'essencial',
    'essencial'
  )
  RETURNING id INTO new_org_id;

  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    role,
    access_all_properties,
    organization_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'admin',
    true,
    new_org_id,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-creates organization and user_profiles record when new user signs up via Supabase Auth. Restored 2026-09-19 after the trigger calling it was found missing in both staging and production.';
