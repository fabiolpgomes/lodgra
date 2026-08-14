-- Restore the organization fields still consumed by the application and align
-- the database property-limit guard with src/lib/billing/plans.ts.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan TEXT,
  ADD COLUMN IF NOT EXISTS premium_extra_properties_count INTEGER NOT NULL DEFAULT 0;

UPDATE public.organizations
SET plan = COALESCE(subscription_plan, 'essencial')
WHERE plan IS DISTINCT FROM COALESCE(subscription_plan, 'essencial');

ALTER TABLE public.organizations
  ALTER COLUMN plan SET DEFAULT 'essencial';

CREATE OR REPLACE FUNCTION public.check_property_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  property_count INTEGER;
  plan_name TEXT;
  included_limit INTEGER;
  extra_count INTEGER;
  max_allowed INTEGER;
BEGIN
  SELECT
    COALESCE(o.subscription_plan, o.plan, 'essencial'),
    COALESCE(o.premium_extra_properties_count, 0)
  INTO plan_name, extra_count
  FROM public.organizations o
  WHERE o.id = NEW.organization_id;

  IF plan_name IS NULL THEN
    RAISE EXCEPTION 'Organization % not found or has no subscription plan', NEW.organization_id;
  END IF;

  included_limit := CASE plan_name
    WHEN 'essencial' THEN 1
    WHEN 'starter' THEN 1
    WHEN 'expansao' THEN 3
    WHEN 'growth' THEN 3
    WHEN 'development' THEN 99
    WHEN 'premium' THEN NULL
    WHEN 'professional' THEN NULL
    WHEN 'business' THEN NULL
    WHEN 'pro' THEN NULL
    WHEN 'enterprise' THEN NULL
    ELSE 1
  END;

  -- NULL denotes an unlimited plan.
  IF included_limit IS NULL THEN
    RETURN NEW;
  END IF;

  max_allowed := included_limit + extra_count;

  SELECT COUNT(*) INTO property_count
  FROM public.properties p
  WHERE p.organization_id = NEW.organization_id
    AND p.deleted_at IS NULL;

  IF property_count >= max_allowed THEN
    RAISE EXCEPTION 'Property limit reached for plan %. Current: %, Limit: %',
      plan_name, property_count, max_allowed
      USING HINT = 'Add an extra property or upgrade your plan to continue';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_property_limit() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.check_property_limit() IS
  'Enforces organization property limits with RLS-independent counting. Premium and Enterprise are unlimited; subscription_plan is the primary source.';

-- The organizations table was restored with RLS enabled but without policies.
-- Members may read only their own organization; privileged writes continue to
-- go through the authenticated server-side routes.
DROP POLICY IF EXISTS org_members_select ON public.organizations;

CREATE POLICY org_members_select
ON public.organizations
FOR SELECT
TO authenticated
USING (id = (SELECT public.get_user_organization_id()));
