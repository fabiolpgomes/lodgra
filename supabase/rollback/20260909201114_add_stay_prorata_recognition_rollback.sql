BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.organization_financial_settings
    WHERE default_recognition_basis = 'stay_prorata'
  ) OR EXISTS (
    SELECT 1 FROM public.regras_repasse
    WHERE recognition_basis = 'stay_prorata'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'ROLLBACK_REQUIRES_STAY_PRORATA_REMEDIATION';
  END IF;
END
$$;

ALTER TABLE public.organization_financial_settings
  ALTER COLUMN default_recognition_basis DROP DEFAULT,
  DROP CONSTRAINT organization_financial_settings_recognition_check,
  ADD CONSTRAINT organization_financial_settings_recognition_check
    CHECK (default_recognition_basis IN ('check_in', 'check_out', 'payout_date'));

ALTER TABLE public.regras_repasse
  DROP CONSTRAINT regras_repasse_v2_fields_check,
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
        AND recognition_basis IN ('check_in', 'check_out', 'payout_date')
        AND cash_flow_model IN ('manager_trust', 'owner_direct')
        AND preset_key IN ('net_received', 'gross_reservation', 'custom')
        AND management_commission_tax_rate BETWEEN 0 AND 100)
    );

COMMENT ON COLUMN public.organization_financial_settings.default_recognition_basis IS NULL;
COMMENT ON COLUMN public.regras_repasse.recognition_basis IS
  'Revenue recognition basis copied from tenant defaults and versioned with the property contract.';
COMMENT ON COLUMN public.channel_payouts.payout_at IS NULL;

COMMIT;
