BEGIN;

CREATE OR REPLACE FUNCTION lodgra_private.mutate_property_payout_rule_v2_with_declared(
  p_property_id uuid, p_expected_current_rule_id uuid, p_expect_absent boolean,
  p_vigencia_inicio date, p_tipo_comissao public.tipo_comissao_repasse,
  p_comissao_valor numeric, p_imposto_comissao_percentual numeric,
  p_competencia_receita text, p_fluxo_financeiro text, p_preset text,
  p_despesas_repassaveis boolean, p_dia_fechamento smallint,
  p_componentes jsonb, p_observacoes text, p_allow_declared_owner_base boolean
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_result jsonb; v_rule_id uuid;
BEGIN
  IF p_allow_declared_owner_base IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PAYOUT_RULE_INVALID';
  END IF;
  v_result := lodgra_private.mutate_property_payout_rule_v2(
    p_property_id, p_expected_current_rule_id, p_expect_absent, p_vigencia_inicio,
    p_tipo_comissao, p_comissao_valor, p_imposto_comissao_percentual,
    p_competencia_receita, p_fluxo_financeiro, p_preset, p_despesas_repassaveis,
    p_dia_fechamento, p_componentes, p_observacoes
  );
  v_rule_id := (v_result->>'current_rule_id')::uuid;
  PERFORM pg_catalog.set_config('lodgra.v2_rule_replacement_txid', pg_catalog.txid_current()::text, true);
  UPDATE public.regras_repasse SET allow_declared_owner_base = p_allow_declared_owner_base
  WHERE id = v_rule_id AND propriedade_id = p_property_id AND contract_version = 2;
  PERFORM pg_catalog.set_config('lodgra.v2_rule_replacement_txid', '', true);
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION lodgra_private.mutate_property_payout_rule_v2_with_declared(
  uuid,uuid,boolean,date,public.tipo_comissao_repasse,numeric,numeric,text,text,text,
  boolean,smallint,jsonb,text,boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION lodgra_private.mutate_property_payout_rule_v2_with_declared(
  uuid,uuid,boolean,date,public.tipo_comissao_repasse,numeric,numeric,text,text,text,
  boolean,smallint,jsonb,text,boolean
) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.replace_property_payout_rule_v2(
  p_property_id uuid, p_expected_current_rule_id uuid, p_vigencia_inicio date,
  p_tipo_comissao public.tipo_comissao_repasse, p_comissao_valor numeric,
  p_imposto_comissao_percentual numeric, p_competencia_receita text,
  p_fluxo_financeiro text, p_preset text, p_despesas_repassaveis boolean,
  p_dia_fechamento smallint, p_componentes jsonb, p_observacoes text,
  p_allow_declared_owner_base boolean
)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT lodgra_private.mutate_property_payout_rule_v2_with_declared(
    p_property_id,p_expected_current_rule_id,false,p_vigencia_inicio,p_tipo_comissao,
    p_comissao_valor,p_imposto_comissao_percentual,p_competencia_receita,p_fluxo_financeiro,
    p_preset,p_despesas_repassaveis,p_dia_fechamento,p_componentes,p_observacoes,p_allow_declared_owner_base
  );
$$;

CREATE OR REPLACE FUNCTION public.create_property_payout_rule_v2(
  p_property_id uuid, p_vigencia_inicio date,
  p_tipo_comissao public.tipo_comissao_repasse, p_comissao_valor numeric,
  p_imposto_comissao_percentual numeric, p_competencia_receita text,
  p_fluxo_financeiro text, p_preset text, p_despesas_repassaveis boolean,
  p_dia_fechamento smallint, p_componentes jsonb, p_observacoes text,
  p_allow_declared_owner_base boolean
)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT lodgra_private.mutate_property_payout_rule_v2_with_declared(
    p_property_id,NULL,true,p_vigencia_inicio,p_tipo_comissao,p_comissao_valor,
    p_imposto_comissao_percentual,p_competencia_receita,p_fluxo_financeiro,p_preset,
    p_despesas_repassaveis,p_dia_fechamento,p_componentes,p_observacoes,p_allow_declared_owner_base
  );
$$;

REVOKE ALL ON FUNCTION public.replace_property_payout_rule_v2(
  uuid,uuid,date,public.tipo_comissao_repasse,numeric,numeric,text,text,text,boolean,smallint,jsonb,text,boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_property_payout_rule_v2(
  uuid,uuid,date,public.tipo_comissao_repasse,numeric,numeric,text,text,text,boolean,smallint,jsonb,text,boolean
) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_property_payout_rule_v2(
  uuid,date,public.tipo_comissao_repasse,numeric,numeric,text,text,text,boolean,smallint,jsonb,text,boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_property_payout_rule_v2(
  uuid,date,public.tipo_comissao_repasse,numeric,numeric,text,text,text,boolean,smallint,jsonb,text,boolean
) TO authenticated, service_role;

COMMIT;
