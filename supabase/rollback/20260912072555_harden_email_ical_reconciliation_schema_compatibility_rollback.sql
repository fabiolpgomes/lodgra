-- Forward-fix rollback: retain additive reservation columns and reconciled data.
-- Removing the compatibility trigger would reintroduce failures for legacy
-- calendar_blocks writers, so rollback intentionally disables no invariant.
BEGIN;

DO $rollback$
BEGIN
  IF to_regprocedure('public.normalize_calendar_block_legacy_date()') IS NOT NULL THEN
    COMMENT ON FUNCTION public.normalize_calendar_block_legacy_date() IS
      'Forward-fix retained: keeps legacy calendar_blocks.date aligned with start_date.';
  END IF;
END;
$rollback$;

COMMIT;
