


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE SCHEMA IF NOT EXISTS "lodgra_private";


ALTER SCHEMA "lodgra_private" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."base_comissao_repasse" AS ENUM (
    'receita_bruta',
    'faturamento_propriedade'
);


ALTER TYPE "public"."base_comissao_repasse" OWNER TO "postgres";


CREATE TYPE "public"."destinatario_taxa_repasse" AS ENUM (
    'gestor',
    'proprietario'
);


ALTER TYPE "public"."destinatario_taxa_repasse" OWNER TO "postgres";


CREATE TYPE "public"."tipo_comissao_repasse" AS ENUM (
    'percentual',
    'fixo_mensal',
    'fixo_por_reserva'
);


ALTER TYPE "public"."tipo_comissao_repasse" OWNER TO "postgres";


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

  IF p_vigencia_inicio <> (pg_catalog.now() AT TIME ZONE 'UTC')::date
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


ALTER FUNCTION "lodgra_private"."mutate_property_payout_rule_v2"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_expect_absent" boolean, "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "lodgra_private"."mutate_property_payout_rule_v2"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_expect_absent" boolean, "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text") IS 'Única mutação atômica de política v2; serializa por propriedade e exige presença ou ausência esperada.';



CREATE OR REPLACE FUNCTION "lodgra_private"."mutate_property_payout_rule_v2_with_declared"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_expect_absent" boolean, "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text", "p_allow_declared_owner_base" boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "lodgra_private"."mutate_property_payout_rule_v2_with_declared"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_expect_absent" boolean, "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text", "p_allow_declared_owner_base" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lodgra_private"."prevent_unversioned_property_financial_parameter_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'PROPERTY_FINANCIAL_PARAMETERS_ARE_IMMUTABLE';
  END IF;

  IF pg_catalog.current_setting(
      'lodgra.allow_property_financial_parameter_replacement', true
    ) IS DISTINCT FROM 'on'
    OR OLD.valid_to IS NOT NULL
    OR NEW.valid_to IS NULL
    OR NEW.valid_to < OLD.valid_from
    OR (pg_catalog.to_jsonb(NEW) - 'valid_to')
      IS DISTINCT FROM (pg_catalog.to_jsonb(OLD) - 'valid_to')
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'PROPERTY_FINANCIAL_PARAMETERS_ARE_IMMUTABLE';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "lodgra_private"."prevent_unversioned_property_financial_parameter_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lodgra_private"."prevent_unversioned_v2_rule_closure"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF OLD.contract_version = 2
     AND current_setting('lodgra.v2_rule_replacement_txid', true)
         IS DISTINCT FROM pg_catalog.txid_current()::text THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'PAYOUT_V2_MUTATION_REQUIRED';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "lodgra_private"."prevent_unversioned_v2_rule_closure"() OWNER TO "postgres";


COMMENT ON FUNCTION "lodgra_private"."prevent_unversioned_v2_rule_closure"() IS 'Fail-closed gate: v2 rules may only be closed in the same transaction as the reviewed v2 replacement RPC.';



CREATE OR REPLACE FUNCTION "lodgra_private"."protect_declared_reservation_total"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_snapshot public.reservation_financial_snapshots%ROWTYPE;
BEGIN
  SELECT s.* INTO v_snapshot
  FROM public.reservation_financial_snapshots s
  WHERE s.reservation_id = OLD.id AND s.organization_id = OLD.organization_id
    AND s.superseded_at IS NULL AND s.fact_mode = 'declared_owner_base';
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF NEW.property_id IS DISTINCT FROM OLD.property_id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.booking_source IS DISTINCT FROM OLD.booking_source
     OR (NEW.total_amount IS DISTINCT FROM OLD.total_amount AND (
       NOT COALESCE(OLD.booking_source = 'manual' OR OLD.booking_source LIKE 'ical%', false)
       OR NEW.total_amount IS DISTINCT FROM v_snapshot.declared_owner_base_amount
     )) THEN
    RAISE EXCEPTION USING ERRCODE = 'PT409',
      MESSAGE = 'FINANCIAL_TOTAL_MANAGED_BY_SNAPSHOT';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "lodgra_private"."protect_declared_reservation_total"() OWNER TO "postgres";


COMMENT ON FUNCTION "lodgra_private"."protect_declared_reservation_total"() IS 'Story 47.4: serialize generic reservation changes with declared financial snapshots; RPC synchronizes only manual/ical totals.';



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


ALTER FUNCTION "lodgra_private"."replace_property_payout_rule"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_base_comissao" "public"."base_comissao_repasse", "p_taxa_limpeza_para" "public"."destinatario_taxa_repasse", "p_comissao_ota_por_conta" "public"."destinatario_taxa_repasse", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_observacoes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lodgra_private"."replace_property_payout_rule_v2"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text") RETURNS "jsonb"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT lodgra_private.mutate_property_payout_rule_v2(
    p_property_id, p_expected_current_rule_id, false, p_vigencia_inicio,
    p_tipo_comissao, p_comissao_valor, p_imposto_comissao_percentual,
    p_competencia_receita, p_fluxo_financeiro, p_preset,
    p_despesas_repassaveis, p_dia_fechamento, p_componentes, p_observacoes
  );
$$;


ALTER FUNCTION "lodgra_private"."replace_property_payout_rule_v2"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text") OWNER TO "postgres";


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
      AND rr.vigencia_inicio <= (pg_catalog.now() AT TIME ZONE 'UTC')::date
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


ALTER FUNCTION "lodgra_private"."replace_reservation_financial_snapshot"("p_reservation_id" "uuid", "p_expected_current_version" integer, "p_fact_mode" "text", "p_currency" "text", "p_declared_owner_base_amount" numeric, "p_accommodation_amount" numeric, "p_cleaning_fee_amount" numeric, "p_municipal_tax_amount" numeric, "p_other_guest_fees_amount" numeric, "p_discount_amount" numeric, "p_platform_adjustment_amount" numeric, "p_guest_total_amount" numeric, "p_ota_commission_base_amount" numeric, "p_ota_commission_amount" numeric, "p_payment_processing_fee_amount" numeric, "p_manager_cleaning_cost_amount" numeric, "p_channel_net_payout_amount" numeric, "p_ota_commission_settlement" "text", "p_payment_processing_settlement" "text", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bridge_legacy_reservation_write"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NEW.property_listing_id IS NOT NULL AND (
    NEW.property_id IS NULL
    OR TG_OP = 'INSERT'
    OR NEW.property_listing_id IS DISTINCT FROM OLD.property_listing_id
  ) THEN
    SELECT pl.property_id INTO NEW.property_id
    FROM public.property_listings pl
    WHERE pl.id = NEW.property_listing_id;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.reservation_status := NEW.status;
  ELSIF TG_OP = 'UPDATE' AND NEW.reservation_status IS DISTINCT FROM OLD.reservation_status THEN
    NEW.status := NEW.reservation_status;
  ELSE
    NEW.reservation_status := COALESCE(NEW.reservation_status, NEW.status, 'confirmed');
    NEW.status := COALESCE(NEW.status, NEW.reservation_status, 'confirmed');
  END IF;

  IF TG_OP = 'UPDATE'
    AND NEW.external_id IS NOT NULL
    AND NEW.external_id IS DISTINCT FROM OLD.external_id THEN
    NEW.external_reservation_id := NEW.external_id;
  ELSIF TG_OP = 'UPDATE'
    AND NEW.external_reservation_id IS NOT NULL
    AND NEW.external_reservation_id IS DISTINCT FROM OLD.external_reservation_id THEN
    NEW.external_id := NEW.external_reservation_id;
  ELSE
    NEW.external_reservation_id := COALESCE(
      NEW.external_id,
      NEW.external_reservation_id,
      NEW.id::text
    );
    NEW.external_id := NEW.external_reservation_id;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
    NEW.total_price := NEW.total_amount;
  ELSIF TG_OP = 'UPDATE' AND NEW.total_price IS DISTINCT FROM OLD.total_price THEN
    NEW.total_amount := NEW.total_price;
  ELSE
    NEW.total_price := COALESCE(NEW.total_price, NEW.total_amount);
    NEW.total_amount := COALESCE(NEW.total_amount, NEW.total_price);
  END IF;

  NEW.last_sync_at := COALESCE(NEW.last_sync_at, NEW.synced_at);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."bridge_legacy_reservation_write"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."bridge_legacy_reservation_write"() IS 'Temporary brownfield bridge. Keeps the Lodgra MVP reservation contract compatible while Multi-OTA uses an isolated future model.';



CREATE OR REPLACE FUNCTION "public"."check_property_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  property_count INTEGER;
  plan_name TEXT;
  included_limit INTEGER;
  extra_count INTEGER;
  max_allowed INTEGER;
BEGIN
  SELECT
    COALESCE(o.subscription_plan, o.plan, 'essencial'),
    COALESCE(o.premium_extra_properties_count, 0)
  INTO plan_name, extra_count
  FROM public.organizations o
  WHERE o.id = NEW.organization_id;

  IF plan_name IS NULL THEN
    RAISE EXCEPTION 'Organization % not found or has no subscription plan', NEW.organization_id;
  END IF;

  included_limit := CASE plan_name
    WHEN 'essencial' THEN 1
    WHEN 'starter' THEN 1
    WHEN 'expansao' THEN 3
    WHEN 'growth' THEN 3
    WHEN 'development' THEN 99
    WHEN 'premium' THEN NULL
    WHEN 'professional' THEN NULL
    WHEN 'business' THEN NULL
    WHEN 'pro' THEN NULL
    WHEN 'enterprise' THEN NULL
    ELSE 1
  END;

  -- NULL denotes an unlimited plan.
  IF included_limit IS NULL THEN
    RETURN NEW;
  END IF;

  max_allowed := included_limit + extra_count;

  SELECT COUNT(*) INTO property_count
  FROM public.properties p
  WHERE p.organization_id = NEW.organization_id
    AND p.deleted_at IS NULL;

  IF property_count >= max_allowed THEN
    RAISE EXCEPTION 'Property limit reached for plan %. Current: %, Limit: %',
      plan_name, property_count, max_allowed
      USING HINT = 'Add an extra property or upgrade your plan to continue';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_property_limit"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_property_limit"() IS 'Enforces organization property limits with RLS-independent counting. Premium and Enterprise are unlimited; subscription_plan is the primary source.';



CREATE OR REPLACE FUNCTION "public"."check_reservation_conflict"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    IF (OLD.status = 'cancelled' AND NEW.status = 'confirmed') OR (OLD.status =
  'confirmed' AND NEW.status = 'cancelled') THEN
      RETURN NEW;
    END IF;

    IF EXISTS (
      SELECT 1 FROM reservations r
      JOIN property_listings pl ON r.property_listing_id = pl.id 
      WHERE pl.property_id = (
        SELECT property_id FROM property_listings WHERE id =  
  NEW.property_listing_id
      )
      AND r.status IN ('confirmed', 'pending_payment')           
      AND r.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        (NEW.check_in >= r.check_in AND NEW.check_in < r.check_out)
        OR (NEW.check_out > r.check_in AND NEW.check_out <= r.check_out)
        OR (NEW.check_in <= r.check_in AND NEW.check_out >= r.check_out)
      )
    ) THEN
      RAISE EXCEPTION 'Conflito de reserva detectado para estas datas';
    END IF;

    RETURN NEW;
  END;                                                           
  $$;


ALTER FUNCTION "public"."check_reservation_conflict"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."raw_emails" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "provider" "text" DEFAULT 'resend'::"text" NOT NULL,
    "provider_message_id" "text" NOT NULL,
    "recipient" "text" NOT NULL,
    "sender" "text" NOT NULL,
    "subject" "text",
    "received_at" timestamp with time zone NOT NULL,
    "raw_content" "text" NOT NULL,
    "processing_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "raw_emails_attempt_count_check" CHECK (("attempt_count" >= 0)),
    CONSTRAINT "raw_emails_content_check" CHECK (("octet_length"("raw_content") > 0)),
    CONSTRAINT "raw_emails_processing_status_check" CHECK (("processing_status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'processed'::"text", 'retry'::"text", 'needs_review'::"text", 'rejected'::"text"]))),
    CONSTRAINT "raw_emails_provider_check" CHECK (("provider" = 'resend'::"text")),
    CONSTRAINT "raw_emails_provider_message_id_check" CHECK (("btrim"("provider_message_id") <> ''::"text"))
);

ALTER TABLE ONLY "public"."raw_emails" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."raw_emails" OWNER TO "postgres";


COMMENT ON TABLE "public"."raw_emails" IS 'Story 38.1 private inbound email staging; service-role only.';



CREATE OR REPLACE FUNCTION "public"."claim_email_reconciliation_batch"("p_limit" integer DEFAULT 20) RETURNS SETOF "public"."raw_emails"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'service_role required';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT re.id
    FROM public.raw_emails re
    JOIN public.organizations o ON o.id = re.organization_id
    WHERE (
        re.processing_status IN ('pending', 'retry')
        OR (re.processing_status = 'processing' AND re.updated_at < now() - interval '10 minutes')
      )
      AND re.attempt_count < 2
      AND o.email_ical_reconciliation_enabled = true
    ORDER BY re.received_at, re.id
    FOR UPDATE OF re SKIP LOCKED
    LIMIT greatest(1, least(COALESCE(p_limit, 20), 50))
  )
  UPDATE public.raw_emails re
  SET processing_status = 'processing',
      attempt_count = re.attempt_count + 1,
      last_error = NULL,
      updated_at = now()
  FROM candidates c
  WHERE re.id = c.id
  RETURNING re.*;
END;
$$;


ALTER FUNCTION "public"."claim_email_reconciliation_batch"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_property_payout_rule_v2"("p_property_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT lodgra_private.mutate_property_payout_rule_v2(
    p_property_id, NULL, true, p_vigencia_inicio,
    p_tipo_comissao, p_comissao_valor, p_imposto_comissao_percentual,
    p_competencia_receita, p_fluxo_financeiro, p_preset,
    p_despesas_repassaveis, p_dia_fechamento, p_componentes, p_observacoes
  );
$$;


ALTER FUNCTION "public"."create_property_payout_rule_v2"("p_property_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_property_payout_rule_v2"("p_property_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text") IS 'Cria a primeira política financeira v2 somente quando a propriedade ainda não possui regra vigente.';



CREATE OR REPLACE FUNCTION "public"."create_property_payout_rule_v2"("p_property_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text", "p_allow_declared_owner_base" boolean) RETURNS "jsonb"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT lodgra_private.mutate_property_payout_rule_v2_with_declared(
    p_property_id,NULL,true,p_vigencia_inicio,p_tipo_comissao,p_comissao_valor,
    p_imposto_comissao_percentual,p_competencia_receita,p_fluxo_financeiro,p_preset,
    p_despesas_repassaveis,p_dia_fechamento,p_componentes,p_observacoes,p_allow_declared_owner_base
  );
$$;


ALTER FUNCTION "public"."create_property_payout_rule_v2"("p_property_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text", "p_allow_declared_owner_base" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enable_email_ical_pilot"("org_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  UPDATE public.organizations
  SET email_ical_reconciliation_enabled = true,
      email_ical_pilot_started_at = now(),
      email_ical_pilot_platforms = ARRAY['airbnb', 'booking']::text[]
  WHERE id = org_id;
END;
$$;


ALTER FUNCTION "public"."enable_email_ical_pilot"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_my_organization"("p_name" "text", "p_slug" "text") RETURNS TABLE("organization_id" "uuid", "organization_slug" "text", "created" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_org_id UUID;
  candidate_slug TEXT;
  base_slug TEXT;
  suffix INTEGER := 0;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Serialize retries from the same authenticated account.
  PERFORM pg_advisory_xact_lock(hashtextextended(current_user_id::TEXT, 0));

  SELECT up.organization_id
  INTO current_org_id
  FROM public.user_profiles up
  WHERE up.id = current_user_id;

  IF current_org_id IS NOT NULL THEN
    RETURN QUERY
      SELECT o.id, o.slug, false
      FROM public.organizations o
      WHERE o.id = current_org_id;
    RETURN;
  END IF;

  base_slug := lower(left(COALESCE(NULLIF(trim(p_slug), ''), 'empresa'), 40));
  base_slug := regexp_replace(base_slug, '[^a-z0-9-]+', '-', 'g');
  base_slug := COALESCE(NULLIF(trim(both '-' from base_slug), ''), 'empresa');

  LOOP
    candidate_slug := base_slug || CASE WHEN suffix = 0 THEN '' ELSE '-' || suffix::TEXT END;
    BEGIN
      INSERT INTO public.organizations (
        name,
        slug,
        subscription_status,
        subscription_plan,
        plan
      )
      VALUES (
        COALESCE(NULLIF(trim(p_name), ''), 'Nova organização'),
        candidate_slug,
        'trialing',
        'essencial',
        'essencial'
      )
      RETURNING id INTO current_org_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      suffix := suffix + 1;
      IF suffix > 99 THEN
        RAISE EXCEPTION 'Unable to allocate a unique organization slug';
      END IF;
    END;
  END LOOP;

  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    role,
    access_all_properties,
    organization_id,
    created_at,
    updated_at
  )
  SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', ''),
    'admin',
    true,
    current_org_id,
    NOW(),
    NOW()
  FROM auth.users au
  WHERE au.id = current_user_id
  ON CONFLICT (id) DO UPDATE
  SET organization_id = EXCLUDED.organization_id,
      role = 'admin',
      access_all_properties = true,
      updated_at = NOW()
  WHERE public.user_profiles.organization_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Authenticated user record not found';
  END IF;

  RETURN QUERY SELECT current_org_id, candidate_slug, true;
END;
$$;


ALTER FUNCTION "public"."ensure_my_organization"("p_name" "text", "p_slug" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."ensure_my_organization"("p_name" "text", "p_slug" "text") IS 'Idempotently repairs legacy authenticated accounts without a tenant; never accepts a user or organization id.';



CREATE OR REPLACE FUNCTION "public"."get_my_profile"() RETURNS TABLE("user_id" "uuid", "role" "text", "access_all_properties" boolean, "organization_id" "uuid", "guest_type" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  BEGIN
    RETURN QUERY
      SELECT
        up.id,
        up.role,
        up.access_all_properties,
        up.organization_id,
        up.guest_type
      FROM user_profiles up
      WHERE up.id = auth.uid();
  END;
  $$;


ALTER FUNCTION "public"."get_my_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_organization_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
    SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
  $$;


ALTER FUNCTION "public"."get_user_organization_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_manager_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  BEGIN
    IF NEW.role = 'gestor' THEN
      INSERT INTO public.user_properties (user_id, property_id)
      SELECT NEW.id, id
      FROM public.properties
      WHERE organization_id = NEW.organization_id
      ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."handle_manager_created"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  new_org_id UUID;
  base_slug TEXT;
  unique_slug TEXT;
BEGIN
  base_slug := lower(left(split_part(COALESCE(NEW.email, 'user'), '@', 1), 20));
  base_slug := regexp_replace(base_slug, '[^a-z0-9-]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  unique_slug := COALESCE(NULLIF(base_slug, ''), 'empresa') || '-' || left(NEW.id::TEXT, 8);

  INSERT INTO public.organizations (
    name,
    slug,
    subscription_status,
    subscription_plan,
    plan
  )
  VALUES (
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, 'Nova organização'),
    unique_slug,
    'trialing',
    'essencial',
    'essencial'
  )
  RETURNING id INTO new_org_id;

  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    role,
    access_all_properties,
    organization_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'admin',
    true,
    new_org_id,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Atomically creates one isolated organization and its first admin profile during auth signup.';



CREATE OR REPLACE FUNCTION "public"."handle_storage_upload"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  project_url TEXT := 'https://brjumbfpvijrkhrherpt.supabase.co'; -- Substituir pelo teu URL se for diferente
  edge_function_url TEXT := project_url || '/functions/v1/process-image-variants';
  service_role_key TEXT := 'REPLACE_WITH_YOUR_SERVICE_ROLE_KEY'; -- Recomendado usar Vault ou variável de ambiente se possível
BEGIN
  -- Só processa se for no bucket correto
  IF NEW.bucket_id = 'property-images' THEN
    PERFORM
      extensions.http_post(
        url := edge_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'Records', jsonb_build_array(
            jsonb_build_object(
              's3', jsonb_build_object(
                'bucket', jsonb_build_object('name', NEW.bucket_id),
                'object', jsonb_build_object('key', NEW.name)
              ),
              'eventName', 'INSERT'
            )
          )
        )
      );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_storage_upload"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_storage_upload"() IS 'Trigger para processar variantes de imagem via Edge Function após upload no Storage.';



CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
    SELECT EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    );
  $$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_or_manager"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'gestor')
    );
  $$;


ALTER FUNCTION "public"."is_admin_or_manager"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_admin"("target_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin' AND organization_id = target_org_id
  );
$$;


ALTER FUNCTION "public"."is_org_admin"("target_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."permanently_delete_cancelled_reservation"("p_reservation_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_status text;
BEGIN
  DELETE FROM public.reservations
  WHERE id = p_reservation_id
    AND reservation_status = 'cancelled'
  RETURNING reservation_status INTO v_status;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id, details
  ) VALUES (
    (SELECT auth.uid()),
    'delete',
    'reservation',
    p_reservation_id,
    jsonb_build_object(
      'event', 'reservation_permanently_deleted',
      'reservation_status', v_status
    )
  );

  RETURN true;
END;
$$;


ALTER FUNCTION "public"."permanently_delete_cancelled_reservation"("p_reservation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_active_reservation_overlap"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  conflicting_reservation_id uuid;
BEGIN
  IF NEW.property_id IS NULL
     OR NEW.check_in IS NULL
     OR NEW.check_out IS NULL
     OR NEW.status IS NOT DISTINCT FROM 'cancelled' THEN
    RETURN NEW;
  END IF;

  IF NEW.check_out <= NEW.check_in THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'reservation check_out must be after check_in';
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.property_id IS NOT DISTINCT FROM OLD.property_id
     AND NEW.check_in IS NOT DISTINCT FROM OLD.check_in
     AND NEW.check_out IS NOT DISTINCT FROM OLD.check_out
     AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.property_id::text, 0));

  SELECT r.id
  INTO conflicting_reservation_id
  FROM public.reservations r
  WHERE r.property_id = NEW.property_id
    AND r.id IS DISTINCT FROM NEW.id
    AND r.status IS DISTINCT FROM 'cancelled'
    AND daterange(r.check_in, r.check_out, '[)')
        && daterange(NEW.check_in, NEW.check_out, '[)')
  LIMIT 1;

  IF conflicting_reservation_id IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23P01',
      MESSAGE = 'active reservation overlaps an existing reservation for this property',
      DETAIL = format('conflicting_reservation_id=%s', conflicting_reservation_id),
      HINT = 'Cancel or reconcile the existing reservation before creating another active stay.';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_active_reservation_overlap"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."prevent_active_reservation_overlap"() IS 'Serializes reservation writes per property and prevents new active date overlaps while legacy conflicts are reconciled.';



CREATE OR REPLACE FUNCTION "public"."prevent_property_images_immutable_field_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.original_filename IS DISTINCT FROM OLD.original_filename THEN
    RAISE EXCEPTION 'original_filename cannot be changed after upload';
  END IF;
  IF NEW.file_size_bytes IS DISTINCT FROM OLD.file_size_bytes THEN
    RAISE EXCEPTION 'file_size_bytes cannot be changed after upload';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_property_images_immutable_field_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reconcile_email_extraction"("p_extraction_id" "uuid", "p_event_id" "uuid", "p_confirmed_by_host" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_extraction public.email_extractions%ROWTYPE;
  v_event public.calendar_events%ROWTYPE;
  v_reservation_id uuid;
  v_existing_extraction_id uuid;
  v_existing_event_id uuid;
  v_created boolean := false;
  v_first_name text;
  v_last_name text;
  v_external_id text;
BEGIN
  IF (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'service_role required';
  END IF;

  SELECT * INTO v_extraction
  FROM public.email_extractions
  WHERE id = p_extraction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'email extraction not found';
  END IF;

  SELECT * INTO v_event
  FROM public.calendar_events
  WHERE id = p_event_id
    AND organization_id = v_extraction.organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'calendar event not found in extraction organization';
  END IF;

  IF v_extraction.source_platform IS DISTINCT FROM v_event.source_platform THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'source platform mismatch';
  END IF;

  IF v_extraction.check_in IS NULL OR v_extraction.check_out IS NULL
     OR v_extraction.guest_name IS NULL OR btrim(v_extraction.guest_name) = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'required extraction fields are missing';
  END IF;

  IF v_extraction.check_in IS DISTINCT FROM v_event.check_in
     OR v_extraction.check_out IS DISTINCT FROM v_event.check_out THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'reservation dates do not exactly match calendar event';
  END IF;

  IF NOT p_confirmed_by_host AND v_extraction.match_status IS DISTINCT FROM 'auto_matched' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'automatic reconciliation requires an auto-matched extraction';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_event.property_id::text, 0));

  SELECT r.id, r.email_extraction_id, r.calendar_event_id
  INTO v_reservation_id, v_existing_extraction_id, v_existing_event_id
  FROM public.reservations r
  WHERE r.organization_id = v_extraction.organization_id
    AND (r.email_extraction_id = v_extraction.id OR r.calendar_event_id = v_event.id)
  ORDER BY r.created_at, r.id
  LIMIT 1
  FOR UPDATE;

  IF v_reservation_id IS NOT NULL THEN
    IF v_existing_extraction_id IS NOT NULL AND v_existing_extraction_id <> v_extraction.id THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'reservation already linked to another extraction';
    END IF;
    IF v_existing_event_id IS NOT NULL AND v_existing_event_id <> v_event.id THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'reservation already linked to another calendar event';
    END IF;
  ELSE
    SELECT r.id INTO v_reservation_id
    FROM public.reservations r
    WHERE r.organization_id = v_extraction.organization_id
      AND r.property_id = v_event.property_id
      AND r.check_in = v_extraction.check_in
      AND r.check_out = v_extraction.check_out
      AND r.status IS DISTINCT FROM 'cancelled'
      AND r.calendar_event_id IS NULL
      AND r.email_extraction_id IS NULL
    ORDER BY r.created_at, r.id
    LIMIT 1
    FOR UPDATE;
  END IF;

  v_first_name := split_part(btrim(v_extraction.guest_name), ' ', 1);
  v_last_name := NULLIF(btrim(substr(btrim(v_extraction.guest_name), length(v_first_name) + 1)), '');
  v_external_id := CASE
    WHEN NULLIF(btrim(v_extraction.reservation_code), '') IS NOT NULL
      THEN v_extraction.source_platform || '_' || btrim(v_extraction.reservation_code)
    ELSE v_extraction.source_platform || '_' || split_part(v_event.ical_uid, '@', 1)
  END;

  IF v_reservation_id IS NULL THEN
    INSERT INTO public.reservations (
      organization_id, property_id, property_listing_id,
      check_in, check_out, status, source, booking_source,
      external_id, external_reservation_id, booking_reference,
      guest_name, first_name, last_name, number_of_guests,
      total_amount, currency, calendar_event_id, email_extraction_id,
      confirmed_by_host, platform_synced_at, synced_at
    ) VALUES (
      v_extraction.organization_id, v_event.property_id, v_event.property_listing_id,
      v_extraction.check_in, v_extraction.check_out, 'confirmed', v_extraction.source_platform,
      v_extraction.source_platform, v_external_id, v_external_id,
      NULLIF(btrim(v_extraction.reservation_code), ''),
      btrim(v_extraction.guest_name), v_first_name, COALESCE(v_last_name, ''),
      COALESCE(v_extraction.guest_count, 1), v_extraction.total_value,
      COALESCE(v_extraction.currency, 'EUR'), v_event.id, v_extraction.id,
      p_confirmed_by_host, now(), now()
    )
    RETURNING id INTO v_reservation_id;
    v_created := true;
  ELSE
    UPDATE public.reservations
    SET property_id = v_event.property_id,
        property_listing_id = v_event.property_listing_id,
        check_in = v_extraction.check_in,
        check_out = v_extraction.check_out,
        status = 'confirmed',
        source = v_extraction.source_platform,
        booking_source = v_extraction.source_platform,
        external_id = v_external_id,
        external_reservation_id = v_external_id,
        booking_reference = COALESCE(NULLIF(btrim(v_extraction.reservation_code), ''), booking_reference),
        guest_name = btrim(v_extraction.guest_name),
        first_name = v_first_name,
        last_name = COALESCE(v_last_name, ''),
        number_of_guests = COALESCE(v_extraction.guest_count, number_of_guests, 1),
        total_amount = COALESCE(v_extraction.total_value, total_amount),
        currency = COALESCE(v_extraction.currency, currency, 'EUR'),
        calendar_event_id = v_event.id,
        email_extraction_id = v_extraction.id,
        confirmed_by_host = confirmed_by_host OR p_confirmed_by_host,
        platform_synced_at = now(),
        updated_at = now()
    WHERE id = v_reservation_id;
  END IF;

  UPDATE public.calendar_events
  SET reservation_id = v_reservation_id,
      status = 'matched',
      updated_at = now()
  WHERE id = v_event.id;

  UPDATE public.email_extractions
  SET matched_event_id = v_event.id,
      match_status = 'auto_matched',
      updated_at = now()
  WHERE id = v_extraction.id;

  UPDATE public.raw_emails
  SET processing_status = 'processed',
      processed_at = now(),
      last_error = NULL,
      updated_at = now()
  WHERE id = v_extraction.raw_email_id
    AND organization_id = v_extraction.organization_id;

  DELETE FROM public.calendar_blocks
  WHERE organization_id = v_event.organization_id
    AND property_id = v_event.property_id
    AND property_listing_id = v_event.property_listing_id
    AND external_uid = v_event.ical_uid
    AND block_type = 'platform_sync';

  RETURN jsonb_build_object(
    'reservation_id', v_reservation_id,
    'calendar_event_id', v_event.id,
    'email_extraction_id', v_extraction.id,
    'created', v_created
  );
