-- Add template management features for cleaning portal
-- Allows default templates per property and global organization templates

-- Add is_default and is_global columns to cleaning_checklist_templates
ALTER TABLE cleaning_checklist_templates
ADD COLUMN is_default BOOLEAN DEFAULT false,
ADD COLUMN is_global BOOLEAN DEFAULT false;

-- Add unique constraint: only one default template per property (if property_id is set)
CREATE UNIQUE INDEX idx_cleaning_templates_default_per_property
ON cleaning_checklist_templates(property_id, organization_id)
WHERE is_default = true AND property_id IS NOT NULL;

-- Add unique constraint: only one global default per organization
CREATE UNIQUE INDEX idx_cleaning_templates_global_default
ON cleaning_checklist_templates(organization_id)
WHERE is_default = true AND is_global = true;

-- Add index for filtering templates
CREATE INDEX idx_cleaning_templates_is_global_default
ON cleaning_checklist_templates(organization_id, is_global, is_default);

-- Add index for finding property templates
CREATE INDEX idx_cleaning_templates_property_active
ON cleaning_checklist_templates(property_id, organization_id, is_active);
