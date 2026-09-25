-- Story 8.1: Add subscription_plan to organizations
-- Starter (€19) | Professional (€49) | Business (€99)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'starter'
    CHECK (subscription_plan IN ('starter', 'professional', 'business'));
