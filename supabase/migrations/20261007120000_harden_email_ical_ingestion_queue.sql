-- Idempotente: o staging já tinha uma versão anterior aplicada como 20261001081009.
-- Story 38.1: one canonical inbox, safe retry queue and cross-provider reconciliation.
ALTER TABLE public.email_connections ADD COLUMN IF NOT EXISTS sync_page_token text, ADD COLUMN IF NOT EXISTS sync_query text;
ALTER TABLE public.raw_emails DROP CONSTRAINT IF EXISTS raw_emails_provider_check;
ALTER TABLE public.raw_emails ADD CONSTRAINT raw_emails_provider_check CHECK(provider IN ('resend','gmail'));
ALTER TABLE public.raw_emails DROP CONSTRAINT IF EXISTS raw_emails_org_provider_message_key;
ALTER TABLE public.raw_emails ADD CONSTRAINT raw_emails_org_provider_message_key UNIQUE(organization_id,provider,provider_message_id);
ALTER TABLE public.email_extractions DROP CONSTRAINT IF EXISTS email_extractions_source_platform_check;
ALTER TABLE public.email_extractions ADD CONSTRAINT email_extractions_source_platform_check CHECK(source_platform IN ('airbnb','booking','vrbo','flatio'));
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_platform_reference ON public.reservations(organization_id,source,booking_reference)
 WHERE deleted_at IS NULL AND nullif(btrim(booking_reference),'') IS NOT NULL AND source IN ('booking','airbnb','flatio','vrbo');
-- The same reservation confirmation may arrive through Gmail and Resend.
DROP INDEX IF EXISTS public.idx_email_extractions_event_unique;
CREATE INDEX IF NOT EXISTS idx_email_extractions_event ON public.email_extractions(organization_id,matched_event_id) WHERE matched_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_raw_emails_claim ON public.raw_emails(received_at,id) WHERE processing_status IN ('pending','retry','processing');

CREATE OR REPLACE FUNCTION public.claim_email_reconciliation_batch(p_limit integer DEFAULT 20)
RETURNS SETOF public.raw_emails LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $$
BEGIN
 IF (NULLIF(current_setting('request.jwt.claims',true),'')::jsonb->>'role') IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='service_role required';
 END IF;
 -- A crashed last attempt must become visible, rather than remain processing forever.
 UPDATE public.raw_emails re SET processing_status='needs_review',last_error='RETRY_EXHAUSTED',updated_at=now()
 WHERE re.attempt_count>=5 AND (re.processing_status IN ('pending','retry') OR
  (re.processing_status='processing' AND re.updated_at<now()-interval '10 minutes'))
 AND EXISTS(SELECT 1 FROM public.organizations o WHERE o.id=re.organization_id AND o.email_ical_reconciliation_enabled);
 RETURN QUERY WITH candidates AS (
  SELECT re.id FROM public.raw_emails re JOIN public.organizations o ON o.id=re.organization_id
  WHERE (re.processing_status='pending' OR (re.processing_status='retry' AND re.updated_at<now()-interval '1 minute')
    OR (re.processing_status='processing' AND re.updated_at<now()-interval '10 minutes'))
    AND re.attempt_count<5 AND o.email_ical_reconciliation_enabled
  ORDER BY re.received_at,re.id FOR UPDATE OF re SKIP LOCKED
  LIMIT greatest(1,least(coalesce(p_limit,20),50))
 ) UPDATE public.raw_emails re SET processing_status='processing',attempt_count=re.attempt_count+1,last_error=NULL,updated_at=now()
 FROM candidates c WHERE re.id=c.id RETURNING re.*;
