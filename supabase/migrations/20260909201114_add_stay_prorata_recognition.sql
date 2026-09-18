BEGIN;

-- Story 47.3: checkout remains the product default, while each v2 property
-- contract may explicitly opt into recognition prorated by occupied nights.
ALTER TABLE public.organization_financial_settings
  ALTER COLUMN default_recognition_basis SET DEFAULT 'check_out',
  DROP CONSTRAINT organization_financial_settings_recognition_check,
  ADD CONSTRAINT organization_financial_settings_recognition_check
    CHECK (default_recognition_basis IN ('check_in', 'check_out', 'stay_prorata', 'payout_date'));

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
        AND recognition_basis IN ('check_in', 'check_out', 'stay_prorata', 'payout_date')
        AND cash_flow_model IN ('manager_trust', 'owner_direct')
        AND preset_key IN ('net_received', 'gross_reservation', 'custom')
        AND management_commission_tax_rate BETWEEN 0 AND 100)
    );

COMMENT ON COLUMN public.organization_financial_settings.default_recognition_basis IS
  'Default for new contracts only. Lodgra defaults to check_out; properties may explicitly override with check_in, stay_prorata or payout_date.';
COMMENT ON COLUMN public.regras_repasse.recognition_basis IS
  'Explicit versioned contract basis: check_in, check_out, stay_prorata by occupied nights, or reconciled payout_date.';
COMMENT ON COLUMN public.channel_payouts.payout_at IS
  'Observed payout timestamp kept independently for bank reconciliation, regardless of the contract recognition basis.';

COMMIT;
