BEGIN;

CREATE OR REPLACE FUNCTION lodgra_private.prevent_unversioned_v2_rule_closure()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.contract_version = 2 THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'PAYOUT_V2_MUTATION_REQUIRED';
    END IF;
    RETURN OLD;
  END IF;

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

COMMENT ON FUNCTION lodgra_private.prevent_unversioned_v2_rule_closure() IS
  'Fail-closed gate: v2 payout rules cannot be closed, downgraded or deleted outside a reviewed transactional v2 workflow.';

COMMIT;
