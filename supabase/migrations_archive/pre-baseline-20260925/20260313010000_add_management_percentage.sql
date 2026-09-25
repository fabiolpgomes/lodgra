-- Add management_percentage column to properties table
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS management_percentage NUMERIC(5, 2) DEFAULT 0;

-- Create index for management_percentage if not exists
CREATE INDEX IF NOT EXISTS idx_properties_management_percentage ON properties(management_percentage);
