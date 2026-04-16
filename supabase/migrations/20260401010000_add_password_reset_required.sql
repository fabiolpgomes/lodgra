-- Add password_reset_required column to user_profiles
-- Used to enforce password change on first login for newly created users

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_password_reset_required
ON public.user_profiles(password_reset_required);
