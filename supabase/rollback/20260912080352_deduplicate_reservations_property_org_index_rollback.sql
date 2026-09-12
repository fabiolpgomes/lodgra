-- Forward-fix rollback: the removed index duplicated an existing covering
-- index, so recreating it would restore known performance debt.
BEGIN;

DO $rollback$
BEGIN
  IF to_regclass('public.idx_reservations_property_organization') IS NOT NULL THEN
    COMMENT ON INDEX public.idx_reservations_property_organization IS
      'Canonical covering index retained after reconciliation index deduplication.';
  END IF;
END;
$rollback$;

COMMIT;
