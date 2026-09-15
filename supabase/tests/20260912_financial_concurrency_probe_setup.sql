CREATE OR REPLACE FUNCTION public.story474_concurrency_probe(
  p_reservation_id uuid, p_operation text, p_start_at timestamptz,
  p_hold_ms integer DEFAULT 0, p_expected_version integer DEFAULT NULL, p_amount numeric DEFAULT 321.09
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $probe$
DECLARE prop uuid; rule_id uuid; comps jsonb; started timestamptz; acquired timestamptz;
  code text:='00000'; msg text:='OK'; outcome jsonb;
BEGIN
  IF p_hold_ms IS NULL OR p_hold_ms NOT BETWEEN 0 AND 4000
    OR p_operation NOT IN ('capture','generic','replace_rule') THEN
    RAISE EXCEPTION 'Invalid disposable probe request';
  END IF;
  SELECT r.property_id INTO prop FROM public.reservations r JOIN public.properties p ON p.id=r.property_id
  WHERE r.id=p_reservation_id AND p.name IN (
    'Story47.4-concurrency-authorized-20260912-1','Story47.4-concurrency-authorized-20260912-2',
    'Story47.4-concurrency-authorized-20260912-3','Story47.4-concurrency-authorized-20260912-4')
    AND p.organization_id='00000000-0000-0000-0000-000000000001';
  IF prop IS NULL THEN RAISE EXCEPTION 'Not an authorized disposable fixture'; END IF;
  PERFORM set_config('request.jwt.claim.sub','a1508087-6d88-4f53-b222-76b0b0379c0b',true);
  PERFORM pg_sleep(LEAST(5,GREATEST(0,EXTRACT(EPOCH FROM(p_start_at-clock_timestamp())))));
  started:=clock_timestamp();
  BEGIN
    IF p_operation='capture' THEN
      outcome:=public.replace_reservation_financial_snapshot(p_reservation_id,p_expected_version,'declared_owner_base','EUR',p_amount);
    ELSIF p_operation='generic' THEN
      UPDATE public.reservations SET total_amount=p_amount WHERE id=p_reservation_id;
    ELSE
      SELECT id INTO rule_id FROM public.regras_repasse WHERE propriedade_id=prop AND vigencia_fim IS NULL;
      SELECT jsonb_agg(jsonb_build_object('component_code',component_code,'recipient',recipient,
        'commission_base_effect',commission_base_effect,'owner_statement_effect',owner_statement_effect))
      INTO comps FROM public.payout_rule_components WHERE payout_rule_id=rule_id;
      outcome:=public.replace_property_payout_rule_v2(prop,rule_id,(now() AT TIME ZONE 'UTC')::date,
        'percentual',10,0,'check_out','manager_trust','custom',false,1::smallint,comps,NULL,false);
    END IF;
    acquired:=clock_timestamp();
    PERFORM pg_sleep(p_hold_ms/1000.0);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS code=RETURNED_SQLSTATE,msg=MESSAGE_TEXT;
  END;
  RETURN jsonb_build_object('pid',pg_backend_pid(),'started',started,'acquired',acquired,
    'ended',clock_timestamp(),'code',code,'message',msg,'result',outcome);
END $probe$;
REVOKE ALL ON FUNCTION public.story474_concurrency_probe(uuid,text,timestamptz,integer,integer,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.story474_concurrency_probe(uuid,text,timestamptz,integer,integer,numeric) TO service_role;
