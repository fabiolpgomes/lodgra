BEGIN;

DROP TRIGGER IF EXISTS prevent_unversioned_v2_rule_mutation
ON public.regras_repasse;

CREATE TRIGGER prevent_unversioned_v2_rule_closure
BEFORE UPDATE OF vigencia_fim, contract_version
ON public.regras_repasse
FOR EACH ROW
EXECUTE FUNCTION lodgra_private.prevent_unversioned_v2_rule_closure();

CREATE TRIGGER prevent_unversioned_v2_rule_delete
BEFORE DELETE ON public.regras_repasse
FOR EACH ROW
EXECUTE FUNCTION lodgra_private.prevent_unversioned_v2_rule_closure();

COMMIT;
