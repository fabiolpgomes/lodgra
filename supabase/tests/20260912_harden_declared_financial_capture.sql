BEGIN;

-- Dedicated property/reservation; nested rollback also works in SQL executors
-- which do not preserve the outer transaction. Never mutate a real reservation.
DO $test$
DECLARE
  v_user uuid;
  v_org uuid;
  v_property uuid := gen_random_uuid();
  v_reservation uuid := gen_random_uuid();
  v_rule jsonb;
  v_result jsonb;
  v_components jsonb;
  v_total numeric;
  v_metadata jsonb;
BEGIN
  BEGIN
    SELECT id, organization_id INTO v_user, v_org
    FROM public.user_profiles WHERE role = 'admin' AND organization_id IS NOT NULL LIMIT 1;
    IF v_user IS NULL THEN RAISE EXCEPTION 'fixture requires an admin'; END IF;
    PERFORM set_config('request.jwt.claim.sub', v_user::text, true);
    INSERT INTO public.properties(id, organization_id, name)
    VALUES(v_property, v_org, 'Story 47.4 transactional hardening fixture');
    INSERT INTO public.reservations(id, organization_id, property_id, check_in, check_out,
      booking_source, currency, total_amount, status)
    VALUES(v_reservation, v_org, v_property, DATE '2039-01-01', DATE '2039-01-05',
      'ical_booking', 'EUR', 125.50, 'confirmed');
    SELECT jsonb_agg(jsonb_build_object('component_code',code,'recipient','owner',
      'commission_base_effect','ignore','owner_statement_effect','ignore')) INTO v_components
    FROM unnest(ARRAY['accommodation','cleaning_fee','municipal_tax','other_guest_fees',
      'discount','ota_commission','payment_processing_fee']) code;

    BEGIN
      PERFORM public.replace_reservation_financial_snapshot(v_reservation,NULL,'declared_owner_base','EUR',321.09);
      RAISE EXCEPTION 'absent contract accepted';
    EXCEPTION WHEN SQLSTATE '22023' THEN
      IF SQLERRM <> 'DECLARED_OWNER_BASE_NOT_ALLOWED' THEN RAISE; END IF;
    END;

    BEGIN
      INSERT INTO public.regras_repasse(organization_id,propriedade_id,vigencia_inicio,
        tipo_comissao,comissao_valor,base_comissao,taxa_limpeza_para,comissao_ota_por_conta)
      VALUES(v_org,v_property,CURRENT_DATE,'percentual',10,'faturamento_propriedade','gestor','proprietario');
      BEGIN
        PERFORM public.replace_reservation_financial_snapshot(v_reservation,NULL,'declared_owner_base','EUR',321.09);
        RAISE EXCEPTION 'legacy contract accepted';
      EXCEPTION WHEN SQLSTATE '22023' THEN
        IF SQLERRM <> 'DECLARED_OWNER_BASE_NOT_ALLOWED' THEN RAISE; END IF;
      END;
      RAISE EXCEPTION USING ERRCODE='Z4741', MESSAGE='legacy fixture rollback';
    EXCEPTION WHEN SQLSTATE 'Z4741' THEN NULL;
    END;

    BEGIN
      PERFORM public.create_property_payout_rule_v2(v_property,(now() AT TIME ZONE 'UTC')::date,
        'percentual',10,0,'check_out','manager_trust','custom',false,1::smallint,v_components,NULL,false);
      BEGIN
        PERFORM public.replace_reservation_financial_snapshot(v_reservation,NULL,'declared_owner_base','EUR',321.09);
        RAISE EXCEPTION 'opt-out contract accepted';
      EXCEPTION WHEN SQLSTATE '22023' THEN
        IF SQLERRM <> 'DECLARED_OWNER_BASE_NOT_ALLOWED' THEN RAISE; END IF;
      END;
      RAISE EXCEPTION USING ERRCODE='Z4742', MESSAGE='opt-out fixture rollback';
    EXCEPTION WHEN SQLSTATE 'Z4742' THEN NULL;
    END;

    SELECT public.create_property_payout_rule_v2(v_property,(now() AT TIME ZONE 'UTC')::date,
      'percentual',10,0,'check_out','manager_trust','custom',false,1::smallint,v_components,NULL,true)
    INTO v_rule;
    SELECT public.replace_reservation_financial_snapshot(v_reservation,NULL,'declared_owner_base','EUR',321.09)
    INTO v_result;
    SELECT total_amount INTO v_total FROM public.reservations WHERE id=v_reservation;
    SELECT source_metadata INTO v_metadata FROM public.reservation_financial_snapshots
    WHERE id=(v_result->>'snapshot_id')::uuid;
    IF v_total IS DISTINCT FROM 321.09 OR v_result->>'status' IS DISTINCT FROM 'complete'
      OR (v_metadata->>'legacy_total_amount_before_capture')::numeric IS DISTINCT FROM 125.50
      OR v_metadata->>'declared_payout_rule_id' IS DISTINCT FROM v_rule->>'current_rule_id'
      OR EXISTS(SELECT 1 FROM public.reservation_financial_snapshots WHERE reservation_id=v_reservation AND guest_total_amount IS NOT NULL)
    THEN RAISE EXCEPTION 'declared sync or semantic lineage failed'; END IF;

    BEGIN
      UPDATE public.reservations SET total_amount=999 WHERE id=v_reservation;
      RAISE EXCEPTION 'generic total overwrite accepted';
    EXCEPTION WHEN SQLSTATE 'PT409' THEN
      IF SQLERRM <> 'FINANCIAL_TOTAL_MANAGED_BY_SNAPSHOT' THEN RAISE; END IF;
    END;
    BEGIN
      UPDATE public.reservations SET currency='USD' WHERE id=v_reservation;
      RAISE EXCEPTION 'currency overwrite accepted';
    EXCEPTION WHEN SQLSTATE 'PT409' THEN
      IF SQLERRM <> 'FINANCIAL_TOTAL_MANAGED_BY_SNAPSHOT' THEN RAISE; END IF;
    END;
    BEGIN
      UPDATE public.reservations SET booking_source='manual' WHERE id=v_reservation;
      RAISE EXCEPTION 'provider overwrite accepted';
    EXCEPTION WHEN SQLSTATE 'PT409' THEN
      IF SQLERRM <> 'FINANCIAL_TOTAL_MANAGED_BY_SNAPSHOT' THEN RAISE; END IF;
    END;
    UPDATE public.reservations SET total_amount=321.09, guest_name='Metadata still editable' WHERE id=v_reservation;
    BEGIN
      PERFORM public.replace_reservation_financial_snapshot(v_reservation,NULL,'declared_owner_base','EUR',322.09);
      RAISE EXCEPTION 'stale version accepted';
    EXCEPTION WHEN SQLSTATE 'PT409' THEN
      IF SQLERRM <> 'FINANCIAL_FACTS_CONFLICT' THEN RAISE; END IF;
    END;
    PERFORM public.replace_reservation_financial_snapshot(v_reservation,1,'declared_owner_base','EUR',322.09);
    PERFORM public.replace_reservation_financial_snapshot(v_reservation,2,'component_breakdown','EUR');
    UPDATE public.reservations SET total_amount=555 WHERE id=v_reservation;
    IF (SELECT total_amount FROM public.reservations WHERE id=v_reservation) IS DISTINCT FROM 555
    THEN RAISE EXCEPTION 'detailed mode retained declared restriction'; END IF;

    -- A missing auth identity must fail before all writes.
    PERFORM set_config('request.jwt.claim.sub','',true);
    BEGIN
      PERFORM public.replace_reservation_financial_snapshot(v_reservation,3,'component_breakdown','EUR');
      RAISE EXCEPTION 'unauthenticated capture accepted';
    EXCEPTION WHEN SQLSTATE '42501' THEN
      IF SQLERRM <> 'FINANCIAL_FACTS_FORBIDDEN' THEN RAISE; END IF;
    END;
    RAISE EXCEPTION USING ERRCODE='Z4740', MESSAGE='all transactional hardening assertions passed';
  EXCEPTION WHEN SQLSTATE 'Z4740' THEN
    RAISE NOTICE 'Story 47.4 hardening assertions passed; fixture rolled back';
  END;
  IF EXISTS(SELECT 1 FROM public.properties WHERE id=v_property)
    OR EXISTS(SELECT 1 FROM public.reservations WHERE id=v_reservation)
    OR EXISTS(SELECT 1 FROM public.reservation_financial_snapshots WHERE reservation_id=v_reservation)
  THEN RAISE EXCEPTION 'hardening fixture leaked'; END IF;
END;
$test$;

ROLLBACK;
