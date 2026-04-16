-- Add preferred_locale column to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS preferred_locale varchar(10) DEFAULT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferred_locale ON user_profiles(preferred_locale);

-- Add comment for clarity
COMMENT ON COLUMN user_profiles.preferred_locale IS 'User preferred locale (pt, pt-BR, en-US, es-ES). NULL means use browser Accept-Language header';
