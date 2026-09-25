-- Enforce current Lodgra property limits with paid extra properties.
-- Included properties:
-- - essencial: 1
-- - expansao: 3
-- - premium: 10
-- All current paid plans can add extra properties at the configured extra price.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS premium_extra_properties_count INTEGER DEFAULT 0;

COMMENT ON COLUMN public.organizations.premium_extra_properties_count IS
  'Number of paid extra properties beyond the included plan limit. Applies to essencial, expansao, and premium.';

CREATE OR REPLACE FUNCTION public.check_property_limit()
RETURNS TRIGGER AS $$
DECLARE
  property_count INT;
  plan_name TEXT;
  included_limit INT;
  extra_count INT;
  max_allowed INT;
BEGIN
  SELECT
    COALESCE(subscription_plan, plan, 'essencial'),
    COALESCE(premium_extra_properties_count, 0)
  INTO plan_name, extra_count
  FROM public.organizations
  WHERE id = NEW.organization_id;

  included_limit := CASE plan_name
    WHEN 'essencial' THEN 1
    WHEN 'starter' THEN 1
    WHEN 'expansao' THEN 3
    WHEN 'growth' THEN 3
    WHEN 'premium' THEN 10
    WHEN 'professional' THEN 10
    WHEN 'business' THEN 10
    WHEN 'pro' THEN 10
    WHEN 'enterprise' THEN NULL
    ELSE 1
  END;

  IF included_limit IS NULL THEN
    RETURN NEW;
  END IF;

  max_allowed := included_limit + extra_count;

  SELECT COUNT(*) INTO property_count
  FROM public.properties
  WHERE organization_id = NEW.organization_id
    AND deleted_at IS NULL;

  IF property_count >= max_allowed THEN
    RAISE EXCEPTION 'Property limit reached for plan %. Current: %, Limit: %',
      plan_name, property_count, max_allowed
      USING HINT = 'Add an extra property or upgrade your plan to continue';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_property_limit_trigger ON public.properties;

CREATE TRIGGER check_property_limit_trigger
  BEFORE INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.check_property_limit();

COMMENT ON FUNCTION public.check_property_limit() IS
  'Validates property count against included plan limit plus paid extra properties.';
