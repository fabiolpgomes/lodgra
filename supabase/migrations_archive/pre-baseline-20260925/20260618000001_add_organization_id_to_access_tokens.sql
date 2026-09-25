-- Add organization_id to cleaner_access_tokens for RLS isolation
ALTER TABLE cleaner_access_tokens
ADD COLUMN organization_id UUID NOT NULL DEFAULT (
  SELECT organization_id FROM user_profiles WHERE id = cleaner_id LIMIT 1
);

-- Add constraint to user_profiles for data integrity
ALTER TABLE cleaner_access_tokens
ADD CONSTRAINT fk_tokens_organization
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Add index for organization filtering
CREATE INDEX IF NOT EXISTS idx_cleaner_tokens_org_id
ON cleaner_access_tokens(organization_id);

-- Update RLS policy to use organization_id
DROP POLICY IF EXISTS cleaner_tokens_insert_for_cleaner ON cleaner_access_tokens;

CREATE POLICY cleaner_tokens_insert_for_cleaner
  ON cleaner_access_tokens FOR INSERT
  WITH CHECK (
    (SELECT organization_id FROM user_profiles WHERE id = auth.uid()) = organization_id
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'manager')
    AND cleaner_id IN (
      SELECT id FROM user_profiles
      WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );
