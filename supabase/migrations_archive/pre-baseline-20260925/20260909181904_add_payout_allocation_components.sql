BEGIN;

ALTER TABLE public.channel_payout_allocations
  ADD CONSTRAINT channel_payout_allocations_id_org_key UNIQUE (id, organization_id);

CREATE TABLE public.channel_payout_allocation_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  allocation_id uuid NOT NULL,
  component_code text NOT NULL,
  amount numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT channel_payout_allocation_components_allocation_org_fk
    FOREIGN KEY (allocation_id, organization_id)
    REFERENCES public.channel_payout_allocations(id, organization_id) ON DELETE CASCADE,
  CONSTRAINT channel_payout_allocation_components_code_check CHECK (
    component_code IN (
      'accommodation', 'cleaning_fee', 'municipal_tax', 'other_guest_fees',
      'discount', 'ota_commission', 'payment_processing_fee'
    )
  ),
  CONSTRAINT channel_payout_allocation_components_amount_check CHECK (amount >= 0),
  CONSTRAINT channel_payout_allocation_components_unique
    UNIQUE (organization_id, allocation_id, component_code)
);

CREATE INDEX channel_payout_allocation_components_allocation_org_fk_idx
  ON public.channel_payout_allocation_components (allocation_id, organization_id);

ALTER TABLE public.channel_payout_allocation_components ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.channel_payout_allocation_components FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.channel_payout_allocation_components TO authenticated;
GRANT ALL ON TABLE public.channel_payout_allocation_components TO service_role;

CREATE POLICY channel_payout_allocation_components_tenant_select
ON public.channel_payout_allocation_components FOR SELECT TO authenticated
USING (
  organization_id = (SELECT public.get_user_organization_id())
  AND EXISTS (
    SELECT 1
    FROM public.channel_payout_allocations allocation
    WHERE allocation.id = allocation_id
      AND allocation.organization_id = channel_payout_allocation_components.organization_id
      AND public.user_has_property_access(allocation.property_id)
  )
);

COMMENT ON TABLE public.channel_payout_allocation_components IS
  'Exact canonical component breakdown for cash-basis recognition by payout date; no proportional inference.';

COMMIT;
