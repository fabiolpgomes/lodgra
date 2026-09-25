BEGIN;

DROP INDEX IF EXISTS public.regras_repasse_historico_lookup;

CREATE INDEX regras_repasse_historico_lookup
  ON public.regras_repasse (propriedade_id, organization_id, vigencia_inicio DESC);

COMMIT;
