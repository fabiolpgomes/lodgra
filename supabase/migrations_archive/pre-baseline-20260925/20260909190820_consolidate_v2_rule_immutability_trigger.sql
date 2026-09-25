BEGIN;

DROP TRIGGER IF EXISTS prevent_unversioned_v2_rule_closure
ON public.regras_repasse;
DROP TRIGGER IF EXISTS prevent_unversioned_v2_rule_delete
ON public.regras_repasse;
DROP TRIGGER IF EXISTS prevent_unversioned_v2_rule_mutation
ON public.regras_repasse;

CREATE TRIGGER prevent_unversioned_v2_rule_mutation
BEFORE UPDATE OR DELETE ON public.regras_repasse
FOR EACH ROW
EXECUTE FUNCTION lodgra_private.prevent_unversioned_v2_rule_closure();

COMMIT;