END;
$$;


ALTER FUNCTION "public"."reconcile_email_extraction"("p_extraction_id" "uuid", "p_event_id" "uuid", "p_confirmed_by_host" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_commission_summary"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY commission_summary;
    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."refresh_commission_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."replace_property_payout_rule"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_base_comissao" "public"."base_comissao_repasse", "p_taxa_limpeza_para" "public"."destinatario_taxa_repasse", "p_comissao_ota_por_conta" "public"."destinatario_taxa_repasse", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_observacoes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT lodgra_private.replace_property_payout_rule(
    p_property_id,
    p_expected_current_rule_id,
    p_vigencia_inicio,
    p_tipo_comissao,
    p_comissao_valor,
    p_base_comissao,
    p_taxa_limpeza_para,
    p_comissao_ota_por_conta,
    p_despesas_repassaveis,
    p_dia_fechamento,
    p_observacoes
  );
$$;


ALTER FUNCTION "public"."replace_property_payout_rule"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_base_comissao" "public"."base_comissao_repasse", "p_taxa_limpeza_para" "public"."destinatario_taxa_repasse", "p_comissao_ota_por_conta" "public"."destinatario_taxa_repasse", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_observacoes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."replace_property_payout_rule"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_base_comissao" "public"."base_comissao_repasse", "p_taxa_limpeza_para" "public"."destinatario_taxa_repasse", "p_comissao_ota_por_conta" "public"."destinatario_taxa_repasse", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_observacoes" "text") IS 'Substitui atomicamente a regra aberta de uma propriedade com autorização e concorrência otimista.';



CREATE OR REPLACE FUNCTION "public"."replace_property_payout_rule_v2"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT lodgra_private.replace_property_payout_rule_v2(
    p_property_id, p_expected_current_rule_id, p_vigencia_inicio,
    p_tipo_comissao, p_comissao_valor, p_imposto_comissao_percentual,
    p_competencia_receita, p_fluxo_financeiro, p_preset,
    p_despesas_repassaveis, p_dia_fechamento, p_componentes, p_observacoes
  );
$$;


ALTER FUNCTION "public"."replace_property_payout_rule_v2"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."replace_property_payout_rule_v2"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text") IS 'Substitui atomicamente uma regra por uma política financeira v2 completa, tenant-scoped e versionada.';



CREATE OR REPLACE FUNCTION "public"."replace_property_payout_rule_v2"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text", "p_allow_declared_owner_base" boolean) RETURNS "jsonb"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT lodgra_private.mutate_property_payout_rule_v2_with_declared(
    p_property_id,p_expected_current_rule_id,false,p_vigencia_inicio,p_tipo_comissao,
    p_comissao_valor,p_imposto_comissao_percentual,p_competencia_receita,p_fluxo_financeiro,
    p_preset,p_despesas_repassaveis,p_dia_fechamento,p_componentes,p_observacoes,p_allow_declared_owner_base
  );
$$;


ALTER FUNCTION "public"."replace_property_payout_rule_v2"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text", "p_allow_declared_owner_base" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."replace_reservation_financial_snapshot"("p_reservation_id" "uuid", "p_expected_current_version" integer, "p_fact_mode" "text", "p_currency" "text", "p_declared_owner_base_amount" numeric DEFAULT NULL::numeric, "p_accommodation_amount" numeric DEFAULT NULL::numeric, "p_cleaning_fee_amount" numeric DEFAULT NULL::numeric, "p_municipal_tax_amount" numeric DEFAULT NULL::numeric, "p_other_guest_fees_amount" numeric DEFAULT NULL::numeric, "p_discount_amount" numeric DEFAULT NULL::numeric, "p_platform_adjustment_amount" numeric DEFAULT NULL::numeric, "p_guest_total_amount" numeric DEFAULT NULL::numeric, "p_ota_commission_base_amount" numeric DEFAULT NULL::numeric, "p_ota_commission_amount" numeric DEFAULT NULL::numeric, "p_payment_processing_fee_amount" numeric DEFAULT NULL::numeric, "p_manager_cleaning_cost_amount" numeric DEFAULT NULL::numeric, "p_channel_net_payout_amount" numeric DEFAULT NULL::numeric, "p_ota_commission_settlement" "text" DEFAULT 'unknown'::"text", "p_payment_processing_settlement" "text" DEFAULT 'unknown'::"text", "p_note" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT lodgra_private.replace_reservation_financial_snapshot(
    p_reservation_id, p_expected_current_version, p_fact_mode, p_currency,
    p_declared_owner_base_amount, p_accommodation_amount, p_cleaning_fee_amount,
    p_municipal_tax_amount, p_other_guest_fees_amount, p_discount_amount,
    p_platform_adjustment_amount, p_guest_total_amount, p_ota_commission_base_amount,
    p_ota_commission_amount, p_payment_processing_fee_amount,
    p_manager_cleaning_cost_amount, p_channel_net_payout_amount,
    p_ota_commission_settlement, p_payment_processing_settlement, p_note
  );
$$;


ALTER FUNCTION "public"."replace_reservation_financial_snapshot"("p_reservation_id" "uuid", "p_expected_current_version" integer, "p_fact_mode" "text", "p_currency" "text", "p_declared_owner_base_amount" numeric, "p_accommodation_amount" numeric, "p_cleaning_fee_amount" numeric, "p_municipal_tax_amount" numeric, "p_other_guest_fees_amount" numeric, "p_discount_amount" numeric, "p_platform_adjustment_amount" numeric, "p_guest_total_amount" numeric, "p_ota_commission_base_amount" numeric, "p_ota_commission_amount" numeric, "p_payment_processing_fee_amount" numeric, "p_manager_cleaning_cost_amount" numeric, "p_channel_net_payout_amount" numeric, "p_ota_commission_settlement" "text", "p_payment_processing_settlement" "text", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_cleaner_token_org_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    SELECT organization_id INTO NEW.organization_id
    FROM user_profiles
    WHERE id = NEW.cleaner_id;                                    
    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."set_cleaner_token_org_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_compliance_organization_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.organization_id := (SELECT organization_id FROM user_profiles WHERE id = NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_compliance_organization_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_get_user_organization_id"() RETURNS "text"
    LANGUAGE "sql"
    AS $$
  SELECT get_user_organization_id();
  $$;


ALTER FUNCTION "public"."test_get_user_organization_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_regras_repasse_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."touch_regras_repasse_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_email_parser"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$                                          
  BEGIN                                                                    
    PERFORM http_post(
      'https://www.lodgra.io/api/cron/email-parser',
      '{}'::jsonb,
      'application/json'
    );                                                           

    INSERT INTO email_parser_cron_log (triggered_at, status)               
    VALUES (NOW(), 'success');
  END;
  $$;


ALTER FUNCTION "public"."trigger_email_parser"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_company_expenses_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."update_company_expenses_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_daily_prices_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN                                                          
    NEW.updated_at = NOW();                                                
    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."update_daily_prices_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_my_organization"("p_name" "text", "p_slug" "text") RETURNS TABLE("organization_id" "uuid", "organization_slug" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_org_id UUID;
  candidate_slug TEXT;
  base_slug TEXT;
  suffix INTEGER := 0;
BEGIN
  IF current_user_id IS NULL OR NULLIF(trim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Authentication and organization name are required' USING ERRCODE = '42501';
  END IF;

  SELECT up.organization_id
  INTO current_org_id
  FROM public.user_profiles up
  WHERE up.id = current_user_id
    AND up.role = 'admin';

  IF current_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization administrator access required' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(current_org_id::TEXT, 0));

  IF NULLIF(trim(p_slug), '') IS NULL THEN
    SELECT o.slug INTO base_slug
    FROM public.organizations o
    WHERE o.id = current_org_id;
  ELSE
    base_slug := lower(left(trim(p_slug), 40));
    base_slug := regexp_replace(base_slug, '[^a-z0-9-]+', '-', 'g');
    base_slug := COALESCE(NULLIF(trim(both '-' from base_slug), ''), 'empresa');
  END IF;

  LOOP
    candidate_slug := base_slug || CASE WHEN suffix = 0 THEN '' ELSE '-' || suffix::TEXT END;
    BEGIN
      UPDATE public.organizations
      SET name = trim(p_name),
          slug = candidate_slug,
          updated_at = NOW()
      WHERE id = current_org_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      suffix := suffix + 1;
      IF suffix > 99 THEN
        RAISE EXCEPTION 'Unable to allocate a unique organization slug';
      END IF;
    END;
  END LOOP;

  RETURN QUERY SELECT current_org_id, candidate_slug;
END;
$$;


ALTER FUNCTION "public"."update_my_organization"("p_name" "text", "p_slug" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_my_organization"("p_name" "text", "p_slug" "text") IS 'Updates only the authenticated administrator organization and resolves slug collisions atomically.';



CREATE OR REPLACE FUNCTION "public"."update_owners_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."update_owners_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_calendar_event_audit"("p_organization_id" "uuid", "p_property_id" "uuid", "p_property_listing_id" "uuid", "p_source_platform" "text", "p_check_in" "date", "p_check_out" "date", "p_ical_uid" "text", "p_raw_summary" "text", "p_raw_vevent" "text", "p_event_kind" "text", "p_reservation_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'service_role required';
  END IF;

  RETURN QUERY
  INSERT INTO public.calendar_events AS existing (
    organization_id, property_id, property_listing_id, source_platform,
    check_in, check_out, ical_uid, raw_summary, raw_vevent, event_kind,
    reservation_id, status
  ) VALUES (
    p_organization_id, p_property_id, p_property_listing_id, p_source_platform,
    p_check_in, p_check_out, p_ical_uid, p_raw_summary, COALESCE(p_raw_vevent, ''),
    p_event_kind, p_reservation_id,
    CASE WHEN p_reservation_id IS NOT NULL THEN 'matched'
         WHEN p_event_kind = 'unknown' THEN 'ignored'
         ELSE 'unmatched' END
  )
  ON CONFLICT (organization_id, property_id, property_listing_id, ical_uid)
  DO UPDATE SET
    source_platform = EXCLUDED.source_platform,
    check_in = EXCLUDED.check_in,
    check_out = EXCLUDED.check_out,
    raw_summary = EXCLUDED.raw_summary,
    raw_vevent = EXCLUDED.raw_vevent,
    event_kind = EXCLUDED.event_kind,
    reservation_id = COALESCE(existing.reservation_id, EXCLUDED.reservation_id),
    status = CASE
      WHEN existing.reservation_id IS NOT NULL OR EXCLUDED.reservation_id IS NOT NULL THEN 'matched'
      WHEN EXCLUDED.event_kind = 'unknown' THEN 'ignored'
      ELSE 'unmatched'
    END,
    updated_at = now()
  RETURNING existing.id, existing.status;
END;
$$;


ALTER FUNCTION "public"."upsert_calendar_event_audit"("p_organization_id" "uuid", "p_property_id" "uuid", "p_property_listing_id" "uuid", "p_source_platform" "text", "p_check_in" "date", "p_check_out" "date", "p_ical_uid" "text", "p_raw_summary" "text", "p_raw_vevent" "text", "p_event_kind" "text", "p_reservation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_property_access"("prop_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      -- Nova guarda: org do utilizador deve coincidir com org da propriedade
      AND up.organization_id = (
        SELECT organization_id FROM public.properties WHERE id = prop_id
      )
      AND (
        up.role = 'admin'
        OR up.access_all_properties = TRUE
        OR EXISTS (
          SELECT 1 FROM public.user_properties
          WHERE user_id = auth.uid()
            AND property_id = prop_id
        )
      )
  );
$$;


ALTER FUNCTION "public"."user_has_property_access"("prop_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_minimum_stay"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_nights integer;
  v_property_id uuid;
  v_property_min_nights integer;
  v_rule_min_nights integer;
  v_effective_min_nights integer;
BEGIN
  IF NEW.calendar_event_id IS NOT NULL
     OR NEW.booking_source IN (
       'ical_import',
       'ical_auto_sync',
       'booking_webhook',
       'manual',
       'direct'
     ) THEN
    RETURN NEW;
  END IF;

  v_nights := NEW.check_out::date - NEW.check_in::date;

  v_property_id := NEW.property_id;
  IF v_property_id IS NULL THEN
    SELECT pl.property_id
    INTO v_property_id
    FROM public.property_listings pl
    WHERE pl.id = NEW.property_listing_id;
  END IF;

  SELECT COALESCE(pa.min_nights, 1)
  INTO v_property_min_nights
  FROM public.property_availability pa
  WHERE pa.property_id = v_property_id;

  SELECT COALESCE(max(pr.min_nights), 0)
  INTO v_rule_min_nights
  FROM public.pricing_rules pr
  WHERE pr.property_id = v_property_id
    AND pr.start_date < NEW.check_out::date
    AND pr.end_date >= NEW.check_in::date;

  v_effective_min_nights := greatest(
    COALESCE(v_property_min_nights, 1),
    COALESCE(v_rule_min_nights, 0)
  );

  IF v_nights < v_effective_min_nights THEN
    RAISE EXCEPTION 'Minimum stay requirement: % nights required, only % nights provided',
      v_effective_min_nights, v_nights;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_minimum_stay"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_minimum_stay"() IS 'Validates Lodgra-originated inventory rules; authoritative OTA/calendar reservations bypass using calendar_event_id provenance.';



CREATE TABLE IF NOT EXISTS "public"."amenities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text" NOT NULL,
    "category" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."amenities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_config_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "action" character varying(50) NOT NULL,
    "old_values" "jsonb",
    "new_values" "jsonb",
    "changed_by" character varying(100) DEFAULT 'system'::character varying,
    "ip_address" "inet",
    "user_agent" character varying(500),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_config_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "text",
    "details" "jsonb",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "audit_logs_action_check" CHECK (("action" = ANY (ARRAY['create'::"text", 'update'::"text", 'delete'::"text"])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."availability_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "channel_connection_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "unit_id" "uuid",
    "external_block_uid" "text",
    "source_event_uid" "text",
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "block_type" "text" DEFAULT 'unavailable'::"text",
    "reason" "text",
    "source" "text" DEFAULT 'ical'::"text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "deleted_at" timestamp without time zone,
    CONSTRAINT "ab_dates_valid" CHECK (("start_date" < "end_date")),
    CONSTRAINT "ab_type_valid" CHECK (("block_type" = ANY (ARRAY['unavailable'::"text", 'maintenance'::"text", 'owner_block'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."availability_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calendar_blocks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "property_id" "uuid",
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "block_type" character varying(50),
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "organization_id" "uuid" NOT NULL,
    "blocked_by" "uuid",
    "external_uid" "text",
    "blocked_at" timestamp with time zone DEFAULT "now"(),
    "property_listing_id" "uuid"
);


ALTER TABLE "public"."calendar_blocks" OWNER TO "postgres";


COMMENT ON COLUMN "public"."calendar_blocks"."property_listing_id" IS 'Feed/listing that owns a platform-synced block; used to isolate reconciliation cleanup.';



CREATE TABLE IF NOT EXISTS "public"."calendar_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "property_listing_id" "uuid" NOT NULL,
    "source_platform" "text" NOT NULL,
    "check_in" "date" NOT NULL,
    "check_out" "date" NOT NULL,
    "ical_uid" "text" NOT NULL,
    "raw_summary" "text",
    "reservation_id" "uuid",
    "status" "text" DEFAULT 'unmatched'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "raw_vevent" "text" DEFAULT ''::"text" NOT NULL,
    "event_kind" "text" DEFAULT 'unknown'::"text" NOT NULL,
    CONSTRAINT "calendar_events_dates_check" CHECK (("check_out" > "check_in")),
    CONSTRAINT "calendar_events_event_kind_check" CHECK (("event_kind" = ANY (ARRAY['reservation'::"text", 'block'::"text", 'unknown'::"text"]))),
    CONSTRAINT "calendar_events_ical_uid_check" CHECK (("btrim"("ical_uid") <> ''::"text")),
    CONSTRAINT "calendar_events_source_platform_check" CHECK (("source_platform" = ANY (ARRAY['airbnb'::"text", 'booking'::"text", 'flatio'::"text", 'vrbo'::"text", 'unknown'::"text"]))),
    CONSTRAINT "calendar_events_status_check" CHECK (("status" = ANY (ARRAY['unmatched'::"text", 'matched'::"text", 'ignored'::"text"])))
);

ALTER TABLE ONLY "public"."calendar_events" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."calendar_events" IS 'Story 38.1 canonical staging for reservation-like iCal VEVENTs.';



COMMENT ON COLUMN "public"."calendar_events"."raw_vevent" IS 'Raw VEVENT payload stored for audit and classification evolution.';



COMMENT ON COLUMN "public"."calendar_events"."event_kind" IS 'Normalized classification of the raw iCal event: reservation, block or unknown.';



CREATE TABLE IF NOT EXISTS "public"."channel_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "channel" "text" NOT NULL,
    "external_account_id" "text" NOT NULL,
    "account_name" "text",
    "encrypted_credentials" "bytea",
    "credential_type" "text",
    "token_expires_at" timestamp without time zone,
    "status" "text" DEFAULT 'active'::"text",
    "last_sync_at" timestamp without time zone,
    "last_error" "text",
    "error_count" integer DEFAULT 0,
    "connected_at" timestamp without time zone DEFAULT "now"(),
    "disconnected_at" timestamp without time zone,
    "disconnected_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "deleted_at" timestamp without time zone,
    CONSTRAINT "cc_status_valid" CHECK (("status" = ANY (ARRAY['active'::"text", 'error'::"text", 'revoked'::"text", 'testing'::"text"])))
);


ALTER TABLE "public"."channel_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."channel_listing_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "channel_connection_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "unit_id" "uuid",
    "external_listing_id" "text" NOT NULL,
    "external_property_id" "text",
    "external_room_type_id" "text",
    "external_rate_plan_id" "text",
    "status" "text" DEFAULT 'active'::"text",
    "sync_enabled" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "deleted_at" timestamp without time zone,
    CONSTRAINT "clm_status_valid" CHECK (("status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'disconnected'::"text"])))
);


ALTER TABLE "public"."channel_listing_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."channel_payout_allocation_components" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "allocation_id" "uuid" NOT NULL,
    "component_code" "text" NOT NULL,
    "amount" numeric(14,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "channel_payout_allocation_components_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "channel_payout_allocation_components_code_check" CHECK (("component_code" = ANY (ARRAY['accommodation'::"text", 'cleaning_fee'::"text", 'municipal_tax'::"text", 'other_guest_fees'::"text", 'discount'::"text", 'ota_commission'::"text", 'payment_processing_fee'::"text"])))
);


ALTER TABLE "public"."channel_payout_allocation_components" OWNER TO "postgres";


COMMENT ON TABLE "public"."channel_payout_allocation_components" IS 'Exact canonical component breakdown for cash-basis recognition by payout date; no proportional inference.';



CREATE TABLE IF NOT EXISTS "public"."channel_payout_allocations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "payout_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "reservation_id" "uuid" NOT NULL,
    "allocation_type" "text" NOT NULL,
    "currency" "text" NOT NULL,
    "amount" numeric(14,2) NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "external_allocation_id" "text",
    CONSTRAINT "channel_payout_allocations_amount_check" CHECK (((("allocation_type" = 'reservation'::"text") AND ("amount" >= (0)::numeric)) OR (("allocation_type" = 'refund'::"text") AND ("amount" <= (0)::numeric)) OR (("allocation_type" = 'adjustment'::"text") AND ("amount" <> (0)::numeric)))),
    CONSTRAINT "channel_payout_allocations_currency_check" CHECK (("currency" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "channel_payout_allocations_type_check" CHECK (("allocation_type" = ANY (ARRAY['reservation'::"text", 'adjustment'::"text", 'refund'::"text"])))
);


ALTER TABLE "public"."channel_payout_allocations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."channel_payout_allocations"."external_allocation_id" IS 'Optional provider identifier for idempotency; multiple legitimate allocations of the same type remain allowed.';



CREATE TABLE IF NOT EXISTS "public"."channel_payouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "external_payout_id" "text",
    "payout_at" timestamp with time zone NOT NULL,
    "currency" "text" NOT NULL,
    "gross_amount" numeric(14,2),
    "ota_commission_amount" numeric(14,2),
    "payment_processing_fee_amount" numeric(14,2),
    "adjustment_amount" numeric(14,2),
    "net_amount" numeric(14,2) NOT NULL,
    "source_kind" "text" NOT NULL,
    "reconciliation_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "source_metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ota_commission_settlement" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "payment_processing_settlement" "text" DEFAULT 'unknown'::"text" NOT NULL,
    CONSTRAINT "channel_payouts_currency_check" CHECK (("currency" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "channel_payouts_fees_check" CHECK (((("ota_commission_amount" IS NULL) OR ("ota_commission_amount" >= (0)::numeric)) AND (("payment_processing_fee_amount" IS NULL) OR ("payment_processing_fee_amount" >= (0)::numeric)))),
    CONSTRAINT "channel_payouts_metadata_object_check" CHECK (("jsonb_typeof"("source_metadata") = 'object'::"text")),
    CONSTRAINT "channel_payouts_ota_settlement_check" CHECK (("ota_commission_settlement" = ANY (ARRAY['withheld'::"text", 'invoiced_separately'::"text", 'not_applicable'::"text", 'unknown'::"text"]))),
    CONSTRAINT "channel_payouts_payment_settlement_check" CHECK (("payment_processing_settlement" = ANY (ARRAY['withheld'::"text", 'invoiced_separately'::"text", 'not_applicable'::"text", 'unknown'::"text"]))),
    CONSTRAINT "channel_payouts_provider_check" CHECK (("btrim"("provider") <> ''::"text")),
    CONSTRAINT "channel_payouts_reconciled_settlement_check" CHECK ((("reconciliation_status" <> 'reconciled'::"text") OR (("ota_commission_settlement" <> 'unknown'::"text") AND ("payment_processing_settlement" <> 'unknown'::"text")))),
    CONSTRAINT "channel_payouts_source_check" CHECK (("source_kind" = ANY (ARRAY['manual'::"text", 'channel_api'::"text", 'channel_csv'::"text", 'bank_import'::"text", 'import'::"text"]))),
    CONSTRAINT "channel_payouts_status_check" CHECK (("reconciliation_status" = ANY (ARRAY['pending'::"text", 'reconciled'::"text", 'needs_review'::"text"])))
);


ALTER TABLE "public"."channel_payouts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."channel_payouts"."payout_at" IS 'Observed payout timestamp kept independently for bank reconciliation, regardless of the contract recognition basis.';



COMMENT ON COLUMN "public"."channel_payouts"."ota_commission_settlement" IS 'Settlement mode used when reconciling observed channel net amount.';



CREATE TABLE IF NOT EXISTS "public"."cleaner_access_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cleaner_id" "uuid" NOT NULL,
    "token_hash" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone NOT NULL,
    "is_used" boolean DEFAULT false,
    "used_at" timestamp with time zone,
    "ip_address" "inet",
    "user_agent" "text",
    "organization_id" "uuid" NOT NULL
);


ALTER TABLE "public"."cleaner_access_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cleaning_checklist_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "category" "text",
    "is_required" boolean DEFAULT false,
    "order_index" integer DEFAULT 0
);


ALTER TABLE "public"."cleaning_checklist_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cleaning_checklist_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "is_checked" boolean DEFAULT false,
    "checked_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cleaning_checklist_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cleaning_checklist_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "property_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cleaning_checklist_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cleaning_checklists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "reservation_id" "uuid",
    "assigned_to" "uuid",
    "scheduled_date" "date" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "notes" "text",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cleaning_checklists_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."cleaning_checklists" OWNER TO "postgres";


COMMENT ON TABLE "public"."cleaning_checklists" IS 'Mobile-first cleaning task management for
   field teams';



CREATE TABLE IF NOT EXISTS "public"."cleaning_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "uploader_id" "uuid" NOT NULL,
    "caption" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cleaning_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cleaning_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "reservation_id" "uuid",
    "cleaner_id" "uuid",
    "checklist_template_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "scheduled_date" "date" NOT NULL,
    "scheduled_time" time without time zone,
    "notes" "text",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cleaning_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cleaning_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "property_id" "uuid",
    "items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cleaning_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."cleaning_templates" IS 'Reusable item templates per property or
  organization';



CREATE TABLE IF NOT EXISTS "public"."company_expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "currency" character varying(3) DEFAULT 'EUR'::character varying NOT NULL,
    "category" character varying(80) DEFAULT 'other'::character varying NOT NULL,
    "expense_date" "date" NOT NULL,
    "recurrence_type" character varying(20) DEFAULT 'none'::character varying NOT NULL,
    "recurrence_end_date" "date",
    "status" character varying(20) DEFAULT 'paid'::character varying NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "company_expenses_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "company_expenses_recurrence_end_check" CHECK ((("recurrence_end_date" IS NULL) OR ("recurrence_end_date" >= "expense_date"))),
    CONSTRAINT "company_expenses_recurrence_type_check" CHECK ((("recurrence_type")::"text" = ANY ((ARRAY['none'::character varying, 'monthly'::character varying, 'yearly'::character varying])::"text"[]))),
    CONSTRAINT "company_expenses_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['paid'::character varying, 'pending'::character varying, 'planned'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."company_expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consent_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "consent_type" "text" NOT NULL,
    "consent_value" boolean NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid",
    CONSTRAINT "consent_records_consent_type_check" CHECK (("consent_type" = ANY (ARRAY['analytics'::"text", 'marketing'::"text", 'essential'::"text", 'terms'::"text", 'privacy_policy'::"text"])))
);


ALTER TABLE "public"."consent_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_prices" (
    "id" bigint NOT NULL,
    "property_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "base_price" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."daily_prices" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."daily_prices_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."daily_prices_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."daily_prices_id_seq" OWNED BY "public"."daily_prices"."id";



CREATE TABLE IF NOT EXISTS "public"."deletion_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "scheduled_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "cancelled_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid",
    CONSTRAINT "deletion_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."deletion_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text" NOT NULL,
    "token_expiry" timestamp with time zone NOT NULL,
    "scope" "text" DEFAULT 'https://www.googleapis.com/auth/gmail.readonly'::"text" NOT NULL,
    "connected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_sync_at" timestamp with time zone
);


ALTER TABLE "public"."email_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_extractions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "raw_email_id" "uuid" NOT NULL,
    "source_platform" "text" NOT NULL,
    "confidence" numeric(5,4) NOT NULL,
    "guest_name" "text",
    "guest_count" integer,
    "check_in" "date",
    "check_out" "date",
    "total_value" numeric(14,2),
    "currency" "text",
    "reservation_code" "text",
    "property_identifier_raw" "text",
    "raw_email_snippet" "text",
    "matched_event_id" "uuid",
    "match_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "phone" "text",
    "extraction_version" "text" DEFAULT 'email-reservation-extraction/v1'::"text" NOT NULL,
    "extraction_model" "text",
    CONSTRAINT "email_extractions_confidence_check" CHECK ((("confidence" >= (0)::numeric) AND ("confidence" <= (1)::numeric))),
    CONSTRAINT "email_extractions_currency_check" CHECK ((("currency" IS NULL) OR ("currency" ~ '^[A-Z]{3}$'::"text"))),
    CONSTRAINT "email_extractions_dates_check" CHECK ((("check_in" IS NULL) OR ("check_out" IS NULL) OR ("check_out" > "check_in"))),
    CONSTRAINT "email_extractions_guest_count_check" CHECK ((("guest_count" IS NULL) OR ("guest_count" > 0))),
    CONSTRAINT "email_extractions_match_status_check" CHECK (("match_status" = ANY (ARRAY['pending'::"text", 'auto_matched'::"text", 'needs_review'::"text", 'no_match'::"text"]))),
    CONSTRAINT "email_extractions_source_platform_check" CHECK (("source_platform" = ANY (ARRAY['airbnb'::"text", 'booking'::"text", 'vrbo'::"text"]))),
    CONSTRAINT "email_extractions_total_value_check" CHECK ((("total_value" IS NULL) OR ("total_value" >= (0)::numeric)))
);

ALTER TABLE ONLY "public"."email_extractions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_extractions" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_extractions" IS 'Story 38.1 structured LLM extraction before deterministic validation and matching.';



COMMENT ON COLUMN "public"."email_extractions"."phone" IS 'Guest phone number extracted from confirmation email (Booking.com, Airbnb, 
  VRBO)';



COMMENT ON COLUMN "public"."email_extractions"."extraction_version" IS 'Versioned extraction contract used to produce this row.';



COMMENT ON COLUMN "public"."email_extractions"."extraction_model" IS 'Provider model identifier used to produce this row.';



CREATE TABLE IF NOT EXISTS "public"."email_parse_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "message_id" "text" NOT NULL,
    "received_at" timestamp with time zone NOT NULL,
    "platform" "text",
    "status" "text" NOT NULL,
    "parsed_data" "jsonb",
    "reservation_id" "uuid",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "property_id" "uuid",
    "matched_reservation_id" "uuid",
    "is_cancellation" boolean DEFAULT false
);


ALTER TABLE "public"."email_parse_log" OWNER TO "postgres";


COMMENT ON COLUMN "public"."email_parse_log"."property_id" IS 'Auto-detected 
  property from email domain (if available)';



COMMENT ON COLUMN "public"."email_parse_log"."matched_reservation_id" IS 'iCal 
  reservation matched and enriched with email data';



COMMENT ON COLUMN "public"."email_parse_log"."is_cancellation" IS 'Email detected as
  cancellation';



CREATE TABLE IF NOT EXISTS "public"."email_parser_cron_log" (
    "id" bigint NOT NULL,
    "triggered_at" timestamp with time zone,
    "status" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_parser_cron_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."email_parser_cron_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."email_parser_cron_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."email_parser_cron_log_id_seq" OWNED BY "public"."email_parser_cron_log"."id";



CREATE TABLE IF NOT EXISTS "public"."expense_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expense_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_size" integer,
    "mime_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."expense_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "currency" character varying(3) DEFAULT 'EUR'::character varying NOT NULL,
    "category" character varying(50) NOT NULL,
    "expense_date" "date" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid",
    CONSTRAINT "expenses_amount_check" CHECK (("amount" >= (0)::numeric))
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


COMMENT ON TABLE "public"."expenses" IS 'Despesas relacionadas às propriedades';



COMMENT ON COLUMN "public"."expenses"."currency" IS 'Código ISO 4217 da moeda (EUR, BRL, USD, etc)';



COMMENT ON COLUMN "public"."expenses"."category" IS 'Categorias: cleaning, maintenance, utilities, taxes, insurance, supplies, repairs, marketing, other';



CREATE TABLE IF NOT EXISTS "public"."feature_flag_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "feature" "text" NOT NULL,
    "enabled" boolean NOT NULL,
    "reason" "text",
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."feature_flag_audit" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_flag_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financial_transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "property_id" "uuid",
    "reservation_id" "uuid",
    "transaction_type" character varying(50),
    "category" character varying(100),
    "amount" numeric(10,2) NOT NULL,
    "currency" character varying(3) DEFAULT 'EUR'::character varying,
    "description" "text",
    "transaction_date" "date" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."financial_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."google_feed_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "action" "text" NOT NULL,
    "status" "text" NOT NULL,
    "duration_ms" integer,
    "error_message" "text",
    "properties_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "google_feed_logs_action_check" CHECK (("action" = ANY (ARRAY['auto'::"text", 'manual'::"text"]))),
    CONSTRAINT "google_feed_logs_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'failed'::"text", 'queued'::"text", 'in_progress'::"text"])))
);


ALTER TABLE "public"."google_feed_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."google_merchant_sync_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "sync_job_id" character varying(255),
    "action" character varying(50),
    "status" character varying(50),
    "properties_count" integer DEFAULT 0,
    "properties_synced" integer DEFAULT 0,
    "properties_failed" integer DEFAULT 0,
    "duration_ms" integer DEFAULT 0,
    "error_message" "text",
    "api_quota_used" integer DEFAULT 0,
    "sync_details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."google_merchant_sync_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."google_merchant_sync_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "last_fetched" timestamp with time zone,
    "error_message" "text",
    "data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."google_merchant_sync_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "first_name" character varying(100),
    "last_name" character varying(100),
    "email" character varying(255),
    "phone" character varying(50),
    "total_bookings" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "organization_id" "uuid" NOT NULL,
    "country" "text"
);


ALTER TABLE "public"."guests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."image_variants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_image_id" "uuid" NOT NULL,
    "variant_type" character varying(20) NOT NULL,
    "storage_path" "text" NOT NULL,
    "width" integer NOT NULL,
    "height" integer NOT NULL,
    "file_size_bytes" integer,
    "format" character varying(10) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "image_variants_format_check" CHECK ((("format")::"text" = ANY ((ARRAY['webp'::character varying, 'jpeg'::character varying])::"text"[]))),
    CONSTRAINT "image_variants_height_check" CHECK (("height" > 0)),
    CONSTRAINT "image_variants_variant_type_check" CHECK ((("variant_type")::"text" = ANY ((ARRAY['thumb'::character varying, 'mobile'::character varying, 'tablet'::character varying, 'desktop'::character varying, 'original'::character varying])::"text"[]))),
    CONSTRAINT "image_variants_width_check" CHECK (("width" > 0)),
    CONSTRAINT "valid_path_format" CHECK (("storage_path" ~~ '%/%'::"text"))
);


ALTER TABLE "public"."image_variants" OWNER TO "postgres";


COMMENT ON TABLE "public"."image_variants" IS 'Generated image variants for responsive display. Each property_image can have multiple formats (WebP primary, JPEG fallback) at different resolutions (thumb, mobile, tablet, desktop).';



COMMENT ON COLUMN "public"."image_variants"."variant_type" IS 'Responsive breakpoint: thumb (300px), mobile (600px), tablet (1024px), desktop (1920px), original (full size)';



COMMENT ON COLUMN "public"."image_variants"."storage_path" IS 'Path in Supabase Storage bucket (e.g., "{org-id}/{prop-id}/{image-id}/desktop.webp")';



COMMENT ON COLUMN "public"."image_variants"."format" IS 'Image format: webp (primary, ~80% smaller) or jpeg (fallback)';



CREATE TABLE IF NOT EXISTS "public"."organization_analytics_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "ga_measurement_id_encrypted" "text" NOT NULL,
    "ga_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."organization_analytics_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_branding" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "logo_url" "text",
    "favicon_url" "text",
    "primary_color" "text" DEFAULT '#1E40AF'::"text",
    "secondary_color" "text" DEFAULT '#6B7280'::"text",
    "accent_color" "text" DEFAULT '#FFC000'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organization_branding" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_financial_settings" (
    "organization_id" "uuid" NOT NULL,
    "default_preset" "text" NOT NULL,
    "default_recognition_basis" "text" DEFAULT 'check_out'::"text" NOT NULL,
    "default_cash_flow_model" "text" NOT NULL,
    "default_cleaning_recipient" "text" NOT NULL,
    "default_municipal_tax_recipient" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organization_financial_settings_cash_flow_check" CHECK (("default_cash_flow_model" = ANY (ARRAY['manager_trust'::"text", 'owner_direct'::"text"]))),
    CONSTRAINT "organization_financial_settings_cleaning_recipient_check" CHECK (("default_cleaning_recipient" = ANY (ARRAY['manager'::"text", 'owner'::"text", 'third_party'::"text"]))),
    CONSTRAINT "organization_financial_settings_municipal_recipient_check" CHECK (("default_municipal_tax_recipient" = 'municipality'::"text")),
    CONSTRAINT "organization_financial_settings_preset_check" CHECK (("default_preset" = ANY (ARRAY['net_received'::"text", 'gross_reservation'::"text", 'custom'::"text"]))),
    CONSTRAINT "organization_financial_settings_recognition_check" CHECK (("default_recognition_basis" = ANY (ARRAY['check_in'::"text", 'check_out'::"text", 'stay_prorata'::"text", 'payout_date'::"text"])))
);


ALTER TABLE "public"."organization_financial_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."organization_financial_settings" IS 'Tenant defaults used only when composing a new property contract; never rewrites historical payout rules.';



COMMENT ON COLUMN "public"."organization_financial_settings"."default_recognition_basis" IS 'Default for new contracts only. Lodgra defaults to check_out; properties may explicitly override with check_in, stay_prorata or payout_date.';



CREATE TABLE IF NOT EXISTS "public"."organization_public_profile" (
    "organization_id" "uuid" NOT NULL,
    "contact_email" "text",
    "contact_phone" "text",
    "whatsapp_number" "text",
    "website_url" "text",
    "instagram_url" "text",
    "public_contact_message" "text",
    "address_line" "text",
    "city" "text",
    "country" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "organization_public_profile_address_length" CHECK ((("address_line" IS NULL) OR ("length"("address_line") <= 255))),
    CONSTRAINT "organization_public_profile_city_length" CHECK ((("city" IS NULL) OR ("length"("city") <= 120))),
    CONSTRAINT "organization_public_profile_country_length" CHECK ((("country" IS NULL) OR ("length"("country") <= 120))),
    CONSTRAINT "organization_public_profile_email_length" CHECK ((("contact_email" IS NULL) OR ("length"("contact_email") <= 254))),
    CONSTRAINT "organization_public_profile_instagram_length" CHECK ((("instagram_url" IS NULL) OR ("length"("instagram_url") <= 500))),
    CONSTRAINT "organization_public_profile_message_length" CHECK ((("public_contact_message" IS NULL) OR ("length"("public_contact_message") <= 180))),
    CONSTRAINT "organization_public_profile_phone_length" CHECK ((("contact_phone" IS NULL) OR ("length"("contact_phone") <= 40))),
    CONSTRAINT "organization_public_profile_website_length" CHECK ((("website_url" IS NULL) OR ("length"("website_url") <= 500))),
    CONSTRAINT "organization_public_profile_whatsapp_length" CHECK ((("whatsapp_number" IS NULL) OR ("length"("whatsapp_number") <= 40)))
);


ALTER TABLE "public"."organization_public_profile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "subscription_status" "text" DEFAULT 'trial'::"text" NOT NULL,
    "subscription_plan" "text" DEFAULT 'essencial'::"text",
    "trial_ends_at" timestamp with time zone DEFAULT ("now"() + '14 days'::interval),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "plan" "text" DEFAULT 'essencial'::"text",
    "premium_extra_properties_count" integer DEFAULT 0 NOT NULL,
    "email_ical_reconciliation_enabled" boolean DEFAULT false NOT NULL,
    "email_ical_pilot_started_at" timestamp with time zone,
    "email_ical_pilot_platforms" "text"[] DEFAULT ARRAY['airbnb'::"text", 'booking'::"text"] NOT NULL
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."owners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "full_name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "tax_id" "text",
    "address" "text",
    "city" "text",
    "country" "text" DEFAULT 'Portugal'::"text",
    "postal_code" "text",
    "bank_name_pt" "text",
    "swift_code" "text",
    "iban" "text",
    "mbway_phone" "text",
    "bank_name_br" "text",
    "agency_number" "text",
    "account_number" "text",
    "pix_key" "text",
    "preferred_currency" character varying(3) DEFAULT 'EUR'::character varying,
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid" NOT NULL
);


ALTER TABLE "public"."owners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."password_reset_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."password_reset_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payout_rule_components" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "payout_rule_id" "uuid" NOT NULL,
    "component_code" "text" NOT NULL,
    "recipient" "text" NOT NULL,
    "commission_base_effect" "text" NOT NULL,
    "owner_statement_effect" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payout_rule_components_code_check" CHECK (("component_code" = ANY (ARRAY['accommodation'::"text", 'cleaning_fee'::"text", 'municipal_tax'::"text", 'other_guest_fees'::"text", 'discount'::"text", 'ota_commission'::"text", 'payment_processing_fee'::"text"]))),
    CONSTRAINT "payout_rule_components_commission_effect_check" CHECK (("commission_base_effect" = ANY (ARRAY['credit'::"text", 'debit'::"text", 'ignore'::"text"]))),
    CONSTRAINT "payout_rule_components_recipient_check" CHECK (("recipient" = ANY (ARRAY['manager'::"text", 'owner'::"text", 'municipality'::"text", 'channel'::"text", 'payment_processor'::"text", 'third_party'::"text"]))),
    CONSTRAINT "payout_rule_components_statement_effect_check" CHECK (("owner_statement_effect" = ANY (ARRAY['credit'::"text", 'debit'::"text", 'ignore'::"text"])))
);


ALTER TABLE "public"."payout_rule_components" OWNER TO "postgres";


COMMENT ON TABLE "public"."payout_rule_components" IS 'Explicit component policy for v2 payout rules. Preset names never select a calculation branch.';



CREATE OR REPLACE VIEW "public"."pilot_organizations" WITH ("security_invoker"='true') AS
 SELECT "id",
    "name",
    "email_ical_pilot_started_at",
    ("now"() - "email_ical_pilot_started_at") AS "pilot_duration",
    "email_ical_pilot_platforms"
   FROM "public"."organizations"
  WHERE (("email_ical_reconciliation_enabled" = true) AND ("email_ical_pilot_started_at" IS NOT NULL));


ALTER VIEW "public"."pilot_organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platforms" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "code" character varying(20) NOT NULL,
    "api_endpoint" "text",
    "requires_oauth" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "display_name" "text"
);


ALTER TABLE "public"."platforms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pricing_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "price_per_night" numeric(10,2) NOT NULL,
    "min_nights" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_date_range" CHECK (("end_date" >= "start_date"))
);


