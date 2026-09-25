BEGIN;

CREATE OR REPLACE FUNCTION lodgra_private.prevent_unversioned_v2_rule_closure()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.contract_version = 2 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'PAYOUT_V2_MUTATION_REQUIRED';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_unversioned_v2_rule_mutation
ON public.regras_repasse;
CREATE TRIGGER prevent_unversioned_v2_rule_mutation
BEFORE UPDATE OR DELETE ON public.regras_repasse
FOR EACH ROW
EXECUTE FUNCTION lodgra_private.prevent_unversioned_v2_rule_closure();

COMMENT ON FUNCTION lodgra_private.prevent_unversioned_v2_rule_closure() IS
  'Temporary fail-closed gate: every v2 rule mutation is blocked until the reviewed transactional v2 RPC replaces this function.';

COMMIT;
