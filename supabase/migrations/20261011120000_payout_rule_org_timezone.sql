-- Vigência das regras de repasse passa a ser "hoje" no fuso da organização (antes: hoje em UTC).
--
-- Problema: a base exigia p_vigencia_inicio = hoje UTC. No Brasil, entre 21h e 24h o dia UTC já é o
-- seguinte; em Portugal/Espanha, entre 00h e 01h/02h o dia UTC ainda é o anterior. O contrato passava
-- a valer no dia errado para o utilizador.
--
-- Aplicar DEPOIS de 20261011110000_organization_timezone.sql (coluna organizations.timezone) e ANTES de publicar
-- o código que envia a data no fuso da organização. Tem de ser corrida primeiro em staging.
-- As três funções abaixo são as da baseline (20260925000000), só com a data de "hoje" trocada.
-- CREATE OR REPLACE preserva dono e privilégios.

CREATE OR REPLACE FUNCTION lodgra_private.organization_today(p_organization_id uuid)
RETURNS date
LANGUAGE sql
STABLE
SET search_path TO ''
AS $$
  SELECT COALESCE(
    (
      SELECT (pg_catalog.now() AT TIME ZONE COALESCE(
        (SELECT z.name FROM pg_catalog.pg_timezone_names AS z WHERE z.name = o.timezone),
        'Europe/Lisbon'
      ))::date
      FROM public.organizations AS o
      WHERE o.id = p_organization_id
    ),
    (pg_catalog.now() AT TIME ZONE 'Europe/Lisbon')::date
  );
$$;