ALTER TABLE "public"."pricing_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."properties" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "address" "text" NOT NULL,
    "city" character varying(100),
    "country" character varying(100),
    "postal_code" character varying(20),
    "bedrooms" integer,
    "bathrooms" integer,
    "max_guests" integer,
    "property_type" character varying(50),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "currency" character varying(3) DEFAULT 'EUR'::character varying NOT NULL,
    "owner_id" "uuid",
    "organization_id" "uuid" NOT NULL,
    "ical_export_token" "text" DEFAULT ("gen_random_uuid"())::"text",
    "management_percentage" numeric(5,2) DEFAULT 0,
    "slug" "text",
    "description" "text",
    "photos" "text"[] DEFAULT '{}'::"text"[],
    "amenities" "text"[] DEFAULT '{}'::"text"[],
    "is_public" boolean DEFAULT false,
    "base_price" numeric(10,2) DEFAULT 0,
    "cleaning_fee" numeric,
    "cleaning_fee_type" "text",
    "pet_fee" numeric,
    "pet_fee_type" "text",
    "checkin_from" time without time zone,
    "checkin_until" time without time zone,
    "checkout_until" time without time zone,
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "deleted_at" timestamp with time zone,
    CONSTRAINT "cleaning_fee_type_check" CHECK (("cleaning_fee_type" = ANY (ARRAY['per_stay'::"text", 'per_night'::"text"]))),
    CONSTRAINT "pet_fee_type_check" CHECK (("pet_fee_type" = ANY (ARRAY['per_stay'::"text", 'per_night'::"text"])))
);


ALTER TABLE "public"."properties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_amenities" (
    "property_id" "uuid" NOT NULL,
    "amenity_id" "uuid" NOT NULL
);


ALTER TABLE "public"."property_amenities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_availability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "min_nights" integer DEFAULT 1,
    "max_nights" integer DEFAULT 365,
    "advance_notice_days" integer DEFAULT 0,
    "notice_for_same_day" time without time zone DEFAULT '00:00:00'::time without time zone,
    "preparation_days" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "allow_last_minute_bookings" boolean DEFAULT false,
    "availability_window_months" integer DEFAULT 12,
    "allow_bookings_beyond_window" boolean DEFAULT false,
    CONSTRAINT "property_availability_advance_notice_days_check" CHECK (("advance_notice_days" >= 0)),
    CONSTRAINT "property_availability_max_nights_check" CHECK (("max_nights" >= 1)),
    CONSTRAINT "property_availability_min_nights_check" CHECK (("min_nights" >= 1)),
    CONSTRAINT "property_availability_preparation_days_check" CHECK (("preparation_days" >= 0))
);


ALTER TABLE "public"."property_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_bathrooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "name" "text",
    "bathroom_type" "text" NOT NULL,
    "amenities" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."property_bathrooms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_cancellation_policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "policy_type" "text" NOT NULL,
    "is_long_stay" boolean NOT NULL,
    "full_refund_days" integer NOT NULL,
    "partial_refund_days" integer,
    "partial_refund_percent" integer,
    "non_refundable_discount_percent" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "property_cancellation_polici_non_refundable_discount_perc_check" CHECK ((("non_refundable_discount_percent" >= 0) AND ("non_refundable_discount_percent" <= 100))),
    CONSTRAINT "property_cancellation_policies_full_refund_days_check" CHECK (("full_refund_days" >= 0)),
    CONSTRAINT "property_cancellation_policies_partial_refund_days_check" CHECK ((("partial_refund_days" IS NULL) OR ("partial_refund_days" >= 0))),
    CONSTRAINT "property_cancellation_policies_partial_refund_percent_check" CHECK ((("partial_refund_percent" IS NULL) OR (("partial_refund_percent" >= 0) AND ("partial_refund_percent" <= 100)))),
    CONSTRAINT "property_cancellation_policies_policy_type_check" CHECK (("policy_type" = ANY (ARRAY['flexible'::"text", 'moderate'::"text", 'limited'::"text", 'firm'::"text", 'rigid'::"text"])))
);


ALTER TABLE "public"."property_cancellation_policies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_cancellation_policy_periods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "policy_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "property_cancellation_policy_periods_dates_check" CHECK (("start_date" <= "end_date"))
);


ALTER TABLE "public"."property_cancellation_policy_periods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_discounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "discount_type" "text" NOT NULL,
    "percentage" integer NOT NULL,
    "min_nights" integer DEFAULT 1,
    "conditions" "jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "property_discounts_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['weekly'::"text", 'monthly'::"text", 'excellent_guest'::"text", 'last_minute'::"text", 'advance'::"text"]))),
    CONSTRAINT "property_discounts_percentage_check" CHECK ((("percentage" >= 0) AND ("percentage" <= 100)))
);


ALTER TABLE "public"."property_discounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_size" integer,
    "mime_type" "text",
    "document_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."property_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_fees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "property_fees_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "property_fees_name_check" CHECK (("char_length"(TRIM(BOTH FROM "name")) > 0))
);


ALTER TABLE "public"."property_fees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_financial_parameters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "version" integer NOT NULL,
    "currency" "text" NOT NULL,
    "guest_cleaning_fee_default_amount" numeric(14,2),
    "guest_cleaning_fee_mode" "text",
    "manager_cleaning_cost_default_amount" numeric(14,2),
    "manager_cleaning_cost_mode" "text",
    "municipal_tax_amount_per_guest_night" numeric(14,2),
    "valid_from" "date" NOT NULL,
    "valid_to" "date",
    "note" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "property_financial_parameters_currency_check" CHECK (("currency" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "property_financial_parameters_guest_cleaning_check" CHECK (((("guest_cleaning_fee_default_amount" IS NULL) AND ("guest_cleaning_fee_mode" IS NULL)) OR (("guest_cleaning_fee_default_amount" >= (0)::numeric) AND ("guest_cleaning_fee_mode" = ANY (ARRAY['per_stay'::"text", 'per_night'::"text"]))))),
    CONSTRAINT "property_financial_parameters_has_value_check" CHECK ((("guest_cleaning_fee_default_amount" IS NOT NULL) OR ("manager_cleaning_cost_default_amount" IS NOT NULL) OR ("municipal_tax_amount_per_guest_night" IS NOT NULL))),
    CONSTRAINT "property_financial_parameters_manager_cleaning_check" CHECK (((("manager_cleaning_cost_default_amount" IS NULL) AND ("manager_cleaning_cost_mode" IS NULL)) OR (("manager_cleaning_cost_default_amount" >= (0)::numeric) AND ("manager_cleaning_cost_mode" = ANY (ARRAY['per_stay'::"text", 'per_night'::"text"]))))),
    CONSTRAINT "property_financial_parameters_municipal_tax_check" CHECK ((("municipal_tax_amount_per_guest_night" IS NULL) OR ("municipal_tax_amount_per_guest_night" >= (0)::numeric))),
    CONSTRAINT "property_financial_parameters_note_check" CHECK ((("note" IS NULL) OR ("char_length"("note") <= 2000))),
    CONSTRAINT "property_financial_parameters_validity_check" CHECK ((("valid_to" IS NULL) OR ("valid_to" >= "valid_from"))),
    CONSTRAINT "property_financial_parameters_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."property_financial_parameters" OWNER TO "postgres";


COMMENT ON TABLE "public"."property_financial_parameters" IS 'Immutable, versioned property defaults used only to propose reviewable reservation facts; never retroactive canonical facts.';



COMMENT ON COLUMN "public"."property_financial_parameters"."municipal_tax_amount_per_guest_night" IS 'Configured rate multiplied by confirmed guest count and occupied nights; unmodelled exemptions or caps require manual confirmation.';



CREATE TABLE IF NOT EXISTS "public"."property_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "original_filename" "text" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "alt_text" "text",
    "is_primary" boolean DEFAULT false NOT NULL,
    "file_size_bytes" integer,
    "mime_type" "text" DEFAULT 'image/jpeg'::"text",
    "width" integer NOT NULL,
    "height" integer NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "storage_path" "text",
    CONSTRAINT "property_images_height_check" CHECK (("height" > 0)),
    CONSTRAINT "property_images_width_check" CHECK (("width" > 0)),
    CONSTRAINT "valid_order" CHECK (("display_order" >= 0))
);


ALTER TABLE "public"."property_images" OWNER TO "postgres";


COMMENT ON TABLE "public"."property_images" IS 'Metadata for property images. Each property can have multiple images with variants (WebP at different resolutions). Organized by organization for multi-tenancy.';



COMMENT ON COLUMN "public"."property_images"."id" IS 'Unique identifier (UUID v4)';



COMMENT ON COLUMN "public"."property_images"."organization_id" IS 'Organization owning the property (multi-tenancy isolation)';



COMMENT ON COLUMN "public"."property_images"."property_id" IS 'Property this image belongs to';



COMMENT ON COLUMN "public"."property_images"."original_filename" IS 'Original filename from upload (e.g., "living-room.jpg")';



COMMENT ON COLUMN "public"."property_images"."display_order" IS 'Display order in gallery (0-indexed, can reorder via API)';



COMMENT ON COLUMN "public"."property_images"."alt_text" IS 'Alternative text for accessibility and SEO';



COMMENT ON COLUMN "public"."property_images"."is_primary" IS 'Cover photo for property listing (only one per property)';



COMMENT ON COLUMN "public"."property_images"."width" IS 'Original image width in pixels';



COMMENT ON COLUMN "public"."property_images"."height" IS 'Original image height in pixels';



COMMENT ON COLUMN "public"."property_images"."uploaded_by" IS 'User who uploaded this image';



CREATE TABLE IF NOT EXISTS "public"."property_listings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "property_id" "uuid",
    "platform_id" "uuid",
    "external_listing_id" character varying(255),
    "listing_url" "text",
    "sync_enabled" boolean DEFAULT true,
    "last_synced_at" timestamp without time zone,
    "ical_url" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "organization_id" "uuid",
    "last_sync_error" "text",
    "sync_error_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."property_listings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "base_price" numeric(10,2) NOT NULL,
    "weekend_price" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "property_prices_base_price_check" CHECK (("base_price" >= (0)::numeric)),
    CONSTRAINT "property_prices_weekend_price_check" CHECK ((("weekend_price" IS NULL) OR ("weekend_price" >= (0)::numeric)))
);


