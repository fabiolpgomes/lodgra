BEGIN;

CREATE TYPE public.tipo_comissao_repasse AS ENUM (
  'percentual',
  'fixo_mensal',
  'fixo_por_reserva'
);

CREATE TYPE public.base_comissao_repasse AS ENUM (
  'receita_bruta',
  'faturamento_propriedade'
);

CREATE TYPE public.destinatario_taxa_repasse AS ENUM (
  'gestor',
  'proprietario'
);

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

CREATE TABLE public.regras_repasse (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  propriedade_id uuid NOT NULL,
  vigencia_inicio date NOT NULL,
  vigencia_fim date,
  tipo_comissao public.tipo_comissao_repasse NOT NULL,
  comissao_valor numeric(12, 4) NOT NULL,
  base_comissao public.base_comissao_repasse NOT NULL DEFAULT 'faturamento_propriedade',
  taxa_limpeza_para public.destinatario_taxa_repasse NOT NULL DEFAULT 'gestor',
  comissao_ota_por_conta public.destinatario_taxa_repasse NOT NULL DEFAULT 'proprietario',
  despesas_repassaveis boolean NOT NULL DEFAULT true,
  dia_fechamento smallint NOT NULL DEFAULT 1,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT regras_repasse_property_org_fk
    FOREIGN KEY (propriedade_id, organization_id)
    REFERENCES public.properties(id, organization_id)
    ON DELETE CASCADE,
  CONSTRAINT regras_repasse_vigencia_valida
    CHECK (vigencia_fim IS NULL OR vigencia_fim >= vigencia_inicio),
  CONSTRAINT regras_repasse_dia_fechamento_valido
    CHECK (dia_fechamento BETWEEN 1 AND 31),
  CONSTRAINT regras_repasse_comissao_valor_valido
    CHECK (
      (tipo_comissao = 'percentual' AND comissao_valor BETWEEN 0 AND 100)
      OR
      (tipo_comissao IN ('fixo_mensal', 'fixo_por_reserva') AND comissao_valor >= 0)
    ),
  CONSTRAINT regras_repasse_vigencias_sem_sobreposicao
    EXCLUDE USING gist (
      organization_id WITH =,
      propriedade_id WITH =,
      daterange(
        vigencia_inicio,
        COALESCE(vigencia_fim + 1, 'infinity'::date),
        '[)'
      ) WITH &&
    )
);

COMMENT ON TABLE public.regras_repasse IS
  'Histórico de regras contratuais usadas no cálculo de repasse por propriedade.';
COMMENT ON COLUMN public.regras_repasse.vigencia_fim IS
  'Último dia inclusivo da vigência; NULL identifica a regra vigente sem fim definido.';
COMMENT ON COLUMN public.regras_repasse.comissao_valor IS
  'Percentual de 0 a 100 ou valor monetário, conforme tipo_comissao.';

CREATE UNIQUE INDEX regras_repasse_uma_vigente_por_propriedade
  ON public.regras_repasse (organization_id, propriedade_id)
  WHERE vigencia_fim IS NULL;

CREATE INDEX regras_repasse_historico_lookup
  ON public.regras_repasse (organization_id, propriedade_id, vigencia_inicio DESC);

CREATE OR REPLACE FUNCTION public.touch_regras_repasse_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_regras_repasse_updated_at() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_regras_repasse_updated_at() TO authenticated, service_role;

CREATE TRIGGER regras_repasse_touch_updated_at
BEFORE UPDATE ON public.regras_repasse
FOR EACH ROW
EXECUTE FUNCTION public.touch_regras_repasse_updated_at();

INSERT INTO public.regras_repasse (
  organization_id,
  propriedade_id,
  vigencia_inicio,
  tipo_comissao,
  comissao_valor
)
SELECT
  p.organization_id,
  p.id,
  COALESCE(p.created_at::date, CURRENT_DATE),
  'percentual'::public.tipo_comissao_repasse,
  COALESCE(p.management_percentage, 0)
FROM public.properties p
WHERE p.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.regras_repasse rr
    WHERE rr.organization_id = p.organization_id
      AND rr.propriedade_id = p.id
      AND rr.vigencia_fim IS NULL
  );

ALTER TABLE public.regras_repasse ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.regras_repasse FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.regras_repasse TO authenticated;
GRANT ALL ON TABLE public.regras_repasse TO service_role;

CREATE POLICY regras_repasse_tenant_select
ON public.regras_repasse
FOR SELECT
TO authenticated
USING (
  organization_id = (SELECT public.get_user_organization_id())
  AND public.user_has_property_access(propriedade_id)
);

CREATE POLICY regras_repasse_tenant_insert
ON public.regras_repasse
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = (SELECT public.get_user_organization_id())
  AND public.user_has_property_access(propriedade_id)
  AND EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.organization_id = regras_repasse.organization_id
      AND up.role = ANY (ARRAY['admin', 'gestor'])
  )
);

CREATE POLICY regras_repasse_tenant_update
ON public.regras_repasse
FOR UPDATE
TO authenticated
USING (
  organization_id = (SELECT public.get_user_organization_id())
  AND public.user_has_property_access(propriedade_id)
  AND EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.organization_id = regras_repasse.organization_id
      AND up.role = ANY (ARRAY['admin', 'gestor'])
  )
)
WITH CHECK (
  organization_id = (SELECT public.get_user_organization_id())
  AND public.user_has_property_access(propriedade_id)
  AND EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.organization_id = regras_repasse.organization_id
      AND up.role = ANY (ARRAY['admin', 'gestor'])
  )
);

COMMIT;
