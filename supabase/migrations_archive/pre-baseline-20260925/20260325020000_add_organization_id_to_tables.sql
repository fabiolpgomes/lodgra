-- Add organization_id column to reservations table
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id column to expenses table
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id column to property_listings table (if not already present)
ALTER TABLE property_listings
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add NOT NULL constraint with default for existing rows
-- For new rows, organization_id will come from the insert statements

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reservations_organization_id ON reservations(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_organization_id ON expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_property_listings_organization_id ON property_listings(organization_id);

-- Update RLS policies for reservations if needed
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Update RLS policies for expenses if needed
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Update RLS policies for property_listings if needed
ALTER TABLE property_listings ENABLE ROW LEVEL SECURITY;