ALTER TABLE "public"."property_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "source" "text" NOT NULL,
    "reviewer_name" "text" NOT NULL,
    "rating" numeric(3,1) NOT NULL,
    "review_text" "text",
    "review_date" "date" NOT NULL,
    "is_featured" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "property_reviews_rating_check" CHECK ((("rating" >= 1.0) AND ("rating" <= 10.0))),
    CONSTRAINT "property_reviews_review_text_check" CHECK ((("review_text" IS NULL) OR ("char_length"("review_text") <= 500))),
    CONSTRAINT "property_reviews_source_check" CHECK (("source" = ANY (ARRAY['booking'::"text", 'airbnb'::"text", 'google'::"text", 'tripadvisor'::"text", 'direct'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."property_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "name" "text",
    "bed_type" "text" NOT NULL,
    "bed_count" integer DEFAULT 1 NOT NULL,
    "provides_linen" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."property_rooms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."regras_repasse" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "propriedade_id" "uuid" NOT NULL,
    "vigencia_inicio" "date" NOT NULL,
    "vigencia_fim" "date",
    "tipo_comissao" "public"."tipo_comissao_repasse" NOT NULL,
    "comissao_valor" numeric(12,4) NOT NULL,
    "base_comissao" "public"."base_comissao_repasse",
    "taxa_limpeza_para" "public"."destinatario_taxa_repasse",
    "comissao_ota_por_conta" "public"."destinatario_taxa_repasse",
    "despesas_repassaveis" boolean DEFAULT true NOT NULL,
    "dia_fechamento" smallint DEFAULT 1 NOT NULL,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "contract_version" smallint DEFAULT 1 NOT NULL,
    "recognition_basis" "text",
    "cash_flow_model" "text",
    "preset_key" "text",
    "management_commission_tax_rate" numeric(7,4),
    "allow_declared_owner_base" boolean DEFAULT false NOT NULL,
    CONSTRAINT "regras_repasse_comissao_valor_valido" CHECK (((("tipo_comissao" = 'percentual'::"public"."tipo_comissao_repasse") AND (("comissao_valor" >= (0)::numeric) AND ("comissao_valor" <= (100)::numeric))) OR (("tipo_comissao" = ANY (ARRAY['fixo_mensal'::"public"."tipo_comissao_repasse", 'fixo_por_reserva'::"public"."tipo_comissao_repasse"])) AND ("comissao_valor" >= (0)::numeric)))),
    CONSTRAINT "regras_repasse_contract_payload_check" CHECK (((("contract_version" = 1) AND ("base_comissao" IS NOT NULL) AND ("taxa_limpeza_para" IS NOT NULL) AND ("comissao_ota_por_conta" IS NOT NULL)) OR (("contract_version" = 2) AND ("base_comissao" IS NULL) AND ("taxa_limpeza_para" IS NULL) AND ("comissao_ota_por_conta" IS NULL)))),
    CONSTRAINT "regras_repasse_contract_version_check" CHECK (("contract_version" = ANY (ARRAY[1, 2]))),
    CONSTRAINT "regras_repasse_dia_fechamento_valido" CHECK ((("dia_fechamento" >= 1) AND ("dia_fechamento" <= 31))),
    CONSTRAINT "regras_repasse_v2_fields_check" CHECK (((("contract_version" = 1) AND ("recognition_basis" IS NULL) AND ("cash_flow_model" IS NULL) AND ("preset_key" IS NULL) AND ("management_commission_tax_rate" IS NULL) AND ("allow_declared_owner_base" = false)) OR (("contract_version" = 2) AND ("recognition_basis" IS NOT NULL) AND ("cash_flow_model" IS NOT NULL) AND ("preset_key" IS NOT NULL) AND ("management_commission_tax_rate" IS NOT NULL) AND ("recognition_basis" = ANY (ARRAY['check_in'::"text", 'check_out'::"text", 'stay_prorata'::"text", 'payout_date'::"text"])) AND ("cash_flow_model" = ANY (ARRAY['manager_trust'::"text", 'owner_direct'::"text"])) AND ("preset_key" = ANY (ARRAY['net_received'::"text", 'gross_reservation'::"text", 'custom'::"text"])) AND (("management_commission_tax_rate" >= (0)::numeric) AND ("management_commission_tax_rate" <= (100)::numeric))))),
    CONSTRAINT "regras_repasse_vigencia_valida" CHECK ((("vigencia_fim" IS NULL) OR ("vigencia_fim" >= "vigencia_inicio")))
);


ALTER TABLE "public"."regras_repasse" OWNER TO "postgres";


COMMENT ON TABLE "public"."regras_repasse" IS 'Histórico de regras contratuais usadas no cálculo de repasse por propriedade.';



COMMENT ON COLUMN "public"."regras_repasse"."vigencia_fim" IS 'Último dia inclusivo da vigência; NULL identifica a regra vigente sem fim definido.';



COMMENT ON COLUMN "public"."regras_repasse"."comissao_valor" IS 'Percentual de 0 a 100 ou valor monetário, conforme tipo_comissao.';



COMMENT ON COLUMN "public"."regras_repasse"."contract_version" IS 'Version 1 preserves the legacy contract; version 2 uses explicit component policies.';



COMMENT ON COLUMN "public"."regras_repasse"."recognition_basis" IS 'Explicit versioned contract basis: check_in, check_out, stay_prorata by occupied nights, or reconciled payout_date.';



COMMENT ON COLUMN "public"."regras_repasse"."management_commission_tax_rate" IS 'Tax percentage charged on the management service, not a reservation tax.';



COMMENT ON COLUMN "public"."regras_repasse"."allow_declared_owner_base" IS 'Explicit opt-in, versioned with the effective contract, for operator-confirmed declared owner bases.';



CREATE TABLE IF NOT EXISTS "public"."reservation_conflicts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "reservation_id_1" "uuid" NOT NULL,
    "reservation_id_2" "uuid" NOT NULL,
    "conflict_type" "text" NOT NULL,
    "match_score" integer,
    "match_breakdown" "jsonb",
    "resolution_status" "text" DEFAULT 'pending'::"text",
    "resolution_type" "text",
    "resolved_at" timestamp without time zone,
    "resolved_by" "uuid",
    "conflict_resolved_by_user_id" "uuid",
    "resolution_approved_at" timestamp without time zone,
    "resolution_notes" "text",
    "severity" "text" DEFAULT 'medium'::"text",
    "requires_action_by" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "deleted_at" timestamp without time zone,
    CONSTRAINT "rc_severity_valid" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "rc_status_valid" CHECK (("resolution_status" = ANY (ARRAY['pending'::"text", 'auto_resolved'::"text", 'manual_resolved'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "rc_type_valid" CHECK (("conflict_type" = ANY (ARRAY['duplicate'::"text", 'price_mismatch'::"text", 'overbooking'::"text", 'date_mismatch'::"text"])))
);


ALTER TABLE "public"."reservation_conflicts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reservation_financial_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "reservation_id" "uuid" NOT NULL,
    "version" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "currency" "text" NOT NULL,
    "accommodation_amount" numeric(14,2),
    "cleaning_fee_amount" numeric(14,2),
    "municipal_tax_amount" numeric(14,2),
    "other_guest_fees_amount" numeric(14,2),
    "discount_amount" numeric(14,2),
    "guest_total_amount" numeric(14,2),
    "ota_commission_amount" numeric(14,2),
    "payment_processing_fee_amount" numeric(14,2),
    "channel_net_payout_amount" numeric(14,2),
    "source_kind" "text" NOT NULL,
    "provider" "text",
    "external_reference" "text",
    "source_metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "captured_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "superseded_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ota_commission_settlement" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "payment_processing_settlement" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "fact_mode" "text" DEFAULT 'component_breakdown'::"text" NOT NULL,
    "declared_owner_base_amount" numeric(14,2),
    "platform_adjustment_amount" numeric(14,2),
    "ota_commission_base_amount" numeric(14,2),
    "manager_cleaning_cost_amount" numeric(14,2),
    "source_mapping_version" "text",
    CONSTRAINT "reservation_financial_snapshots_amounts_check" CHECK (((("accommodation_amount" IS NULL) OR ("accommodation_amount" >= (0)::numeric)) AND (("cleaning_fee_amount" IS NULL) OR ("cleaning_fee_amount" >= (0)::numeric)) AND (("municipal_tax_amount" IS NULL) OR ("municipal_tax_amount" >= (0)::numeric)) AND (("other_guest_fees_amount" IS NULL) OR ("other_guest_fees_amount" >= (0)::numeric)) AND (("discount_amount" IS NULL) OR ("discount_amount" >= (0)::numeric)) AND (("guest_total_amount" IS NULL) OR ("guest_total_amount" >= (0)::numeric)) AND (("ota_commission_base_amount" IS NULL) OR ("ota_commission_base_amount" >= (0)::numeric)) AND (("ota_commission_amount" IS NULL) OR ("ota_commission_amount" >= (0)::numeric)) AND (("payment_processing_fee_amount" IS NULL) OR ("payment_processing_fee_amount" >= (0)::numeric)) AND (("manager_cleaning_cost_amount" IS NULL) OR ("manager_cleaning_cost_amount" >= (0)::numeric)) AND (("channel_net_payout_amount" IS NULL) OR ("channel_net_payout_amount" >= (0)::numeric)) AND (("declared_owner_base_amount" IS NULL) OR ("declared_owner_base_amount" >= (0)::numeric)))),
    CONSTRAINT "reservation_financial_snapshots_complete_settlement_check" CHECK ((("status" <> 'complete'::"text") OR ("fact_mode" = 'declared_owner_base'::"text") OR (("ota_commission_settlement" <> 'unknown'::"text") AND ("payment_processing_settlement" <> 'unknown'::"text")))),
    CONSTRAINT "reservation_financial_snapshots_currency_check" CHECK (("currency" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "reservation_financial_snapshots_fact_mode_check" CHECK (("fact_mode" = ANY (ARRAY['component_breakdown'::"text", 'declared_owner_base'::"text"]))),
    CONSTRAINT "reservation_financial_snapshots_mapping_version_check" CHECK ((("source_mapping_version" IS NULL) OR ("btrim"("source_mapping_version") <> ''::"text"))),
    CONSTRAINT "reservation_financial_snapshots_metadata_object_check" CHECK (("jsonb_typeof"("source_metadata") = 'object'::"text")),
    CONSTRAINT "reservation_financial_snapshots_ota_settlement_check" CHECK (("ota_commission_settlement" = ANY (ARRAY['withheld'::"text", 'invoiced_separately'::"text", 'not_applicable'::"text", 'unknown'::"text"]))),
    CONSTRAINT "reservation_financial_snapshots_payment_settlement_check" CHECK (("payment_processing_settlement" = ANY (ARRAY['withheld'::"text", 'invoiced_separately'::"text", 'not_applicable'::"text", 'unknown'::"text"]))),
    CONSTRAINT "reservation_financial_snapshots_representation_check" CHECK (((("fact_mode" = 'component_breakdown'::"text") AND ("declared_owner_base_amount" IS NULL)) OR (("fact_mode" = 'declared_owner_base'::"text") AND ("declared_owner_base_amount" IS NOT NULL)))),
    CONSTRAINT "reservation_financial_snapshots_source_check" CHECK (("source_kind" = ANY (ARRAY['manual'::"text", 'ical'::"text", 'channel_api'::"text", 'channel_csv'::"text", 'import'::"text"]))),
    CONSTRAINT "reservation_financial_snapshots_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'complete'::"text", 'needs_review'::"text"]))),
    CONSTRAINT "reservation_financial_snapshots_superseded_check" CHECK ((("superseded_at" IS NULL) OR ("superseded_at" >= "captured_at"))),
    CONSTRAINT "reservation_financial_snapshots_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."reservation_financial_snapshots" OWNER TO "postgres";


COMMENT ON TABLE "public"."reservation_financial_snapshots" IS 'Versioned canonical financial facts. NULL means unavailable; iCal zero must not be treated as confirmed finance.';



COMMENT ON COLUMN "public"."reservation_financial_snapshots"."ota_commission_settlement" IS 'Whether OTA commission was withheld from payout or invoiced separately; prevents double deduction.';



COMMENT ON COLUMN "public"."reservation_financial_snapshots"."fact_mode" IS 'Calculation discriminator. Supporting component facts in declared mode are evidence only and must never be added to the declared base.';



COMMENT ON COLUMN "public"."reservation_financial_snapshots"."declared_owner_base_amount" IS 'Operator-confirmed amount before management commission and property expenses; not guest gross or channel reconciliation.';



COMMENT ON COLUMN "public"."reservation_financial_snapshots"."platform_adjustment_amount" IS 'Signed platform price adjustment, distinct from non-negative discounts.';



COMMENT ON COLUMN "public"."reservation_financial_snapshots"."ota_commission_base_amount" IS 'Observed OTA commission base used for reconciliation only; it is not an additive payout component.';



COMMENT ON COLUMN "public"."reservation_financial_snapshots"."manager_cleaning_cost_amount" IS 'Cleaning or laundry cost borne by the manager for this reservation.';



COMMENT ON COLUMN "public"."reservation_financial_snapshots"."source_mapping_version" IS 'Version of the manual/import/API mapping that produced the canonical facts.';



CREATE TABLE IF NOT EXISTS "public"."reservation_matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "source_1_reservation_id" "uuid" NOT NULL,
    "source_2_reservation_id" "uuid" NOT NULL,
    "same_property" boolean,
    "same_checkin" boolean,
    "same_checkout" boolean,
    "guest_name_similarity" numeric(3,2),
    "phone_email_match" boolean,
    "price_match" boolean,
    "creation_proximity_minutes" integer,
    "total_score" integer,
    "recommendation" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "deleted_at" timestamp without time zone,
    CONSTRAINT "rm_score_valid" CHECK ((("total_score" >= 0) AND ("total_score" <= 100)))
);


ALTER TABLE "public"."reservation_matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reservation_org_backfill_20260719" (
    "reservation_id" "uuid" NOT NULL,
    "previous_organization_id" "uuid",
    "inferred_organization_id" "uuid" NOT NULL,
    "property_listing_id" "uuid" NOT NULL,
    "backed_up_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reservation_org_backfill_20260719" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reservation_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "reservation_id" "uuid" NOT NULL,
    "source_type" "text" NOT NULL,
    "source_identifier" "text",
    "raw_payload" "jsonb",
    "parsed_data" "jsonb",
    "received_at" timestamp without time zone NOT NULL,
    "processed_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "rs_source_type_valid" CHECK (("source_type" = ANY (ARRAY['email'::"text", 'ical'::"text", 'api_webhook'::"text", 'scraper'::"text"])))
);


ALTER TABLE "public"."reservation_sources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reservations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "channel_connection_id" "uuid",
    "external_reservation_id" character varying(255) NOT NULL COLLATE "pg_catalog"."C",
    "source_event_uid" "text",
    "property_id" "uuid" NOT NULL,
    "unit_id" "uuid",
    "check_in" "date" NOT NULL,
    "check_out" "date" NOT NULL,
    "number_of_nights" integer GENERATED ALWAYS AS (("check_out" - "check_in")) STORED,
    "guest_name" "text",
    "first_name" "text",
    "last_name" "text",
    "guest_email" "text",
    "guest_phone" "text",
    "number_of_guests" integer,
    "total_price" numeric(10,2),
    "currency" "text",
    "commission_amount" numeric(10,2),
    "reservation_status" "text" DEFAULT 'confirmed'::"text",
    "completeness_status" "text" DEFAULT 'minimal'::"text",
    "completeness_percentage" integer DEFAULT 0,
    "missing_fields" "text"[],
    "needs_enrichment" boolean DEFAULT true,
    "enrichment_attempts" integer DEFAULT 0,
    "enrichment_retry_count" integer DEFAULT 0,
    "enrichment_source" "text",
    "enrichment_error_code" "text",
    "enrichment_failed_reason" "text",
    "last_enrichment_at" timestamp without time zone,
    "next_enrichment_at" timestamp without time zone,
    "enrichment_deadline_at" timestamp without time zone,
    "sync_health" "text" DEFAULT 'healthy'::"text",
    "last_sync_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "cancelled_at" timestamp without time zone,
    "deleted_at" timestamp without time zone,
    "adults" integer,
    "children" integer,
    "notes" character varying(200) DEFAULT NULL::character varying,
    "property_listing_id" "uuid",
    "guest_id" "uuid",
    "external_id" "text",
    "total_amount" numeric,
    "platform_fee" numeric,
    "net_amount" numeric,
    "status" character varying DEFAULT 'confirmed'::character varying,
    "synced_at" timestamp without time zone,
    "source" character varying,
    "internal_notes" "text",
    "cancellation_reason" "text",
    "stripe_payment_intent_id" "text",
    "stripe_checkout_session_id" "text",
    "booking_source" "text" DEFAULT 'ical'::"text",
    "num_guests" integer DEFAULT 1,
    "commission_rate" numeric(5,4) DEFAULT 0.15,
    "commission_calculated_at" timestamp with time zone,
    "synced_to_platforms" boolean DEFAULT false,
    "synced_platforms_at" timestamp without time zone,
    "asaas_payment_id" "text",
    "asaas_payment_link" "text",
    "asaas_status" "text",
    "raw_data" "jsonb",
    "channel_id" "uuid",
    "calendar_event_id" "uuid",
    "email_extraction_id" "uuid",
    "confirmed_by_host" boolean DEFAULT false NOT NULL,
    "checkin_code" "text",
    "checkin_instructions" "text",
    "checkin_code_sent_at" timestamp with time zone,
    "confirmation_sent_at" timestamp with time zone,
    "manager_notified_at" timestamp with time zone,
    "auto_confirm_enabled" boolean DEFAULT true,
    "auto_notify_manager" boolean DEFAULT true,
    "booking_reference" character varying(100),
    "platform_sync_url" "text",
    "platform_synced_at" timestamp without time zone,
    "discount_amount" numeric(12,2) DEFAULT 0,
    "service_fee_amount" numeric(12,2) DEFAULT 0,
    "cancellation_policy_id" "uuid",
    "cancellation_policy_snapshot" "jsonb",
    "refund_amount" numeric(10,2),
    "stripe_refund_id" "text",
    "refund_processed_at" timestamp with time zone,
    "review_token" "text",
    "review_token_expires_at" timestamp with time zone,
    "manual_review_notes" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "cancellation_description" "text",
    "cancellation_evidence_url" "text",
    "requires_approval" boolean DEFAULT false,
    "approval_reason" "text",
    "approved_at" timestamp with time zone,
    CONSTRAINT "commission_positive" CHECK ((("commission_amount" IS NULL) OR ("commission_amount" >= (0)::numeric))),
    CONSTRAINT "price_positive" CHECK ((("total_price" IS NULL) OR ("total_price" >= (0)::numeric))),
    CONSTRAINT "res_completeness_pct" CHECK ((("completeness_percentage" >= 0) AND ("completeness_percentage" <= 100))),
    CONSTRAINT "res_completeness_valid" CHECK (("completeness_status" = ANY (ARRAY['minimal'::"text", 'partial'::"text", 'complete'::"text", 'enrichment_pending'::"text", 'enrichment_failed'::"text", 'manual_review'::"text", 'not_enrichable'::"text"]))),
    CONSTRAINT "res_dates_valid" CHECK (("check_in" < "check_out")),
    CONSTRAINT "res_health_valid" CHECK (("sync_health" = ANY (ARRAY['healthy'::"text", 'degraded'::"text", 'error'::"text"]))),
    CONSTRAINT "res_status_valid" CHECK (("reservation_status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'cancelled'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."reservations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."reservations"."notes" IS 'Reservation notes (max 200 
  characters)';



COMMENT ON COLUMN "public"."reservations"."commission_calculated_at" IS 'Legacy timestamp. NULL means no legacy commission calculation was recorded; v2 finance uses canonical snapshots.';



CREATE TABLE IF NOT EXISTS "public"."sync_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "property_listing_id" "uuid",
    "sync_type" character varying(50),
    "direction" character varying(20),
    "status" character varying(50),
    "error_message" "text",
    "records_processed" integer,
    "records_created" integer,
    "records_updated" integer,
    "records_failed" integer,
    "synced_at" timestamp without time zone DEFAULT "now"(),
    "reservation_id" "uuid",
    "message" "text"
);


ALTER TABLE "public"."sync_logs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sync_logs"."reservation_id" IS 'Reference to the reservation being 
  synced (for outbound syncs)';



COMMENT ON COLUMN "public"."sync_logs"."message" IS 'Human-readable message about the sync 
  operation (e.g., awaiting platform polling)';



CREATE TABLE IF NOT EXISTS "public"."task_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "changed_by" "uuid" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "action" character varying(50) NOT NULL,
    "field_name" character varying(100),
    "old_value" "text",
    "new_value" "text",
    "reason" character varying(500),
    "full_snapshot" "jsonb"
);


ALTER TABLE "public"."task_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "role" "text" DEFAULT 'viewer'::"text" NOT NULL,
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "access_all_properties" boolean DEFAULT false,
    "organization_id" "uuid" NOT NULL,
    "password_reset_required" boolean DEFAULT false,
    "guest_type" "text",
    "phone_number" "text",
    "accepts_whatsapp" boolean DEFAULT false,
    CONSTRAINT "guest_type_check" CHECK ((("guest_type" IS NULL) OR ("guest_type" = ANY (ARRAY['staff'::"text", 'owner'::"text", 'cleaner'::"text"])))),
    CONSTRAINT "phone_number_format" CHECK ((("phone_number" IS NULL) OR ("phone_number" ~ '^\+?[1-9]\d{1,14}$'::"text"))),
    CONSTRAINT "user_profiles_role_check" CHECK (("role" = ANY (ARRAY['guest'::"text", 'admin'::"text", 'gestor'::"text", 'cleaner'::"text"])))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_profiles" IS 'Perfis de usuários com roles e permissões';



COMMENT ON COLUMN "public"."user_profiles"."role" IS 'admin: acesso total | manager: gerenciar | viewer: apenas visualizar';



COMMENT ON COLUMN "public"."user_profiles"."avatar_url" IS 'Optional URL for the user avatar displayed in authenticated application shells.';



COMMENT ON COLUMN "public"."user_profiles"."guest_type" IS 'Type of guest user: staff 
  (internal staff), owner (property owner), cleaner (cleaning staff)';



COMMENT ON COLUMN "public"."user_profiles"."phone_number" IS 'International phone number 
  format: +country_code followed by number (e.g., +351912345678)';



COMMENT ON COLUMN "public"."user_profiles"."accepts_whatsapp" IS 'User has consented to 
  receive WhatsApp messages from the organization';



CREATE TABLE IF NOT EXISTS "public"."user_properties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_properties" OWNER TO "postgres";


ALTER TABLE ONLY "public"."daily_prices" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."daily_prices_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."email_parser_cron_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."email_parser_cron_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."amenities"
    ADD CONSTRAINT "amenities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_config_audit_log"
    ADD CONSTRAINT "analytics_config_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."availability_blocks"
    ADD CONSTRAINT "availability_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_blocks"
    ADD CONSTRAINT "calendar_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_id_organization_key" UNIQUE ("id", "organization_id");



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_org_property_listing_uid_key" UNIQUE ("organization_id", "property_id", "property_listing_id", "ical_uid");



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channel_connections"
    ADD CONSTRAINT "channel_connections_organization_id_channel_external_accoun_key" UNIQUE ("organization_id", "channel", "external_account_id");



ALTER TABLE ONLY "public"."channel_connections"
    ADD CONSTRAINT "channel_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channel_listing_mappings"
    ADD CONSTRAINT "channel_listing_mappings_channel_connection_id_external_lis_key" UNIQUE ("channel_connection_id", "external_listing_id");



ALTER TABLE ONLY "public"."channel_listing_mappings"
    ADD CONSTRAINT "channel_listing_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channel_payout_allocation_components"
    ADD CONSTRAINT "channel_payout_allocation_components_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channel_payout_allocation_components"
    ADD CONSTRAINT "channel_payout_allocation_components_unique" UNIQUE ("organization_id", "allocation_id", "component_code");



ALTER TABLE ONLY "public"."channel_payout_allocations"
    ADD CONSTRAINT "channel_payout_allocations_id_org_key" UNIQUE ("id", "organization_id");



ALTER TABLE ONLY "public"."channel_payout_allocations"
    ADD CONSTRAINT "channel_payout_allocations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channel_payouts"
    ADD CONSTRAINT "channel_payouts_id_org_currency_key" UNIQUE ("id", "organization_id", "currency");



ALTER TABLE ONLY "public"."channel_payouts"
    ADD CONSTRAINT "channel_payouts_id_org_key" UNIQUE ("id", "organization_id");



ALTER TABLE ONLY "public"."channel_payouts"
    ADD CONSTRAINT "channel_payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cleaner_access_tokens"
    ADD CONSTRAINT "cleaner_access_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cleaner_access_tokens"
    ADD CONSTRAINT "cleaner_access_tokens_token_hash_key" UNIQUE ("token_hash");



ALTER TABLE ONLY "public"."cleaning_checklist_items"
    ADD CONSTRAINT "cleaning_checklist_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cleaning_checklist_responses"
    ADD CONSTRAINT "cleaning_checklist_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cleaning_checklist_templates"
    ADD CONSTRAINT "cleaning_checklist_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cleaning_checklists"
    ADD CONSTRAINT "cleaning_checklists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cleaning_photos"
    ADD CONSTRAINT "cleaning_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cleaning_tasks"
    ADD CONSTRAINT "cleaning_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cleaning_templates"
    ADD CONSTRAINT "cleaning_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_expenses"
    ADD CONSTRAINT "company_expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consent_records"
    ADD CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_prices"
    ADD CONSTRAINT "daily_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deletion_requests"
    ADD CONSTRAINT "deletion_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_connections"
    ADD CONSTRAINT "email_connections_org_unique" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."email_connections"
    ADD CONSTRAINT "email_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_extractions"
    ADD CONSTRAINT "email_extractions_id_organization_key" UNIQUE ("id", "organization_id");



ALTER TABLE ONLY "public"."email_extractions"
    ADD CONSTRAINT "email_extractions_org_raw_email_key" UNIQUE ("organization_id", "raw_email_id");



ALTER TABLE ONLY "public"."email_extractions"
    ADD CONSTRAINT "email_extractions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_parse_log"
    ADD CONSTRAINT "email_parse_log_message_org_unique" UNIQUE ("message_id", "organization_id");



ALTER TABLE ONLY "public"."email_parse_log"
    ADD CONSTRAINT "email_parse_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_parser_cron_log"
    ADD CONSTRAINT "email_parser_cron_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expense_documents"
    ADD CONSTRAINT "expense_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_flag_audit"
    ADD CONSTRAINT "feature_flag_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_transactions"
    ADD CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."google_feed_logs"
    ADD CONSTRAINT "google_feed_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."google_merchant_sync_logs"
    ADD CONSTRAINT "google_merchant_sync_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."google_merchant_sync_status"
    ADD CONSTRAINT "google_merchant_sync_status_organization_id_property_id_key" UNIQUE ("organization_id", "property_id");



ALTER TABLE ONLY "public"."google_merchant_sync_status"
    ADD CONSTRAINT "google_merchant_sync_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_email_org_unique" UNIQUE ("email", "organization_id");



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."image_variants"
    ADD CONSTRAINT "image_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_analytics_config"
    ADD CONSTRAINT "organization_analytics_config_organization_id_key" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."organization_analytics_config"
    ADD CONSTRAINT "organization_analytics_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_branding"
    ADD CONSTRAINT "organization_branding_organization_id_key" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."organization_branding"
    ADD CONSTRAINT "organization_branding_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_financial_settings"
    ADD CONSTRAINT "organization_financial_settings_pkey" PRIMARY KEY ("organization_id");



ALTER TABLE ONLY "public"."organization_public_profile"
    ADD CONSTRAINT "organization_public_profile_pkey" PRIMARY KEY ("organization_id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."owners"
    ADD CONSTRAINT "owners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."payout_rule_components"
    ADD CONSTRAINT "payout_rule_components_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payout_rule_components"
    ADD CONSTRAINT "payout_rule_components_rule_component_key" UNIQUE ("organization_id", "payout_rule_id", "component_code");



ALTER TABLE ONLY "public"."platforms"
    ADD CONSTRAINT "platforms_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."platforms"
    ADD CONSTRAINT "platforms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pricing_rules"
    ADD CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_ical_export_token_key" UNIQUE ("ical_export_token");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_id_organization_key" UNIQUE ("id", "organization_id");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."property_amenities"
    ADD CONSTRAINT "property_amenities_pkey" PRIMARY KEY ("property_id", "amenity_id");



ALTER TABLE ONLY "public"."property_availability"
    ADD CONSTRAINT "property_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_availability"
    ADD CONSTRAINT "property_availability_property_id_key" UNIQUE ("property_id");



ALTER TABLE ONLY "public"."property_bathrooms"
    ADD CONSTRAINT "property_bathrooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_cancellation_policies"
    ADD CONSTRAINT "property_cancellation_policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_cancellation_policies"
    ADD CONSTRAINT "property_cancellation_policies_unique_type_duration" UNIQUE ("property_id", "policy_type", "is_long_stay");



ALTER TABLE ONLY "public"."property_cancellation_policy_periods"
    ADD CONSTRAINT "property_cancellation_policy_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_cancellation_policy_periods"
    ADD CONSTRAINT "property_cancellation_policy_periods_unique_range" UNIQUE ("property_id", "start_date", "end_date");



ALTER TABLE ONLY "public"."property_discounts"
    ADD CONSTRAINT "property_discounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_discounts"
    ADD CONSTRAINT "property_discounts_property_id_discount_type_key" UNIQUE ("property_id", "discount_type");



ALTER TABLE ONLY "public"."property_documents"
    ADD CONSTRAINT "property_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_fees"
    ADD CONSTRAINT "property_fees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_financial_parameters"
    ADD CONSTRAINT "property_financial_parameters_no_overlapping_validity" EXCLUDE USING "gist" ("organization_id" WITH =, "property_id" WITH =, "daterange"("valid_from", COALESCE(("valid_to" + 1), 'infinity'::"date"), '[)'::"text") WITH &&);



ALTER TABLE ONLY "public"."property_financial_parameters"
    ADD CONSTRAINT "property_financial_parameters_org_property_version_key" UNIQUE ("organization_id", "property_id", "version");



ALTER TABLE ONLY "public"."property_financial_parameters"
    ADD CONSTRAINT "property_financial_parameters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_images"
    ADD CONSTRAINT "property_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_listings"
    ADD CONSTRAINT "property_listings_id_organization_key" UNIQUE ("id", "organization_id");



ALTER TABLE ONLY "public"."property_listings"
    ADD CONSTRAINT "property_listings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_listings"
    ADD CONSTRAINT "property_listings_platform_id_external_listing_id_key" UNIQUE ("platform_id", "external_listing_id");



ALTER TABLE ONLY "public"."property_prices"
    ADD CONSTRAINT "property_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_prices"
    ADD CONSTRAINT "property_prices_property_id_key" UNIQUE ("property_id");



ALTER TABLE ONLY "public"."property_reviews"
    ADD CONSTRAINT "property_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_rooms"
    ADD CONSTRAINT "property_rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."raw_emails"
    ADD CONSTRAINT "raw_emails_id_organization_key" UNIQUE ("id", "organization_id");



ALTER TABLE ONLY "public"."raw_emails"
    ADD CONSTRAINT "raw_emails_org_provider_message_key" UNIQUE ("organization_id", "provider_message_id");



ALTER TABLE ONLY "public"."raw_emails"
    ADD CONSTRAINT "raw_emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."regras_repasse"
    ADD CONSTRAINT "regras_repasse_id_organization_key" UNIQUE ("id", "organization_id");



ALTER TABLE ONLY "public"."regras_repasse"
    ADD CONSTRAINT "regras_repasse_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."regras_repasse"
    ADD CONSTRAINT "regras_repasse_vigencias_sem_sobreposicao" EXCLUDE USING "gist" ("organization_id" WITH =, "propriedade_id" WITH =, "daterange"("vigencia_inicio", COALESCE(("vigencia_fim" + 1), 'infinity'::"date"), '[)'::"text") WITH &&);



ALTER TABLE ONLY "public"."reservation_conflicts"
    ADD CONSTRAINT "reservation_conflicts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservation_financial_snapshots"
    ADD CONSTRAINT "reservation_financial_snapshots_id_org_key" UNIQUE ("id", "organization_id");



ALTER TABLE ONLY "public"."reservation_financial_snapshots"
    ADD CONSTRAINT "reservation_financial_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservation_financial_snapshots"
    ADD CONSTRAINT "reservation_financial_snapshots_reservation_version_key" UNIQUE ("organization_id", "reservation_id", "version");



ALTER TABLE ONLY "public"."reservation_matches"
    ADD CONSTRAINT "reservation_matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservation_org_backfill_20260719"
    ADD CONSTRAINT "reservation_org_backfill_20260719_pkey" PRIMARY KEY ("reservation_id");



ALTER TABLE ONLY "public"."reservation_sources"
    ADD CONSTRAINT "reservation_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_id_property_organization_key" UNIQUE ("id", "property_id", "organization_id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_organization_id_channel_connection_id_external_key" UNIQUE ("organization_id", "channel_connection_id", "external_reservation_id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sync_logs"
    ADD CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_history"
    ADD CONSTRAINT "task_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_prices"
    ADD CONSTRAINT "unique_property_date" UNIQUE ("property_id", "date");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "unique_reservation_per_channel" UNIQUE ("organization_id", "external_reservation_id", "channel_connection_id");



ALTER TABLE ONLY "public"."image_variants"
    ADD CONSTRAINT "unique_variant" UNIQUE ("property_image_id", "variant_type", "format");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_properties"
    ADD CONSTRAINT "user_properties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_properties"
    ADD CONSTRAINT "user_properties_user_id_property_id_key" UNIQUE ("user_id", "property_id");



CREATE INDEX "channel_payout_allocation_components_allocation_org_fk_idx" ON "public"."channel_payout_allocation_components" USING "btree" ("allocation_id", "organization_id");



CREATE UNIQUE INDEX "channel_payout_allocations_external_reference_key" ON "public"."channel_payout_allocations" USING "btree" ("organization_id", "payout_id", "external_allocation_id") WHERE ("external_allocation_id" IS NOT NULL);



CREATE INDEX "channel_payout_allocations_payout_org_currency_fk_idx" ON "public"."channel_payout_allocations" USING "btree" ("payout_id", "organization_id", "currency");



CREATE INDEX "channel_payout_allocations_property_org_fk_idx" ON "public"."channel_payout_allocations" USING "btree" ("property_id", "organization_id");



CREATE INDEX "channel_payout_allocations_reservation_lookup" ON "public"."channel_payout_allocations" USING "btree" ("organization_id", "property_id", "reservation_id");



CREATE INDEX "channel_payout_allocations_reservation_org_fk_idx" ON "public"."channel_payout_allocations" USING "btree" ("reservation_id", "property_id", "organization_id");



CREATE INDEX "channel_payouts_created_by_fk_idx" ON "public"."channel_payouts" USING "btree" ("created_by") WHERE ("created_by" IS NOT NULL);



CREATE UNIQUE INDEX "channel_payouts_external_reference_key" ON "public"."channel_payouts" USING "btree" ("organization_id", "provider", "external_payout_id") WHERE ("external_payout_id" IS NOT NULL);



CREATE INDEX "channel_payouts_org_date" ON "public"."channel_payouts" USING "btree" ("organization_id", "payout_at" DESC);



CREATE INDEX "idx_access_tokens_hash" ON "public"."cleaner_access_tokens" USING "btree" ("token_hash");



CREATE INDEX "idx_analytics_config_audit_log_created_at" ON "public"."analytics_config_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_analytics_config_audit_log_organization_id" ON "public"."analytics_config_audit_log" USING "btree" ("organization_id");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_resource" ON "public"."audit_logs" USING "btree" ("resource_type", "resource_id");



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_calendar_blocks_dates" ON "public"."calendar_blocks" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_calendar_blocks_external_uid" ON "public"."calendar_blocks" USING "btree" ("external_uid");



CREATE UNIQUE INDEX "idx_calendar_blocks_feed_uid_unique" ON "public"."calendar_blocks" USING "btree" ("organization_id", "property_listing_id", "external_uid");



CREATE INDEX "idx_calendar_blocks_listing_external_uid" ON "public"."calendar_blocks" USING "btree" ("property_listing_id", "external_uid") WHERE (("property_listing_id" IS NOT NULL) AND ("external_uid" IS NOT NULL));



CREATE INDEX "idx_calendar_blocks_org" ON "public"."calendar_blocks" USING "btree" ("organization_id");



CREATE INDEX "idx_calendar_blocks_property" ON "public"."calendar_blocks" USING "btree" ("property_id");



CREATE INDEX "idx_calendar_events_listing_org_fk" ON "public"."calendar_events" USING "btree" ("property_listing_id", "organization_id");



CREATE INDEX "idx_calendar_events_org_status_dates" ON "public"."calendar_events" USING "btree" ("organization_id", "status", "check_in", "check_out");



CREATE INDEX "idx_calendar_events_property_org_fk" ON "public"."calendar_events" USING "btree" ("property_id", "organization_id");



CREATE INDEX "idx_calendar_events_reservation_org_fk" ON "public"."calendar_events" USING "btree" ("reservation_id", "organization_id");



CREATE UNIQUE INDEX "idx_calendar_events_reservation_unique" ON "public"."calendar_events" USING "btree" ("organization_id", "reservation_id") WHERE ("reservation_id" IS NOT NULL);



CREATE INDEX "idx_calendar_view" ON "public"."reservations" USING "btree" ("organization_id", "property_id", "check_in", "check_out") WHERE (("reservation_status" <> 'cancelled'::"text") AND ("deleted_at" IS NULL));



CREATE INDEX "idx_cancellation_policy_periods_lookup" ON "public"."property_cancellation_policy_periods" USING "btree" ("property_id", "start_date", "end_date");



CREATE INDEX "idx_cleaner_tokens_cleaner" ON "public"."cleaner_access_tokens" USING "btree" ("cleaner_id");



CREATE INDEX "idx_cleaner_tokens_expires" ON "public"."cleaner_access_tokens" USING "btree" ("expires_at");



CREATE INDEX "idx_cleaner_tokens_hash" ON "public"."cleaner_access_tokens" USING "btree" ("token_hash");



CREATE INDEX "idx_cleaner_tokens_org_id" ON "public"."cleaner_access_tokens" USING "btree" ("organization_id");



CREATE INDEX "idx_cleaning_checklist_items_template_id" ON "public"."cleaning_checklist_items" USING "btree" ("template_id");



CREATE INDEX "idx_cleaning_checklist_responses_task_id" ON "public"."cleaning_checklist_responses" USING "btree" ("task_id");



CREATE INDEX "idx_cleaning_checklist_templates_organization_id" ON "public"."cleaning_checklist_templates" USING "btree" ("organization_id");



CREATE INDEX "idx_cleaning_checklists_assigned" ON "public"."cleaning_checklists" USING "btree" ("assigned_to");



CREATE INDEX "idx_cleaning_checklists_date" ON "public"."cleaning_checklists" USING "btree" ("scheduled_date");



CREATE INDEX "idx_cleaning_checklists_property" ON "public"."cleaning_checklists" USING "btree" ("property_id");



CREATE INDEX "idx_cleaning_checklists_status" ON "public"."cleaning_checklists" USING "btree" ("status");



CREATE INDEX "idx_cleaning_items_template" ON "public"."cleaning_checklist_items" USING "btree" ("template_id");



CREATE INDEX "idx_cleaning_photos_task" ON "public"."cleaning_photos" USING "btree" ("task_id");



CREATE INDEX "idx_cleaning_photos_task_id" ON "public"."cleaning_photos" USING "btree" ("task_id");



CREATE INDEX "idx_cleaning_responses_task" ON "public"."cleaning_checklist_responses" USING "btree" ("task_id");



CREATE INDEX "idx_cleaning_responses_task_id" ON "public"."cleaning_checklist_responses" USING "btree" ("task_id");



CREATE INDEX "idx_cleaning_tasks_org_id_status" ON "public"."cleaning_tasks" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_cleaning_tasks_org_property" ON "public"."cleaning_tasks" USING "btree" ("organization_id", "property_id");



CREATE INDEX "idx_cleaning_tasks_status" ON "public"."cleaning_tasks" USING "btree" ("status");



CREATE INDEX "idx_cleaning_templates_org" ON "public"."cleaning_checklist_templates" USING "btree" ("organization_id");



CREATE INDEX "idx_company_expenses_org_category" ON "public"."company_expenses" USING "btree" ("organization_id", "category");



CREATE INDEX "idx_company_expenses_org_date" ON "public"."company_expenses" USING "btree" ("organization_id", "expense_date" DESC);



CREATE INDEX "idx_company_expenses_org_status" ON "public"."company_expenses" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_conflicts_pending" ON "public"."reservation_conflicts" USING "btree" ("organization_id", "resolution_status", "severity", "created_at") WHERE (("resolution_status" = 'pending'::"text") AND ("deleted_at" IS NULL));



CREATE INDEX "idx_conflicts_time_series" ON "public"."reservation_conflicts" USING "btree" ("organization_id", "created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_consent_records_org" ON "public"."consent_records" USING "btree" ("organization_id");



CREATE INDEX "idx_consent_records_type" ON "public"."consent_records" USING "btree" ("consent_type", "created_at" DESC);



CREATE INDEX "idx_consent_records_user" ON "public"."consent_records" USING "btree" ("user_id");



CREATE INDEX "idx_daily_prices_property_date" ON "public"."daily_prices" USING "btree" ("property_id", "date");



CREATE INDEX "idx_date_range_queries" ON "public"."reservations" USING "btree" ("organization_id", "check_in", "check_out") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "idx_dedup" ON "public"."reservations" USING "btree" ("channel_connection_id", "external_reservation_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_deletion_requests_org" ON "public"."deletion_requests" USING "btree" ("organization_id");



CREATE INDEX "idx_deletion_requests_status" ON "public"."deletion_requests" USING "btree" ("status", "scheduled_at");



CREATE INDEX "idx_deletion_requests_user" ON "public"."deletion_requests" USING "btree" ("user_id");



CREATE INDEX "idx_email_connections_org" ON "public"."email_connections" USING "btree" ("organization_id");



CREATE INDEX "idx_email_extractions_event_org_fk" ON "public"."email_extractions" USING "btree" ("matched_event_id", "organization_id");



CREATE UNIQUE INDEX "idx_email_extractions_event_unique" ON "public"."email_extractions" USING "btree" ("organization_id", "matched_event_id") WHERE ("matched_event_id" IS NOT NULL);



CREATE INDEX "idx_email_extractions_org_status_dates" ON "public"."email_extractions" USING "btree" ("organization_id", "match_status", "check_in", "check_out");



CREATE INDEX "idx_email_extractions_phone" ON "public"."email_extractions" USING "btree" ("phone") WHERE ("phone" IS NOT NULL);



CREATE INDEX "idx_email_extractions_property_trgm" ON "public"."email_extractions" USING "gin" ("property_identifier_raw" "extensions"."gin_trgm_ops") WHERE ("property_identifier_raw" IS NOT NULL);



CREATE INDEX "idx_email_extractions_raw_email_org_fk" ON "public"."email_extractions" USING "btree" ("raw_email_id", "organization_id");



CREATE INDEX "idx_email_parse_log_cancellation" ON "public"."email_parse_log" USING "btree" ("is_cancellation");



CREATE INDEX "idx_email_parse_log_created" ON "public"."email_parse_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_email_parse_log_matched_res" ON "public"."email_parse_log" USING "btree" ("matched_reservation_id");



CREATE INDEX "idx_email_parse_log_org" ON "public"."email_parse_log" USING "btree" ("organization_id");



CREATE INDEX "idx_email_parse_log_property" ON "public"."email_parse_log" USING "btree" ("property_id");



CREATE INDEX "idx_email_parse_log_status" ON "public"."email_parse_log" USING "btree" ("status");



CREATE INDEX "idx_enrich_queue" ON "public"."reservations" USING "btree" ("organization_id", "needs_enrichment", "next_enrichment_at") WHERE (("needs_enrichment" = true) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_expenses_category" ON "public"."expenses" USING "btree" ("category");



CREATE INDEX "idx_expenses_currency" ON "public"."expenses" USING "btree" ("currency");



CREATE INDEX "idx_expenses_date" ON "public"."expenses" USING "btree" ("expense_date");



CREATE INDEX "idx_expenses_organization_id" ON "public"."expenses" USING "btree" ("organization_id");



CREATE INDEX "idx_expenses_property_id" ON "public"."expenses" USING "btree" ("property_id");



CREATE INDEX "idx_feature_flag_audit_org_feature" ON "public"."feature_flag_audit" USING "btree" ("organization_id", "feature");



CREATE INDEX "idx_google_feed_logs_created_at" ON "public"."google_feed_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_google_feed_logs_organization_id" ON "public"."google_feed_logs" USING "btree" ("organization_id");



CREATE INDEX "idx_google_feed_logs_organization_id_timestamp" ON "public"."google_feed_logs" USING "btree" ("organization_id", "timestamp" DESC);



CREATE INDEX "idx_google_feed_logs_property_id_timestamp" ON "public"."google_feed_logs" USING "btree" ("property_id", "timestamp" DESC);



CREATE INDEX "idx_google_merchant_sync_logs_created_at" ON "public"."google_merchant_sync_logs" USING "btree" ("created_at");



CREATE INDEX "idx_google_merchant_sync_logs_org_id" ON "public"."google_merchant_sync_logs" USING "btree" ("organization_id");



CREATE INDEX "idx_google_merchant_sync_status_org_id" ON "public"."google_merchant_sync_status" USING "btree" ("organization_id");



CREATE INDEX "idx_google_merchant_sync_status_prop_id" ON "public"."google_merchant_sync_status" USING "btree" ("property_id");



CREATE INDEX "idx_guests_email" ON "public"."guests" USING "btree" ("email");



CREATE INDEX "idx_guests_email_organization" ON "public"."guests" USING "btree" ("email", "organization_id");



CREATE INDEX "idx_guests_organization_id" ON "public"."guests" USING "btree" ("organization_id");



CREATE INDEX "idx_guests_phone_organization" ON "public"."guests" USING "btree" ("phone", "organization_id") WHERE ("phone" IS NOT NULL);



CREATE INDEX "idx_image_variants_property_image" ON "public"."image_variants" USING "btree" ("property_image_id", "variant_type", "format");



CREATE INDEX "idx_image_variants_property_image_id" ON "public"."image_variants" USING "btree" ("property_image_id");



CREATE INDEX "idx_org_channel_sync_status" ON "public"."reservations" USING "btree" ("organization_id", "channel_connection_id", "sync_health") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_organization_analytics_config_deleted_at" ON "public"."organization_analytics_config" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_organization_analytics_config_organization_id" ON "public"."organization_analytics_config" USING "btree" ("organization_id");



CREATE INDEX "idx_organization_branding_org_id" ON "public"."organization_branding" USING "btree" ("organization_id");



CREATE INDEX "idx_organizations_email_ical_enabled" ON "public"."organizations" USING "btree" ("email_ical_reconciliation_enabled");



CREATE INDEX "idx_owners_email" ON "public"."owners" USING "btree" ("email");



CREATE INDEX "idx_owners_is_active" ON "public"."owners" USING "btree" ("is_active");



CREATE INDEX "idx_owners_organization_id" ON "public"."owners" USING "btree" ("organization_id");



CREATE INDEX "idx_owners_user_id" ON "public"."owners" USING "btree" ("user_id");



CREATE INDEX "idx_password_reset_tokens_expires_at" ON "public"."password_reset_tokens" USING "btree" ("expires_at");



CREATE INDEX "idx_password_reset_tokens_token" ON "public"."password_reset_tokens" USING "btree" ("token");



CREATE INDEX "idx_password_reset_tokens_user_id" ON "public"."password_reset_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_pricing_rules_dates" ON "public"."pricing_rules" USING "btree" ("property_id", "start_date", "end_date");



CREATE INDEX "idx_pricing_rules_property_id" ON "public"."pricing_rules" USING "btree" ("property_id");



CREATE INDEX "idx_properties_currency" ON "public"."properties" USING "btree" ("currency");



CREATE INDEX "idx_properties_ical_export_token" ON "public"."properties" USING "btree" ("ical_export_token") WHERE ("ical_export_token" IS NOT NULL);



CREATE INDEX "idx_properties_is_public" ON "public"."properties" USING "btree" ("is_public");



CREATE INDEX "idx_properties_management_percentage" ON "public"."properties" USING "btree" ("management_percentage");



CREATE INDEX "idx_properties_organization_active_count" ON "public"."properties" USING "btree" ("organization_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_properties_organization_id" ON "public"."properties" USING "btree" ("organization_id");



CREATE INDEX "idx_properties_owner_id" ON "public"."properties" USING "btree" ("owner_id");



CREATE INDEX "idx_properties_slug" ON "public"."properties" USING "btree" ("slug");



CREATE INDEX "idx_property_amenities_amenity_id" ON "public"."property_amenities" USING "btree" ("amenity_id");



CREATE INDEX "idx_property_availability_property_id" ON "public"."property_availability" USING "btree" ("property_id");



CREATE INDEX "idx_property_bathrooms_property_id" ON "public"."property_bathrooms" USING "btree" ("property_id");



CREATE INDEX "idx_property_cancellation_policies_property_id" ON "public"."property_cancellation_policies" USING "btree" ("property_id");



CREATE INDEX "idx_property_cancellation_policies_type_duration" ON "public"."property_cancellation_policies" USING "btree" ("property_id", "policy_type", "is_long_stay");



CREATE INDEX "idx_property_discounts_property_id" ON "public"."property_discounts" USING "btree" ("property_id");



CREATE INDEX "idx_property_discounts_type" ON "public"."property_discounts" USING "btree" ("property_id", "discount_type");



CREATE INDEX "idx_property_documents_property_id" ON "public"."property_documents" USING "btree" ("property_id");



CREATE INDEX "idx_property_fees_property_id" ON "public"."property_fees" USING "btree" ("property_id");



CREATE UNIQUE INDEX "idx_property_images_one_primary_per_property" ON "public"."property_images" USING "btree" ("property_id") WHERE ("is_primary" = true);



CREATE INDEX "idx_property_images_org_property" ON "public"."property_images" USING "btree" ("organization_id", "property_id");



CREATE INDEX "idx_property_images_primary" ON "public"."property_images" USING "btree" ("property_id") WHERE ("is_primary" = true);



CREATE INDEX "idx_property_images_property_order" ON "public"."property_images" USING "btree" ("property_id", "display_order") WHERE ("is_primary" = false);



CREATE INDEX "idx_property_listings_organization_id" ON "public"."property_listings" USING "btree" ("organization_id");



CREATE INDEX "idx_property_listings_property_id" ON "public"."property_listings" USING "btree" ("property_id");



CREATE INDEX "idx_property_listings_property_organization" ON "public"."property_listings" USING "btree" ("property_id", "organization_id");



CREATE INDEX "idx_property_listings_sync_error" ON "public"."property_listings" USING "btree" ("sync_error_count" DESC) WHERE (("sync_enabled" = true) AND ("sync_error_count" > 0));



CREATE INDEX "idx_property_prices_property_id" ON "public"."property_prices" USING "btree" ("property_id");



CREATE INDEX "idx_property_reviews_org_id" ON "public"."property_reviews" USING "btree" ("organization_id");



CREATE INDEX "idx_property_reviews_property_featured" ON "public"."property_reviews" USING "btree" ("property_id", "is_featured");



CREATE INDEX "idx_property_rooms_property_id" ON "public"."property_rooms" USING "btree" ("property_id");



CREATE INDEX "idx_raw_emails_org_status_received" ON "public"."raw_emails" USING "btree" ("organization_id", "processing_status", "received_at", "id");



CREATE INDEX "idx_raw_emails_organization_id" ON "public"."raw_emails" USING "btree" ("organization_id");



CREATE INDEX "idx_reservations_booking_reference" ON "public"."reservations" USING "btree" ("booking_source", "booking_reference") WHERE ("booking_reference" IS NOT NULL);



CREATE INDEX "idx_reservations_calendar_event_org_fk" ON "public"."reservations" USING "btree" ("calendar_event_id", "organization_id");



CREATE INDEX "idx_reservations_email_extraction_org_fk" ON "public"."reservations" USING "btree" ("email_extraction_id", "organization_id");



CREATE INDEX "idx_reservations_legacy_property_dates" ON "public"."reservations" USING "btree" ("property_id", "check_in", "check_out") WHERE (("status")::"text" IS DISTINCT FROM 'cancelled'::"text");



CREATE INDEX "idx_reservations_listing" ON "public"."reservations" USING "btree" ("property_listing_id");



CREATE INDEX "idx_reservations_property_organization" ON "public"."reservations" USING "btree" ("property_id", "organization_id");



CREATE INDEX "idx_reservations_status" ON "public"."reservations" USING "btree" ("status");



CREATE INDEX "idx_sync_health" ON "public"."reservations" USING "btree" ("organization_id", "sync_health", "last_sync_at") WHERE (("sync_health" = ANY (ARRAY['degraded'::"text", 'error'::"text"])) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_sync_logs_listing_date" ON "public"."sync_logs" USING "btree" ("property_listing_id", "synced_at" DESC);



CREATE INDEX "idx_sync_logs_property_listing_direction" ON "public"."sync_logs" USING "btree" ("property_listing_id", "direction", "synced_at");



CREATE INDEX "idx_sync_logs_reservation_id" ON "public"."sync_logs" USING "btree" ("reservation_id");



CREATE INDEX "idx_sync_worker" ON "public"."reservations" USING "btree" ("organization_id", "completeness_status", "next_enrichment_at") WHERE (("completeness_status" = ANY (ARRAY['minimal'::"text", 'partial'::"text", 'enrichment_pending'::"text"])) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_task_history_changed_at" ON "public"."task_history" USING "btree" ("changed_at" DESC);



CREATE INDEX "idx_task_history_changed_by" ON "public"."task_history" USING "btree" ("changed_by");



CREATE INDEX "idx_task_history_organization_id" ON "public"."task_history" USING "btree" ("organization_id");



CREATE INDEX "idx_task_history_task_id" ON "public"."task_history" USING "btree" ("task_id");



CREATE INDEX "idx_transactions_property_date" ON "public"."financial_transactions" USING "btree" ("property_id", "transaction_date" DESC);



CREATE INDEX "idx_user_profiles_cleaner_type" ON "public"."user_profiles" USING "btree" ("organization_id", "guest_type") WHERE ("guest_type" = 'cleaner'::"text");



CREATE INDEX "idx_user_profiles_email" ON "public"."user_profiles" USING "btree" ("email");



CREATE INDEX "idx_user_profiles_organization_id" ON "public"."user_profiles" USING "btree" ("organization_id");



CREATE INDEX "idx_user_profiles_password_reset_required" ON "public"."user_profiles" USING "btree" ("password_reset_required") WHERE ("password_reset_required" = true);



CREATE INDEX "idx_user_profiles_phone" ON "public"."user_profiles" USING "btree" ("phone_number") WHERE ("phone_number" IS NOT NULL);



CREATE INDEX "idx_user_profiles_role" ON "public"."user_profiles" USING "btree" ("role");



CREATE INDEX "idx_user_profiles_whatsapp_consent" ON "public"."user_profiles" USING "btree" ("organization_id", "accepts_whatsapp") WHERE ("accepts_whatsapp" = true);



CREATE INDEX "idx_user_properties_property_id" ON "public"."user_properties" USING "btree" ("property_id");



CREATE INDEX "idx_user_properties_user_id" ON "public"."user_properties" USING "btree" ("user_id");



CREATE INDEX "payout_rule_components_rule_org_fk_idx" ON "public"."payout_rule_components" USING "btree" ("payout_rule_id", "organization_id");



CREATE INDEX "property_financial_parameters_created_by_fk" ON "public"."property_financial_parameters" USING "btree" ("created_by") WHERE ("created_by" IS NOT NULL);



CREATE INDEX "property_financial_parameters_history_lookup" ON "public"."property_financial_parameters" USING "btree" ("organization_id", "property_id", "valid_from" DESC);



CREATE UNIQUE INDEX "property_financial_parameters_one_current" ON "public"."property_financial_parameters" USING "btree" ("organization_id", "property_id") WHERE ("valid_to" IS NULL);



CREATE INDEX "property_financial_parameters_property_fk" ON "public"."property_financial_parameters" USING "btree" ("property_id", "organization_id");



CREATE INDEX "regras_repasse_historico_lookup" ON "public"."regras_repasse" USING "btree" ("propriedade_id", "organization_id", "vigencia_inicio" DESC);



CREATE UNIQUE INDEX "regras_repasse_uma_vigente_por_propriedade" ON "public"."regras_repasse" USING "btree" ("organization_id", "propriedade_id") WHERE ("vigencia_fim" IS NULL);



CREATE INDEX "reservation_financial_snapshots_created_by_fk_idx" ON "public"."reservation_financial_snapshots" USING "btree" ("created_by") WHERE ("created_by" IS NOT NULL);



CREATE UNIQUE INDEX "reservation_financial_snapshots_one_current" ON "public"."reservation_financial_snapshots" USING "btree" ("organization_id", "reservation_id") WHERE ("superseded_at" IS NULL);



CREATE INDEX "reservation_financial_snapshots_property_org_fk_idx" ON "public"."reservation_financial_snapshots" USING "btree" ("property_id", "organization_id");



CREATE INDEX "reservation_financial_snapshots_property_period" ON "public"."reservation_financial_snapshots" USING "btree" ("organization_id", "property_id", "captured_at" DESC);



CREATE INDEX "reservation_financial_snapshots_reservation_org_fk_idx" ON "public"."reservation_financial_snapshots" USING "btree" ("reservation_id", "property_id", "organization_id");



CREATE OR REPLACE TRIGGER "bridge_legacy_reservation_write_trigger" BEFORE INSERT OR UPDATE ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."bridge_legacy_reservation_write"();



CREATE OR REPLACE TRIGGER "channel_payouts_touch_updated_at" BEFORE UPDATE ON "public"."channel_payouts" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "check_property_limit_trigger" BEFORE INSERT ON "public"."properties" FOR EACH ROW EXECUTE FUNCTION "public"."check_property_limit"();



CREATE OR REPLACE TRIGGER "company_expenses_updated_at_trigger" BEFORE UPDATE ON "public"."company_expenses" FOR EACH ROW EXECUTE FUNCTION "public"."update_company_expenses_updated_at"();



CREATE OR REPLACE TRIGGER "on_manager_created" AFTER INSERT ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_manager_created"();



CREATE OR REPLACE TRIGGER "organization_financial_settings_touch_updated_at" BEFORE UPDATE ON "public"."organization_financial_settings" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "prevent_unversioned_property_financial_parameter_mutation" BEFORE DELETE OR UPDATE ON "public"."property_financial_parameters" FOR EACH ROW EXECUTE FUNCTION "lodgra_private"."prevent_unversioned_property_financial_parameter_mutation"();



CREATE OR REPLACE TRIGGER "prevent_unversioned_v2_rule_mutation" BEFORE DELETE OR UPDATE ON "public"."regras_repasse" FOR EACH ROW EXECUTE FUNCTION "lodgra_private"."prevent_unversioned_v2_rule_closure"();



CREATE OR REPLACE TRIGGER "regras_repasse_touch_updated_at" BEFORE UPDATE ON "public"."regras_repasse" FOR EACH ROW EXECUTE FUNCTION "public"."touch_regras_repasse_updated_at"();



CREATE OR REPLACE TRIGGER "reservations_prevent_active_overlap" BEFORE INSERT OR UPDATE OF "property_id", "check_in", "check_out", "status" ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_active_reservation_overlap"();



CREATE OR REPLACE TRIGGER "reservations_protect_declared_financial_total" BEFORE UPDATE OF "total_amount", "property_id", "organization_id", "currency", "booking_source" ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "lodgra_private"."protect_declared_reservation_total"();



CREATE OR REPLACE TRIGGER "set_token_org_id" BEFORE INSERT ON "public"."cleaner_access_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."set_cleaner_token_org_id"();



CREATE OR REPLACE TRIGGER "trg_consent_records_set_org" BEFORE INSERT ON "public"."consent_records" FOR EACH ROW EXECUTE FUNCTION "public"."set_compliance_organization_id"();



CREATE OR REPLACE TRIGGER "trg_deletion_requests_set_org" BEFORE INSERT ON "public"."deletion_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_compliance_organization_id"();



CREATE OR REPLACE TRIGGER "trg_property_images_immutable_fields" BEFORE UPDATE ON "public"."property_images" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_property_images_immutable_field_changes"();



CREATE OR REPLACE TRIGGER "trigger_owners_updated_at" BEFORE UPDATE ON "public"."owners" FOR EACH ROW EXECUTE FUNCTION "public"."update_owners_updated_at"();



CREATE OR REPLACE TRIGGER "update_calendar_blocks_updated_at" BEFORE UPDATE ON "public"."calendar_blocks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_daily_prices_updated_at_trigger" BEFORE UPDATE ON "public"."daily_prices" FOR EACH ROW EXECUTE FUNCTION "public"."update_daily_prices_updated_at"();



CREATE OR REPLACE TRIGGER "update_guests_updated_at" BEFORE UPDATE ON "public"."guests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_properties_updated_at" BEFORE UPDATE ON "public"."properties" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_property_listings_updated_at" BEFORE UPDATE ON "public"."property_listings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."availability_blocks"
    ADD CONSTRAINT "availability_blocks_channel_connection_id_fkey" FOREIGN KEY ("channel_connection_id") REFERENCES "public"."channel_connections"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."calendar_blocks"
    ADD CONSTRAINT "calendar_blocks_blocked_by_fkey" FOREIGN KEY ("blocked_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."calendar_blocks"
    ADD CONSTRAINT "calendar_blocks_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_blocks"
    ADD CONSTRAINT "calendar_blocks_property_listing_id_fkey" FOREIGN KEY ("property_listing_id") REFERENCES "public"."property_listings"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_listing_org_fk" FOREIGN KEY ("property_listing_id", "organization_id") REFERENCES "public"."property_listings"("id", "organization_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_property_org_fk" FOREIGN KEY ("property_id", "organization_id") REFERENCES "public"."properties"("id", "organization_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."channel_listing_mappings"
    ADD CONSTRAINT "channel_listing_mappings_channel_connection_id_fkey" FOREIGN KEY ("channel_connection_id") REFERENCES "public"."channel_connections"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."channel_payout_allocation_components"
    ADD CONSTRAINT "channel_payout_allocation_components_allocation_org_fk" FOREIGN KEY ("allocation_id", "organization_id") REFERENCES "public"."channel_payout_allocations"("id", "organization_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channel_payout_allocation_components"
    ADD CONSTRAINT "channel_payout_allocation_components_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channel_payout_allocations"
    ADD CONSTRAINT "channel_payout_allocations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channel_payout_allocations"
    ADD CONSTRAINT "channel_payout_allocations_payout_org_currency_fk" FOREIGN KEY ("payout_id", "organization_id", "currency") REFERENCES "public"."channel_payouts"("id", "organization_id", "currency") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channel_payout_allocations"
    ADD CONSTRAINT "channel_payout_allocations_property_org_fk" FOREIGN KEY ("property_id", "organization_id") REFERENCES "public"."properties"("id", "organization_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."channel_payout_allocations"
    ADD CONSTRAINT "channel_payout_allocations_reservation_org_fk" FOREIGN KEY ("reservation_id", "property_id", "organization_id") REFERENCES "public"."reservations"("id", "property_id", "organization_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."channel_payouts"
    ADD CONSTRAINT "channel_payouts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."channel_payouts"
    ADD CONSTRAINT "channel_payouts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cleaner_access_tokens"
    ADD CONSTRAINT "cleaner_access_tokens_cleaner_id_fkey" FOREIGN KEY ("cleaner_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cleaning_checklist_items"
    ADD CONSTRAINT "cleaning_checklist_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."cleaning_checklist_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cleaning_checklist_responses"
    ADD CONSTRAINT "cleaning_checklist_responses_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."cleaning_checklist_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cleaning_checklist_responses"
    ADD CONSTRAINT "cleaning_checklist_responses_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."cleaning_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cleaning_checklist_templates"
    ADD CONSTRAINT "cleaning_checklist_templates_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cleaning_checklists"
    ADD CONSTRAINT "cleaning_checklists_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cleaning_checklists"
    ADD CONSTRAINT "cleaning_checklists_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cleaning_photos"
    ADD CONSTRAINT "cleaning_photos_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."cleaning_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cleaning_photos"
    ADD CONSTRAINT "cleaning_photos_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cleaning_tasks"
    ADD CONSTRAINT "cleaning_tasks_checklist_template_id_fkey" FOREIGN KEY ("checklist_template_id") REFERENCES "public"."cleaning_checklist_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cleaning_tasks"
    ADD CONSTRAINT "cleaning_tasks_cleaner_id_fkey" FOREIGN KEY ("cleaner_id") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cleaning_tasks"
    ADD CONSTRAINT "cleaning_tasks_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cleaning_templates"
    ADD CONSTRAINT "cleaning_templates_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_expenses"
    ADD CONSTRAINT "company_expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consent_records"
    ADD CONSTRAINT "consent_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."daily_prices"
    ADD CONSTRAINT "daily_prices_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deletion_requests"
    ADD CONSTRAINT "deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."email_extractions"
    ADD CONSTRAINT "email_extractions_event_org_fk" FOREIGN KEY ("matched_event_id", "organization_id") REFERENCES "public"."calendar_events"("id", "organization_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."email_extractions"
    ADD CONSTRAINT "email_extractions_raw_email_org_fk" FOREIGN KEY ("raw_email_id", "organization_id") REFERENCES "public"."raw_emails"("id", "organization_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."email_parse_log"
    ADD CONSTRAINT "email_parse_log_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."expense_documents"
    ADD CONSTRAINT "expense_documents_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_flag_audit"
    ADD CONSTRAINT "feature_flag_audit_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financial_transactions"
    ADD CONSTRAINT "financial_transactions_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."image_variants"
    ADD CONSTRAINT "fk_image" FOREIGN KEY ("property_image_id") REFERENCES "public"."property_images"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_images"
    ADD CONSTRAINT "fk_property" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "fk_reservations_property_id" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."property_images"
    ADD CONSTRAINT "fk_uploader" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."google_feed_logs"
    ADD CONSTRAINT "google_feed_logs_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."google_merchant_sync_status"
    ADD CONSTRAINT "google_merchant_sync_status_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."image_variants"
    ADD CONSTRAINT "image_variants_property_image_id_fkey" FOREIGN KEY ("property_image_id") REFERENCES "public"."property_images"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_financial_settings"
    ADD CONSTRAINT "organization_financial_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."owners"
    ADD CONSTRAINT "owners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payout_rule_components"
    ADD CONSTRAINT "payout_rule_components_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payout_rule_components"
    ADD CONSTRAINT "payout_rule_components_rule_org_fk" FOREIGN KEY ("payout_rule_id", "organization_id") REFERENCES "public"."regras_repasse"("id", "organization_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pricing_rules"
    ADD CONSTRAINT "pricing_rules_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."property_amenities"
    ADD CONSTRAINT "property_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "public"."amenities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_amenities"
    ADD CONSTRAINT "property_amenities_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_availability"
    ADD CONSTRAINT "property_availability_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_bathrooms"
    ADD CONSTRAINT "property_bathrooms_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_cancellation_policies"
    ADD CONSTRAINT "property_cancellation_policies_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_cancellation_policy_periods"
    ADD CONSTRAINT "property_cancellation_policy_periods_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "public"."property_cancellation_policies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_cancellation_policy_periods"
    ADD CONSTRAINT "property_cancellation_policy_periods_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_discounts"
    ADD CONSTRAINT "property_discounts_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_documents"
    ADD CONSTRAINT "property_documents_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_fees"
    ADD CONSTRAINT "property_fees_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_financial_parameters"
    ADD CONSTRAINT "property_financial_parameters_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."property_financial_parameters"
    ADD CONSTRAINT "property_financial_parameters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_financial_parameters"
    ADD CONSTRAINT "property_financial_parameters_property_org_fk" FOREIGN KEY ("property_id", "organization_id") REFERENCES "public"."properties"("id", "organization_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_images"
    ADD CONSTRAINT "property_images_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_images"
    ADD CONSTRAINT "property_images_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."property_listings"
    ADD CONSTRAINT "property_listings_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_listings"
    ADD CONSTRAINT "property_listings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_listings"
    ADD CONSTRAINT "property_listings_property_org_fk" FOREIGN KEY ("property_id", "organization_id") REFERENCES "public"."properties"("id", "organization_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_prices"
    ADD CONSTRAINT "property_prices_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_reviews"
    ADD CONSTRAINT "property_reviews_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_rooms"
    ADD CONSTRAINT "property_rooms_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."regras_repasse"
    ADD CONSTRAINT "regras_repasse_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."regras_repasse"
    ADD CONSTRAINT "regras_repasse_property_org_fk" FOREIGN KEY ("propriedade_id", "organization_id") REFERENCES "public"."properties"("id", "organization_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation_conflicts"
    ADD CONSTRAINT "reservation_conflicts_reservation_id_1_fkey" FOREIGN KEY ("reservation_id_1") REFERENCES "public"."reservations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reservation_conflicts"
    ADD CONSTRAINT "reservation_conflicts_reservation_id_2_fkey" FOREIGN KEY ("reservation_id_2") REFERENCES "public"."reservations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reservation_financial_snapshots"
    ADD CONSTRAINT "reservation_financial_snapshots_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reservation_financial_snapshots"
    ADD CONSTRAINT "reservation_financial_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation_financial_snapshots"
    ADD CONSTRAINT "reservation_financial_snapshots_property_org_fk" FOREIGN KEY ("property_id", "organization_id") REFERENCES "public"."properties"("id", "organization_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reservation_financial_snapshots"
    ADD CONSTRAINT "reservation_financial_snapshots_reservation_org_fk" FOREIGN KEY ("reservation_id", "property_id", "organization_id") REFERENCES "public"."reservations"("id", "property_id", "organization_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reservation_matches"
    ADD CONSTRAINT "reservation_matches_source_1_reservation_id_fkey" FOREIGN KEY ("source_1_reservation_id") REFERENCES "public"."reservations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reservation_matches"
    ADD CONSTRAINT "reservation_matches_source_2_reservation_id_fkey" FOREIGN KEY ("source_2_reservation_id") REFERENCES "public"."reservations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reservation_sources"
    ADD CONSTRAINT "reservation_sources_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_channel_connection_id_fkey" FOREIGN KEY ("channel_connection_id") REFERENCES "public"."channel_connections"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_property_listing_id_fkey" FOREIGN KEY ("property_listing_id") REFERENCES "public"."property_listings"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_property_org_fk" FOREIGN KEY ("property_id", "organization_id") REFERENCES "public"."properties"("id", "organization_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sync_logs"
    ADD CONSTRAINT "sync_logs_property_listing_id_fkey" FOREIGN KEY ("property_listing_id") REFERENCES "public"."property_listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_history"
    ADD CONSTRAINT "task_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."task_history"
    ADD CONSTRAINT "task_history_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."cleaning_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_properties"
    ADD CONSTRAINT "user_properties_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_properties"
    ADD CONSTRAINT "user_properties_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can insert task history" ON "public"."task_history" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Org admin/manager manage pricing_rules" ON "public"."pricing_rules" USING ((("organization_id" = "public"."get_user_organization_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text"])))))));



CREATE POLICY "Organizations can view their task history" ON "public"."task_history" FOR SELECT USING (("organization_id" = ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Public read pricing_rules for public properties" ON "public"."pricing_rules" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE (("properties"."id" = "pricing_rules"."property_id") AND ("properties"."is_public" = true)))));



CREATE POLICY "Service role can insert sync logs" ON "public"."google_merchant_sync_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can insert/update sync status" ON "public"."google_merchant_sync_status" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can manage password reset tokens" ON "public"."password_reset_tokens" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can update sync status" ON "public"."google_merchant_sync_status" FOR UPDATE USING (true);



CREATE POLICY "Service role full access calendar_blocks" ON "public"."calendar_blocks" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access company_expenses" ON "public"."company_expenses" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users can manage own property availability" ON "public"."property_availability" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("o"."id" = "p"."owner_id")))
  WHERE (("p"."id" = "property_availability"."property_id") AND ("o"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("o"."id" = "p"."owner_id")))
  WHERE (("p"."id" = "property_availability"."property_id") AND ("o"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own properties" ON "public"."user_properties" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own property availability" ON "public"."property_availability" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("o"."id" = "p"."owner_id")))
  WHERE (("p"."id" = "property_availability"."property_id") AND ("o"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their organization's sync logs" ON "public"."google_merchant_sync_logs" FOR SELECT USING (("organization_id" IN ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their organization's sync status" ON "public"."google_merchant_sync_status" FOR SELECT USING (("organization_id" IN ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"()))));



CREATE POLICY "ab_isolation" ON "public"."availability_blocks" USING ((("organization_id" = ("current_setting"('app.current_org_id'::"text"))::"uuid") AND ("deleted_at" IS NULL)));



CREATE POLICY "admins_all" ON "public"."user_profiles" USING ("public"."is_org_admin"("organization_id"));



ALTER TABLE "public"."amenities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "amenities_select_all" ON "public"."amenities" FOR SELECT USING (true);



ALTER TABLE "public"."analytics_config_audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "analytics_config_audit_log_tenant_select" ON "public"."analytics_config_audit_log" FOR SELECT TO "authenticated" USING ((("organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."organization_id" = "analytics_config_audit_log"."organization_id") AND ("up"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'gestor'::"text"])))))));



CREATE POLICY "assigned user update checklist" ON "public"."cleaning_checklists" FOR UPDATE USING (("assigned_to" = "auth"."uid"()));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_admin_insert" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'admin'::"text"))))));



CREATE POLICY "audit_logs_admin_select" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'admin'::"text")))));



ALTER TABLE "public"."availability_blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_blocks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "calendar_blocks_tenant_delete" ON "public"."calendar_blocks" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("property_id") AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."role" = 'admin'::"text"))))));



CREATE POLICY "calendar_blocks_tenant_insert" ON "public"."calendar_blocks" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("property_id") AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text"])))))));



CREATE POLICY "calendar_blocks_tenant_select" ON "public"."calendar_blocks" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("property_id")));



CREATE POLICY "calendar_blocks_tenant_update" ON "public"."calendar_blocks" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("property_id") AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text"])))))));



ALTER TABLE "public"."calendar_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "calendar_events_select_organization" ON "public"."calendar_events" FOR SELECT TO "authenticated" USING (("organization_id" = "public"."get_user_organization_id"()));



ALTER TABLE "public"."channel_connections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "channel_connections_tenant_delete" ON "public"."channel_connections" FOR DELETE TO "authenticated" USING ((("organization_id" = "public"."get_user_organization_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'admin'::"text"))))));



CREATE POLICY "channel_connections_tenant_insert" ON "public"."channel_connections" FOR INSERT TO "authenticated" WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text"])))))));



CREATE POLICY "channel_connections_tenant_select" ON "public"."channel_connections" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND (("organization_id" = "public"."get_user_organization_id"()) OR (EXISTS ( SELECT 1
   FROM "public"."reservations" "r"
  WHERE (("r"."channel_connection_id" = "channel_connections"."id") AND ("r"."organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("r"."property_id") AND ("r"."deleted_at" IS NULL)))))));



CREATE POLICY "channel_connections_tenant_update" ON "public"."channel_connections" FOR UPDATE TO "authenticated" USING ((("organization_id" = "public"."get_user_organization_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text"]))))))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text"])))))));



ALTER TABLE "public"."channel_listing_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."channel_payout_allocation_components" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "channel_payout_allocation_components_tenant_select" ON "public"."channel_payout_allocation_components" FOR SELECT TO "authenticated" USING ((("organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")) AND (EXISTS ( SELECT 1
   FROM "public"."channel_payout_allocations" "allocation"
  WHERE (("allocation"."id" = "channel_payout_allocation_components"."allocation_id") AND ("allocation"."organization_id" = "channel_payout_allocation_components"."organization_id") AND "public"."user_has_property_access"("allocation"."property_id"))))));



ALTER TABLE "public"."channel_payout_allocations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "channel_payout_allocations_tenant_select" ON "public"."channel_payout_allocations" FOR SELECT TO "authenticated" USING ((("organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")) AND "public"."user_has_property_access"("property_id")));



ALTER TABLE "public"."channel_payouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "channel_payouts_tenant_select" ON "public"."channel_payouts" FOR SELECT TO "authenticated" USING (("organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")));



ALTER TABLE "public"."cleaner_access_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cleaner_tokens_insert_for_cleaner" ON "public"."cleaner_access_tokens" FOR INSERT WITH CHECK (((( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())) = "organization_id") AND (( SELECT "user_profiles"."role"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())) = ANY (ARRAY['admin'::"text", 'manager'::"text"]))));



ALTER TABLE "public"."cleaning_checklist_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cleaning_checklist_items_tenant_delete" ON "public"."cleaning_checklist_items" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."cleaning_checklist_templates" "t"
     JOIN "public"."user_profiles" "up" ON ((("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."organization_id" = "t"."organization_id") AND ("up"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'gestor'::"text"])))))
  WHERE (("t"."id" = "cleaning_checklist_items"."template_id") AND ("t"."organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id"))))));



