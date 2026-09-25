BEGIN;

-- Story 47.4: represent operator-confirmed owner bases without manufacturing
-- unavailable platform components. Existing snapshots remain detailed by default.

ALTER TABLE public.regras_repasse
  ADD COLUMN allow_declared_owner_base boolean NOT NULL DEFAULT false,
  DROP CONSTRAINT regras_repasse_v2_fields_check,
  ADD CONSTRAINT regras_repasse_v2_fields_check
    CHECK (
      (contract_version = 1
        AND recognition_basis IS NULL
        AND cash_flow_model IS NULL
        AND preset_key IS NULL
        AND management_commission_tax_rate IS NULL
        AND allow_declared_owner_base = false)
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

COMMENT ON COLUMN public.regras_repasse.allow_declared_owner_base IS
  'Explicit opt-in, versioned with the effective contract, for operator-confirmed declared owner bases.';

ALTER TABLE public.reservation_financial_snapshots
  ADD COLUMN fact_mode text NOT NULL DEFAULT 'component_breakdown',
  ADD COLUMN declared_owner_base_amount numeric(14,2),
  ADD COLUMN platform_adjustment_amount numeric(14,2),
  ADD COLUMN ota_commission_base_amount numeric(14,2),
  ADD COLUMN manager_cleaning_cost_amount numeric(14,2),
  ADD COLUMN source_mapping_version text,
  DROP CONSTRAINT reservation_financial_snapshots_amounts_check,
  DROP CONSTRAINT reservation_financial_snapshots_complete_settlement_check,
  ADD CONSTRAINT reservation_financial_snapshots_amounts_check CHECK (
    (accommodation_amount IS NULL OR accommodation_amount >= 0)
    AND (cleaning_fee_amount IS NULL OR cleaning_fee_amount >= 0)
    AND (municipal_tax_amount IS NULL OR municipal_tax_amount >= 0)
    AND (other_guest_fees_amount IS NULL OR other_guest_fees_amount >= 0)
    AND (discount_amount IS NULL OR discount_amount >= 0)
    AND (guest_total_amount IS NULL OR guest_total_amount >= 0)
    AND (ota_commission_base_amount IS NULL OR ota_commission_base_amount >= 0)
    AND (ota_commission_amount IS NULL OR ota_commission_amount >= 0)
    AND (payment_processing_fee_amount IS NULL OR payment_processing_fee_amount >= 0)
    AND (manager_cleaning_cost_amount IS NULL OR manager_cleaning_cost_amount >= 0)
    AND (channel_net_payout_amount IS NULL OR channel_net_payout_amount >= 0)
    AND (declared_owner_base_amount IS NULL OR declared_owner_base_amount >= 0)
  ),
  ADD CONSTRAINT reservation_financial_snapshots_fact_mode_check
    CHECK (fact_mode IN ('component_breakdown', 'declared_owner_base')),
  ADD CONSTRAINT reservation_financial_snapshots_representation_check
    CHECK (
      (fact_mode = 'component_breakdown' AND declared_owner_base_amount IS NULL)
      OR
      (fact_mode = 'declared_owner_base' AND declared_owner_base_amount IS NOT NULL)
    ),
  ADD CONSTRAINT reservation_financial_snapshots_mapping_version_check
    CHECK (source_mapping_version IS NULL OR btrim(source_mapping_version) <> ''),
  ADD CONSTRAINT reservation_financial_snapshots_complete_settlement_check
    CHECK (
      status <> 'complete'
      OR fact_mode = 'declared_owner_base'
      OR (
        ota_commission_settlement <> 'unknown'
        AND payment_processing_settlement <> 'unknown'
      )
    ) NOT VALID;

COMMENT ON COLUMN public.reservation_financial_snapshots.fact_mode IS
  'Calculation discriminator. Supporting component facts in declared mode are evidence only and must never be added to the declared base.';
COMMENT ON COLUMN public.reservation_financial_snapshots.declared_owner_base_amount IS
  'Operator-confirmed amount before management commission and property expenses; not guest gross or channel reconciliation.';
COMMENT ON COLUMN public.reservation_financial_snapshots.platform_adjustment_amount IS
  'Signed platform price adjustment, distinct from non-negative discounts.';
COMMENT ON COLUMN public.reservation_financial_snapshots.ota_commission_base_amount IS
  'Observed OTA commission base used for reconciliation only; it is not an additive payout component.';
COMMENT ON COLUMN public.reservation_financial_snapshots.manager_cleaning_cost_amount IS
  'Cleaning or laundry cost borne by the manager for this reservation.';
COMMENT ON COLUMN public.reservation_financial_snapshots.source_mapping_version IS
  'Version of the manual/import/API mapping that produced the canonical facts.';

CREATE TABLE public.property_financial_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL,
  version integer NOT NULL,
  currency text NOT NULL,
  guest_cleaning_fee_default_amount numeric(14,2),
  guest_cleaning_fee_mode text,
  manager_cleaning_cost_default_amount numeric(14,2),
  manager_cleaning_cost_mode text,
  municipal_tax_amount_per_guest_night numeric(14,2),
  valid_from date NOT NULL,
  valid_to date,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT property_financial_parameters_property_org_fk
    FOREIGN KEY (property_id, organization_id)
    REFERENCES public.properties(id, organization_id) ON DELETE CASCADE,
  CONSTRAINT property_financial_parameters_version_check CHECK (version > 0),
  CONSTRAINT property_financial_parameters_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT property_financial_parameters_guest_cleaning_check CHECK (
    (guest_cleaning_fee_default_amount IS NULL AND guest_cleaning_fee_mode IS NULL)
    OR
    (guest_cleaning_fee_default_amount >= 0 AND guest_cleaning_fee_mode IN ('per_stay', 'per_night'))
  ),
  CONSTRAINT property_financial_parameters_manager_cleaning_check CHECK (
    (manager_cleaning_cost_default_amount IS NULL AND manager_cleaning_cost_mode IS NULL)
    OR
    (manager_cleaning_cost_default_amount >= 0 AND manager_cleaning_cost_mode IN ('per_stay', 'per_night'))
  ),
  CONSTRAINT property_financial_parameters_municipal_tax_check
    CHECK (municipal_tax_amount_per_guest_night IS NULL OR municipal_tax_amount_per_guest_night >= 0),
  CONSTRAINT property_financial_parameters_has_value_check CHECK (
    guest_cleaning_fee_default_amount IS NOT NULL
    OR manager_cleaning_cost_default_amount IS NOT NULL
    OR municipal_tax_amount_per_guest_night IS NOT NULL
  ),
  CONSTRAINT property_financial_parameters_validity_check
    CHECK (valid_to IS NULL OR valid_to >= valid_from),
  CONSTRAINT property_financial_parameters_note_check
    CHECK (note IS NULL OR char_length(note) <= 2000),
  CONSTRAINT property_financial_parameters_org_property_version_key
    UNIQUE (organization_id, property_id, version),
  CONSTRAINT property_financial_parameters_no_overlapping_validity
    EXCLUDE USING gist (
      organization_id WITH =,
      property_id WITH =,
      daterange(valid_from, COALESCE(valid_to + 1, 'infinity'::date), '[)') WITH &&
    )
);

