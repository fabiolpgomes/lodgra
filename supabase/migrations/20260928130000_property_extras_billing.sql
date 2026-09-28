-- Tabela de preços de lançamento (2026):
--   Essencial 1 · Expansão 3 · Premium 10 · Enterprise 20 propriedades incluídas.
--   Acima do incluído, cada propriedade é uma "extra" cobrada na assinatura Stripe.
-- O limite efetivo = incluídas + organizations.extra_properties_count.
-- Espelha PLAN_LIMITS em src/lib/billing/plans.ts — alterar os dois juntos.

-- 1. Coluna de extras deixa de ser "premium_": vale para todos os planos
alter table public.organizations
  rename column premium_extra_properties_count to extra_properties_count;

alter table public.organizations
  add constraint organizations_extra_properties_count_nonnegative check (extra_properties_count >= 0);

-- 2. Moeda da assinatura SaaS (definida pelo webhook do Stripe)
alter table public.organizations
  add column if not exists billing_currency text;

alter table public.organizations
  add constraint organizations_billing_currency_check check (billing_currency is null or billing_currency in ('brl', 'eur'));

comment on column public.organizations.extra_properties_count is
  'Propriedades adicionais contratadas acima das incluídas no plano (item de extra na assinatura Stripe).';
comment on column public.organizations.billing_currency is
  'Moeda da assinatura Lodgra (brl|eur). Null = sem assinatura; trata-se como brl.';

-- 3. Colunas do modelo antigo (cobrança por uso / por quantidade), sem uso
alter table public.organizations drop constraint if exists organizations_billing_unit_count_positive;
alter table public.organizations
  drop column if exists stripe_metered_item_id,
  drop column if exists billing_unit_count;

-- 4. Trigger de limite: sem planos ilimitados
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
    COALESCE(o.extra_properties_count, 0)
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
    WHEN 'premium' THEN 10
    WHEN 'professional' THEN 10
    WHEN 'business' THEN 10
    WHEN 'pro' THEN 10
    WHEN 'enterprise' THEN 20
    WHEN 'development' THEN 99
    ELSE 1
  END;

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

COMMENT ON FUNCTION "public"."check_property_limit"() IS 'Limite de propriedades = incluídas no plano + extra_properties_count. Espelha PLAN_LIMITS (src/lib/billing/plans.ts).';
