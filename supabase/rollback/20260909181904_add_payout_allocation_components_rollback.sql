BEGIN;

DROP TABLE IF EXISTS public.channel_payout_allocation_components;
ALTER TABLE public.channel_payout_allocations
  DROP CONSTRAINT IF EXISTS channel_payout_allocations_id_org_key;

COMMIT;
