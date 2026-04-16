# Migration: Add organization_id columns

Execute the following SQL in **Supabase Console → SQL Editor**:

```sql
-- Add organization_id column to reservations table
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id column to expenses table
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id column to property_listings table
ALTER TABLE property_listings
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reservations_organization_id ON reservations(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_organization_id ON expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_property_listings_organization_id ON property_listings(organization_id);
```

## Steps:

1. Go to https://app.supabase.com/project/brjumbfpvijrkhrherpt/sql/new
2. Copy the SQL above
3. Click **Run**
4. Once completed, restart the application

This adds multi-tenant isolation columns to core tables.