CREATE POLICY "cleaning_checklist_items_tenant_insert" ON "public"."cleaning_checklist_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."cleaning_checklist_templates" "t"
     JOIN "public"."user_profiles" "up" ON ((("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."organization_id" = "t"."organization_id") AND ("up"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'gestor'::"text"])))))
  WHERE (("t"."id" = "cleaning_checklist_items"."template_id") AND ("t"."organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id"))))));



CREATE POLICY "cleaning_checklist_items_tenant_select" ON "public"."cleaning_checklist_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."cleaning_checklist_templates" "t"
  WHERE (("t"."id" = "cleaning_checklist_items"."template_id") AND ("t"."organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id"))))));



CREATE POLICY "cleaning_checklist_items_tenant_update" ON "public"."cleaning_checklist_items" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."cleaning_checklist_templates" "t"
     JOIN "public"."user_profiles" "up" ON ((("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."organization_id" = "t"."organization_id") AND ("up"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'gestor'::"text"])))))
  WHERE (("t"."id" = "cleaning_checklist_items"."template_id") AND ("t"."organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id"))))));



ALTER TABLE "public"."cleaning_checklist_responses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cleaning_checklist_responses_tenant_insert" ON "public"."cleaning_checklist_responses" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."cleaning_tasks" "t"
  WHERE (("t"."id" = "cleaning_checklist_responses"."task_id") AND ("t"."organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id"))))));



