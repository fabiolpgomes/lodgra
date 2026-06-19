-- Add phone_number and WhatsApp consent fields to user_profiles
-- Enables automatic WhatsApp messaging to cleaners and other guest users

ALTER TABLE user_profiles
ADD COLUMN phone_number TEXT;

-- Add WhatsApp consent flag (users must opt-in to receive messages)
ALTER TABLE user_profiles
ADD COLUMN accepts_whatsapp BOOLEAN DEFAULT false;

-- Add constraint to validate international phone format (+country_code + number)
ALTER TABLE user_profiles
ADD CONSTRAINT phone_number_format
CHECK (phone_number IS NULL OR phone_number ~ '^\+?[1-9]\d{1,14}$');

-- Index for efficient lookup by phone number
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone
ON user_profiles(phone_number)
WHERE phone_number IS NOT NULL;

-- Index for finding users who accept WhatsApp
CREATE INDEX IF NOT EXISTS idx_user_profiles_whatsapp_consent
ON user_profiles(organization_id, accepts_whatsapp)
WHERE accepts_whatsapp = true;

-- Add comments for documentation
COMMENT ON COLUMN user_profiles.phone_number IS 'International phone number format: +country_code followed by number (e.g., +351912345678)';
COMMENT ON COLUMN user_profiles.accepts_whatsapp IS 'User has consented to receive WhatsApp messages from the organization';
