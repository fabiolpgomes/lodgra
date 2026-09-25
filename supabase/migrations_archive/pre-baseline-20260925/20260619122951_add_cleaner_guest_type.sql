-- Add 'cleaner' as a valid guest_type for user_profiles
-- This allows guest users with guest_type='cleaner' to access the cleaning portal

-- Update the check constraint on user_profiles to include 'cleaner'
-- First, drop the existing constraint if it exists
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS guest_type_check;

-- Add the updated constraint with 'cleaner' support
ALTER TABLE user_profiles
ADD CONSTRAINT guest_type_check
CHECK (guest_type IS NULL OR guest_type IN ('staff', 'owner', 'cleaner'));

-- Add an index for filtering cleaners by guest_type
CREATE INDEX IF NOT EXISTS idx_user_profiles_cleaner_type
ON user_profiles(organization_id, guest_type)
WHERE guest_type = 'cleaner';

-- Add a comment to document the cleaner type
COMMENT ON COLUMN user_profiles.guest_type IS 'Type of guest user: staff (internal staff), owner (property owner), cleaner (cleaning staff)';
