BEGIN;

DROP TABLE IF EXISTS public.channel_payout_allocations;
DROP TABLE IF EXISTS public.channel_payouts;
DROP TABLE IF EXISTS public.reservation_financial_snapshots;
DROP TABLE IF EXISTS public.payout_rule_components;
DROP TABLE IF EXISTS public.organization_financial_settings;
DROP FUNCTION IF EXISTS public.touch_updated_at();

ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_id_property_organization_key;

ALTER TABLE public.regras_repasse
  DROP CONSTRAINT IF EXISTS regras_repasse_id_organization_key,
  DROP CONSTRAINT IF EXISTS regras_repasse_v2_fields_check,
  DROP CONSTRAINT IF EXISTS regras_repasse_contract_version_check,
  DROP COLUMN IF EXISTS management_commission_tax_rate,
  DROP COLUMN IF EXISTS preset_key,
  DROP COLUMN IF EXISTS cash_flow_model,
  DROP COLUMN IF EXISTS recognition_basis,
  DROP COLUMN IF EXISTS contract_version;

COMMIT;
