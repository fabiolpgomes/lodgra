-- Story 38.1 Phase 0 operational verification.
-- Run in staging after loading >=10k rows/table across >=2 organizations and ANALYZE.

-- Catalog and default-off assertions.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.organizations
    WHERE email_ical_reconciliation_enabled IS DISTINCT FROM false
  ) THEN
    RAISE EXCEPTION 'feature flag must default/remain false for Gate 0';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'calendar_events' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'calendar_events RLS is not enabled';
  END IF;
END
$$;

-- Execute the RLS matrix with real authenticated JWTs through the Supabase API:
-- 1. Org A reads its calendar_events/email_extractions -> own rows only.
-- 2. Org A filters Org B -> zero rows.
-- 3. Org A INSERT/UPDATE/DELETE on all pipeline tables -> denied.
-- 4. Org A SELECT raw_emails -> zero/denied.
-- 5. anon SELECT all pipeline tables -> zero/denied.
-- 6. service-role attempt to cross-link Org A and Org B -> composite FK violation.

ANALYZE public.calendar_events;
ANALYZE public.email_extractions;
ANALYZE public.raw_emails;

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT id, property_id, source_platform, check_in, check_out, ical_uid, raw_summary
FROM public.calendar_events
WHERE organization_id = '11111111-1111-1111-1111-111111111111'
  AND status = 'unmatched'
  AND check_in <= DATE '2026-08-11'
  AND check_out >= DATE '2026-08-09'
ORDER BY check_in, id
LIMIT 100;

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT id, source_platform, check_in, check_out, reservation_code, property_identifier_raw
FROM public.email_extractions
WHERE organization_id = '11111111-1111-1111-1111-111111111111'
  AND match_status = 'pending'
  AND check_in <= DATE '2026-08-11'
  AND check_out >= DATE '2026-08-09'
ORDER BY check_in, id
LIMIT 100;

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT id, extensions.similarity(property_identifier_raw, 'Apartamento Marina') AS score
FROM public.email_extractions
WHERE organization_id = '11111111-1111-1111-1111-111111111111'
  AND match_status = 'pending'
  AND check_in <= DATE '2026-08-11'
  AND check_out >= DATE '2026-08-09'
  AND property_identifier_raw OPERATOR(extensions.%) 'Apartamento Marina'
ORDER BY score DESC, id
LIMIT 3;

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT id
FROM public.raw_emails
WHERE organization_id = '11111111-1111-1111-1111-111111111111'
  AND processing_status IN ('pending', 'retry')
ORDER BY received_at, id
LIMIT 50;

-- Gate criteria: required named indexes, no full-table Seq Scan at >=10k rows,
-- no material cross-tenant filtering, and median of five warm executions <= 50 ms.
