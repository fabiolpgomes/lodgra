-- Reconcile the canonical user profile schema with the fields consumed by the app.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.user_profiles.avatar_url IS
  'Optional URL for the user avatar displayed in authenticated application shells.';
