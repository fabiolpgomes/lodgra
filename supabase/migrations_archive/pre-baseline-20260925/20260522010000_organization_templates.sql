-- Story 31.3: Personalized Booking Page Templates
CREATE TABLE organization_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  booking_headline TEXT DEFAULT 'Properties',
  booking_subtitle TEXT,
  booking_description TEXT,
  featured_property_ids UUID[] DEFAULT '{}',
  show_all_properties BOOLEAN DEFAULT true,
  hero_image_url TEXT,
  cta_button_text TEXT DEFAULT 'Book Now',
  template_type TEXT DEFAULT 'standard' CHECK (template_type IN ('standard', 'luxury', 'budget')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE organization_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_templates_select ON organization_templates
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members
      WHERE organization_id = organization_templates.organization_id
    )
  );

CREATE POLICY org_templates_update ON organization_templates
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members
      WHERE organization_id = organization_templates.organization_id
      AND role = 'admin'
    )
  );

CREATE POLICY org_templates_insert ON organization_templates
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM organization_members
      WHERE organization_id = organization_templates.organization_id
      AND role = 'admin'
    )
  );

CREATE INDEX idx_organization_templates_org_id ON organization_templates(organization_id);
