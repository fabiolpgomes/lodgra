BEGIN;

-- Production already had the equivalent canonical index under a historical
-- name. Keep exactly one covering index without weakening environments where
-- the reconciliation index is the only one available.
DO $deduplicate$
BEGIN
  IF to_regclass('public.idx_reservations_property_org_fk') IS NOT NULL
     AND to_regclass('public.idx_reservations_property_organization') IS NOT NULL THEN
    DROP INDEX public.idx_reservations_property_org_fk;
  END IF;
END;
$deduplicate$;

COMMIT;
