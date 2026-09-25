BEGIN;

-- Cover the tenant-composite foreign keys used by reconciliation cleanup and
-- cascades. Partial uniqueness indexes enforce identity but do not cover rows
-- whose optional relationship is still NULL.
CREATE INDEX IF NOT EXISTS idx_calendar_events_listing_org_fk
  ON public.calendar_events (property_listing_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_property_org_fk
  ON public.calendar_events (property_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_reservation_org_fk
  ON public.calendar_events (reservation_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_email_extractions_event_org_fk
  ON public.email_extractions (matched_event_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_email_extractions_raw_email_org_fk
  ON public.email_extractions (raw_email_id, organization_id);

-- Trigger functions are invoked by PostgreSQL, never as public RPCs.
DO $privileges$
BEGIN
  IF to_regprocedure('public.normalize_calendar_block_legacy_date()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.normalize_calendar_block_legacy_date()
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.normalize_calendar_block_legacy_date()
      TO service_role;
  END IF;
END;
$privileges$;

REVOKE ALL ON FUNCTION public.validate_minimum_stay()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_minimum_stay()
  TO service_role;

COMMIT;
