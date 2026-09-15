BEGIN;

DO $$
DECLARE
  v_user uuid;
  v_user_role text;
  v_org uuid;
  v_property uuid;
  v_rule uuid;
  v_result jsonb;
  v_new_rule uuid;
  v_utc_today date := (pg_catalog.now() AT TIME ZONE 'UTC')::date;
  v_components jsonb := jsonb_build_array(
    jsonb_build_object('component_code', 'accommodation', 'recipient', 'owner', 'commission_base_effect', 'credit', 'owner_statement_effect', 'credit'),
    jsonb_build_object('component_code', 'cleaning_fee', 'recipient', 'manager', 'commission_base_effect', 'credit', 'owner_statement_effect', 'ignore'),
    jsonb_build_object('component_code', 'municipal_tax', 'recipient', 'municipality', 'commission_base_effect', 'credit', 'owner_statement_effect', 'ignore'),
    jsonb_build_object('component_code', 'other_guest_fees', 'recipient', 'owner', 'commission_base_effect', 'credit', 'owner_statement_effect', 'credit'),
    jsonb_build_object('component_code', 'discount', 'recipient', 'owner', 'commission_base_effect', 'debit', 'owner_statement_effect', 'debit'),
    jsonb_build_object('component_code', 'ota_commission', 'recipient', 'channel', 'commission_base_effect', 'debit', 'owner_statement_effect', 'debit'),
    jsonb_build_object('component_code', 'payment_processing_fee', 'recipient', 'payment_processor', 'commission_base_effect', 'debit', 'owner_statement_effect', 'debit')
  );
BEGIN
  SELECT up.id, up.role, up.organization_id, p.id, rr.id
    INTO v_user, v_user_role, v_org, v_property, v_rule
  FROM public.user_profiles up
  JOIN public.properties p ON p.organization_id = up.organization_id
  JOIN public.regras_repasse rr
    ON rr.organization_id = p.organization_id
   AND rr.propriedade_id = p.id
   AND rr.vigencia_fim IS NULL
  WHERE up.role IN ('admin', 'gestor')
    AND rr.vigencia_inicio < v_utc_today
  ORDER BY (up.role = 'admin') DESC, rr.vigencia_inicio
  LIMIT 1;

  IF v_rule IS NULL THEN
    RAISE EXCEPTION 'fixture requires an editable tenant-scoped payout rule';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_user::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('TimeZone', 'Pacific/Kiritimati', true);

  IF has_function_privilege('anon', 'public.replace_property_payout_rule_v2(uuid,uuid,date,public.tipo_comissao_repasse,numeric,numeric,text,text,text,boolean,smallint,jsonb,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not execute v2 replacement';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.replace_property_payout_rule_v2(uuid,uuid,date,public.tipo_comissao_repasse,numeric,numeric,text,text,text,boolean,smallint,jsonb,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must execute the reviewed wrapper';
  END IF;

  UPDATE public.user_profiles SET role = NULL WHERE id = v_user;
  BEGIN
    PERFORM public.replace_property_payout_rule_v2(
      v_property, v_rule, v_utc_today, 'percentual'::public.tipo_comissao_repasse, 20::numeric, 23::numeric,
      'check_out'::text, 'manager_trust'::text, 'net_received'::text, true, 5::smallint,
      v_components, NULL
    );
    RAISE EXCEPTION 'NULL role must not bypass v2 authorization';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;
  UPDATE public.user_profiles SET role = v_user_role WHERE id = v_user;

  BEGIN
    PERFORM public.replace_property_payout_rule(
      v_property, NULL, v_utc_today,
      'percentual'::public.tipo_comissao_repasse, 20::numeric,
      'faturamento_propriedade'::public.base_comissao_repasse,
      'gestor'::public.destinatario_taxa_repasse,
      'proprietario'::public.destinatario_taxa_repasse,
      true, 5::smallint, NULL
    );
    RAISE EXCEPTION 'NULL must not bypass legacy optimistic concurrency';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;

  BEGIN
    PERFORM public.replace_property_payout_rule_v2(
      v_property, NULL, v_utc_today, 'percentual'::public.tipo_comissao_repasse, 20::numeric, 23::numeric,
      'check_out'::text, 'manager_trust'::text, 'net_received'::text, true, 5::smallint,
      v_components, NULL
    );
    RAISE EXCEPTION 'NULL must not bypass v2 optimistic concurrency';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;

  BEGIN
    PERFORM public.replace_property_payout_rule_v2(
      v_property, v_rule, v_utc_today - 1, 'percentual'::public.tipo_comissao_repasse, 20::numeric, 23::numeric,
      'check_out'::text, 'manager_trust'::text, 'net_received'::text, true, 5::smallint,
      v_components, NULL
    );
    RAISE EXCEPTION 'retroactive v2 replacement should have failed';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;

  SELECT public.replace_property_payout_rule_v2(
    v_property, v_rule, v_utc_today, 'percentual'::public.tipo_comissao_repasse, 20::numeric, 23::numeric,
    'check_out'::text, 'manager_trust'::text, 'net_received'::text, true, 5::smallint,
    v_components, 'transactional v2 test'
  ) INTO v_result;
  v_new_rule := (v_result->>'current_rule_id')::uuid;

  IF (SELECT contract_version FROM public.regras_repasse WHERE id = v_new_rule) IS DISTINCT FROM 2
     OR (SELECT count(*) FROM public.payout_rule_components WHERE payout_rule_id = v_new_rule) <> 7
     OR (SELECT vigencia_fim FROM public.regras_repasse WHERE id = v_rule) IS DISTINCT FROM v_utc_today - 1 THEN
    RAISE EXCEPTION 'v2 replacement did not preserve the atomic versioned contract';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.regras_repasse
    WHERE id = v_new_rule
      AND (base_comissao IS NOT NULL OR taxa_limpeza_para IS NOT NULL OR comissao_ota_por_conta IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'v2 must not carry invented legacy semantics';
  END IF;

  BEGIN
    UPDATE public.regras_repasse SET recognition_basis = 'check_in' WHERE id = v_new_rule;
    RAISE EXCEPTION 'direct v2 mutation should have failed';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;

  BEGIN
    PERFORM public.replace_property_payout_rule_v2(
      v_property, v_new_rule, v_utc_today, 'percentual'::public.tipo_comissao_repasse, 20::numeric, 23::numeric,
      'check_out'::text, 'manager_trust'::text, 'net_received'::text, true, 5::smallint,
      v_components || jsonb_build_array(v_components->0), NULL
    );
    RAISE EXCEPTION 'invalid component cardinality should have failed';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;

  IF NOT EXISTS (
    SELECT 1 FROM public.audit_logs
    WHERE resource_id = v_property::text
      AND details->>'event' = 'property_payout_rule_v2_replaced'
      AND details->>'current_rule_id' = v_new_rule::text
  ) THEN
    RAISE EXCEPTION 'v2 replacement audit event is missing';
  END IF;
END
$$;

ROLLBACK;
