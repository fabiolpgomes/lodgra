BEGIN;

-- Story 47.3: additive, tenant-safe financial policy v2 foundation.
-- No legacy reservation value is backfilled or reinterpreted here.

CREATE TABLE public.organization_financial_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  default_preset text NOT NULL,
  default_recognition_basis text NOT NULL,
  default_cash_flow_model text NOT NULL,
  default_cleaning_recipient text NOT NULL,
  default_municipal_tax_recipient text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_financial_settings_preset_check
    CHECK (default_preset IN ('net_received', 'gross_reservation', 'custom')),
  CONSTRAINT organization_financial_settings_recognition_check
    CHECK (default_recognition_basis IN ('check_in', 'check_out', 'payout_date')),
  CONSTRAINT organization_financial_settings_cash_flow_check
    CHECK (default_cash_flow_model IN ('manager_trust', 'owner_direct')),
  CONSTRAINT organization_financial_settings_cleaning_recipient_check
    CHECK (default_cleaning_recipient IN ('manager', 'owner', 'third_party')),
  CONSTRAINT organization_financial_settings_municipal_recipient_check
    CHECK (default_municipal_tax_recipient = 'municipality')
);

COMMENT ON TABLE public.organization_financial_settings IS
  'Tenant defaults used only when composing a new property contract; never rewrites historical payout rules.';

ALTER TABLE public.regras_repasse
  ADD COLUMN contract_version smallint NOT NULL DEFAULT 1,
  ADD COLUMN recognition_basis text,
  ADD COLUMN cash_flow_model text,
  ADD COLUMN preset_key text,
  ADD COLUMN management_commission_tax_rate numeric(7,4),
  ADD CONSTRAINT regras_repasse_contract_version_check
    CHECK (contract_version IN (1, 2)),
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
    ),
  ADD CONSTRAINT regras_repasse_id_organization_key UNIQUE (id, organization_id);

COMMENT ON COLUMN public.regras_repasse.contract_version IS
  'Version 1 preserves the legacy contract; version 2 uses explicit component policies.';
COMMENT ON COLUMN public.regras_repasse.recognition_basis IS
  'Revenue recognition basis copied from tenant defaults and versioned with the property contract.';
COMMENT ON COLUMN public.regras_repasse.management_commission_tax_rate IS
  'Tax percentage charged on the management service, not a reservation tax.';

CREATE TABLE public.payout_rule_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payout_rule_id uuid NOT NULL,
  component_code text NOT NULL,
  recipient text NOT NULL,
  commission_base_effect text NOT NULL,
  owner_statement_effect text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payout_rule_components_rule_org_fk
    FOREIGN KEY (payout_rule_id, organization_id)
    REFERENCES public.regras_repasse(id, organization_id) ON DELETE CASCADE,
  CONSTRAINT payout_rule_components_code_check CHECK (
    component_code IN (
      'accommodation', 'cleaning_fee', 'municipal_tax', 'other_guest_fees',
      'discount', 'ota_commission', 'payment_processing_fee'
    )
  ),
  CONSTRAINT payout_rule_components_recipient_check CHECK (
    recipient IN ('manager', 'owner', 'municipality', 'channel', 'payment_processor', 'third_party')
  ),
  CONSTRAINT payout_rule_components_commission_effect_check
    CHECK (commission_base_effect IN ('credit', 'debit', 'ignore')),
  CONSTRAINT payout_rule_components_statement_effect_check
    CHECK (owner_statement_effect IN ('credit', 'debit', 'ignore')),
  CONSTRAINT payout_rule_components_rule_component_key
    UNIQUE (organization_id, payout_rule_id, component_code)
);

COMMENT ON TABLE public.payout_rule_components IS
  'Explicit component policy for v2 payout rules. Preset names never select a calculation branch.';

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_id_property_organization_key
  UNIQUE (id, property_id, organization_id);

