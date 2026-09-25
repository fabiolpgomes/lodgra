BEGIN;

-- Some production histories recorded the original rollout migration while the
-- physical feature-flag objects were absent. Restore the contract idempotently.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS email_ical_reconciliation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_ical_pilot_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_ical_pilot_platforms text[] NOT NULL DEFAULT ARRAY['airbnb', 'booking']::text[];

CREATE INDEX IF NOT EXISTS idx_organizations_email_ical_enabled
  ON public.organizations (email_ical_reconciliation_enabled);

CREATE OR REPLACE FUNCTION public.enable_email_ical_pilot(org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public.organizations
  SET email_ical_reconciliation_enabled = true,
      email_ical_pilot_started_at = now(),
      email_ical_pilot_platforms = ARRAY['airbnb', 'booking']::text[]
  WHERE id = org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enable_email_ical_pilot(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enable_email_ical_pilot(uuid)
  TO service_role;

CREATE OR REPLACE VIEW public.pilot_organizations
WITH (security_invoker = true)
AS
SELECT id,
       name,
       email_ical_pilot_started_at,
       now() - email_ical_pilot_started_at AS pilot_duration,
       email_ical_pilot_platforms
FROM public.organizations
WHERE email_ical_reconciliation_enabled = true
  AND email_ical_pilot_started_at IS NOT NULL;

REVOKE ALL ON public.pilot_organizations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.pilot_organizations TO service_role;

CREATE TABLE IF NOT EXISTS public.feature_flag_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feature text NOT NULL,
  enabled boolean NOT NULL,
  reason text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_org_feature
  ON public.feature_flag_audit (organization_id, feature);

ALTER TABLE public.feature_flag_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flag_audit FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.feature_flag_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flag_audit TO service_role;

COMMIT;
