-- Ensure on_auth_user_created trigger exists on auth.users.
--
-- Context: this trigger was found present in production but missing from
-- staging on 2026-09-23, despite having been created earlier via ad-hoc SQL
-- in the SQL Editor (not a tracked migration) -- that manual application was
-- lost, likely due to an implicit transaction rollback when it was run as
-- part of a larger multi-statement script. Recreated here as an isolated,
-- idempotent statement and validated end-to-end via real Auth API signups
-- in both staging and production on 2026-09-23.
--
-- Depends on public.handle_new_user() (see migration 20260919105605).

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
