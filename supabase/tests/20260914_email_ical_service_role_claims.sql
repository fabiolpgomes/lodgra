-- Story 38.1: exercise actual RPCs with PostgREST JSON claims and SQL roles.
-- All writes, including queue claims, are rolled back by the inner subtransaction.
DO $test$
DECLARE
  v_signature text;
  v_call text;
  v_claims text;
  v_org uuid;
  v_property uuid;
  v_listing uuid;
  v_event uuid;
  v_again uuid;
BEGIN
  BEGIN
    FOREACH v_signature IN ARRAY ARRAY[
      'public.upsert_calendar_event_audit(uuid,uuid,uuid,text,date,date,text,text,text,text,uuid)',
      'public.claim_email_reconciliation_batch(integer)',
      'public.reconcile_email_extraction(uuid,uuid,boolean)'
    ] LOOP
      IF has_function_privilege('anon', v_signature, 'EXECUTE')
         OR has_function_privilege('authenticated', v_signature, 'EXECUTE')
         OR NOT has_function_privilege('service_role', v_signature, 'EXECUTE') THEN
        RAISE EXCEPTION 'incorrect RPC privileges: %', v_signature;
      END IF;
    END LOOP;

    -- Even with SQL service_role privileges, absent/non-service JWTs must fail.
    -- A stale legacy GUC must never authorize a modern authenticated request.
    PERFORM set_config('role', 'service_role', true);
    PERFORM set_config('request.jwt.claim.role', 'service_role', true);
    FOREACH v_claims IN ARRAY ARRAY['', '{}', '{"role":"anon"}', '{"role":"authenticated"}'] LOOP
      PERFORM set_config('request.jwt.claims', v_claims, true);
      FOREACH v_call IN ARRAY ARRAY[
        'SELECT public.upsert_calendar_event_audit(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL)',
        'SELECT public.claim_email_reconciliation_batch(1)',
        'SELECT public.reconcile_email_extraction(NULL,NULL,false)'
      ] LOOP
        BEGIN
          EXECUTE v_call;
          RAISE EXCEPTION 'RPC accepted unauthorized claims: %', v_claims;
        EXCEPTION WHEN insufficient_privilege THEN
          IF SQLERRM <> 'service_role required' THEN RAISE; END IF;
        END;
      END LOOP;
    END LOOP;

    PERFORM set_config('request.jwt.claim.role', '', true);
    PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
    SELECT organization_id, property_id, id INTO v_org, v_property, v_listing
      FROM public.property_listings WHERE organization_id IS NOT NULL
      ORDER BY created_at, id LIMIT 1;
    IF v_listing IS NULL THEN RAISE EXCEPTION 'fixture requires a listing'; END IF;

    SELECT id INTO v_event FROM public.upsert_calendar_event_audit(
      v_org,v_property,v_listing,'booking',DATE '2099-10-01',DATE '2099-10-02',
      'test-json-claims@booking.com','CLOSED - Not available','','block',NULL);
    SELECT id INTO v_again FROM public.upsert_calendar_event_audit(
      v_org,v_property,v_listing,'booking',DATE '2099-10-01',DATE '2099-10-02',
      'test-json-claims@booking.com','CLOSED - Not available','','block',NULL);
    IF v_event IS NULL OR v_again IS DISTINCT FROM v_event THEN
      RAISE EXCEPTION 'audit RPC is not idempotent';
    END IF;
    PERFORM public.claim_email_reconciliation_batch(1);
    BEGIN
      PERFORM public.reconcile_email_extraction(NULL,NULL,false);
      RAISE EXCEPTION 'reconciliation accepted missing extraction';
    EXCEPTION WHEN no_data_found THEN
      IF SQLERRM <> 'email extraction not found' THEN RAISE; END IF;
    END;

    RAISE EXCEPTION USING ERRCODE='P3814', MESSAGE='rollback claims regression fixture';
  EXCEPTION WHEN SQLSTATE 'P3814' THEN
    IF SQLERRM <> 'rollback claims regression fixture' THEN RAISE; END IF;
  END;
END
$test$;
SELECT 'PASS: 3 RPC grants, 12 denied claims, JSON service_role, audit idempotency; all fixture writes rolled back' AS result;
