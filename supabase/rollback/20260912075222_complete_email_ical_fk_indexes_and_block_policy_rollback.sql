-- Forward-fix rollback: retain covering indexes and equivalent optimized RLS.
BEGIN;

COMMENT ON INDEX public.idx_reservations_calendar_event_org_fk IS
  'Forward-fix retained: covers reconciliation calendar-event foreign key.';

COMMIT;
