-- Production RPC snapshot: 2026-09-14; Story 38.1.
CREATE OR REPLACE FUNCTION public.claim_email_reconciliation_batch(p_limit integer DEFAULT 20)
 RETURNS SETOF raw_emails
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
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
$function$
;
-- ACL: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.reconcile_email_extraction(p_extraction_id uuid, p_event_id uuid, p_confirmed_by_host boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
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
$function$
;
-- ACL: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.upsert_calendar_event_audit(p_organization_id uuid, p_property_id uuid, p_property_listing_id uuid, p_source_platform text, p_check_in date, p_check_out date, p_ical_uid text, p_raw_summary text, p_raw_vevent text, p_event_kind text, p_reservation_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
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
$function$
;
-- ACL: {postgres=X/postgres,service_role=X/postgres}
