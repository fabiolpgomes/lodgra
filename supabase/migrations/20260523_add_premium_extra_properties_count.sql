-- Add premium_extra_properties_count column to organizations table
-- Tracks how many extra properties a Premium customer has added

ALTER TABLE organizations
ADD COLUMN premium_extra_properties_count INTEGER DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN organizations.premium_extra_properties_count IS 'Number of extra properties added beyond the included limit for Premium plans. Each extra property costs R$49/month.';

-- Create index for faster queries
CREATE INDEX idx_organizations_premium_extra_properties_count
ON organizations(premium_extra_properties_count);
