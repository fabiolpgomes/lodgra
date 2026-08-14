-- Create organizations table if not exists
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  subscription_plan TEXT DEFAULT 'essencial',
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Add organization_id to user_profiles if not exists
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Never attach an unscoped user to a shared fallback tenant. Existing orphaned
-- profiles must be repaired explicitly before this recovery migration proceeds.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE organization_id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce tenant isolation: user_profiles contains rows without organization_id';
  END IF;
END
$$;

ALTER TABLE public.user_profiles
  ALTER COLUMN organization_id SET NOT NULL;
