-- Ensure calendar_blocks has correct RLS policies for multi-org support
-- The table should already exist from bootstrap migration, this adds missing RLS

-- Ensure required columns exist (they should from bootstrap, but add if missing)
ALTER TABLE public.calendar_blocks
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE public.calendar_blocks
  ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES auth.users(id);

ALTER TABLE public.calendar_blocks
  ADD COLUMN IF NOT EXISTS external_uid TEXT;

-- Set block_type constraint if not present (original may have different constraint)
ALTER TABLE public.calendar_blocks
  ADD CONSTRAINT calendar_blocks_block_type_check
  CHECK (block_type IN ('manual', 'platform_sync'))
  NOT VALID;

-- Backfill organization_id from properties for existing rows
UPDATE public.calendar_blocks
SET organization_id = (SELECT organization_id FROM properties WHERE id = property_id)
WHERE organization_id IS NULL
  AND property_id IS NOT NULL;

-- Enable RLS if not already enabled
ALTER TABLE public.calendar_blocks ENABLE ROW LEVEL SECURITY;

-- Drop any old/incorrect policies
DROP POLICY IF EXISTS "Users can manage property calendar blocks" ON public.calendar_blocks;
DROP POLICY IF EXISTS "Public read calendar blocks for public properties" ON public.calendar_blocks;
DROP POLICY IF EXISTS "org_members_can_view_blocks" ON public.calendar_blocks;
DROP POLICY IF EXISTS "admins_can_create_blocks" ON public.calendar_blocks;
DROP POLICY IF EXISTS "admins_can_update_blocks" ON public.calendar_blocks;
DROP POLICY IF EXISTS "admins_can_delete_blocks" ON public.calendar_blocks;
DROP POLICY IF EXISTS "Service role full access calendar_blocks" ON public.calendar_blocks;

-- Org-aware SELECT policy: members can view blocks in their org
CREATE POLICY "org_members_can_view_blocks"
  ON public.calendar_blocks FOR SELECT
  USING (
    organization_id = public.get_user_organization_id()
  );

-- Org-aware INSERT policy: admins/gestors can create blocks in their org
CREATE POLICY "admins_can_create_blocks"
  ON public.calendar_blocks FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND organization_id = public.get_user_organization_id()
      AND role IN ('admin', 'gestor')
    )
  );

-- Org-aware UPDATE policy: admins/gestors can update blocks in their org
CREATE POLICY "admins_can_update_blocks"
  ON public.calendar_blocks FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND organization_id = public.get_user_organization_id()
      AND role IN ('admin', 'gestor')
    )
  );

-- Org-aware DELETE policy: admins/gestors can delete blocks in their org
CREATE POLICY "admins_can_delete_blocks"
  ON public.calendar_blocks FOR DELETE
  USING (
    organization_id = public.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND organization_id = public.get_user_organization_id()
      AND role IN ('admin', 'gestor')
    )
  );

-- CRITICAL: Service-role bypass policy for API endpoints (cron jobs and admin clients)
CREATE POLICY "Service role full access calendar_blocks"
  ON public.calendar_blocks FOR ALL TO service_role
  USING (true) WITH CHECK (true);
