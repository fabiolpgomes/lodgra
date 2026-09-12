-- Forward-fix rollback. The OTA provenance bypass is required to avoid
-- rejecting reservations already accepted by an external platform.
BEGIN;

COMMENT ON FUNCTION public.validate_minimum_stay() IS
  'Forward-fix retained: authoritative OTA/calendar reservations must bypass local minimum-stay validation.';

COMMIT;
