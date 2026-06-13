-- HOTFIX: Add missing organization_id column and RLS policies to calendar_blocks
-- This was supposed to be in migration 20260516000000 but was not applied to production

-- Step 1: Add missing columns
ALTER TABLE calendar_blocks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE calendar_blocks ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES auth.users(id);
ALTER TABLE calendar_blocks ADD COLUMN IF NOT EXISTS external_uid TEXT;

-- Step 2: Create indices
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_property ON calendar_blocks(property_id);
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_org ON calendar_blocks(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_dates ON calendar_blocks(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_external_uid ON calendar_blocks(external_uid);

-- Step 3: Backfill organization_id from properties
UPDATE calendar_blocks
SET organization_id = (SELECT organization_id FROM properties WHERE id = property_id)
WHERE organization_id IS NULL
  AND property_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM properties WHERE id = calendar_blocks.property_id);

-- Step 4: For any remaining NULL organization_id (orphaned blocks), assign to default org
UPDATE calendar_blocks
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Step 5: Make organization_id NOT NULL
ALTER TABLE calendar_blocks ALTER COLUMN organization_id SET NOT NULL;

-- Step 6: Drop old service-role-only policy if exists
DROP POLICY IF EXISTS "Service role full access calendar_blocks" ON calendar_blocks;

-- Step 7: Create org-aware SELECT policy
DROP POLICY IF EXISTS "org_members_can_view_blocks" ON calendar_blocks;
CREATE POLICY "org_members_can_view_blocks" ON calendar_blocks
  FOR SELECT USING (
    organization_id = public.get_user_organization_id()
  );

-- Step 8: Create org-aware INSERT policy
DROP POLICY IF EXISTS "admins_can_create_blocks" ON calendar_blocks;
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

-- Step 9: Create org-aware UPDATE policy
DROP POLICY IF EXISTS "admins_can_update_blocks" ON calendar_blocks;
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

-- Step 10: Create org-aware DELETE policy (THIS IS CRITICAL FOR THE BUG FIX!)
DROP POLICY IF EXISTS "admins_can_delete_blocks" ON calendar_blocks;
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

-- Step 11: Create service role bypass policy
DROP POLICY IF EXISTS "Service role full access calendar_blocks" ON calendar_blocks;
CREATE POLICY "Service role full access calendar_blocks" ON calendar_blocks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Verification: Check that organization_id is now populated
-- SELECT id, organization_id, COUNT(*) as block_count FROM calendar_blocks GROUP BY organization_id;
