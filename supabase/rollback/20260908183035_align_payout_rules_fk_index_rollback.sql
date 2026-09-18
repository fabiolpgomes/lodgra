BEGIN;

DROP INDEX IF EXISTS public.regras_repasse_historico_lookup;

CREATE INDEX regras_repasse_historico_lookup
  ON public.regras_repasse (organization_id, propriedade_id, vigencia_inicio DESC);

COMMIT;
