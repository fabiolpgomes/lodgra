BEGIN;

DROP TRIGGER IF EXISTS prevent_unversioned_v2_rule_closure
ON public.regras_repasse;

DROP FUNCTION IF EXISTS lodgra_private.prevent_unversioned_v2_rule_closure();

COMMIT;
