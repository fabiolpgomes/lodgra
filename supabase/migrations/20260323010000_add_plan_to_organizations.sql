-- ============================================================
-- Add plan column to organizations (for SaaS tier selection)
-- ============================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'starter';

-- Add constraint to ensure valid plan values
ALTER TABLE public.organizations
  ADD CONSTRAINT check_valid_plan CHECK (plan IN ('starter', 'professional', 'business'));

-- Comment for clarity
COMMENT ON COLUMN public.organizations.plan IS 'Selected pricing tier: starter (€19), professional (€49), or business (€99)';
