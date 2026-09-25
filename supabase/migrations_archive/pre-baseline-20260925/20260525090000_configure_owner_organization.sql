-- Configure Lodgra owner organization with unlimited internal access.
-- This account belongs to the developer/owner and is used as the original
-- Algarve Home Stay operating account.

UPDATE public.organizations
SET
  name = 'Algarve Home Stay',
  slug = 'algarve-home-stay',
  plan = 'premium',
  subscription_plan = 'premium',
  subscription_status = 'active',
  updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