CREATE POLICY "cleaning_checklist_responses_tenant_select" ON "public"."cleaning_checklist_responses" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."cleaning_tasks" "t"
  WHERE (("t"."id" = "cleaning_checklist_responses"."task_id") AND ("t"."organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id"))))));



CREATE POLICY "cleaning_checklist_responses_tenant_update" ON "public"."cleaning_checklist_responses" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."cleaning_tasks" "t"
  WHERE (("t"."id" = "cleaning_checklist_responses"."task_id") AND ("t"."organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id"))))));



ALTER TABLE "public"."cleaning_checklist_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cleaning_checklist_templates_tenant_delete" ON "public"."cleaning_checklist_templates" FOR DELETE TO "authenticated" USING ((("organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."organization_id" = "cleaning_checklist_templates"."organization_id") AND ("up"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'gestor'::"text"])))))));



CREATE POLICY "cleaning_checklist_templates_tenant_insert" ON "public"."cleaning_checklist_templates" FOR INSERT TO "authenticated" WITH CHECK ((("organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."organization_id" = "cleaning_checklist_templates"."organization_id") AND ("up"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'gestor'::"text"])))))));



CREATE POLICY "cleaning_checklist_templates_tenant_select" ON "public"."cleaning_checklist_templates" FOR SELECT TO "authenticated" USING (("organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")));



CREATE POLICY "cleaning_checklist_templates_tenant_update" ON "public"."cleaning_checklist_templates" FOR UPDATE TO "authenticated" USING ((("organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."organization_id" = "cleaning_checklist_templates"."organization_id") AND ("up"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'gestor'::"text"]))))))) WITH CHECK (("organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")));



ALTER TABLE "public"."cleaning_checklists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cleaning_photos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cleaning_photos_tenant_delete" ON "public"."cleaning_photos" FOR DELETE TO "authenticated" USING ((("uploader_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."cleaning_tasks" "t"
  WHERE (("t"."id" = "cleaning_photos"."task_id") AND ("t"."organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")))))));



CREATE POLICY "cleaning_photos_tenant_insert" ON "public"."cleaning_photos" FOR INSERT TO "authenticated" WITH CHECK ((("uploader_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."cleaning_tasks" "t"
  WHERE (("t"."id" = "cleaning_photos"."task_id") AND ("t"."organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")))))));



CREATE POLICY "cleaning_photos_tenant_select" ON "public"."cleaning_photos" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."cleaning_tasks" "t"
  WHERE (("t"."id" = "cleaning_photos"."task_id") AND ("t"."organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id"))))));



