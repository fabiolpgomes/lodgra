-- Rollback de 20260928130000_property_extras_billing.sql
-- Restaura o trigger antigo (Premium/Enterprise ilimitados) e as colunas do modelo anterior.
alter table public.organizations drop constraint if exists organizations_extra_properties_count_nonnegative;
alter table public.organizations drop constraint if exists organizations_billing_currency_check;
alter table public.organizations drop column if exists billing_currency;
alter table public.organizations rename column extra_properties_count to premium_extra_properties_count;

alter table public.organizations
  add column if not exists stripe_metered_item_id text,
  add column if not exists billing_unit_count integer not null default 1;
alter table public.organizations
  add constraint organizations_billing_unit_count_positive check (billing_unit_count >= 1);

CREATE OR REPLACE FUNCTION "public"."check_property_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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

COMMENT ON FUNCTION "public"."check_property_limit"() IS 'Enforces organization property limits with RLS-independent counting. Premium and Enterprise are unlimited; subscription_plan is the primary source.';
