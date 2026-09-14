BEGIN;

DO $$
DECLARE
  v_org uuid;
  v_property uuid;
  v_listing uuid;
  v_raw_email uuid;
  v_extraction uuid;
  v_event uuid;
  v_reservation uuid;
  v_second_result jsonb;
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
    DATE '2099-09-29', DATE '2099-09-30', 162.09, 'EUR', '5762083928',
    'AHS Premium Apart', 'auto_matched'
  ) RETURNING id INTO v_extraction;

  -- A racing email between audit and iCal import cannot create a confirmed stay.
  BEGIN
    PERFORM public.reconcile_email_extraction(v_extraction, v_event, false);
    RAISE EXCEPTION 'email created a reservation before iCal import';
  EXCEPTION WHEN invalid_parameter_value THEN
    IF SQLERRM <> 'existing confirmed reservation required before email reconciliation' THEN RAISE; END IF;
  END;
  IF EXISTS(SELECT 1 FROM public.reservations WHERE calendar_event_id=v_event)
    OR NOT EXISTS(SELECT 1 FROM public.calendar_events WHERE id=v_event AND status='unmatched' AND reservation_id IS NULL) THEN
    RAISE EXCEPTION 'racing email changed availability identity';
  END IF;
  SELECT (public.import_ical_pending_reservation(v_org, v_event)->>'reservation_id')::uuid
  INTO v_reservation;
  UPDATE public.reservations SET guest_name='Nuno Correia', number_of_guests=3,
    total_amount=162.09, currency='EUR' WHERE id=v_reservation;
  PERFORM public.review_ical_pending_reservation(v_org,v_reservation,'confirm');

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
      AND booking_reference = '5762083928'
      AND guest_name = 'Nuno Correia'
      AND check_in = DATE '2099-09-29'
      AND check_out = DATE '2099-09-30'
  ) THEN
    RAISE EXCEPTION 'atomic reconciliation did not preserve the reviewed reservation';
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
  RAISE EXCEPTION USING ERRCODE = 'P3810', MESSAGE = 'rollback atomic reconciliation fixture';
  EXCEPTION WHEN SQLSTATE 'P3810' THEN
    IF SQLERRM <> 'rollback atomic reconciliation fixture' THEN
      RAISE;
    END IF;
  END;
END
$$;

ROLLBACK;