ALTER TABLE "public"."cleaning_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cleaning_tasks_delete" ON "public"."cleaning_tasks" FOR DELETE USING ((("organization_id" = ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"()))) AND (( SELECT "user_profiles"."role"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())) = ANY (ARRAY['admin'::"text", 'manager'::"text"]))));



CREATE POLICY "cleaning_tasks_insert" ON "public"."cleaning_tasks" FOR INSERT WITH CHECK ((("organization_id" = ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"()))) AND (( SELECT "user_profiles"."role"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())) = ANY (ARRAY['admin'::"text", 'manager'::"text"]))));



CREATE POLICY "cleaning_tasks_select" ON "public"."cleaning_tasks" FOR SELECT USING (("organization_id" = ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"()))));



CREATE POLICY "cleaning_tasks_update" ON "public"."cleaning_tasks" FOR UPDATE USING ((("organization_id" = ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"()))) AND (( SELECT "user_profiles"."role"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())) = ANY (ARRAY['admin'::"text", 'manager'::"text"])))) WITH CHECK (("organization_id" = ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."cleaning_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clm_isolation" ON "public"."channel_listing_mappings" USING ((("organization_id" = ("current_setting"('app.current_org_id'::"text"))::"uuid") AND ("deleted_at" IS NULL)));



ALTER TABLE "public"."company_expenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_expenses_delete" ON "public"."company_expenses" FOR DELETE TO "authenticated" USING ((("organization_id" = "public"."get_user_organization_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."organization_id" = "public"."get_user_organization_id"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text"])))))));



CREATE POLICY "company_expenses_insert" ON "public"."company_expenses" FOR INSERT TO "authenticated" WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("created_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."organization_id" = "public"."get_user_organization_id"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text"])))))));



CREATE POLICY "company_expenses_select" ON "public"."company_expenses" FOR SELECT TO "authenticated" USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "company_expenses_update" ON "public"."company_expenses" FOR UPDATE TO "authenticated" USING ((("organization_id" = "public"."get_user_organization_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."organization_id" = "public"."get_user_organization_id"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text"]))))))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."organization_id" = "public"."get_user_organization_id"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text"])))))));



ALTER TABLE "public"."consent_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "consent_records_insert_anyone" ON "public"."consent_records" FOR INSERT WITH CHECK (true);



CREATE POLICY "consent_records_select_admin" ON "public"."consent_records" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text"])) AND (("user_profiles"."organization_id" = "consent_records"."organization_id") OR ("consent_records"."organization_id" IS NULL))))));



CREATE POLICY "consent_records_select_own" ON "public"."consent_records" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."daily_prices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "daily_prices_insert" ON "public"."daily_prices" FOR INSERT WITH CHECK (("property_id" IN ( SELECT "p"."id"
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("p"."owner_id" = "o"."id")))
  WHERE ("o"."user_id" = "auth"."uid"()))));



CREATE POLICY "daily_prices_select" ON "public"."daily_prices" FOR SELECT USING (("property_id" IN ( SELECT "p"."id"
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("p"."owner_id" = "o"."id")))
  WHERE ("o"."user_id" = "auth"."uid"()))));



CREATE POLICY "daily_prices_update" ON "public"."daily_prices" FOR UPDATE USING (("property_id" IN ( SELECT "p"."id"
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("p"."owner_id" = "o"."id")))
  WHERE ("o"."user_id" = "auth"."uid"())))) WITH CHECK (("property_id" IN ( SELECT "p"."id"
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("p"."owner_id" = "o"."id")))
  WHERE ("o"."user_id" = "auth"."uid"()))));



CREATE POLICY "delete_own_property_prices" ON "public"."daily_prices" FOR DELETE USING (("auth"."uid"() IN ( SELECT "owners"."user_id"
   FROM ("public"."properties"
     JOIN "public"."owners" ON (("properties"."owner_id" = "owners"."id")))
  WHERE ("properties"."id" = "daily_prices"."property_id"))));



ALTER TABLE "public"."deletion_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "deletion_requests_insert_own" ON "public"."deletion_requests" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "deletion_requests_select_admin" ON "public"."deletion_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text"])) AND ("user_profiles"."organization_id" = "deletion_requests"."organization_id")))));



CREATE POLICY "deletion_requests_select_own" ON "public"."deletion_requests" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "deletion_requests_update_own" ON "public"."deletion_requests" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK ((("status" = 'cancelled'::"text") AND ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."email_connections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_connections_delete" ON "public"."email_connections" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND (( SELECT "user_profiles"."role"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())) = ANY (ARRAY['admin'::"text", 'gestor'::"text"]))));



CREATE POLICY "email_connections_insert" ON "public"."email_connections" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND (( SELECT "user_profiles"."role"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())) = ANY (ARRAY['admin'::"text", 'gestor'::"text"]))));



CREATE POLICY "email_connections_select" ON "public"."email_connections" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "email_connections_update" ON "public"."email_connections" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND (( SELECT "user_profiles"."role"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())) = ANY (ARRAY['admin'::"text", 'gestor'::"text"]))));



ALTER TABLE "public"."email_extractions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_extractions_select_organization" ON "public"."email_extractions" FOR SELECT TO "authenticated" USING (("organization_id" = "public"."get_user_organization_id"()));



ALTER TABLE "public"."email_parse_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_parse_log_select" ON "public"."email_parse_log" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



ALTER TABLE "public"."email_parser_cron_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expense_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "expenses_delete" ON "public"."expenses" FOR DELETE USING (((( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())) = "organization_id") AND (( SELECT "user_profiles"."role"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())) = ANY (ARRAY['admin'::"text", 'gestor'::"text"])) AND "public"."user_has_property_access"("property_id")));



CREATE POLICY "expenses_insert" ON "public"."expenses" FOR INSERT WITH CHECK (((( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())) = "organization_id") AND (( SELECT "user_profiles"."role"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())) = ANY (ARRAY['admin'::"text", 'gestor'::"text"])) AND "public"."user_has_property_access"("property_id")));



CREATE POLICY "expenses_select" ON "public"."expenses" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."properties" "p"
  WHERE (("p"."id" = "expenses"."property_id") AND ("p"."organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("p"."id")))));



CREATE POLICY "expenses_update" ON "public"."expenses" FOR UPDATE USING (((( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())) = "organization_id") AND (( SELECT "user_profiles"."role"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())) = ANY (ARRAY['admin'::"text", 'gestor'::"text"])) AND "public"."user_has_property_access"("property_id")));



ALTER TABLE "public"."feature_flag_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."financial_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "financial_transactions_delete" ON "public"."financial_transactions" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'admin'::"text")))));



CREATE POLICY "financial_transactions_insert" ON "public"."financial_transactions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."properties" "p"
  WHERE (("p"."id" = "financial_transactions"."property_id") AND ("p"."organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("p"."id")))));



CREATE POLICY "financial_transactions_select" ON "public"."financial_transactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."properties" "p"
  WHERE (("p"."id" = "financial_transactions"."property_id") AND ("p"."organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("p"."id")))));



CREATE POLICY "financial_transactions_update" ON "public"."financial_transactions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."properties" "p"
  WHERE (("p"."id" = "financial_transactions"."property_id") AND ("p"."organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("p"."id")))));



ALTER TABLE "public"."google_feed_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "google_feed_logs_tenant_select" ON "public"."google_feed_logs" FOR SELECT TO "authenticated" USING ((("organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."organization_id" = "google_feed_logs"."organization_id") AND ("up"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'gestor'::"text"])))))));



ALTER TABLE "public"."google_merchant_sync_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."google_merchant_sync_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "guests_delete" ON "public"."guests" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND "public"."is_admin"()));



CREATE POLICY "guests_insert" ON "public"."guests" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND (( SELECT "user_profiles"."role"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())) = ANY (ARRAY['admin'::"text", 'gestor'::"text"]))));



CREATE POLICY "guests_select" ON "public"."guests" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "guests_update" ON "public"."guests" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND (( SELECT "user_profiles"."role"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())) = ANY (ARRAY['admin'::"text", 'gestor'::"text"]))));



ALTER TABLE "public"."image_variants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "image_variants_select_public" ON "public"."image_variants" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."property_images" "pi"
     JOIN "public"."properties" "p" ON (("p"."id" = "pi"."property_id")))
  WHERE (("pi"."id" = "image_variants"."property_image_id") AND ("p"."is_public" = true)))));



CREATE POLICY "image_variants_select_with_access" ON "public"."image_variants" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."property_images" "pi"
  WHERE (("pi"."id" = "image_variants"."property_image_id") AND ("pi"."organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("pi"."property_id")))));



CREATE POLICY "insert_own_property_prices" ON "public"."daily_prices" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "owners"."user_id"
   FROM ("public"."properties"
     JOIN "public"."owners" ON (("properties"."owner_id" = "owners"."id")))
  WHERE ("properties"."id" = "daily_prices"."property_id"))));



CREATE POLICY "managers manage checklists" ON "public"."cleaning_checklists" USING (("organization_id" IN ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "org members view checklists" ON "public"."cleaning_checklists" FOR SELECT USING (("organization_id" IN ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"()))));



CREATE POLICY "org templates access" ON "public"."cleaning_templates" USING (("organization_id" IN ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"()))));



CREATE POLICY "org_branding_insert" ON "public"."organization_branding" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."organization_id" = "organization_branding"."organization_id") AND ("up"."role" = 'admin'::"text")))));



CREATE POLICY "org_branding_select" ON "public"."organization_branding" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."organization_id" = "organization_branding"."organization_id")))));



CREATE POLICY "org_branding_update" ON "public"."organization_branding" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."organization_id" = "organization_branding"."organization_id") AND ("up"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."organization_id" = "organization_branding"."organization_id") AND ("up"."role" = 'admin'::"text")))));



CREATE POLICY "org_members_select" ON "public"."organizations" FOR SELECT TO "authenticated" USING (("id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")));



CREATE POLICY "org_public_profile_insert" ON "public"."organization_public_profile" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."organization_id" = "organization_public_profile"."organization_id") AND ("up"."role" = 'admin'::"text")))));



CREATE POLICY "org_public_profile_select" ON "public"."organization_public_profile" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."organization_id" = "organization_public_profile"."organization_id")))));



CREATE POLICY "org_public_profile_update" ON "public"."organization_public_profile" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."organization_id" = "organization_public_profile"."organization_id") AND ("up"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."organization_id" = "organization_public_profile"."organization_id") AND ("up"."role" = 'admin'::"text")))));



ALTER TABLE "public"."organization_analytics_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_analytics_config_tenant_insert" ON "public"."organization_analytics_config" FOR INSERT TO "authenticated" WITH CHECK ((("organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."organization_id" = "organization_analytics_config"."organization_id") AND ("up"."role" = 'admin'::"text"))))));



CREATE POLICY "organization_analytics_config_tenant_select" ON "public"."organization_analytics_config" FOR SELECT TO "authenticated" USING ((("organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."organization_id" = "organization_analytics_config"."organization_id") AND ("up"."role" = 'admin'::"text"))))));



CREATE POLICY "organization_analytics_config_tenant_update" ON "public"."organization_analytics_config" FOR UPDATE TO "authenticated" USING ((("organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."organization_id" = "organization_analytics_config"."organization_id") AND ("up"."role" = 'admin'::"text")))))) WITH CHECK (("organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")));



ALTER TABLE "public"."organization_branding" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_financial_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_financial_settings_tenant_select" ON "public"."organization_financial_settings" FOR SELECT TO "authenticated" USING (("organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")));



ALTER TABLE "public"."organization_public_profile" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."owners" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "owners_delete" ON "public"."owners" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND "public"."is_admin"()));



CREATE POLICY "owners_insert" ON "public"."owners" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND (( SELECT "user_profiles"."role"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())) = ANY (ARRAY['admin'::"text", 'gestor'::"text"]))));



CREATE POLICY "owners_select" ON "public"."owners" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "owners_update" ON "public"."owners" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND (( SELECT "user_profiles"."role"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())) = ANY (ARRAY['admin'::"text", 'gestor'::"text"]))));



ALTER TABLE "public"."password_reset_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payout_rule_components" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payout_rule_components_tenant_select" ON "public"."payout_rule_components" FOR SELECT TO "authenticated" USING ((("organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")) AND (EXISTS ( SELECT 1
   FROM "public"."regras_repasse" "rr"
  WHERE (("rr"."id" = "payout_rule_components"."payout_rule_id") AND ("rr"."organization_id" = "payout_rule_components"."organization_id") AND "public"."user_has_property_access"("rr"."propriedade_id"))))));



ALTER TABLE "public"."platforms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "platforms_select_all" ON "public"."platforms" FOR SELECT USING (true);



CREATE POLICY "platforms_service_role_all" ON "public"."platforms" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."pricing_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."properties" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "properties_authenticated_select" ON "public"."properties" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND ("organization_id" = "public"."get_user_organization_id"()) AND (("is_public" = true) OR "public"."user_has_property_access"("id"))));



CREATE POLICY "properties_public_select" ON "public"."properties" FOR SELECT TO "anon" USING ((("is_public" = true) AND ("deleted_at" IS NULL)));



CREATE POLICY "properties_tenant_delete" ON "public"."properties" FOR DELETE TO "authenticated" USING ((("organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("id") AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'admin'::"text"))))));



CREATE POLICY "properties_tenant_insert" ON "public"."properties" FOR INSERT TO "authenticated" WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."organization_id" = "properties"."organization_id") AND ("up"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text"])))))));



CREATE POLICY "properties_tenant_update" ON "public"."properties" FOR UPDATE TO "authenticated" USING ((("organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("id") AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text"]))))))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("id") AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text"])))))));



ALTER TABLE "public"."property_amenities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "property_amenities_delete" ON "public"."property_amenities" FOR DELETE USING (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "property_amenities_insert" ON "public"."property_amenities" FOR INSERT WITH CHECK (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "property_amenities_select" ON "public"."property_amenities" FOR SELECT USING (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "property_amenities_select_public" ON "public"."property_amenities" FOR SELECT USING (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."is_public" = true))));



ALTER TABLE "public"."property_availability" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."property_bathrooms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "property_bathrooms_delete" ON "public"."property_bathrooms" FOR DELETE USING (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "property_bathrooms_insert" ON "public"."property_bathrooms" FOR INSERT WITH CHECK (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "property_bathrooms_select" ON "public"."property_bathrooms" FOR SELECT USING (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "property_bathrooms_update" ON "public"."property_bathrooms" FOR UPDATE USING (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"()))))));



ALTER TABLE "public"."property_cancellation_policies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "property_cancellation_policies_delete" ON "public"."property_cancellation_policies" FOR DELETE TO "authenticated" USING (("property_id" IN ( SELECT "p"."id"
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("o"."id" = "p"."owner_id")))
  WHERE ("o"."user_id" = "auth"."uid"()))));



CREATE POLICY "property_cancellation_policies_insert" ON "public"."property_cancellation_policies" FOR INSERT TO "authenticated" WITH CHECK (("property_id" IN ( SELECT "p"."id"
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("o"."id" = "p"."owner_id")))
  WHERE ("o"."user_id" = "auth"."uid"()))));



CREATE POLICY "property_cancellation_policies_select" ON "public"."property_cancellation_policies" FOR SELECT TO "authenticated" USING (("property_id" IN ( SELECT "p"."id"
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("o"."id" = "p"."owner_id")))
  WHERE ("o"."user_id" = "auth"."uid"()))));



CREATE POLICY "property_cancellation_policies_update" ON "public"."property_cancellation_policies" FOR UPDATE TO "authenticated" USING (("property_id" IN ( SELECT "p"."id"
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("o"."id" = "p"."owner_id")))
  WHERE ("o"."user_id" = "auth"."uid"())))) WITH CHECK (("property_id" IN ( SELECT "p"."id"
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("o"."id" = "p"."owner_id")))
  WHERE ("o"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."property_cancellation_policy_periods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "property_cancellation_policy_periods_delete" ON "public"."property_cancellation_policy_periods" FOR DELETE TO "authenticated" USING (("property_id" IN ( SELECT "p"."id"
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("o"."id" = "p"."owner_id")))
  WHERE ("o"."user_id" = "auth"."uid"()))));



CREATE POLICY "property_cancellation_policy_periods_insert" ON "public"."property_cancellation_policy_periods" FOR INSERT TO "authenticated" WITH CHECK (("property_id" IN ( SELECT "p"."id"
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("o"."id" = "p"."owner_id")))
  WHERE ("o"."user_id" = "auth"."uid"()))));



CREATE POLICY "property_cancellation_policy_periods_select" ON "public"."property_cancellation_policy_periods" FOR SELECT TO "authenticated" USING (("property_id" IN ( SELECT "p"."id"
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("o"."id" = "p"."owner_id")))
  WHERE ("o"."user_id" = "auth"."uid"()))));



CREATE POLICY "property_cancellation_policy_periods_update" ON "public"."property_cancellation_policy_periods" FOR UPDATE TO "authenticated" USING (("property_id" IN ( SELECT "p"."id"
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("o"."id" = "p"."owner_id")))
  WHERE ("o"."user_id" = "auth"."uid"())))) WITH CHECK (("property_id" IN ( SELECT "p"."id"
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("o"."id" = "p"."owner_id")))
  WHERE ("o"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."property_discounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "property_discounts_all" ON "public"."property_discounts" USING (("property_id" IN ( SELECT "p"."id"
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("p"."owner_id" = "o"."id")))
  WHERE ("o"."user_id" = "auth"."uid"())))) WITH CHECK (("property_id" IN ( SELECT "p"."id"
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("p"."owner_id" = "o"."id")))
  WHERE ("o"."user_id" = "auth"."uid"()))));



CREATE POLICY "property_discounts_select" ON "public"."property_discounts" FOR SELECT USING (("property_id" IN ( SELECT "p"."id"
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("p"."owner_id" = "o"."id")))
  WHERE ("o"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."property_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "property_documents_org_delete" ON "public"."property_documents" FOR DELETE USING (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "property_documents_org_insert" ON "public"."property_documents" FOR INSERT WITH CHECK (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "property_documents_org_select" ON "public"."property_documents" FOR SELECT USING (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"()))))));



ALTER TABLE "public"."property_fees" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "property_fees_delete_organization" ON "public"."property_fees" FOR DELETE USING (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "property_fees_insert_organization" ON "public"."property_fees" FOR INSERT WITH CHECK (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "property_fees_select_organization" ON "public"."property_fees" FOR SELECT USING (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "property_fees_update_organization" ON "public"."property_fees" FOR UPDATE USING (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"()))))));



ALTER TABLE "public"."property_financial_parameters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "property_financial_parameters_tenant_select" ON "public"."property_financial_parameters" FOR SELECT TO "authenticated" USING ((("organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")) AND "public"."user_has_property_access"("property_id")));



ALTER TABLE "public"."property_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "property_images_delete_admin_only" ON "public"."property_images" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."role" = 'admin'::"text"))))));



CREATE POLICY "property_images_insert_manager_or_admin" ON "public"."property_images" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'gestor'::"text"])))))));



CREATE POLICY "property_images_select_public" ON "public"."property_images" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."properties" "p"
  WHERE (("p"."id" = "property_images"."property_id") AND ("p"."is_public" = true)))));



CREATE POLICY "property_images_select_with_access" ON "public"."property_images" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("property_id")));



CREATE POLICY "property_images_update_manager_or_admin" ON "public"."property_images" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'gestor'::"text"]))))))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'gestor'::"text"])))))));



ALTER TABLE "public"."property_listings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "property_listings_tenant_delete" ON "public"."property_listings" FOR DELETE TO "authenticated" USING ((("organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("property_id") AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'admin'::"text"))))));



CREATE POLICY "property_listings_tenant_insert" ON "public"."property_listings" FOR INSERT TO "authenticated" WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("property_id") AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text"])))))));



CREATE POLICY "property_listings_tenant_select" ON "public"."property_listings" FOR SELECT TO "authenticated" USING ((("organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("property_id")));



CREATE POLICY "property_listings_tenant_update" ON "public"."property_listings" FOR UPDATE TO "authenticated" USING ((("organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("property_id") AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text"]))))))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("property_id") AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text"])))))));



ALTER TABLE "public"."property_prices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "property_prices_insert" ON "public"."property_prices" FOR INSERT WITH CHECK (("property_id" IN ( SELECT "p"."id"
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("p"."owner_id" = "o"."id")))
  WHERE ("o"."user_id" = "auth"."uid"()))));



CREATE POLICY "property_prices_select" ON "public"."property_prices" FOR SELECT USING (("property_id" IN ( SELECT "p"."id"
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("p"."owner_id" = "o"."id")))
  WHERE ("o"."user_id" = "auth"."uid"()))));



CREATE POLICY "property_prices_update" ON "public"."property_prices" FOR UPDATE USING (("property_id" IN ( SELECT "p"."id"
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("p"."owner_id" = "o"."id")))
  WHERE ("o"."user_id" = "auth"."uid"())))) WITH CHECK (("property_id" IN ( SELECT "p"."id"
   FROM ("public"."properties" "p"
     JOIN "public"."owners" "o" ON (("p"."owner_id" = "o"."id")))
  WHERE ("o"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."property_reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "property_reviews_delete" ON "public"."property_reviews" FOR DELETE USING (("organization_id" = ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"()))));



CREATE POLICY "property_reviews_insert" ON "public"."property_reviews" FOR INSERT WITH CHECK (("organization_id" = ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"()))));



CREATE POLICY "property_reviews_select" ON "public"."property_reviews" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) OR (EXISTS ( SELECT 1
   FROM "public"."properties" "p"
  WHERE (("p"."id" = "property_reviews"."property_id") AND ("p"."is_public" = true) AND ("p"."deleted_at" IS NULL))))));



CREATE POLICY "property_reviews_update" ON "public"."property_reviews" FOR UPDATE USING (("organization_id" = ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."property_rooms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "property_rooms_delete" ON "public"."property_rooms" FOR DELETE USING (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "property_rooms_insert" ON "public"."property_rooms" FOR INSERT WITH CHECK (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "property_rooms_select" ON "public"."property_rooms" FOR SELECT USING (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "property_rooms_update" ON "public"."property_rooms" FOR UPDATE USING (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "public_read_daily_prices" ON "public"."daily_prices" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE (("properties"."id" = "daily_prices"."property_id") AND ("properties"."is_public" = true)))));



ALTER TABLE "public"."raw_emails" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "raw_emails_tenant_select" ON "public"."raw_emails" FOR SELECT TO "authenticated" USING ((("organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."organization_id" = "raw_emails"."organization_id") AND ("up"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'gestor'::"text"])))))));



CREATE POLICY "rc_isolation" ON "public"."reservation_conflicts" USING ((("organization_id" = ("current_setting"('app.current_org_id'::"text"))::"uuid") AND ("deleted_at" IS NULL)));



ALTER TABLE "public"."regras_repasse" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "regras_repasse_tenant_insert" ON "public"."regras_repasse" FOR INSERT TO "authenticated" WITH CHECK ((("organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")) AND "public"."user_has_property_access"("propriedade_id") AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."organization_id" = "regras_repasse"."organization_id") AND ("up"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text"])))))));



CREATE POLICY "regras_repasse_tenant_select" ON "public"."regras_repasse" FOR SELECT TO "authenticated" USING ((("organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")) AND "public"."user_has_property_access"("propriedade_id")));



CREATE POLICY "regras_repasse_tenant_update" ON "public"."regras_repasse" FOR UPDATE TO "authenticated" USING ((("organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")) AND "public"."user_has_property_access"("propriedade_id") AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."organization_id" = "regras_repasse"."organization_id") AND ("up"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text"]))))))) WITH CHECK ((("organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")) AND "public"."user_has_property_access"("propriedade_id") AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."organization_id" = "regras_repasse"."organization_id") AND ("up"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text"])))))));



ALTER TABLE "public"."reservation_conflicts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reservation_financial_snapshots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reservation_financial_snapshots_tenant_select" ON "public"."reservation_financial_snapshots" FOR SELECT TO "authenticated" USING ((("organization_id" = ( SELECT "public"."get_user_organization_id"() AS "get_user_organization_id")) AND "public"."user_has_property_access"("property_id")));



ALTER TABLE "public"."reservation_matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reservation_org_backfill_20260719" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reservation_sources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reservations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reservations_tenant_delete" ON "public"."reservations" FOR DELETE TO "authenticated" USING ((("organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("property_id") AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'admin'::"text"))))));



CREATE POLICY "reservations_tenant_insert" ON "public"."reservations" FOR INSERT TO "authenticated" WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("property_id") AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text"])))))));



CREATE POLICY "reservations_tenant_select" ON "public"."reservations" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND ("organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("property_id")));



CREATE POLICY "reservations_tenant_update" ON "public"."reservations" FOR UPDATE TO "authenticated" USING ((("organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("property_id") AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text", 'manager'::"text", 'owner'::"text"]))))))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("property_id") AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text", 'manager'::"text", 'owner'::"text"])))))));



CREATE POLICY "rm_isolation" ON "public"."reservation_matches" USING ((("organization_id" = ("current_setting"('app.current_org_id'::"text"))::"uuid") AND ("deleted_at" IS NULL)));



CREATE POLICY "rs_isolation" ON "public"."reservation_sources" USING (("organization_id" = ("current_setting"('app.current_org_id'::"text"))::"uuid"));



