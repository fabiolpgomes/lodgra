BEGIN;

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

REVOKE ALL ON FUNCTION lodgra_private.prevent_unversioned_v2_rule_closure()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION lodgra_private.prevent_unversioned_v2_rule_closure()
TO service_role;

CREATE TRIGGER prevent_unversioned_v2_rule_closure
BEFORE UPDATE OF vigencia_fim, contract_version
ON public.regras_repasse
FOR EACH ROW
EXECUTE FUNCTION lodgra_private.prevent_unversioned_v2_rule_closure();

COMMENT ON FUNCTION lodgra_private.prevent_unversioned_v2_rule_closure() IS
  'Fail-closed gate: an open v2 payout rule remains immutable until the reviewed transactional v2 replacement RPC is installed.';

COMMIT;
