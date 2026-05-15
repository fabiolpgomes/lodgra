-- Add organization_id and enhanced fields to calendar_blocks
-- This enables proper multi-org isolation and blocks to be tracked for origin (manual vs platform sync)

ALTER TABLE calendar_blocks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE calendar_blocks ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES auth.users(id);
ALTER TABLE calendar_blocks ADD COLUMN IF NOT EXISTS external_uid TEXT; -- UID from iCal import (for upsert on sync)

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_property ON calendar_blocks(property_id);
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_org ON calendar_blocks(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_dates ON calendar_blocks(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_external_uid ON calendar_blocks(external_uid);

-- Set organization_id for existing rows (if any) using the property's organization
UPDATE calendar_blocks
SET organization_id = (SELECT organization_id FROM properties WHERE id = property_id)
WHERE organization_id IS NULL;

-- Make organization_id NOT NULL going forward (only if no orphaned blocks)
ALTER TABLE calendar_blocks ALTER COLUMN organization_id SET NOT NULL;

-- Drop old service-role-only policy and replace with org-aware policies
DROP POLICY IF EXISTS "Service role full access calendar_blocks" ON calendar_blocks;

-- SELECT: any org member can view blocks in their org
CREATE POLICY "org_members_can_view_blocks" ON calendar_blocks
  FOR SELECT USING (
    organization_id = public.get_user_organization_id()
  );

-- INSERT: only admin/gestor can create blocks in their org
CREATE POLICY "admins_can_create_blocks" ON calendar_blocks
  FOR INSERT WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND organization_id = public.get_user_organization_id()
      AND role IN ('admin', 'gestor')
    )
  );

-- UPDATE: only admin/gestor can update blocks in their org
CREATE POLICY "admins_can_update_blocks" ON calendar_blocks
  FOR UPDATE USING (
    organization_id = public.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND organization_id = public.get_user_organization_id()
      AND role IN ('admin', 'gestor')
    )
  );

-- DELETE: only admin/gestor can delete blocks in their org
CREATE POLICY "admins_can_delete_blocks" ON calendar_blocks
  FOR DELETE USING (
    organization_id = public.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND organization_id = public.get_user_organization_id()
      AND role IN ('admin', 'gestor')
    )
  );

-- Service role bypass (needed for cron sync operations)
CREATE POLICY "Service role full access calendar_blocks" ON calendar_blocks
  FOR ALL TO service_role USING (true) WITH CHECK (true);