CREATE TABLE public.reservation_financial_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL,
  reservation_id uuid NOT NULL,
  version integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  currency text NOT NULL,
  accommodation_amount numeric(14,2),
  cleaning_fee_amount numeric(14,2),
  municipal_tax_amount numeric(14,2),
  other_guest_fees_amount numeric(14,2),
  discount_amount numeric(14,2),
  guest_total_amount numeric(14,2),
  ota_commission_amount numeric(14,2),
  payment_processing_fee_amount numeric(14,2),
  channel_net_payout_amount numeric(14,2),
  source_kind text NOT NULL,
  provider text,
  external_reference text,
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  captured_at timestamptz NOT NULL DEFAULT now(),
  superseded_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reservation_financial_snapshots_reservation_org_fk
    FOREIGN KEY (reservation_id, property_id, organization_id)
    REFERENCES public.reservations(id, property_id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT reservation_financial_snapshots_property_org_fk
    FOREIGN KEY (property_id, organization_id)
    REFERENCES public.properties(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT reservation_financial_snapshots_version_check CHECK (version > 0),
  CONSTRAINT reservation_financial_snapshots_status_check
    CHECK (status IN ('pending', 'complete', 'needs_review')),
  CONSTRAINT reservation_financial_snapshots_currency_check
    CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT reservation_financial_snapshots_source_check
    CHECK (source_kind IN ('manual', 'ical', 'channel_api', 'channel_csv', 'import')),
  CONSTRAINT reservation_financial_snapshots_metadata_object_check
    CHECK (jsonb_typeof(source_metadata) = 'object'),
  CONSTRAINT reservation_financial_snapshots_superseded_check
    CHECK (superseded_at IS NULL OR superseded_at >= captured_at),
  CONSTRAINT reservation_financial_snapshots_amounts_check CHECK (
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
  CONSTRAINT reservation_financial_snapshots_reservation_version_key
    UNIQUE (organization_id, reservation_id, version),
  CONSTRAINT reservation_financial_snapshots_id_org_key UNIQUE (id, organization_id)
);

CREATE UNIQUE INDEX reservation_financial_snapshots_one_current
  ON public.reservation_financial_snapshots (organization_id, reservation_id)
  WHERE superseded_at IS NULL;
CREATE INDEX reservation_financial_snapshots_property_period
  ON public.reservation_financial_snapshots (organization_id, property_id, captured_at DESC);

COMMENT ON TABLE public.reservation_financial_snapshots IS
  'Versioned canonical financial facts. NULL means unavailable; iCal zero must not be treated as confirmed finance.';

CREATE TABLE public.channel_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_payout_id text,
  payout_at timestamptz NOT NULL,
  currency text NOT NULL,
  gross_amount numeric(14,2),
  ota_commission_amount numeric(14,2),
  payment_processing_fee_amount numeric(14,2),
  adjustment_amount numeric(14,2),
  net_amount numeric(14,2) NOT NULL,
  source_kind text NOT NULL,
  reconciliation_status text NOT NULL DEFAULT 'pending',
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT channel_payouts_provider_check CHECK (btrim(provider) <> ''),
  CONSTRAINT channel_payouts_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT channel_payouts_source_check
    CHECK (source_kind IN ('manual', 'channel_api', 'channel_csv', 'bank_import', 'import')),
  CONSTRAINT channel_payouts_status_check
    CHECK (reconciliation_status IN ('pending', 'reconciled', 'needs_review')),
  CONSTRAINT channel_payouts_fees_check CHECK (
    (ota_commission_amount IS NULL OR ota_commission_amount >= 0)
    AND (payment_processing_fee_amount IS NULL OR payment_processing_fee_amount >= 0)
  ),
  CONSTRAINT channel_payouts_metadata_object_check
    CHECK (jsonb_typeof(source_metadata) = 'object'),
  CONSTRAINT channel_payouts_id_org_key UNIQUE (id, organization_id)
);

CREATE UNIQUE INDEX channel_payouts_external_reference_key
  ON public.channel_payouts (organization_id, provider, external_payout_id)
  WHERE external_payout_id IS NOT NULL;
CREATE INDEX channel_payouts_org_date
  ON public.channel_payouts (organization_id, payout_at DESC);

CREATE TABLE public.channel_payout_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payout_id uuid NOT NULL,
  property_id uuid NOT NULL,
  reservation_id uuid NOT NULL,
  allocation_type text NOT NULL,
  currency text NOT NULL,
  amount numeric(14,2) NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT channel_payout_allocations_payout_org_fk
    FOREIGN KEY (payout_id, organization_id)
    REFERENCES public.channel_payouts(id, organization_id) ON DELETE CASCADE,
  CONSTRAINT channel_payout_allocations_reservation_org_fk
    FOREIGN KEY (reservation_id, property_id, organization_id)
    REFERENCES public.reservations(id, property_id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT channel_payout_allocations_property_org_fk
    FOREIGN KEY (property_id, organization_id)
    REFERENCES public.properties(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT channel_payout_allocations_type_check
    CHECK (allocation_type IN ('reservation', 'adjustment', 'refund')),
  CONSTRAINT channel_payout_allocations_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT channel_payout_allocations_amount_check CHECK (
    (allocation_type = 'reservation' AND amount >= 0)
    OR (allocation_type = 'refund' AND amount <= 0)
    OR (allocation_type = 'adjustment' AND amount <> 0)
  ),
  CONSTRAINT channel_payout_allocations_unique
    UNIQUE (organization_id, payout_id, reservation_id, allocation_type)
);

CREATE INDEX channel_payout_allocations_reservation_lookup
  ON public.channel_payout_allocations (organization_id, property_id, reservation_id);

-- RLS is enabled before any API-facing grants. Direct client writes remain closed
-- until transactional v2 RPCs are introduced and reviewed.
ALTER TABLE public.organization_financial_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_rule_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_financial_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_payout_allocations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.organization_financial_settings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.payout_rule_components FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.reservation_financial_snapshots FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.channel_payouts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.channel_payout_allocations FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.organization_financial_settings TO authenticated;
GRANT SELECT ON TABLE public.payout_rule_components TO authenticated;
GRANT SELECT ON TABLE public.reservation_financial_snapshots TO authenticated;
GRANT SELECT ON TABLE public.channel_payouts TO authenticated;
GRANT SELECT ON TABLE public.channel_payout_allocations TO authenticated;
GRANT ALL ON TABLE public.organization_financial_settings TO service_role;
GRANT ALL ON TABLE public.payout_rule_components TO service_role;
GRANT ALL ON TABLE public.reservation_financial_snapshots TO service_role;
GRANT ALL ON TABLE public.channel_payouts TO service_role;
GRANT ALL ON TABLE public.channel_payout_allocations TO service_role;

CREATE POLICY organization_financial_settings_tenant_select
ON public.organization_financial_settings FOR SELECT TO authenticated
USING (organization_id = (SELECT public.get_user_organization_id()));

CREATE POLICY payout_rule_components_tenant_select
ON public.payout_rule_components FOR SELECT TO authenticated
USING (
  organization_id = (SELECT public.get_user_organization_id())
  AND EXISTS (
    SELECT 1 FROM public.regras_repasse rr
    WHERE rr.id = payout_rule_id
      AND rr.organization_id = payout_rule_components.organization_id
      AND public.user_has_property_access(rr.propriedade_id)
  )
);

CREATE POLICY reservation_financial_snapshots_tenant_select
ON public.reservation_financial_snapshots FOR SELECT TO authenticated
USING (
  organization_id = (SELECT public.get_user_organization_id())
  AND public.user_has_property_access(property_id)
);

CREATE POLICY channel_payouts_tenant_select
ON public.channel_payouts FOR SELECT TO authenticated
USING (organization_id = (SELECT public.get_user_organization_id()));

CREATE POLICY channel_payout_allocations_tenant_select
ON public.channel_payout_allocations FOR SELECT TO authenticated
USING (
  organization_id = (SELECT public.get_user_organization_id())
  AND public.user_has_property_access(property_id)
);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER organization_financial_settings_touch_updated_at
BEFORE UPDATE ON public.organization_financial_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER channel_payouts_touch_updated_at
BEFORE UPDATE ON public.channel_payouts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMIT;