CREATE POLICY "select_own_property_prices" ON "public"."daily_prices" FOR SELECT USING (("auth"."uid"() IN ( SELECT "owners"."user_id"
   FROM ("public"."properties"
     JOIN "public"."owners" ON (("properties"."owner_id" = "owners"."id")))
  WHERE ("properties"."id" = "daily_prices"."property_id"))));



CREATE POLICY "service_role_bypass" ON "public"."daily_prices" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."sync_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sync_logs_service_role_all" ON "public"."sync_logs" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "sync_logs_tenant_select" ON "public"."sync_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."property_listings" "pl"
  WHERE (("pl"."id" = "sync_logs"."property_listing_id") AND ("pl"."organization_id" = "public"."get_user_organization_id"()) AND "public"."user_has_property_access"("pl"."property_id")))));



ALTER TABLE "public"."task_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update_own_property_prices" ON "public"."daily_prices" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "owners"."user_id"
   FROM ("public"."properties"
     JOIN "public"."owners" ON (("properties"."owner_id" = "owners"."id")))
  WHERE ("properties"."id" = "daily_prices"."property_id")))) WITH CHECK (("auth"."uid"() IN ( SELECT "owners"."user_id"
   FROM ("public"."properties"
     JOIN "public"."owners" ON (("properties"."owner_id" = "owners"."id")))
  WHERE ("properties"."id" = "daily_prices"."property_id"))));



ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_properties" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_properties_tenant_admin_manage" ON "public"."user_properties" USING (("public"."is_admin"() AND ("public"."get_user_organization_id"() = ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "user_properties"."user_id"))) AND ("public"."get_user_organization_id"() = ( SELECT "properties"."organization_id"
   FROM "public"."properties"
  WHERE ("properties"."id" = "user_properties"."property_id"))))) WITH CHECK (("public"."is_admin"() AND ("public"."get_user_organization_id"() = ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "user_properties"."user_id"))) AND ("public"."get_user_organization_id"() = ( SELECT "properties"."organization_id"
   FROM "public"."properties"
  WHERE ("properties"."id" = "user_properties"."property_id")))));



CREATE POLICY "users_select_own" ON "public"."user_profiles" FOR SELECT USING ((("id" = "auth"."uid"()) OR "public"."is_org_admin"("organization_id")));



CREATE POLICY "users_update_own" ON "public"."user_profiles" FOR UPDATE USING (("id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";









GRANT USAGE ON SCHEMA "lodgra_private" TO "authenticated";
GRANT USAGE ON SCHEMA "lodgra_private" TO "service_role";






GRANT ALL ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




























































































































































































































































































































































































































































































































































































































































































































































































































































REVOKE ALL ON FUNCTION "lodgra_private"."mutate_property_payout_rule_v2"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_expect_absent" boolean, "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "lodgra_private"."mutate_property_payout_rule_v2"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_expect_absent" boolean, "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "lodgra_private"."mutate_property_payout_rule_v2"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_expect_absent" boolean, "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "lodgra_private"."mutate_property_payout_rule_v2_with_declared"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_expect_absent" boolean, "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text", "p_allow_declared_owner_base" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "lodgra_private"."mutate_property_payout_rule_v2_with_declared"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_expect_absent" boolean, "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text", "p_allow_declared_owner_base" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "lodgra_private"."mutate_property_payout_rule_v2_with_declared"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_expect_absent" boolean, "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text", "p_allow_declared_owner_base" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "lodgra_private"."prevent_unversioned_property_financial_parameter_mutation"() FROM PUBLIC;
GRANT ALL ON FUNCTION "lodgra_private"."prevent_unversioned_property_financial_parameter_mutation"() TO "service_role";



REVOKE ALL ON FUNCTION "lodgra_private"."prevent_unversioned_v2_rule_closure"() FROM PUBLIC;
GRANT ALL ON FUNCTION "lodgra_private"."prevent_unversioned_v2_rule_closure"() TO "service_role";



REVOKE ALL ON FUNCTION "lodgra_private"."protect_declared_reservation_total"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "lodgra_private"."replace_property_payout_rule"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_base_comissao" "public"."base_comissao_repasse", "p_taxa_limpeza_para" "public"."destinatario_taxa_repasse", "p_comissao_ota_por_conta" "public"."destinatario_taxa_repasse", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_observacoes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "lodgra_private"."replace_property_payout_rule"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_base_comissao" "public"."base_comissao_repasse", "p_taxa_limpeza_para" "public"."destinatario_taxa_repasse", "p_comissao_ota_por_conta" "public"."destinatario_taxa_repasse", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_observacoes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "lodgra_private"."replace_property_payout_rule"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_base_comissao" "public"."base_comissao_repasse", "p_taxa_limpeza_para" "public"."destinatario_taxa_repasse", "p_comissao_ota_por_conta" "public"."destinatario_taxa_repasse", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_observacoes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "lodgra_private"."replace_property_payout_rule_v2"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "lodgra_private"."replace_property_payout_rule_v2"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "lodgra_private"."replace_property_payout_rule_v2"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "lodgra_private"."replace_reservation_financial_snapshot"("p_reservation_id" "uuid", "p_expected_current_version" integer, "p_fact_mode" "text", "p_currency" "text", "p_declared_owner_base_amount" numeric, "p_accommodation_amount" numeric, "p_cleaning_fee_amount" numeric, "p_municipal_tax_amount" numeric, "p_other_guest_fees_amount" numeric, "p_discount_amount" numeric, "p_platform_adjustment_amount" numeric, "p_guest_total_amount" numeric, "p_ota_commission_base_amount" numeric, "p_ota_commission_amount" numeric, "p_payment_processing_fee_amount" numeric, "p_manager_cleaning_cost_amount" numeric, "p_channel_net_payout_amount" numeric, "p_ota_commission_settlement" "text", "p_payment_processing_settlement" "text", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "lodgra_private"."replace_reservation_financial_snapshot"("p_reservation_id" "uuid", "p_expected_current_version" integer, "p_fact_mode" "text", "p_currency" "text", "p_declared_owner_base_amount" numeric, "p_accommodation_amount" numeric, "p_cleaning_fee_amount" numeric, "p_municipal_tax_amount" numeric, "p_other_guest_fees_amount" numeric, "p_discount_amount" numeric, "p_platform_adjustment_amount" numeric, "p_guest_total_amount" numeric, "p_ota_commission_base_amount" numeric, "p_ota_commission_amount" numeric, "p_payment_processing_fee_amount" numeric, "p_manager_cleaning_cost_amount" numeric, "p_channel_net_payout_amount" numeric, "p_ota_commission_settlement" "text", "p_payment_processing_settlement" "text", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "lodgra_private"."replace_reservation_financial_snapshot"("p_reservation_id" "uuid", "p_expected_current_version" integer, "p_fact_mode" "text", "p_currency" "text", "p_declared_owner_base_amount" numeric, "p_accommodation_amount" numeric, "p_cleaning_fee_amount" numeric, "p_municipal_tax_amount" numeric, "p_other_guest_fees_amount" numeric, "p_discount_amount" numeric, "p_platform_adjustment_amount" numeric, "p_guest_total_amount" numeric, "p_ota_commission_base_amount" numeric, "p_ota_commission_amount" numeric, "p_payment_processing_fee_amount" numeric, "p_manager_cleaning_cost_amount" numeric, "p_channel_net_payout_amount" numeric, "p_ota_commission_settlement" "text", "p_payment_processing_settlement" "text", "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."bridge_legacy_reservation_write"() TO "anon";
GRANT ALL ON FUNCTION "public"."bridge_legacy_reservation_write"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."bridge_legacy_reservation_write"() TO "service_role";



GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_property_limit"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_property_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_reservation_conflict"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_reservation_conflict"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_reservation_conflict"() TO "service_role";



GRANT ALL ON TABLE "public"."raw_emails" TO "anon";
GRANT ALL ON TABLE "public"."raw_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."raw_emails" TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_email_reconciliation_batch"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_email_reconciliation_batch"("p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_property_payout_rule_v2"("p_property_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_property_payout_rule_v2"("p_property_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_property_payout_rule_v2"("p_property_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_property_payout_rule_v2"("p_property_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text", "p_allow_declared_owner_base" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_property_payout_rule_v2"("p_property_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text", "p_allow_declared_owner_base" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_property_payout_rule_v2"("p_property_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text", "p_allow_declared_owner_base" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."enable_email_ical_pilot"("org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enable_email_ical_pilot"("org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."ensure_my_organization"("p_name" "text", "p_slug" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_my_organization"("p_name" "text", "p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_my_organization"("p_name" "text", "p_slug" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_profile"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_profile"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_organization_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_organization_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_organization_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_manager_created"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_manager_created"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_storage_upload"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_storage_upload"() TO "service_role";



GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "postgres";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "anon";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "postgres";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "anon";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "postgres";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "anon";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin_or_manager"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin_or_manager"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_or_manager"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_admin"("target_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_admin"("target_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_admin"("target_org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."permanently_delete_cancelled_reservation"("p_reservation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."permanently_delete_cancelled_reservation"("p_reservation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."permanently_delete_cancelled_reservation"("p_reservation_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."prevent_active_reservation_overlap"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."prevent_active_reservation_overlap"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_property_images_immutable_field_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_property_images_immutable_field_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_property_images_immutable_field_changes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."reconcile_email_extraction"("p_extraction_id" "uuid", "p_event_id" "uuid", "p_confirmed_by_host" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reconcile_email_extraction"("p_extraction_id" "uuid", "p_event_id" "uuid", "p_confirmed_by_host" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_commission_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_commission_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_commission_summary"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."replace_property_payout_rule"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_base_comissao" "public"."base_comissao_repasse", "p_taxa_limpeza_para" "public"."destinatario_taxa_repasse", "p_comissao_ota_por_conta" "public"."destinatario_taxa_repasse", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_observacoes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."replace_property_payout_rule"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_base_comissao" "public"."base_comissao_repasse", "p_taxa_limpeza_para" "public"."destinatario_taxa_repasse", "p_comissao_ota_por_conta" "public"."destinatario_taxa_repasse", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_observacoes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace_property_payout_rule"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_base_comissao" "public"."base_comissao_repasse", "p_taxa_limpeza_para" "public"."destinatario_taxa_repasse", "p_comissao_ota_por_conta" "public"."destinatario_taxa_repasse", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_observacoes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."replace_property_payout_rule_v2"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."replace_property_payout_rule_v2"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace_property_payout_rule_v2"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."replace_property_payout_rule_v2"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text", "p_allow_declared_owner_base" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."replace_property_payout_rule_v2"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text", "p_allow_declared_owner_base" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace_property_payout_rule_v2"("p_property_id" "uuid", "p_expected_current_rule_id" "uuid", "p_vigencia_inicio" "date", "p_tipo_comissao" "public"."tipo_comissao_repasse", "p_comissao_valor" numeric, "p_imposto_comissao_percentual" numeric, "p_competencia_receita" "text", "p_fluxo_financeiro" "text", "p_preset" "text", "p_despesas_repassaveis" boolean, "p_dia_fechamento" smallint, "p_componentes" "jsonb", "p_observacoes" "text", "p_allow_declared_owner_base" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."replace_reservation_financial_snapshot"("p_reservation_id" "uuid", "p_expected_current_version" integer, "p_fact_mode" "text", "p_currency" "text", "p_declared_owner_base_amount" numeric, "p_accommodation_amount" numeric, "p_cleaning_fee_amount" numeric, "p_municipal_tax_amount" numeric, "p_other_guest_fees_amount" numeric, "p_discount_amount" numeric, "p_platform_adjustment_amount" numeric, "p_guest_total_amount" numeric, "p_ota_commission_base_amount" numeric, "p_ota_commission_amount" numeric, "p_payment_processing_fee_amount" numeric, "p_manager_cleaning_cost_amount" numeric, "p_channel_net_payout_amount" numeric, "p_ota_commission_settlement" "text", "p_payment_processing_settlement" "text", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."replace_reservation_financial_snapshot"("p_reservation_id" "uuid", "p_expected_current_version" integer, "p_fact_mode" "text", "p_currency" "text", "p_declared_owner_base_amount" numeric, "p_accommodation_amount" numeric, "p_cleaning_fee_amount" numeric, "p_municipal_tax_amount" numeric, "p_other_guest_fees_amount" numeric, "p_discount_amount" numeric, "p_platform_adjustment_amount" numeric, "p_guest_total_amount" numeric, "p_ota_commission_base_amount" numeric, "p_ota_commission_amount" numeric, "p_payment_processing_fee_amount" numeric, "p_manager_cleaning_cost_amount" numeric, "p_channel_net_payout_amount" numeric, "p_ota_commission_settlement" "text", "p_payment_processing_settlement" "text", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace_reservation_financial_snapshot"("p_reservation_id" "uuid", "p_expected_current_version" integer, "p_fact_mode" "text", "p_currency" "text", "p_declared_owner_base_amount" numeric, "p_accommodation_amount" numeric, "p_cleaning_fee_amount" numeric, "p_municipal_tax_amount" numeric, "p_other_guest_fees_amount" numeric, "p_discount_amount" numeric, "p_platform_adjustment_amount" numeric, "p_guest_total_amount" numeric, "p_ota_commission_base_amount" numeric, "p_ota_commission_amount" numeric, "p_payment_processing_fee_amount" numeric, "p_manager_cleaning_cost_amount" numeric, "p_channel_net_payout_amount" numeric, "p_ota_commission_settlement" "text", "p_payment_processing_settlement" "text", "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_cleaner_token_org_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_cleaner_token_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_cleaner_token_org_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_compliance_organization_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_compliance_organization_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_get_user_organization_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_get_user_organization_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_get_user_organization_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."touch_regras_repasse_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."touch_regras_repasse_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_regras_repasse_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_email_parser"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_email_parser"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_email_parser"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_company_expenses_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_company_expenses_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_company_expenses_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_daily_prices_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_daily_prices_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_daily_prices_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_my_organization"("p_name" "text", "p_slug" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_my_organization"("p_name" "text", "p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_my_organization"("p_name" "text", "p_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_owners_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_owners_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_owners_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."upsert_calendar_event_audit"("p_organization_id" "uuid", "p_property_id" "uuid", "p_property_listing_id" "uuid", "p_source_platform" "text", "p_check_in" "date", "p_check_out" "date", "p_ical_uid" "text", "p_raw_summary" "text", "p_raw_vevent" "text", "p_event_kind" "text", "p_reservation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_calendar_event_audit"("p_organization_id" "uuid", "p_property_id" "uuid", "p_property_listing_id" "uuid", "p_source_platform" "text", "p_check_in" "date", "p_check_out" "date", "p_ical_uid" "text", "p_raw_summary" "text", "p_raw_vevent" "text", "p_event_kind" "text", "p_reservation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_has_property_access"("prop_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_has_property_access"("prop_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_property_access"("prop_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_minimum_stay"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_minimum_stay"() TO "service_role";
























GRANT ALL ON TABLE "public"."amenities" TO "anon";
GRANT ALL ON TABLE "public"."amenities" TO "authenticated";
GRANT ALL ON TABLE "public"."amenities" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_config_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."analytics_config_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_config_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."availability_blocks" TO "anon";
GRANT ALL ON TABLE "public"."availability_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."availability_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_blocks" TO "anon";
GRANT ALL ON TABLE "public"."calendar_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_events" TO "anon";
GRANT ALL ON TABLE "public"."calendar_events" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_events" TO "service_role";



GRANT ALL ON TABLE "public"."channel_connections" TO "anon";
GRANT ALL ON TABLE "public"."channel_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."channel_connections" TO "service_role";



GRANT ALL ON TABLE "public"."channel_listing_mappings" TO "anon";
GRANT ALL ON TABLE "public"."channel_listing_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."channel_listing_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."channel_payout_allocation_components" TO "service_role";
GRANT SELECT ON TABLE "public"."channel_payout_allocation_components" TO "authenticated";



GRANT ALL ON TABLE "public"."channel_payout_allocations" TO "service_role";
GRANT SELECT ON TABLE "public"."channel_payout_allocations" TO "authenticated";



GRANT ALL ON TABLE "public"."channel_payouts" TO "service_role";
GRANT SELECT ON TABLE "public"."channel_payouts" TO "authenticated";



GRANT ALL ON TABLE "public"."cleaner_access_tokens" TO "anon";
GRANT ALL ON TABLE "public"."cleaner_access_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."cleaner_access_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."cleaning_checklist_items" TO "anon";
GRANT ALL ON TABLE "public"."cleaning_checklist_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cleaning_checklist_items" TO "service_role";



GRANT ALL ON TABLE "public"."cleaning_checklist_responses" TO "anon";
GRANT ALL ON TABLE "public"."cleaning_checklist_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."cleaning_checklist_responses" TO "service_role";



GRANT ALL ON TABLE "public"."cleaning_checklist_templates" TO "anon";
GRANT ALL ON TABLE "public"."cleaning_checklist_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."cleaning_checklist_templates" TO "service_role";



GRANT ALL ON TABLE "public"."cleaning_checklists" TO "anon";
GRANT ALL ON TABLE "public"."cleaning_checklists" TO "authenticated";
GRANT ALL ON TABLE "public"."cleaning_checklists" TO "service_role";



GRANT ALL ON TABLE "public"."cleaning_photos" TO "anon";
GRANT ALL ON TABLE "public"."cleaning_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."cleaning_photos" TO "service_role";



GRANT ALL ON TABLE "public"."cleaning_tasks" TO "anon";
GRANT ALL ON TABLE "public"."cleaning_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."cleaning_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."cleaning_templates" TO "anon";
GRANT ALL ON TABLE "public"."cleaning_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."cleaning_templates" TO "service_role";



GRANT ALL ON TABLE "public"."company_expenses" TO "anon";
GRANT ALL ON TABLE "public"."company_expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."company_expenses" TO "service_role";



GRANT ALL ON TABLE "public"."consent_records" TO "anon";
GRANT ALL ON TABLE "public"."consent_records" TO "authenticated";
GRANT ALL ON TABLE "public"."consent_records" TO "service_role";



GRANT ALL ON TABLE "public"."daily_prices" TO "anon";
GRANT ALL ON TABLE "public"."daily_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_prices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."daily_prices_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."daily_prices_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."daily_prices_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."deletion_requests" TO "anon";
GRANT ALL ON TABLE "public"."deletion_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."deletion_requests" TO "service_role";



GRANT ALL ON TABLE "public"."email_connections" TO "anon";
GRANT ALL ON TABLE "public"."email_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."email_connections" TO "service_role";



GRANT ALL ON TABLE "public"."email_extractions" TO "anon";
GRANT ALL ON TABLE "public"."email_extractions" TO "authenticated";
GRANT ALL ON TABLE "public"."email_extractions" TO "service_role";



GRANT ALL ON TABLE "public"."email_parse_log" TO "anon";
GRANT ALL ON TABLE "public"."email_parse_log" TO "authenticated";
GRANT ALL ON TABLE "public"."email_parse_log" TO "service_role";



GRANT ALL ON TABLE "public"."email_parser_cron_log" TO "anon";
GRANT ALL ON TABLE "public"."email_parser_cron_log" TO "authenticated";
GRANT ALL ON TABLE "public"."email_parser_cron_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."email_parser_cron_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."email_parser_cron_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."email_parser_cron_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."expense_documents" TO "anon";
GRANT ALL ON TABLE "public"."expense_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."expense_documents" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."feature_flag_audit" TO "service_role";



GRANT ALL ON TABLE "public"."financial_transactions" TO "anon";
GRANT ALL ON TABLE "public"."financial_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."google_feed_logs" TO "anon";
GRANT ALL ON TABLE "public"."google_feed_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."google_feed_logs" TO "service_role";



GRANT ALL ON TABLE "public"."google_merchant_sync_logs" TO "anon";
GRANT ALL ON TABLE "public"."google_merchant_sync_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."google_merchant_sync_logs" TO "service_role";



GRANT ALL ON TABLE "public"."google_merchant_sync_status" TO "anon";
GRANT ALL ON TABLE "public"."google_merchant_sync_status" TO "authenticated";
GRANT ALL ON TABLE "public"."google_merchant_sync_status" TO "service_role";



GRANT ALL ON TABLE "public"."guests" TO "anon";
GRANT ALL ON TABLE "public"."guests" TO "authenticated";
GRANT ALL ON TABLE "public"."guests" TO "service_role";



GRANT ALL ON TABLE "public"."image_variants" TO "anon";
GRANT ALL ON TABLE "public"."image_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."image_variants" TO "service_role";



GRANT ALL ON TABLE "public"."organization_analytics_config" TO "anon";
GRANT ALL ON TABLE "public"."organization_analytics_config" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_analytics_config" TO "service_role";



GRANT ALL ON TABLE "public"."organization_branding" TO "anon";
GRANT ALL ON TABLE "public"."organization_branding" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_branding" TO "service_role";



GRANT ALL ON TABLE "public"."organization_financial_settings" TO "service_role";
GRANT SELECT ON TABLE "public"."organization_financial_settings" TO "authenticated";



GRANT ALL ON TABLE "public"."organization_public_profile" TO "anon";
GRANT ALL ON TABLE "public"."organization_public_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_public_profile" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."owners" TO "anon";
GRANT ALL ON TABLE "public"."owners" TO "authenticated";
GRANT ALL ON TABLE "public"."owners" TO "service_role";



GRANT ALL ON TABLE "public"."password_reset_tokens" TO "anon";
GRANT ALL ON TABLE "public"."password_reset_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."password_reset_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."payout_rule_components" TO "service_role";
GRANT SELECT ON TABLE "public"."payout_rule_components" TO "authenticated";



GRANT ALL ON TABLE "public"."pilot_organizations" TO "service_role";



GRANT ALL ON TABLE "public"."platforms" TO "anon";
GRANT ALL ON TABLE "public"."platforms" TO "authenticated";
GRANT ALL ON TABLE "public"."platforms" TO "service_role";



GRANT ALL ON TABLE "public"."pricing_rules" TO "anon";
GRANT ALL ON TABLE "public"."pricing_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."pricing_rules" TO "service_role";



GRANT ALL ON TABLE "public"."properties" TO "anon";
GRANT ALL ON TABLE "public"."properties" TO "authenticated";
GRANT ALL ON TABLE "public"."properties" TO "service_role";



GRANT ALL ON TABLE "public"."property_amenities" TO "anon";
GRANT ALL ON TABLE "public"."property_amenities" TO "authenticated";
GRANT ALL ON TABLE "public"."property_amenities" TO "service_role";



GRANT ALL ON TABLE "public"."property_availability" TO "anon";
GRANT ALL ON TABLE "public"."property_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."property_availability" TO "service_role";



GRANT ALL ON TABLE "public"."property_bathrooms" TO "anon";
GRANT ALL ON TABLE "public"."property_bathrooms" TO "authenticated";
GRANT ALL ON TABLE "public"."property_bathrooms" TO "service_role";



GRANT ALL ON TABLE "public"."property_cancellation_policies" TO "anon";
GRANT ALL ON TABLE "public"."property_cancellation_policies" TO "authenticated";
GRANT ALL ON TABLE "public"."property_cancellation_policies" TO "service_role";



GRANT ALL ON TABLE "public"."property_cancellation_policy_periods" TO "anon";
GRANT ALL ON TABLE "public"."property_cancellation_policy_periods" TO "authenticated";
GRANT ALL ON TABLE "public"."property_cancellation_policy_periods" TO "service_role";



GRANT ALL ON TABLE "public"."property_discounts" TO "anon";
GRANT ALL ON TABLE "public"."property_discounts" TO "authenticated";
GRANT ALL ON TABLE "public"."property_discounts" TO "service_role";



GRANT ALL ON TABLE "public"."property_documents" TO "anon";
GRANT ALL ON TABLE "public"."property_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."property_documents" TO "service_role";



GRANT ALL ON TABLE "public"."property_fees" TO "anon";
GRANT ALL ON TABLE "public"."property_fees" TO "authenticated";
GRANT ALL ON TABLE "public"."property_fees" TO "service_role";



GRANT ALL ON TABLE "public"."property_financial_parameters" TO "service_role";
GRANT SELECT ON TABLE "public"."property_financial_parameters" TO "authenticated";



GRANT ALL ON TABLE "public"."property_images" TO "anon";
GRANT ALL ON TABLE "public"."property_images" TO "authenticated";
GRANT ALL ON TABLE "public"."property_images" TO "service_role";



GRANT ALL ON TABLE "public"."property_listings" TO "anon";
GRANT ALL ON TABLE "public"."property_listings" TO "authenticated";
GRANT ALL ON TABLE "public"."property_listings" TO "service_role";



GRANT ALL ON TABLE "public"."property_prices" TO "anon";
GRANT ALL ON TABLE "public"."property_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."property_prices" TO "service_role";



GRANT ALL ON TABLE "public"."property_reviews" TO "anon";
GRANT ALL ON TABLE "public"."property_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."property_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."property_rooms" TO "anon";
GRANT ALL ON TABLE "public"."property_rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."property_rooms" TO "service_role";



GRANT ALL ON TABLE "public"."regras_repasse" TO "service_role";
GRANT SELECT ON TABLE "public"."regras_repasse" TO "authenticated";



GRANT ALL ON TABLE "public"."reservation_conflicts" TO "anon";
GRANT ALL ON TABLE "public"."reservation_conflicts" TO "authenticated";
GRANT ALL ON TABLE "public"."reservation_conflicts" TO "service_role";



GRANT ALL ON TABLE "public"."reservation_financial_snapshots" TO "service_role";
GRANT SELECT ON TABLE "public"."reservation_financial_snapshots" TO "authenticated";



GRANT ALL ON TABLE "public"."reservation_matches" TO "anon";
GRANT ALL ON TABLE "public"."reservation_matches" TO "authenticated";
GRANT ALL ON TABLE "public"."reservation_matches" TO "service_role";



GRANT ALL ON TABLE "public"."reservation_org_backfill_20260719" TO "anon";
GRANT ALL ON TABLE "public"."reservation_org_backfill_20260719" TO "authenticated";
GRANT ALL ON TABLE "public"."reservation_org_backfill_20260719" TO "service_role";



GRANT ALL ON TABLE "public"."reservation_sources" TO "anon";
GRANT ALL ON TABLE "public"."reservation_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."reservation_sources" TO "service_role";



GRANT ALL ON TABLE "public"."reservations" TO "anon";
GRANT ALL ON TABLE "public"."reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."reservations" TO "service_role";



GRANT ALL ON TABLE "public"."sync_logs" TO "anon";
GRANT ALL ON TABLE "public"."sync_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_logs" TO "service_role";



GRANT ALL ON TABLE "public"."task_history" TO "anon";
GRANT ALL ON TABLE "public"."task_history" TO "authenticated";
GRANT ALL ON TABLE "public"."task_history" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_properties" TO "anon";
GRANT ALL ON TABLE "public"."user_properties" TO "authenticated";
GRANT ALL ON TABLE "public"."user_properties" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































