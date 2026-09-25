BEGIN;

ALTER TABLE public.channel_payout_allocations
  DROP CONSTRAINT channel_payout_allocations_unique,
  DROP CONSTRAINT channel_payout_allocations_payout_org_fk;

ALTER TABLE public.channel_payouts
  ADD CONSTRAINT channel_payouts_id_org_currency_key
  UNIQUE (id, organization_id, currency);

ALTER TABLE public.channel_payout_allocations
  ADD COLUMN external_allocation_id text,
  ADD CONSTRAINT channel_payout_allocations_payout_org_currency_fk
    FOREIGN KEY (payout_id, organization_id, currency)
    REFERENCES public.channel_payouts(id, organization_id, currency)
    ON DELETE CASCADE;

DROP INDEX public.channel_payout_allocations_payout_org_fk_idx;

CREATE INDEX channel_payout_allocations_payout_org_currency_fk_idx
  ON public.channel_payout_allocations (payout_id, organization_id, currency);

CREATE UNIQUE INDEX channel_payout_allocations_external_reference_key
  ON public.channel_payout_allocations (
    organization_id, payout_id, external_allocation_id
  )
  WHERE external_allocation_id IS NOT NULL;

COMMENT ON COLUMN public.channel_payout_allocations.external_allocation_id IS
  'Optional provider identifier for idempotency; multiple legitimate allocations of the same type remain allowed.';

COMMIT;