END $$;
REVOKE ALL ON FUNCTION public.claim_email_reconciliation_batch(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_email_reconciliation_batch(integer) TO service_role;

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

  IF NOT p_confirmed_by_host AND NOT EXISTS(
    SELECT 1 FROM public.organizations o WHERE o.id=v_extraction.organization_id
      AND o.email_ical_reconciliation_enabled
      AND v_extraction.source_platform=ANY(o.email_ical_pilot_platforms)
  ) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='reconciliation disabled for organization or platform';
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

  IF NOT p_confirmed_by_host AND v_extraction.match_status NOT IN ('pending','no_match','auto_matched') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'extraction requires host review';
  END IF;

  IF v_event.status = 'ignored' THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ignored calendar event';
  END IF;

  IF NULLIF(btrim(v_extraction.reservation_code),'') IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(v_extraction.organization_id::text||':'||v_extraction.source_platform||':'||btrim(v_extraction.reservation_code),0));
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_event.property_id::text, 0));

  SELECT r.id, r.email_extraction_id, r.calendar_event_id
  INTO v_reservation_id, v_existing_extraction_id, v_existing_event_id
  FROM public.reservations r
  WHERE r.organization_id = v_extraction.organization_id
    AND (r.email_extraction_id = v_extraction.id OR r.calendar_event_id = v_event.id
      OR r.id=v_event.reservation_id
      OR (NULLIF(btrim(v_extraction.reservation_code),'') IS NOT NULL
          AND r.source=v_extraction.source_platform
          AND (r.booking_reference=btrim(v_extraction.reservation_code)
            OR r.external_id=v_extraction.source_platform||'_'||btrim(v_extraction.reservation_code))))
  ORDER BY r.created_at, r.id
  LIMIT 1
  FOR UPDATE;

  IF v_reservation_id IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM public.reservations r WHERE r.id=v_reservation_id
      AND r.deleted_at IS NULL AND r.status='confirmed' AND r.reservation_status IS DISTINCT FROM 'cancelled'
      AND r.property_id=v_event.property_id AND r.property_listing_id=v_event.property_listing_id
      AND r.check_in=v_event.check_in AND r.check_out=v_event.check_out
      AND r.source=v_extraction.source_platform
      AND (NULLIF(btrim(v_extraction.reservation_code),'') IS NULL OR r.booking_reference IS NULL
           OR r.booking_reference=btrim(v_extraction.reservation_code))) THEN
      RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='existing reservation identity or lifecycle mismatch';
    END IF;
    IF v_existing_extraction_id IS NOT NULL AND v_existing_extraction_id <> v_extraction.id
       AND (NULLIF(btrim(v_extraction.reservation_code),'') IS NULL OR NOT EXISTS(
         SELECT 1 FROM public.reservations r WHERE r.id=v_reservation_id
           AND r.booking_reference=btrim(v_extraction.reservation_code))) THEN
      RAISE EXCEPTION USING ERRCODE='23505', MESSAGE='ambiguous duplicate confirmation';
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
      AND r.status='confirmed' AND r.reservation_status IS DISTINCT FROM 'cancelled' AND r.deleted_at IS NULL
      AND r.property_listing_id=v_event.property_listing_id
      AND r.source=v_extraction.source_platform
      AND (r.booking_reference IS NULL OR r.booking_reference=NULLIF(btrim(v_extraction.reservation_code),''))
      AND r.calendar_event_id IS NULL
      AND r.email_extraction_id IS NULL
    ORDER BY r.created_at, r.id
    LIMIT 1
    FOR UPDATE;
  END IF;

    IF EXISTS(SELECT 1 FROM public.reservations r WHERE r.id=v_reservation_id
      AND ((v_extraction.total_value IS NOT NULL AND r.total_amount IS NOT NULL AND r.total_amount<>v_extraction.total_value)
       OR (v_extraction.currency IS NOT NULL AND r.currency IS NOT NULL AND r.currency<>v_extraction.currency))) THEN
      RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='FINANCIAL_TOTAL_MANAGED_BY_SNAPSHOT';
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
      guest_name, first_name, last_name, number_of_guests, num_guests,
      total_amount, currency, calendar_event_id, email_extraction_id,
      confirmed_by_host, platform_synced_at, synced_at
    ) VALUES (
      v_extraction.organization_id, v_event.property_id, v_event.property_listing_id,
      v_extraction.check_in, v_extraction.check_out, 'confirmed', v_extraction.source_platform,
      v_extraction.source_platform, v_external_id, v_external_id,
      NULLIF(btrim(v_extraction.reservation_code), ''),
      btrim(v_extraction.guest_name), v_first_name, COALESCE(v_last_name, ''),
      v_extraction.guest_count, v_extraction.guest_count, v_extraction.total_value,
      v_extraction.currency, v_event.id, v_extraction.id,
      p_confirmed_by_host, now(), now()
    )
    RETURNING id INTO v_reservation_id;
    v_created := true;
  ELSE
    -- Preserve previously confirmed/financially managed facts on replay.
    IF v_existing_event_id IS NULL AND v_existing_extraction_id IS NULL THEN
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
        number_of_guests = COALESCE(v_extraction.guest_count, number_of_guests),
        total_amount = COALESCE(v_extraction.total_value, total_amount),
        currency = COALESCE(v_extraction.currency, currency),
        calendar_event_id = v_event.id,
        email_extraction_id = v_extraction.id,
        confirmed_by_host = confirmed_by_host OR p_confirmed_by_host,
        platform_synced_at = now(),
        updated_at = now()
    WHERE id = v_reservation_id;
    END IF;
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



REVOKE ALL ON FUNCTION public.reconcile_email_extraction(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_email_extraction(uuid,uuid,boolean) TO service_role;
