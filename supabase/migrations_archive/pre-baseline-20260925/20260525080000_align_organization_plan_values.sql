-- Align organizations plan columns with current Lodgra pricing tiers.
-- Current product tiers: essencial, expansao, premium.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_valid_plan'
      AND conrelid = 'public.organizations'::regclass
  ) THEN
    ALTER TABLE public.organizations DROP CONSTRAINT check_valid_plan;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organizations_subscription_plan_check'
      AND conrelid = 'public.organizations'::regclass
  ) THEN
    ALTER TABLE public.organizations DROP CONSTRAINT organizations_subscription_plan_check;
  END IF;
END $$;

UPDATE public.organizations
SET plan = CASE plan
  WHEN 'starter' THEN 'essencial'
  WHEN 'growth' THEN 'expansao'
  WHEN 'professional' THEN 'premium'
  WHEN 'business' THEN 'premium'
  WHEN 'pro' THEN 'premium'
  ELSE plan
END
WHERE plan IN ('starter', 'growth', 'professional', 'business', 'pro');

UPDATE public.organizations
SET subscription_plan = CASE subscription_plan
  WHEN 'starter' THEN 'essencial'
  WHEN 'growth' THEN 'expansao'
  WHEN 'professional' THEN 'premium'
  WHEN 'business' THEN 'premium'
  WHEN 'pro' THEN 'premium'
  ELSE subscription_plan
END
WHERE subscription_plan IN ('starter', 'growth', 'professional', 'business', 'pro');

ALTER TABLE public.organizations
  ALTER COLUMN plan SET DEFAULT 'essencial',
  ALTER COLUMN subscription_plan SET DEFAULT 'essencial';

ALTER TABLE public.organizations
  ADD CONSTRAINT check_valid_plan
    CHECK (plan IN ('essencial', 'expansao', 'premium')),
  ADD CONSTRAINT organizations_subscription_plan_check
    CHECK (subscription_plan IN ('essencial', 'expansao', 'premium'));

COMMENT ON COLUMN public.organizations.plan IS 'Selected pricing tier: essencial, expansao, or premium';
COMMENT ON COLUMN public.organizations.subscription_plan IS 'Active subscription tier: essencial, expansao, or premium';
