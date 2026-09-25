-- Story 11.7: DB Layer Fixes
-- C1: Multi-tenant isolation for consent_records and deletion_requests
-- H1: RLS UPDATE without WITH CHECK status limitation
-- H7: FK CASCADE inconsistent -> ON DELETE SET NULL

-- 1. Add organization_id to consent_records and deletion_requests
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE deletion_requests ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_consent_records_org ON consent_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_org ON deletion_requests(organization_id);

-- 2. Populate existing records
UPDATE consent_records 
SET organization_id = user_profiles.organization_id 
FROM user_profiles 
WHERE consent_records.user_id = user_profiles.id;

UPDATE deletion_requests 
SET organization_id = user_profiles.organization_id 
FROM user_profiles 
WHERE deletion_requests.user_id = user_profiles.id;

-- 3. Auto-fill trigger for future inserts
CREATE OR REPLACE FUNCTION set_compliance_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.organization_id := (SELECT organization_id FROM user_profiles WHERE id = NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_consent_records_set_org ON consent_records;
CREATE TRIGGER trg_consent_records_set_org
BEFORE INSERT ON consent_records
FOR EACH ROW
EXECUTE FUNCTION set_compliance_organization_id();

DROP TRIGGER IF EXISTS trg_deletion_requests_set_org ON deletion_requests;
CREATE TRIGGER trg_deletion_requests_set_org
BEFORE INSERT ON deletion_requests
FOR EACH ROW
EXECUTE FUNCTION set_compliance_organization_id();

-- 4. Fix RLS for Multi-tenant isolation (preventing cross-org admin reads)

-- For consent_records
DROP POLICY IF EXISTS "consent_records_select_admin" ON consent_records;
CREATE POLICY "consent_records_select_admin"
  ON consent_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'gestor')
        AND (user_profiles.organization_id = consent_records.organization_id OR consent_records.organization_id IS NULL)
    )
  );

-- For deletion_requests
DROP POLICY IF EXISTS "deletion_requests_select_admin" ON deletion_requests;
CREATE POLICY "deletion_requests_select_admin"
  ON deletion_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'gestor')
        AND user_profiles.organization_id = deletion_requests.organization_id
    )
  );

-- 5. Fix H1: RLS UPDATE on deletion_requests needs WITH CHECK (preventing 'completed' spoofing)
DROP POLICY IF EXISTS "deletion_requests_update_own" ON deletion_requests;
CREATE POLICY "deletion_requests_update_own"
  ON deletion_requests FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (status = 'cancelled' AND user_id = auth.uid()); -- Can ONLY update to 'cancelled' status

-- 6. Fix H7: FK CASCADE inconsistent -> change deletion_requests.user_id to ON DELETE SET NULL
ALTER TABLE deletion_requests DROP CONSTRAINT IF EXISTS deletion_requests_user_id_fkey;
ALTER TABLE deletion_requests ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE deletion_requests ADD CONSTRAINT deletion_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
