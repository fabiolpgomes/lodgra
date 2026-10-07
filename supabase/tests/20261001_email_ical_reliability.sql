BEGIN;

DO $$
DECLARE
  v_code text := 'test-'||gen_random_uuid()::text;
  v_org uuid;
  v_property uuid;
  v_listing uuid;
  v_raw_email uuid;
  v_extraction uuid;
  v_event uuid;
  v_reservation uuid;
  v_second_result jsonb;
  v_duplicate uuid;
  v_duplicate_raw uuid;
BEGIN
  BEGIN
  IF has_function_privilege('anon', 'public.reconcile_email_extraction(uuid,uuid,boolean)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.reconcile_email_extraction(uuid,uuid,boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'reconciliation RPC must be service-role only';
  END IF;

  IF position('SKIP LOCKED' IN pg_get_functiondef(
    'public.claim_email_reconciliation_batch(integer)'::regprocedure
  )) = 0 THEN
    RAISE EXCEPTION 'queue claim must use SKIP LOCKED';
  END IF;

  SELECT pl.organization_id, pl.property_id, pl.id
  INTO v_org, v_property, v_listing
  FROM public.property_listings pl
  WHERE pl.organization_id IS NOT NULL
  ORDER BY pl.created_at, pl.id
  LIMIT 1;

  IF v_listing IS NULL THEN
    RAISE EXCEPTION 'fixture requires one tenant-scoped property listing';
  END IF;

  UPDATE public.organizations SET email_ical_reconciliation_enabled=true, email_ical_pilot_platforms=ARRAY['booking','flatio']::text[] WHERE id=v_org;

  -- Match the JSON claims supplied by PostgREST in production.
  PERFORM set_config('request.jwt.claim.role', '', true);
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  INSERT INTO public.raw_emails (
    organization_id, provider_message_id, recipient, sender, subject,
    received_at, raw_content, processing_status, attempt_count
  ) VALUES (
    v_org, 'test-atomic-reconciliation-2099', 'reservas+test@lodgra.io',
    'noreply@booking.com', 'Nova reserva', now(), 'synthetic fixture',
    'processing', 1
  ) RETURNING id INTO v_raw_email;

  INSERT INTO public.calendar_events (
    organization_id, property_id, property_listing_id, source_platform,
    check_in, check_out, ical_uid, raw_summary, raw_vevent, event_kind, status
  ) VALUES (
    v_org, v_property, v_listing, 'booking', DATE '2099-09-29', DATE '2099-09-30',
    'test-atomic-reconciliation@booking.com', 'CLOSED - Not available', '', 'block', 'unmatched'
  ) RETURNING id INTO v_event;

  INSERT INTO public.calendar_blocks (
    organization_id, property_id, property_listing_id, start_date, end_date,
    external_uid, block_type, notes
  ) VALUES (
    v_org, v_property, v_listing, DATE '2099-09-29', DATE '2099-09-30',
    'test-atomic-reconciliation@booking.com', 'platform_sync', 'provisional'
  );

  INSERT INTO public.email_extractions (
    organization_id, raw_email_id, source_platform, confidence, guest_name,
    guest_count, check_in, check_out, total_value, currency, reservation_code,
    property_identifier_raw, match_status
  ) VALUES (
    v_org, v_raw_email, 'booking', 0.98, 'Nuno Correia', 3,
    DATE '2099-09-29', DATE '2099-09-30', 162.09, 'EUR', v_code,
    'AHS Premium Apart', 'pending'
  ) RETURNING id INTO v_extraction;

  SELECT (public.reconcile_email_extraction(v_extraction, v_event, false)->>'reservation_id')::uuid
  INTO v_reservation;

  IF NOT EXISTS (
    SELECT 1 FROM public.reservations
    WHERE id = v_reservation
      AND organization_id = v_org
      AND property_id = v_property
      AND property_listing_id = v_listing
      AND calendar_event_id = v_event
      AND email_extraction_id = v_extraction
      AND booking_reference = v_code
      AND guest_name = 'Nuno Correia'
      AND check_in = DATE '2099-09-29'
      AND check_out = DATE '2099-09-30'
  ) THEN
    RAISE EXCEPTION 'atomic reconciliation did not create the expected reservation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.calendar_blocks
    WHERE organization_id = v_org
      AND property_listing_id = v_listing
      AND external_uid = 'test-atomic-reconciliation@booking.com'
  ) THEN
    RAISE EXCEPTION 'provisional block was not consumed';
  END IF;

  SELECT public.reconcile_email_extraction(v_extraction, v_event, false)
  INTO v_second_result;
  IF (v_second_result->>'reservation_id')::uuid IS DISTINCT FROM v_reservation
     OR (SELECT count(*) FROM public.reservations WHERE email_extraction_id = v_extraction) <> 1 THEN
    RAISE EXCEPTION 'reconciliation is not idempotent';
  END IF;

  INSERT INTO public.raw_emails(organization_id,provider,provider_message_id,recipient,sender,received_at,raw_content)
  VALUES(v_org,'gmail','test-cross-provider-2099','test@example.invalid','test@booking.com',now(),'synthetic duplicate') RETURNING id INTO v_duplicate_raw;
  INSERT INTO public.email_extractions(organization_id,raw_email_id,source_platform,confidence,guest_name,guest_count,check_in,check_out,total_value,currency,reservation_code,match_status)
  SELECT organization_id,v_duplicate_raw,source_platform,confidence,guest_name,guest_count,check_in,check_out,total_value,currency,reservation_code,'pending'
  FROM public.email_extractions WHERE id=v_extraction RETURNING id INTO v_duplicate;
  IF (public.reconcile_email_extraction(v_duplicate,v_event,false)->>'reservation_id')::uuid <> v_reservation THEN
    RAISE EXCEPTION 'cross-provider duplicate produced another reservation';
  END IF;
  IF (SELECT count(*) FROM public.reservations WHERE calendar_event_id=v_event)<>1 OR
     (SELECT count(*) FROM public.email_extractions WHERE matched_event_id=v_event)<>2 THEN
    RAISE EXCEPTION 'duplicate cardinality failure';
  END IF;
  UPDATE public.reservations SET status='cancelled' WHERE id=v_reservation;
  BEGIN
    PERFORM public.reconcile_email_extraction(v_duplicate,v_event,false);
    RAISE EXCEPTION 'cancelled reservation was revived';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  UPDATE public.reservations SET status='confirmed',deleted_at=now() WHERE id=v_reservation;
  BEGIN
    PERFORM public.reconcile_email_extraction(v_duplicate,v_event,false);
    RAISE EXCEPTION 'deleted reservation was revived';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  UPDATE public.reservations SET deleted_at=NULL WHERE id=v_reservation;
  UPDATE public.email_extractions SET total_value=999 WHERE id=v_duplicate;
  BEGIN
    PERFORM public.reconcile_email_extraction(v_duplicate,v_event,false);
    RAISE EXCEPTION 'conflicting financial replay accepted';
  EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL;
  END;
  -- Provider-local message IDs may coincide; only same-provider replay conflicts.
  INSERT INTO public.raw_emails(organization_id,provider,provider_message_id,recipient,sender,received_at,raw_content)
  VALUES(v_org,'resend','test-cross-provider-2099','test@example.invalid','test@booking.com',now(),'synthetic other transport');
  BEGIN
    INSERT INTO public.raw_emails(organization_id,provider,provider_message_id,recipient,sender,received_at,raw_content)
    VALUES(v_org,'gmail','test-cross-provider-2099','test@example.invalid','test@booking.com',now(),'synthetic replay');
    RAISE EXCEPTION 'same provider duplicate accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  UPDATE public.organizations SET email_ical_reconciliation_enabled=false WHERE id=v_org;
  BEGIN
    PERFORM public.reconcile_email_extraction(v_duplicate,v_event,false);
    RAISE EXCEPTION 'disabled rollout accepted automatic reconciliation';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE public.organizations SET email_ical_reconciliation_enabled=true,email_ical_pilot_platforms=ARRAY['flatio']::text[] WHERE id=v_org;
  BEGIN
    PERFORM public.reconcile_email_extraction(v_duplicate,v_event,false);
    RAISE EXCEPTION 'nonpilot platform accepted automatic reconciliation';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE public.organizations SET email_ical_pilot_platforms=ARRAY['booking','flatio']::text[] WHERE id=v_org;
  -- Flatio passes the contract; its exact source remains distinct from Booking.
  UPDATE public.email_extractions SET source_platform='flatio' WHERE id=v_duplicate;
  BEGIN
    PERFORM public.reconcile_email_extraction(v_duplicate,v_event,false);
    RAISE EXCEPTION 'cross-platform event accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  UPDATE public.organizations SET email_ical_reconciliation_enabled=true WHERE id=v_org;
  UPDATE public.raw_emails SET processing_status='processing',attempt_count=5,updated_at=now()-interval '20 minutes' WHERE id=v_duplicate_raw;
  PERFORM public.claim_email_reconciliation_batch(1);
  IF NOT EXISTS(SELECT 1 FROM public.raw_emails WHERE id=v_duplicate_raw AND processing_status='needs_review' AND last_error='RETRY_EXHAUSTED') THEN
    RAISE EXCEPTION 'exhausted lease remained invisible';
  END IF;
  RAISE EXCEPTION USING ERRCODE = 'P3810', MESSAGE = 'rollback atomic reconciliation fixture';
  EXCEPTION WHEN SQLSTATE 'P3810' THEN
    IF SQLERRM <> 'rollback atomic reconciliation fixture' THEN
      RAISE;
    END IF;
  END;
END
$$;

ROLLBACK;
