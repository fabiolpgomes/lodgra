-- Give the owner/internal Algarve Home Stay organization a high extra-property
-- allowance while keeping the commercial plan as premium.

UPDATE public.organizations
SET
  premium_extra_properties_count = GREATEST(COALESCE(premium_extra_properties_count, 0), 990),
  updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
