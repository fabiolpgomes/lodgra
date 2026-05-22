-- Story 31.2: Dynamic Company Branding (Logos, Colors, Favicons)
-- Create organization_branding table with RLS policies

CREATE TABLE organization_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#1E40AF',
  secondary_color TEXT DEFAULT '#6B7280',
  accent_color TEXT DEFAULT '#FFC000',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE organization_branding ENABLE ROW LEVEL SECURITY;

-- RLS Policy: SELECT - Users can only see branding for their organization
CREATE POLICY org_branding_select ON organization_branding
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members
      WHERE organization_id = organization_branding.organization_id
    )
  );

-- RLS Policy: UPDATE - Only org admins can update branding
CREATE POLICY org_branding_update ON organization_branding
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members
      WHERE organization_id = organization_branding.organization_id
      AND role = 'admin'
    )
  );

-- RLS Policy: INSERT - Only org admins can insert branding
CREATE POLICY org_branding_insert ON organization_branding
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM organization_members
      WHERE organization_id = organization_branding.organization_id
      AND role = 'admin'
    )
  );

-- Create index for faster queries
CREATE INDEX idx_organization_branding_org_id ON organization_branding(organization_id);