REVOKE ALL ON FUNCTION lodgra_private.organization_today(uuid) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION "lodgra_private"."mutate_property_payout_rule_v2"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_expect_absent" boolean, "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_organization_id uuid;
  v_role text;
  v_current public.regras_repasse%ROWTYPE;
  v_new public.regras_repasse%ROWTYPE;
  v_component_count integer;
  v_has_current boolean;
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

  -- Serialize both initial creation and replacement on the same property row.
  -- This makes expected absence a real concurrency precondition, not a prior read.
  PERFORM 1
  FROM public.properties AS p
  WHERE p.id = p_property_id
    AND p.organization_id = v_organization_id
    AND public.user_has_property_access(p.id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PAYOUT_FORBIDDEN';
  END IF;

  IF p_expect_absent IS NULL
     OR (p_expect_absent AND p_expected_current_rule_id IS NOT NULL)
     OR (NOT p_expect_absent AND p_expected_current_rule_id IS NULL)
     OR p_vigencia_inicio IS NULL
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
  v_has_current := FOUND;

  IF p_expect_absent THEN
    IF v_has_current THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'PAYOUT_RULE_CONFLICT';
    END IF;
  ELSE
    IF NOT v_has_current OR v_current.id IS DISTINCT FROM p_expected_current_rule_id THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'PAYOUT_RULE_CONFLICT';
    END IF;
  END IF;

  IF p_vigencia_inicio <> lodgra_private.organization_today(v_organization_id)
     OR (v_has_current AND p_vigencia_inicio <= v_current.vigencia_inicio) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PAYOUT_RULE_INVALID';
  END IF;

  IF v_has_current THEN
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
  END IF;

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

  IF (SELECT pg_catalog.count(*) FROM public.payout_rule_components AS prc
      WHERE prc.organization_id = v_organization_id AND prc.payout_rule_id = v_new.id) <> 7 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PAYOUT_RULE_INVALID';
  END IF;

  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (
    v_user_id,
    CASE WHEN v_has_current THEN 'update' ELSE 'create' END,
    'property',
    p_property_id::text,
    pg_catalog.jsonb_build_object(
      'event', CASE WHEN v_has_current
        THEN 'property_payout_rule_v2_replaced'
        ELSE 'property_payout_rule_v2_created'
      END,
      'previous_rule_id', CASE WHEN v_has_current THEN v_current.id ELSE NULL END,
      'current_rule_id', v_new.id,
      'vigencia_inicio', p_vigencia_inicio,
      'contract_version', 2
    )
  );

  RETURN pg_catalog.jsonb_build_object(
    'previous_rule_id', CASE WHEN v_has_current THEN v_current.id ELSE NULL END,
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

CREATE OR REPLACE FUNCTION "lodgra_private"."replace_property_payout_rule"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_base_comissao" "public"."base_comissao_repasse", "p_taxa_limpeza_para" "public"."destinatario_taxa_repasse", "p_comissao_ota_por_conta" "public"."destinatario_taxa_repasse", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_observacoes" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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
     OR p_vigencia_inicio > lodgra_private.organization_today(v_organization_id) THEN
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

CREATE OR REPLACE FUNCTION "lodgra_private"."replace_reservation_financial_snapshot"("p_reservation_id" "uuid", "p_expected_current_version" integer, "p_fact_mode" "text", "p_currency" "text", "p_declared_owner_base_amount" numeric DEFAULT NULL::numeric, "p_accommodation_amount" numeric DEFAULT NULL::numeric, "p_cleaning_fee_amount" numeric DEFAULT NULL::numeric, "p_municipal_tax_amount" numeric DEFAULT NULL::numeric, "p_other_guest_fees_amount" numeric DEFAULT NULL::numeric, "p_discount_amount" numeric DEFAULT NULL::numeric, "p_platform_adjustment_amount" numeric DEFAULT NULL::numeric, "p_guest_total_amount" numeric DEFAULT NULL::numeric, "p_ota_commission_base_amount" numeric DEFAULT NULL::numeric, "p_ota_commission_amount" numeric DEFAULT NULL::numeric, "p_payment_processing_fee_amount" numeric DEFAULT NULL::numeric, "p_manager_cleaning_cost_amount" numeric DEFAULT NULL::numeric, "p_channel_net_payout_amount" numeric DEFAULT NULL::numeric, "p_ota_commission_settlement" "text" DEFAULT 'unknown'::"text", "p_payment_processing_settlement" "text" DEFAULT 'unknown'::"text", "p_note" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_role text;
  v_reservation public.reservations%ROWTYPE;
  v_current public.reservation_financial_snapshots%ROWTYPE;
  v_new public.reservation_financial_snapshots%ROWTYPE;
  v_property_id uuid;
  v_rule_id uuid;
  v_version integer;
  v_status text;
  v_required_missing boolean;
  v_compatibility text := 'legacy_not_synced';
BEGIN
  SELECT up.organization_id, up.role INTO v_org_id, v_role
  FROM public.user_profiles up WHERE up.id = v_user_id;

  IF v_user_id IS NULL OR v_org_id IS NULL OR v_role IS NULL OR v_role NOT IN ('admin', 'gestor') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'FINANCIAL_FACTS_FORBIDDEN';
  END IF;

  -- Rule mutations serialize on the property first. Match that lock order, then
  -- re-read the reservation under its own lock; a concurrent move must retry.
  SELECT r.property_id INTO v_property_id FROM public.reservations r
  WHERE r.id = p_reservation_id AND r.organization_id = v_org_id
    AND public.user_has_property_access(r.property_id);
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'FINANCIAL_FACTS_NOT_FOUND';
  END IF;
  PERFORM 1 FROM public.properties p
  WHERE p.id = v_property_id AND p.organization_id = v_org_id
    AND public.user_has_property_access(p.id)
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'FINANCIAL_FACTS_NOT_FOUND';
  END IF;

  SELECT r.* INTO v_reservation
  FROM public.reservations r
  WHERE r.id = p_reservation_id
    AND r.organization_id = v_org_id
    AND public.user_has_property_access(r.property_id)
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'FINANCIAL_FACTS_NOT_FOUND';
  END IF;

  IF v_reservation.property_id IS DISTINCT FROM v_property_id THEN
    RAISE EXCEPTION USING ERRCODE = 'PT409', MESSAGE = 'FINANCIAL_FACTS_CONFLICT';
  END IF;

  IF p_fact_mode IS NULL OR p_fact_mode NOT IN ('component_breakdown', 'declared_owner_base')
     OR p_currency IS NULL OR p_currency !~ '^[A-Z]{3}$'
     OR p_currency IS DISTINCT FROM COALESCE(v_reservation.currency, p_currency)
     OR length(COALESCE(p_note, '')) > 2000
     OR p_ota_commission_settlement IS NULL
     OR p_ota_commission_settlement NOT IN ('withheld','invoiced_separately','not_applicable','unknown')
     OR p_payment_processing_settlement IS NULL
     OR p_payment_processing_settlement NOT IN ('withheld','invoiced_separately','not_applicable','unknown')
     OR (p_fact_mode = 'declared_owner_base' AND p_declared_owner_base_amount IS NULL)
     OR (p_fact_mode = 'component_breakdown' AND p_declared_owner_base_amount IS NOT NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'FINANCIAL_FACTS_INVALID';
  END IF;

  IF p_fact_mode = 'declared_owner_base' THEN
    SELECT rr.id INTO v_rule_id
    FROM public.regras_repasse rr
    WHERE rr.organization_id = v_org_id
      AND rr.propriedade_id = v_reservation.property_id
      AND rr.vigencia_fim IS NULL
      AND rr.vigencia_inicio <= lodgra_private.organization_today(v_org_id)
      AND rr.contract_version = 2
      AND rr.allow_declared_owner_base IS TRUE FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'DECLARED_OWNER_BASE_NOT_ALLOWED';
    END IF;
  END IF;

  SELECT s.* INTO v_current
  FROM public.reservation_financial_snapshots s
  WHERE s.organization_id = v_org_id AND s.reservation_id = p_reservation_id
    AND s.superseded_at IS NULL
  FOR UPDATE;

  IF FOUND THEN
    IF p_expected_current_version IS DISTINCT FROM v_current.version THEN
      RAISE EXCEPTION USING ERRCODE = 'PT409', MESSAGE = 'FINANCIAL_FACTS_CONFLICT';
    END IF;
    v_version := v_current.version + 1;
    UPDATE public.reservation_financial_snapshots
      SET superseded_at = now()
      WHERE id = v_current.id AND superseded_at IS NULL;
  ELSE
    IF p_expected_current_version IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE = 'PT409', MESSAGE = 'FINANCIAL_FACTS_CONFLICT';
    END IF;
    v_version := 1;
  END IF;

  IF p_fact_mode = 'declared_owner_base' THEN
    v_status := 'complete';
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM public.regras_repasse rr
      JOIN public.payout_rule_components pc ON pc.payout_rule_id = rr.id AND pc.organization_id = rr.organization_id
      WHERE rr.organization_id = v_org_id AND rr.propriedade_id = v_reservation.property_id
        AND rr.vigencia_fim IS NULL AND rr.contract_version = 2
        AND (pc.commission_base_effect <> 'ignore' OR pc.owner_statement_effect <> 'ignore')
        AND CASE pc.component_code
          WHEN 'accommodation' THEN p_accommodation_amount
          WHEN 'cleaning_fee' THEN p_cleaning_fee_amount
          WHEN 'municipal_tax' THEN p_municipal_tax_amount
          WHEN 'other_guest_fees' THEN p_other_guest_fees_amount
          WHEN 'discount' THEN p_discount_amount
          WHEN 'ota_commission' THEN p_ota_commission_amount
          WHEN 'payment_processing_fee' THEN p_payment_processing_fee_amount
        END IS NULL
    ) INTO v_required_missing;
    v_status := CASE WHEN NOT v_required_missing
      AND p_guest_total_amount IS NOT NULL AND p_channel_net_payout_amount IS NOT NULL
      AND p_ota_commission_settlement <> 'unknown'
      AND p_payment_processing_settlement <> 'unknown'
      THEN 'complete' ELSE 'pending' END;
  END IF;

  INSERT INTO public.reservation_financial_snapshots (
    organization_id, property_id, reservation_id, version, status, currency, fact_mode,
    declared_owner_base_amount, accommodation_amount, cleaning_fee_amount, municipal_tax_amount,
    other_guest_fees_amount, discount_amount, platform_adjustment_amount, guest_total_amount,
    ota_commission_base_amount, ota_commission_amount, payment_processing_fee_amount,
    manager_cleaning_cost_amount, channel_net_payout_amount, ota_commission_settlement,
    payment_processing_settlement, source_kind, provider, external_reference,
    source_metadata, source_mapping_version, captured_at, created_by
  ) VALUES (
    v_org_id, v_reservation.property_id, p_reservation_id, v_version, v_status, p_currency, p_fact_mode,
    p_declared_owner_base_amount, p_accommodation_amount, p_cleaning_fee_amount, p_municipal_tax_amount,
    p_other_guest_fees_amount, p_discount_amount, p_platform_adjustment_amount, p_guest_total_amount,
    p_ota_commission_base_amount, p_ota_commission_amount, p_payment_processing_fee_amount,
    p_manager_cleaning_cost_amount, p_channel_net_payout_amount, p_ota_commission_settlement,
    p_payment_processing_settlement, 'manual', NULLIF(v_reservation.booking_source, ''),
    COALESCE(v_reservation.external_reservation_id, v_reservation.external_id),
    jsonb_build_object(
      'note', NULLIF(btrim(p_note), ''),
      'declared_payout_rule_id', v_rule_id,
      'legacy_total_amount_before_capture', v_reservation.total_amount,
      'legacy_total_amount_semantics', 'legacy_unspecified',
      'legacy_booking_source_before_capture', v_reservation.booking_source
    ), 'manual-v1', now(), v_user_id
  ) RETURNING * INTO v_new;

  IF p_fact_mode = 'declared_owner_base' AND (v_reservation.booking_source = 'manual' OR v_reservation.booking_source LIKE 'ical%') THEN
    UPDATE public.reservations SET total_amount = p_declared_owner_base_amount, updated_at = now()
    WHERE id = p_reservation_id AND organization_id = v_org_id;
    v_compatibility := 'legacy_synced';
  ELSIF p_fact_mode = 'declared_owner_base' THEN
    v_compatibility := 'legacy_divergence_visible';
  END IF;

  -- Even unsynced/native and detailed captures write the reservation version.
  -- This makes stale REPEATABLE READ writers fail rather than miss a new snapshot.
  UPDATE public.reservations SET updated_at = now()
  WHERE id = p_reservation_id AND organization_id = v_org_id;

  INSERT INTO public.audit_logs(user_id, action, resource_type, resource_id, details)
  VALUES (v_user_id, 'update', 'reservation_financial_snapshot', v_new.id::text,
    jsonb_build_object('reservation_id', p_reservation_id, 'version', v_version,
      'fact_mode', p_fact_mode, 'compatibility', v_compatibility));

  RETURN jsonb_build_object('snapshot_id', v_new.id, 'version', v_version,
    'status', v_status, 'compatibility', v_compatibility);
EXCEPTION
  WHEN check_violation OR numeric_value_out_of_range OR invalid_text_representation THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'FINANCIAL_FACTS_INVALID';
END;
$_$;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20261011120000', 'payout_rule_org_timezone')
ON CONFLICT DO NOTHING;
