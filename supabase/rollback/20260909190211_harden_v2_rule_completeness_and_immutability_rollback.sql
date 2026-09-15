BEGIN;

DROP TRIGGER IF EXISTS prevent_unversioned_v2_rule_mutation
ON public.regras_repasse;
DROP TRIGGER IF EXISTS prevent_unversioned_v2_rule_delete
ON public.regras_repasse;

CREATE OR REPLACE FUNCTION lodgra_private.prevent_unversioned_v2_rule_closure()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.contract_version = 2
     AND OLD.vigencia_fim IS NULL
     AND (
       NEW.vigencia_fim IS NOT NULL
       OR NEW.contract_version IS DISTINCT FROM OLD.contract_version
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'PAYOUT_V2_MUTATION_REQUIRED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_unversioned_v2_rule_closure
ON public.regras_repasse;

CREATE TRIGGER prevent_unversioned_v2_rule_closure
BEFORE UPDATE OF vigencia_fim, contract_version
ON public.regras_repasse
FOR EACH ROW
EXECUTE FUNCTION lodgra_private.prevent_unversioned_v2_rule_closure();

ALTER TABLE public.regras_repasse
  DROP CONSTRAINT IF EXISTS regras_repasse_v2_fields_check,
  ADD CONSTRAINT regras_repasse_v2_fields_check
    CHECK (
      (contract_version = 1
        AND recognition_basis IS NULL
        AND cash_flow_model IS NULL
        AND preset_key IS NULL
        AND management_commission_tax_rate IS NULL)
      OR
      (contract_version = 2
        AND recognition_basis IN ('check_in', 'check_out', 'payout_date')
        AND cash_flow_model IN ('manager_trust', 'owner_direct')
        AND preset_key IN ('net_received', 'gross_reservation', 'custom')
        AND management_commission_tax_rate BETWEEN 0 AND 100)
    );

COMMIT;
