BEGIN;

-- Operational rollback starts by disabling the writer. Reconciled data is
-- intentionally retained; deleting real reservations or staged PII is unsafe.
UPDATE public.organizations
SET email_ical_reconciliation_enabled = false
WHERE email_ical_reconciliation_enabled = true;

REVOKE ALL ON FUNCTION public.reconcile_email_extraction(uuid, uuid, boolean)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.claim_email_reconciliation_batch(integer)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.upsert_calendar_event_audit(
  uuid, uuid, uuid, text, date, date, text, text, text, text, uuid
) FROM PUBLIC, anon, authenticated, service_role;

-- Forward-fix policy: keep functions and columns while linked production data
-- exists, so audit history and foreign keys remain readable. A later cleanup
-- migration may drop them only after proving there are no consumers.

COMMIT;
