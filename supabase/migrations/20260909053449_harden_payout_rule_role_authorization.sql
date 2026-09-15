CREATE OR REPLACE FUNCTION lodgra_private.replace_property_payout_rule(
  p_property_id uuid,
  p_expected_current_rule_id uuid,
  p_vigencia_inicio date,
  p_tipo_comissao public.tipo_comissao_repasse,
  p_comissao_valor numeric,
  p_base_comissao public.base_comissao_repasse,
  p_taxa_limpeza_para public.destinatario_taxa_repasse,
  p_comissao_ota_por_conta public.destinatario_taxa_repasse,
  p_despesas_repassaveis boolean,
  p_dia_fechamento smallint,
  p_observacoes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_organization_id uuid;
  v_role text;
  v_current public.regras_repasse%ROWTYPE;
  v_new public.regras_repasse%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PAYOUT_FORBIDDEN';
  END IF;

  SELECT up.organization_id, up.role
    INTO v_organization_id, v_role
  FROM public.user_profiles AS up
  WHERE up.id = v_user_id;

  IF v_organization_id IS NULL OR v_role IS NULL OR v_role NOT IN ('admin', 'gestor') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PAYOUT_FORBIDDEN';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.properties AS p
    WHERE p.id = p_property_id
      AND p.organization_id = v_organization_id
      AND public.user_has_property_access(p.id)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PAYOUT_FORBIDDEN';
  END IF;

  IF p_expected_current_rule_id IS NULL
     OR p_vigencia_inicio IS NULL
     OR p_tipo_comissao IS NULL
     OR p_comissao_valor IS NULL
     OR p_base_comissao IS NULL
     OR p_taxa_limpeza_para IS NULL
     OR p_comissao_ota_por_conta IS NULL
     OR p_despesas_repassaveis IS NULL
     OR p_dia_fechamento IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PAYOUT_RULE_INVALID';
  END IF;

  SELECT rr.*
    INTO v_current
  FROM public.regras_repasse AS rr
  WHERE rr.organization_id = v_organization_id
    AND rr.propriedade_id = p_property_id
    AND rr.vigencia_fim IS NULL
  FOR UPDATE;

  IF NOT FOUND OR v_current.id IS DISTINCT FROM p_expected_current_rule_id THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'PAYOUT_RULE_CONFLICT';
  END IF;

  IF p_vigencia_inicio <= v_current.vigencia_inicio
     OR p_vigencia_inicio > (pg_catalog.now() AT TIME ZONE 'UTC')::date THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PAYOUT_RULE_INVALID';
  END IF;

  UPDATE public.regras_repasse
  SET vigencia_fim = p_vigencia_inicio - 1,
      updated_at = now()
  WHERE id = v_current.id
    AND organization_id = v_organization_id
    AND propriedade_id = p_property_id
    AND vigencia_fim IS NULL
  RETURNING * INTO v_current;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'PAYOUT_RULE_CONFLICT';
  END IF;

  INSERT INTO public.regras_repasse (
    organization_id,
    propriedade_id,
    vigencia_inicio,
    tipo_comissao,
    comissao_valor,
    base_comissao,
    taxa_limpeza_para,
    comissao_ota_por_conta,
    despesas_repassaveis,
    dia_fechamento,
    observacoes
  ) VALUES (
    v_organization_id,
    p_property_id,
    p_vigencia_inicio,
    p_tipo_comissao,
    p_comissao_valor,
    p_base_comissao,
    p_taxa_limpeza_para,
    p_comissao_ota_por_conta,
    p_despesas_repassaveis,
    p_dia_fechamento,
    NULLIF(btrim(p_observacoes), '')
  )
  RETURNING * INTO v_new;

  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (
    v_user_id,
    'update',
    'property',
    p_property_id::text,
    jsonb_build_object(
      'event', 'property_payout_rule_replaced',
      'previous_rule_id', v_current.id,
      'current_rule_id', v_new.id,
      'vigencia_inicio', p_vigencia_inicio
    )
  );

  RETURN jsonb_build_object(
    'previous_rule', to_jsonb(v_current),
    'current_rule', to_jsonb(v_new)
  );
EXCEPTION
  WHEN exclusion_violation OR unique_violation OR serialization_failure THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'PAYOUT_RULE_CONFLICT';
  WHEN check_violation OR numeric_value_out_of_range OR string_data_right_truncation THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PAYOUT_RULE_INVALID';
END;
$$;

REVOKE ALL ON FUNCTION lodgra_private.replace_property_payout_rule(
  uuid, uuid, date, public.tipo_comissao_repasse, numeric,
  public.base_comissao_repasse, public.destinatario_taxa_repasse,
  public.destinatario_taxa_repasse, boolean, smallint, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION lodgra_private.replace_property_payout_rule(
  uuid, uuid, date, public.tipo_comissao_repasse, numeric,
  public.base_comissao_repasse, public.destinatario_taxa_repasse,
  public.destinatario_taxa_repasse, boolean, smallint, text
) TO authenticated, service_role;
