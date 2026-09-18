BEGIN;

CREATE INDEX payout_rule_components_rule_org_fk_idx
  ON public.payout_rule_components (payout_rule_id, organization_id);

CREATE INDEX reservation_financial_snapshots_reservation_org_fk_idx
  ON public.reservation_financial_snapshots (reservation_id, property_id, organization_id);
CREATE INDEX reservation_financial_snapshots_property_org_fk_idx
  ON public.reservation_financial_snapshots (property_id, organization_id);
CREATE INDEX reservation_financial_snapshots_created_by_fk_idx
  ON public.reservation_financial_snapshots (created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX channel_payouts_created_by_fk_idx
  ON public.channel_payouts (created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX channel_payout_allocations_payout_org_fk_idx
  ON public.channel_payout_allocations (payout_id, organization_id);
CREATE INDEX channel_payout_allocations_reservation_org_fk_idx
  ON public.channel_payout_allocations (reservation_id, property_id, organization_id);
CREATE INDEX channel_payout_allocations_property_org_fk_idx
  ON public.channel_payout_allocations (property_id, organization_id);

COMMIT;
