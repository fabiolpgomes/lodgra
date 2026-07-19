-- Safe rollback for Story 38.1 Phase 0.
-- PRECONDITION: disable email_ical_reconciliation_enabled for every organization
-- and stop all Story 38.1 writers. If reconciled data exists, use forward-fix instead.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.organizations
    WHERE email_ical_reconciliation_enabled
  ) THEN
    RAISE EXCEPTION 'rollback blocked: feature flag is still enabled';
  END IF;

  IF EXISTS (SELECT 1 FROM public.calendar_events)
     OR EXISTS (SELECT 1 FROM public.raw_emails)
     OR EXISTS (SELECT 1 FROM public.email_extractions)
     OR EXISTS (
       SELECT 1 FROM public.reservations
       WHERE calendar_event_id IS NOT NULL OR email_extraction_id IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'rollback blocked: Phase 0 data exists; use forward-fix';
  END IF;
END
$$;

ALTER TABLE public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_reservation_org_fk;
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_email_extraction_org_fk;
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_calendar_event_org_fk;
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_property_org_fk;

DROP TABLE IF EXISTS public.email_extractions;
DROP TABLE IF EXISTS public.raw_emails;
DROP TABLE IF EXISTS public.calendar_events;

ALTER TABLE public.reservations
  DROP COLUMN IF EXISTS confirmed_by_host,
  DROP COLUMN IF EXISTS email_extraction_id,
  DROP COLUMN IF EXISTS calendar_event_id,
  DROP COLUMN IF EXISTS property_id;

ALTER TABLE public.organizations
  DROP COLUMN IF EXISTS email_ical_reconciliation_enabled;

-- Composite parent constraints are retained: they are harmless and may be used by
-- other tenant-safe relationships. pg_trgm is also retained because it is shared.

COMMIT;
