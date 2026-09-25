BEGIN;

-- Final integrity pass: explicit UTC contract dates, exhaustive legacy NULL
-- validation, and trustworthy updated_at values for mutable v2 records.
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
  v_component_count integer;
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

  IF p_vigencia_inicio IS NULL
     OR p_expected_current_rule_id IS NULL
     OR p_tipo_comissao IS NULL
     OR p_comissao_valor IS NULL
     OR p_imposto_comissao_percentual IS NULL
     OR p_competencia_receita IS NULL
     OR p_competencia_receita NOT IN ('check_in', 'check_out', 'stay_prorata', 'payout_date')
     OR p_fluxo_financeiro IS NULL
     OR p_fluxo_financeiro NOT IN ('manager_trust', 'owner_direct')
     OR p_preset IS NULL
     OR p_preset NOT IN ('net_received', 'gross_reservation', 'custom')
     OR p_despesas_repassaveis IS NULL
     OR p_dia_fechamento IS NULL
     OR p_dia_fechamento NOT BETWEEN 1 AND 31
     OR p_imposto_comissao_percentual NOT BETWEEN 0 AND 100
     OR (p_tipo_comissao = 'percentual' AND p_comissao_valor NOT BETWEEN 0 AND 100)
     OR (p_tipo_comissao IN ('fixo_mensal', 'fixo_por_reserva') AND p_comissao_valor < 0)
     OR p_componentes IS NULL
     OR pg_catalog.jsonb_typeof(p_componentes) <> 'array'
     OR pg_catalog.jsonb_array_length(p_componentes) <> 7
     OR coalesce(pg_catalog.length(p_observacoes), 0) > 2000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PAYOUT_RULE_INVALID';
  END IF;

  SELECT pg_catalog.count(DISTINCT component_code)
    INTO v_component_count
  FROM pg_catalog.jsonb_to_recordset(p_componentes) AS component(
    component_code text,
    recipient text,
    commission_base_effect text,
    owner_statement_effect text
  )
  WHERE component.component_code IN (
      'accommodation', 'cleaning_fee', 'municipal_tax', 'other_guest_fees',
      'discount', 'ota_commission', 'payment_processing_fee'
    )
    AND component.recipient IN (
      'manager', 'owner', 'municipality', 'channel', 'payment_processor', 'third_party'
    )
    AND component.commission_base_effect IN ('credit', 'debit', 'ignore')
    AND component.owner_statement_effect IN ('credit', 'debit', 'ignore');

  IF v_component_count <> 7 THEN
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

  IF p_vigencia_inicio <> (pg_catalog.now() AT TIME ZONE 'UTC')::date
     OR p_vigencia_inicio <= v_current.vigencia_inicio THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PAYOUT_RULE_INVALID';
  END IF;

  PERFORM pg_catalog.set_config(
    'lodgra.v2_rule_replacement_txid',
    pg_catalog.txid_current()::text,
    true
  );

  UPDATE public.regras_repasse
  SET vigencia_fim = p_vigencia_inicio - 1,
      updated_at = pg_catalog.now()
  WHERE id = v_current.id
    AND organization_id = v_organization_id
    AND propriedade_id = p_property_id
    AND vigencia_fim IS NULL
  RETURNING * INTO v_current;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'PAYOUT_RULE_CONFLICT';
  END IF;

  PERFORM pg_catalog.set_config('lodgra.v2_rule_replacement_txid', '', true);

  INSERT INTO public.regras_repasse (
    organization_id, propriedade_id, vigencia_inicio,
    tipo_comissao, comissao_valor,
    base_comissao, taxa_limpeza_para, comissao_ota_por_conta,
    despesas_repassaveis, dia_fechamento, observacoes,
    contract_version, recognition_basis, cash_flow_model,
    preset_key, management_commission_tax_rate
  ) VALUES (
    v_organization_id, p_property_id, p_vigencia_inicio,
    p_tipo_comissao, p_comissao_valor,
    NULL, NULL, NULL,
    p_despesas_repassaveis, p_dia_fechamento, NULLIF(pg_catalog.btrim(p_observacoes), ''),
    2, p_competencia_receita, p_fluxo_financeiro,
    p_preset, p_imposto_comissao_percentual
  )
  RETURNING * INTO v_new;

  INSERT INTO public.payout_rule_components (
    organization_id, payout_rule_id, component_code, recipient,
    commission_base_effect, owner_statement_effect
  )
  SELECT
    v_organization_id, v_new.id, component.component_code, component.recipient,
    component.commission_base_effect, component.owner_statement_effect
  FROM pg_catalog.jsonb_to_recordset(p_componentes) AS component(
    component_code text,
    recipient text,
    commission_base_effect text,
    owner_statement_effect text
  );

  IF (SELECT pg_catalog.count(*) FROM public.payout_rule_components prc
      WHERE prc.organization_id = v_organization_id AND prc.payout_rule_id = v_new.id) <> 7 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PAYOUT_RULE_INVALID';
  END IF;

  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (
    v_user_id,
    'update',
    'property',
    p_property_id::text,
    pg_catalog.jsonb_build_object(
      'event', 'property_payout_rule_v2_replaced',
      'previous_rule_id', v_current.id,
      'current_rule_id', v_new.id,
      'vigencia_inicio', p_vigencia_inicio,
      'contract_version', 2
    )
  );

  RETURN pg_catalog.jsonb_build_object(
    'previous_rule_id', v_current.id,
    'current_rule_id', v_new.id
  );
EXCEPTION
  WHEN exclusion_violation OR unique_violation OR serialization_failure THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'PAYOUT_RULE_CONFLICT';
  WHEN check_violation OR foreign_key_violation OR invalid_text_representation
    OR numeric_value_out_of_range OR string_data_right_truncation THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PAYOUT_RULE_INVALID';
END;
$$;



CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organization_financial_settings_touch_updated_at
ON public.organization_financial_settings;
CREATE TRIGGER organization_financial_settings_touch_updated_at
BEFORE UPDATE ON public.organization_financial_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS channel_payouts_touch_updated_at
ON public.channel_payouts;
CREATE TRIGGER channel_payouts_touch_updated_at
BEFORE UPDATE ON public.channel_payouts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMIT;
