BEGIN;

DROP INDEX IF EXISTS public.channel_payout_allocations_external_reference_key;
DROP INDEX IF EXISTS public.channel_payout_allocations_payout_org_currency_fk_idx;

ALTER TABLE public.channel_payout_allocations
  DROP CONSTRAINT IF EXISTS channel_payout_allocations_payout_org_currency_fk,
  DROP COLUMN IF EXISTS external_allocation_id;

ALTER TABLE public.channel_payouts
  DROP CONSTRAINT IF EXISTS channel_payouts_id_org_currency_key;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.channel_payout_allocations
    WHERE reservation_id IS NOT NULL
    GROUP BY organization_id, payout_id, reservation_id, allocation_type
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'ROLLBACK_REQUIRES_MANUAL_ALLOCATION_CONSOLIDATION';
  END IF;
END
$$;

ALTER TABLE public.channel_payout_allocations
  ADD CONSTRAINT channel_payout_allocations_payout_org_fk
    FOREIGN KEY (payout_id, organization_id)
    REFERENCES public.channel_payouts(id, organization_id)
    ON DELETE CASCADE,
  ADD CONSTRAINT channel_payout_allocations_unique
    UNIQUE (organization_id, payout_id, reservation_id, allocation_type);

CREATE INDEX channel_payout_allocations_payout_org_fk_idx
  ON public.channel_payout_allocations (payout_id, organization_id);

COMMIT;
