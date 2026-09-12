-- Forward-fix rollback: indexes and trigger-function privilege reduction are
-- safe to retain and prevent restoring known performance/security debt.
BEGIN;

COMMENT ON INDEX public.idx_calendar_events_listing_org_fk IS
  'Forward-fix retained: covers tenant-scoped reconciliation foreign key.';

COMMIT;
