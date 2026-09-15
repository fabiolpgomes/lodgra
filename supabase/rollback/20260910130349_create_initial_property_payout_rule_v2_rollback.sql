BEGIN;

DROP FUNCTION IF EXISTS public.create_property_payout_rule_v2(
  uuid, date, public.tipo_comissao_repasse, numeric, numeric,
  text, text, text, boolean, smallint, jsonb, text
);

-- Keep the shared mutation implementation for the existing replacement path,
-- but remove all direct caller privileges so expected-absence is unreachable.
REVOKE ALL ON FUNCTION lodgra_private.mutate_property_payout_rule_v2(
  uuid, uuid, boolean, date, public.tipo_comissao_repasse, numeric, numeric,
  text, text, text, boolean, smallint, jsonb, text
) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION lodgra_private.replace_property_payout_rule_v2(
  p_property_id uuid,
  p_expected_current_rule_id uuid,
  p_vigencia_inicio date,
  p_tipo_comissao public.tipo_comissao_repasse,
  p_comissao_valor numeric,
  p_imposto_comissao_percentual numeric,
  p_competencia_receita text,
  p_fluxo_financeiro text,
  p_preset text,
  p_despesas_repassaveis boolean,
  p_dia_fechamento smallint,
  p_componentes jsonb,
  p_observacoes text
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT lodgra_private.mutate_property_payout_rule_v2(
    p_property_id, p_expected_current_rule_id, false, p_vigencia_inicio,
    p_tipo_comissao, p_comissao_valor, p_imposto_comissao_percentual,
    p_competencia_receita, p_fluxo_financeiro, p_preset,
    p_despesas_repassaveis, p_dia_fechamento, p_componentes, p_observacoes
  );
$$;

REVOKE ALL ON FUNCTION lodgra_private.replace_property_payout_rule_v2(
  uuid, uuid, date, public.tipo_comissao_repasse, numeric, numeric,
  text, text, text, boolean, smallint, jsonb, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION lodgra_private.replace_property_payout_rule_v2(
  uuid, uuid, date, public.tipo_comissao_repasse, numeric, numeric,
  text, text, text, boolean, smallint, jsonb, text
) TO authenticated, service_role;

COMMENT ON FUNCTION lodgra_private.mutate_property_payout_rule_v2(
  uuid, uuid, boolean, date, public.tipo_comissao_repasse, numeric, numeric,
  text, text, text, boolean, smallint, jsonb, text
) IS 'Rollback state: shared replacement implementation retained without direct caller privileges.';

COMMIT;
