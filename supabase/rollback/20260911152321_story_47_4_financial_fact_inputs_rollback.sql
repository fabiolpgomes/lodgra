BEGIN;

-- Refuse a lossy rollback after the new contract has been used.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.regras_repasse
    WHERE allow_declared_owner_base
  ) OR EXISTS (
    SELECT 1
    FROM public.reservation_financial_snapshots
    WHERE fact_mode = 'declared_owner_base'
      OR declared_owner_base_amount IS NOT NULL
      OR platform_adjustment_amount IS NOT NULL
      OR ota_commission_base_amount IS NOT NULL
      OR manager_cleaning_cost_amount IS NOT NULL
      OR source_mapping_version IS NOT NULL
  ) OR EXISTS (
    SELECT 1 FROM public.property_financial_parameters
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'ROLLBACK_REQUIRES_STORY_47_4_DATA_REMEDIATION';
  END IF;
END
$$;

DROP TRIGGER IF EXISTS prevent_unversioned_property_financial_parameter_mutation
  ON public.property_financial_parameters;
DROP FUNCTION IF EXISTS lodgra_private.prevent_unversioned_property_financial_parameter_mutation();
DROP TABLE public.property_financial_parameters;

ALTER TABLE public.reservation_financial_snapshots
  DROP CONSTRAINT reservation_financial_snapshots_mapping_version_check,
  DROP CONSTRAINT reservation_financial_snapshots_representation_check,
  DROP CONSTRAINT reservation_financial_snapshots_fact_mode_check,
  DROP CONSTRAINT reservation_financial_snapshots_amounts_check,
  DROP CONSTRAINT reservation_financial_snapshots_complete_settlement_check,
  DROP COLUMN source_mapping_version,
  DROP COLUMN manager_cleaning_cost_amount,
  DROP COLUMN ota_commission_base_amount,
  DROP COLUMN platform_adjustment_amount,
  DROP COLUMN declared_owner_base_amount,
  DROP COLUMN fact_mode,
  ADD CONSTRAINT reservation_financial_snapshots_amounts_check CHECK (
    (accommodation_amount IS NULL OR accommodation_amount >= 0)
    AND (cleaning_fee_amount IS NULL OR cleaning_fee_amount >= 0)
    AND (municipal_tax_amount IS NULL OR municipal_tax_amount >= 0)
    AND (other_guest_fees_amount IS NULL OR other_guest_fees_amount >= 0)
    AND (discount_amount IS NULL OR discount_amount >= 0)
    AND (guest_total_amount IS NULL OR guest_total_amount >= 0)
    AND (ota_commission_amount IS NULL OR ota_commission_amount >= 0)
    AND (payment_processing_fee_amount IS NULL OR payment_processing_fee_amount >= 0)
    AND (channel_net_payout_amount IS NULL OR channel_net_payout_amount >= 0)
  ),
  ADD CONSTRAINT reservation_financial_snapshots_complete_settlement_check
    CHECK (
      status <> 'complete'
      OR (
        ota_commission_settlement <> 'unknown'
        AND payment_processing_settlement <> 'unknown'
      )
    ) NOT VALID;

ALTER TABLE public.regras_repasse
  DROP CONSTRAINT regras_repasse_v2_fields_check,
  DROP COLUMN allow_declared_owner_base,
  ADD CONSTRAINT regras_repasse_v2_fields_check
    CHECK (
      (contract_version = 1
        AND recognition_basis IS NULL
        AND cash_flow_model IS NULL
        AND preset_key IS NULL
        AND management_commission_tax_rate IS NULL)
      OR
      (contract_version = 2
        AND recognition_basis IS NOT NULL
        AND cash_flow_model IS NOT NULL
        AND preset_key IS NOT NULL
        AND management_commission_tax_rate IS NOT NULL
        AND recognition_basis IN ('check_in', 'check_out', 'stay_prorata', 'payout_date')
        AND cash_flow_model IN ('manager_trust', 'owner_direct')
        AND preset_key IN ('net_received', 'gross_reservation', 'custom')
        AND management_commission_tax_rate BETWEEN 0 AND 100)
    );

COMMIT;
