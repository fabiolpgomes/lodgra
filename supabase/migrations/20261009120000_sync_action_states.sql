-- Sync panel actions: per-tenant dismissals ("não é reserva / ignorar") and alert bookkeeping
-- (each problem is notified once, then at most one reminder per day). Service-role only.
CREATE TABLE IF NOT EXISTS public.sync_action_states (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_key text NOT NULL CHECK (char_length(action_key) BETWEEN 3 AND 200),
  dismissed_at timestamptz,
  dismissed_by uuid,
  dismiss_reason text CHECK (dismiss_reason IS NULL OR char_length(dismiss_reason) <= 300),
  first_notified_at timestamptz,
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, action_key)
);

COMMENT ON TABLE public.sync_action_states IS 'Sync panel: dismissed actions and alert notification state per tenant.';

ALTER TABLE public.sync_action_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_action_states FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.sync_action_states FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.sync_action_states TO service_role;
