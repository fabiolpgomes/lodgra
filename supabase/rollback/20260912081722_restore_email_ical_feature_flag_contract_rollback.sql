-- Forward-fix rollback: retain the feature-flag contract required by the
-- deployed application and keep its privilege/RLS hardening in place.
BEGIN;

COMMENT ON FUNCTION public.enable_email_ical_pilot(uuid) IS
  'Forward-fix retained: service-role-only email/iCal pilot activation.';

COMMIT;