CREATE UNIQUE INDEX property_financial_parameters_one_current
  ON public.property_financial_parameters (organization_id, property_id)
  WHERE valid_to IS NULL;

CREATE INDEX property_financial_parameters_history_lookup
  ON public.property_financial_parameters (organization_id, property_id, valid_from DESC);

COMMENT ON TABLE public.property_financial_parameters IS
  'Immutable, versioned property defaults used only to propose reviewable reservation facts; never retroactive canonical facts.';
COMMENT ON COLUMN public.property_financial_parameters.municipal_tax_amount_per_guest_night IS
  'Configured rate multiplied by confirmed guest count and occupied nights; unmodelled exemptions or caps require manual confirmation.';

ALTER TABLE public.property_financial_parameters ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.property_financial_parameters FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.property_financial_parameters TO authenticated;
GRANT ALL ON TABLE public.property_financial_parameters TO service_role;

CREATE POLICY property_financial_parameters_tenant_select
ON public.property_financial_parameters
FOR SELECT
TO authenticated
USING (
  organization_id = (SELECT public.get_user_organization_id())
  AND public.user_has_property_access(property_id)
);

CREATE OR REPLACE FUNCTION lodgra_private.prevent_unversioned_property_financial_parameter_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'PROPERTY_FINANCIAL_PARAMETERS_ARE_IMMUTABLE';
  END IF;

  IF pg_catalog.current_setting(
      'lodgra.allow_property_financial_parameter_replacement', true
    ) IS DISTINCT FROM 'on'
    OR OLD.valid_to IS NOT NULL
    OR NEW.valid_to IS NULL
    OR NEW.valid_to < OLD.valid_from
    OR (pg_catalog.to_jsonb(NEW) - 'valid_to')
      IS DISTINCT FROM (pg_catalog.to_jsonb(OLD) - 'valid_to')
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'PROPERTY_FINANCIAL_PARAMETERS_ARE_IMMUTABLE';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION lodgra_private.prevent_unversioned_property_financial_parameter_mutation()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION lodgra_private.prevent_unversioned_property_financial_parameter_mutation()
  TO service_role;

CREATE TRIGGER prevent_unversioned_property_financial_parameter_mutation
BEFORE UPDATE OR DELETE ON public.property_financial_parameters
FOR EACH ROW
EXECUTE FUNCTION lodgra_private.prevent_unversioned_property_financial_parameter_mutation();

COMMIT;
