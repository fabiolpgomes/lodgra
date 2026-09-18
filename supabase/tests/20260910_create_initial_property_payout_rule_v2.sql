BEGIN;

DO $$
DECLARE
  v_user uuid;
  v_user_role text;
  v_org uuid;
  v_property uuid;
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
  SELECT up.id, up.role, up.organization_id, p.id
    INTO v_user, v_user_role, v_org, v_property
  FROM public.user_profiles AS up
  JOIN public.properties AS p ON p.organization_id = up.organization_id
  WHERE up.role IN ('admin', 'gestor')
    AND NOT EXISTS (
      SELECT 1
      FROM public.regras_repasse AS rr
      WHERE rr.organization_id = p.organization_id
        AND rr.propriedade_id = p.id
        AND rr.vigencia_fim IS NULL
    )
  ORDER BY (up.role = 'admin') DESC, p.id
  LIMIT 1;

  IF v_property IS NULL THEN
    RAISE EXCEPTION 'fixture requires a tenant-scoped property without a current payout rule';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_user::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('TimeZone', 'Pacific/Kiritimati', true);

  IF has_function_privilege('anon', 'public.create_property_payout_rule_v2(uuid,date,public.tipo_comissao_repasse,numeric,numeric,text,text,text,boolean,smallint,jsonb,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not execute initial v2 creation';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.create_property_payout_rule_v2(uuid,date,public.tipo_comissao_repasse,numeric,numeric,text,text,text,boolean,smallint,jsonb,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must execute the reviewed initial v2 wrapper';
  END IF;

  UPDATE public.user_profiles SET role = NULL WHERE id = v_user;
  BEGIN
    PERFORM public.create_property_payout_rule_v2(
      v_property, v_utc_today, 'percentual'::public.tipo_comissao_repasse, 20::numeric, 0::numeric,
      'check_out', 'manager_trust', 'net_received', true, 1::smallint, v_components, NULL
    );
    RAISE EXCEPTION 'NULL role must not bypass initial v2 authorization';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;
  UPDATE public.user_profiles SET role = v_user_role WHERE id = v_user;

  SELECT public.create_property_payout_rule_v2(
    v_property, v_utc_today, 'percentual'::public.tipo_comissao_repasse, 20::numeric, 0::numeric,
    'check_out', 'manager_trust', 'net_received', true, 1::smallint,
    v_components, 'initial v2 transaction test'
  ) INTO v_result;
  v_new_rule := (v_result->>'current_rule_id')::uuid;

  IF v_result->'previous_rule_id' IS DISTINCT FROM 'null'::jsonb
     OR (SELECT contract_version FROM public.regras_repasse WHERE id = v_new_rule) IS DISTINCT FROM 2
     OR (SELECT count(*) FROM public.payout_rule_components WHERE payout_rule_id = v_new_rule) <> 7
     OR (SELECT count(*) FROM public.regras_repasse WHERE propriedade_id = v_property AND vigencia_fim IS NULL) <> 1 THEN
    RAISE EXCEPTION 'initial v2 creation did not persist exactly one complete current policy';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.audit_logs
    WHERE resource_id = v_property::text
      AND action = 'create'
      AND details->>'event' = 'property_payout_rule_v2_created'
      AND details->>'current_rule_id' = v_new_rule::text
      AND details->'previous_rule_id' = 'null'::jsonb
  ) THEN
    RAISE EXCEPTION 'initial v2 creation audit event is missing';
  END IF;

  BEGIN
    PERFORM public.create_property_payout_rule_v2(
      v_property, v_utc_today, 'percentual'::public.tipo_comissao_repasse, 20::numeric, 0::numeric,
      'check_out', 'manager_trust', 'net_received', true, 1::smallint, v_components, NULL
    );
    RAISE EXCEPTION 'a second initial creation must fail its expected-absence precondition';
  EXCEPTION WHEN SQLSTATE '40001' THEN
    NULL;
  END;
END
$$;

ROLLBACK;
