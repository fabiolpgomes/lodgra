-- Run after 20260914052845. Synthetic fixtures always roll back, including on MCP
-- gateways that execute statements separately (the nested exception is deliberate).
BEGIN;
DO $$
DECLARE
  v_org uuid;
  v_property uuid;
  v_listing uuid;
  v_raw uuid;
  v_event uuid;
  v_extraction uuid;
  v_reservation uuid;
  v_result jsonb;
  v_expected jsonb;
  v_actual jsonb;
  v_tag text := 'manual-fields-test-' || gen_random_uuid()::text;
  v_case integer;
  v_repeat integer;
BEGIN
  BEGIN
    IF has_function_privilege('anon', 'public.reconcile_email_extraction(uuid,uuid,boolean)', 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.reconcile_email_extraction(uuid,uuid,boolean)', 'EXECUTE')
       OR NOT has_function_privilege('service_role', 'public.reconcile_email_extraction(uuid,uuid,boolean)', 'EXECUTE') THEN
      RAISE EXCEPTION 'RPC execute permissions changed';
    END IF;
    SELECT organization_id, property_id, id INTO v_org, v_property, v_listing
    FROM public.property_listings WHERE organization_id IS NOT NULL
    ORDER BY created_at, id LIMIT 1;
    IF v_listing IS NULL THEN RAISE EXCEPTION 'tenant-scoped listing fixture required'; END IF;
    PERFORM set_config('request.jwt.claim.role', '', true);
    PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

    INSERT INTO public.raw_emails (
      organization_id, provider_message_id, recipient, sender, subject,
      received_at, raw_content, processing_status, attempt_count
    ) VALUES (
      v_org, v_tag, 'reservas+test@lodgra.io', 'noreply@booking.com',
      'Synthetic manual preservation fixture', now(), 'synthetic fixture', 'processing', 1
    ) RETURNING id INTO v_raw;
    INSERT INTO public.calendar_events (
      organization_id, property_id, property_listing_id, source_platform,
      check_in, check_out, ical_uid, raw_summary, raw_vevent, event_kind, status
    ) VALUES (
      v_org, v_property, v_listing, 'booking', DATE '2099-10-21', DATE '2099-10-22',
      v_tag || '@booking.com', 'Reserved', '', 'reservation', 'unmatched'
    ) RETURNING id INTO v_event;
    INSERT INTO public.email_extractions (
      organization_id, raw_email_id, source_platform, confidence, guest_name,
      guest_count, check_in, check_out, total_value, currency, reservation_code,
      property_identifier_raw, match_status
    ) VALUES (
      v_org, v_raw, 'booking', 0.98, 'Email Original', 2,
      DATE '2099-10-21', DATE '2099-10-22', 180, 'EUR', v_tag,
      'Synthetic Property', 'auto_matched'
    ) RETURNING id INTO v_extraction;

    -- Email enriches an existing confirmed reservation; it cannot create one.
    INSERT INTO public.reservations(organization_id, property_id, property_listing_id,
      check_in, check_out, status, reservation_status, source, booking_source,
      calendar_event_id, guest_name, first_name, last_name, number_of_guests, total_amount, currency)
    VALUES(v_org, v_property, v_listing, DATE '2099-10-21', DATE '2099-10-22',
      'confirmed', 'confirmed', 'booking', 'booking', v_event, 'Email Original', 'Email', 'Original', 2, 180, 'EUR')
    RETURNING id INTO v_reservation;
    v_result := public.reconcile_email_extraction(v_extraction, v_event, false);
    IF (v_result->>'created')::boolean IS DISTINCT FROM false THEN
      RAISE EXCEPTION 'email created a reservation';
    END IF;

    -- Case 1: edited values. Case 2: explicitly empty values. Case 3: real zero
    -- amount and guest count must not be treated as a missing-value sentinel.
    FOR v_case IN 1..3 LOOP
      UPDATE public.reservations SET
        guest_name = CASE WHEN v_case = 2 THEN NULL ELSE 'Manual Person' END,
        first_name = CASE WHEN v_case = 2 THEN NULL ELSE 'Manual' END,
        last_name = CASE WHEN v_case = 2 THEN NULL ELSE 'Person' END,
        number_of_guests = CASE WHEN v_case = 1 THEN 3 WHEN v_case = 2 THEN NULL ELSE 0 END,
        total_amount = CASE WHEN v_case = 1 THEN 123.45 WHEN v_case = 2 THEN NULL ELSE 0 END,
        currency = CASE WHEN v_case = 2 THEN NULL ELSE 'USD' END,
        confirmed_by_host = false
      WHERE id = v_reservation;
      SELECT jsonb_build_array(guest_name, first_name, last_name, number_of_guests, total_amount, currency)
      INTO v_expected FROM public.reservations WHERE id = v_reservation;
      UPDATE public.email_extractions SET guest_name = 'Conflicting Email', guest_count = 9,
        total_value = 987.65, currency = 'EUR' WHERE id = v_extraction;
      FOR v_repeat IN 1..2 LOOP
        v_result := public.reconcile_email_extraction(v_extraction, v_event, false);
        SELECT jsonb_build_array(guest_name, first_name, last_name, number_of_guests, total_amount, currency)
        INTO v_actual FROM public.reservations WHERE id = v_reservation;
        IF v_actual IS DISTINCT FROM v_expected THEN
          RAISE EXCEPTION 'manual fields overwritten: case %, repetition %', v_case, v_repeat;
        END IF;
        IF (v_result->>'reservation_id')::uuid IS DISTINCT FROM v_reservation
           OR (v_result->>'created')::boolean IS DISTINCT FROM false
           OR (SELECT count(*) FROM public.reservations WHERE calendar_event_id = v_event) <> 1
           OR NOT EXISTS (SELECT 1 FROM public.reservations WHERE id = v_reservation
             AND email_extraction_id = v_extraction AND calendar_event_id = v_event
             AND organization_id = v_org AND property_listing_id = v_listing)
           OR NOT EXISTS (SELECT 1 FROM public.calendar_events WHERE id = v_event
             AND status = 'matched' AND reservation_id = v_reservation) THEN
          RAISE EXCEPTION 'reconciliation lost identity or links';
        END IF;
      END LOOP;
    END LOOP;
    RAISE EXCEPTION USING ERRCODE = 'P3812', MESSAGE = 'rollback manual field fixture';
  EXCEPTION WHEN SQLSTATE 'P3812' THEN
    IF SQLERRM <> 'rollback manual field fixture' THEN RAISE; END IF;
  END;
  IF EXISTS (SELECT 1 FROM public.raw_emails WHERE provider_message_id = v_tag)
     OR EXISTS (SELECT 1 FROM public.calendar_events WHERE ical_uid = v_tag || '@booking.com') THEN
    RAISE EXCEPTION 'synthetic fixture leaked after rollback';
  END IF;
END $$;
ROLLBACK;
