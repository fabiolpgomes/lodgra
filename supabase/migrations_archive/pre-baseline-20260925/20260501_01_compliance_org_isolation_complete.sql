-- Story 11.6: Complete multi-tenant isolation — AC6 + AC5 remainder + DOWN
-- Depends on: 20260407170500_compliance_security_fixes.sql (AC1–AC5 partial)

-- ============================================================
-- DOWN (rollback instructions — run manually if needed)
-- ============================================================
-- ALTER TABLE deletion_requests DROP CONSTRAINT IF EXISTS deletion_requests_scheduled_after_requested;
-- ALTER TABLE consent_records DROP CONSTRAINT IF EXISTS consent_records_user_id_fkey;
-- ALTER TABLE consent_records ADD CONSTRAINT consent_records_user_id_fkey
--   FOREIGN KEY (user_id) REFERENCES auth.users(id);
-- ============================================================

-- AC6: Ensure scheduled_at is always after requested_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'deletion_requests'
      AND constraint_name = 'deletion_requests_scheduled_after_requested'
  ) THEN
    ALTER TABLE deletion_requests
      ADD CONSTRAINT deletion_requests_scheduled_after_requested
      CHECK (scheduled_at > requested_at);
  END IF;
END $$;

-- AC5 (remainder): Fix consent_records.user_id FK to ON DELETE SET NULL
-- (deletion_requests was already fixed in 20260407170500)
ALTER TABLE consent_records DROP CONSTRAINT IF EXISTS consent_records_user_id_fkey;
ALTER TABLE consent_records ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE consent_records
  ADD CONSTRAINT consent_records_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
