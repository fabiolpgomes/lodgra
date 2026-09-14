-- Story 38.1 AC11-14. Import availability into a reviewable reservation without
-- asserting guest identity, occupancy, money or booking confirmation.
BEGIN;

-- Replace the initial two-argument rollout signature without leaving an RPC overload.
DROP FUNCTION IF EXISTS public.import_ical_pending_reservation(uuid,uuid);
CREATE OR REPLACE FUNCTION public.import_ical_pending_reservation(
  p_organization_id uuid, p_event_id uuid, p_external_id_candidates text[] DEFAULT '{}'::text[]
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_event public.calendar_events%ROWTYPE;
  v_reservation public.reservations%ROWTYPE;
  v_created boolean := false;
  v_candidate_count integer;
  v_currency text;
BEGIN
  IF (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'service_role required';
  END IF;
  SELECT * INTO v_event FROM public.calendar_events
  WHERE id = p_event_id AND organization_id = p_organization_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'calendar event not found in organization';
  END IF;
  IF v_event.property_listing_id IS NULL OR v_event.check_in IS NULL
     OR v_event.check_out IS NULL OR v_event.check_out <= v_event.check_in
     OR v_event.event_kind NOT IN ('reservation', 'block')
     OR v_event.source_platform NOT IN ('booking', 'airbnb', 'flatio', 'vrbo') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'event is not importable availability';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_event.property_id::text, 0));
  SELECT * INTO v_reservation FROM public.reservations
  WHERE organization_id = p_organization_id AND calendar_event_id = v_event.id FOR UPDATE;
  IF FOUND AND (v_reservation.property_id IS DISTINCT FROM v_event.property_id
      OR v_reservation.property_listing_id IS DISTINCT FROM v_event.property_listing_id
      OR (v_event.reservation_id IS NOT NULL AND v_event.reservation_id <> v_reservation.id)) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'inconsistent reservation event identity';
  END IF;
  IF v_reservation.id IS NULL AND v_event.reservation_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'calendar event link has no reciprocal reservation';
  END IF;

  -- Upgrade a pre-link reservation only through its known external identity.
  -- The tenant, property and listing must all agree; dates alone never identify it.
  IF v_reservation.id IS NULL THEN
    SELECT count(*) INTO v_candidate_count FROM public.reservations
    WHERE organization_id = p_organization_id AND property_id = v_event.property_id
      AND property_listing_id = v_event.property_listing_id
      AND external_id = ANY(COALESCE(p_external_id_candidates, '{}'::text[]));
    IF v_candidate_count > 1 THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'ambiguous legacy reservation external identity';
    END IF;
    IF v_candidate_count = 1 THEN
      SELECT * INTO v_reservation FROM public.reservations
      WHERE organization_id = p_organization_id AND property_id = v_event.property_id
        AND property_listing_id = v_event.property_listing_id
        AND external_id = ANY(COALESCE(p_external_id_candidates, '{}'::text[])) FOR UPDATE;
      IF v_reservation.calendar_event_id IS NOT NULL THEN
        RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'legacy reservation is linked to another calendar event';
      END IF;
      UPDATE public.reservations SET calendar_event_id = v_event.id, updated_at = now()
      WHERE id = v_reservation.id;
      UPDATE public.calendar_events SET reservation_id = v_reservation.id,
        status = 'matched', updated_at = now() WHERE id = v_event.id;
    END IF;
  END IF;

  IF v_reservation.id IS NOT NULL AND (v_event.status = 'ignored'
     OR v_reservation.status = 'cancelled' OR v_reservation.reservation_status = 'cancelled'
     OR v_reservation.deleted_at IS NOT NULL) THEN
    INSERT INTO public.calendar_blocks (
      organization_id, property_id, property_listing_id, external_uid,
      start_date, end_date, block_type, notes
    ) VALUES (
      p_organization_id, v_event.property_id, v_event.property_listing_id,
      v_event.ical_uid, v_event.check_in, v_event.check_out, 'platform_sync',
      'Indisponibilidade confirmada pelo calendário'
    ) ON CONFLICT (organization_id, property_listing_id, external_uid)
    DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, updated_at = now();
    RETURN jsonb_build_object('reservation_id', v_reservation.id,
      'calendar_event_id', v_event.id, 'created', false,
      'action', CASE WHEN v_event.status = 'ignored' THEN 'ignored' ELSE 'blocked' END);
  END IF;

  IF v_reservation.id IS NULL THEN
    -- Currency comes from the host's property configuration, never from an
    -- assumed feed value or a global EUR fallback. Unknown stays NULL.
    SELECT NULLIF(btrim(currency), '') INTO v_currency FROM public.properties
    WHERE id = v_event.property_id AND organization_id = p_organization_id;
    INSERT INTO public.reservations (
      organization_id, property_id, property_listing_id, calendar_event_id,
      check_in, check_out, status, reservation_status, source, booking_source,
      external_id, external_reservation_id, guest_name, first_name, last_name,
      number_of_guests, total_amount, total_price, currency, confirmed_by_host,
      platform_synced_at, synced_at
    ) VALUES (
      p_organization_id, v_event.property_id, v_event.property_listing_id, v_event.id,
      v_event.check_in, v_event.check_out, 'pending', 'pending',
      v_event.source_platform, v_event.source_platform,
      'ical_' || v_event.id::text, 'ical_' || v_event.id::text,
      NULL, NULL, NULL, NULL, NULL, NULL, v_currency, false, now(), now()
    ) RETURNING * INTO v_reservation;
    v_created := true;
  ELSE
    -- Preserve host values and lifecycle; this RPC only owns feed dates.
    UPDATE public.reservations SET check_in = v_event.check_in, check_out = v_event.check_out,
      platform_synced_at = now(), synced_at = now(), updated_at = now()
    WHERE id = v_reservation.id;
  END IF;
  UPDATE public.calendar_events SET reservation_id = v_reservation.id,
    status = 'matched', updated_at = now() WHERE id = v_event.id;
  DELETE FROM public.calendar_blocks WHERE organization_id = p_organization_id
    AND property_id = v_event.property_id AND property_listing_id = v_event.property_listing_id
    AND external_uid = v_event.ical_uid AND block_type = 'platform_sync';
  RETURN jsonb_build_object('reservation_id', v_reservation.id,
    'calendar_event_id', v_event.id, 'created', v_created,
    'action', CASE WHEN v_created THEN 'created' ELSE 'updated' END);
END;
$$;

CREATE OR REPLACE FUNCTION public.review_ical_pending_reservation(
  p_organization_id uuid, p_reservation_id uuid, p_action text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_event_id uuid;
  v_previous_review_setting text;
  v_event public.calendar_events%ROWTYPE;
  v_reservation public.reservations%ROWTYPE;
BEGIN
  IF (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'service_role required';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('confirm', 'block') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'review action must be confirm or block';
  END IF;
  SELECT calendar_event_id INTO v_event_id FROM public.reservations
  WHERE id = p_reservation_id AND organization_id = p_organization_id;
  IF v_event_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'iCal reservation not found in organization';
  END IF;
  -- Follow the same event -> property -> reservation lock order as ingestion.
  SELECT * INTO v_event FROM public.calendar_events WHERE id = v_event_id
    AND organization_id = p_organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'calendar event not found'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_event.property_id::text, 0));
  SELECT * INTO v_reservation FROM public.reservations
  WHERE id = p_reservation_id AND organization_id = p_organization_id FOR UPDATE;
  IF v_reservation.calendar_event_id IS DISTINCT FROM v_event.id
     OR v_event.reservation_id IS DISTINCT FROM v_reservation.id
     OR v_reservation.property_id IS DISTINCT FROM v_event.property_id
     OR v_reservation.property_listing_id IS DISTINCT FROM v_event.property_listing_id THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'inconsistent reservation event identity';
  END IF;
  IF v_reservation.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'deleted iCal reservations cannot be reviewed';
  END IF;
  IF p_action = 'block' AND v_event.status = 'ignored'
     AND v_reservation.status = 'cancelled' AND v_reservation.reservation_status = 'cancelled' THEN
    RETURN jsonb_build_object('reservation_id', v_reservation.id, 'calendar_event_id', v_event.id, 'action', 'block');
  END IF;
  IF p_action = 'confirm' AND v_reservation.status = 'confirmed'
     AND v_reservation.reservation_status = 'confirmed' AND v_reservation.confirmed_by_host THEN
    RETURN jsonb_build_object('reservation_id', v_reservation.id, 'calendar_event_id', v_event.id, 'action', 'confirm');
  END IF;
  IF v_reservation.status IS DISTINCT FROM 'pending'
     OR v_reservation.reservation_status IS DISTINCT FROM 'pending'
     OR v_reservation.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'only pending iCal reservations can be reviewed';
  END IF;
  IF p_action = 'confirm' THEN
    -- The trigger accepts this transition only for this signed service request
    -- and reservation. Restore the prior setting before returning to the caller.
    v_previous_review_setting := current_setting('lodgra.ical_review_reservation_id', true);
    PERFORM set_config('lodgra.ical_review_reservation_id', v_reservation.id::text, true);
    UPDATE public.reservations SET status = 'confirmed', reservation_status = 'confirmed',
      confirmed_by_host = true, updated_at = now() WHERE id = v_reservation.id;
    PERFORM set_config('lodgra.ical_review_reservation_id', COALESCE(v_previous_review_setting, ''), true);
  ELSE
    INSERT INTO public.calendar_blocks (
      organization_id, property_id, property_listing_id, external_uid,
      start_date, end_date, block_type, notes
    ) VALUES (
      p_organization_id, v_event.property_id, v_event.property_listing_id,
      v_event.ical_uid, v_event.check_in, v_event.check_out, 'platform_sync',
      'Identificado pelo anfitrião como bloqueio'
    ) ON CONFLICT (organization_id, property_listing_id, external_uid)
    DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date,
      notes = EXCLUDED.notes, updated_at = now();
    UPDATE public.reservations SET status = 'cancelled', reservation_status = 'cancelled',
      cancelled_at = now(), updated_at = now() WHERE id = v_reservation.id;
    UPDATE public.calendar_events SET status = 'ignored', updated_at = now() WHERE id = v_event.id;
  END IF;
  RETURN jsonb_build_object('reservation_id', v_reservation.id, 'calendar_event_id', v_event.id, 'action', p_action);
END;
$$;

-- Protect the same invariant when a legacy UI writes directly through PostgREST.
-- Alphabetical trigger order runs this after bridge_legacy_reservation_write_trigger.
CREATE OR REPLACE FUNCTION public.guard_ical_reservation_lifecycle()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_authorized_review boolean;
BEGIN
  IF OLD.calendar_event_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.calendar_event_id IS DISTINCT FROM OLD.calendar_event_id THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'iCal reservation event identity cannot be removed or replaced';
  END IF;
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.property_id IS DISTINCT FROM OLD.property_id
     OR NEW.property_listing_id IS DISTINCT FROM OLD.property_listing_id THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'iCal reservation organization and property identity cannot be changed';
  END IF;
  IF (OLD.status = 'cancelled' OR OLD.reservation_status = 'cancelled' OR OLD.deleted_at IS NOT NULL)
     AND NEW.status IS DISTINCT FROM 'cancelled'
     AND NEW.reservation_status IS DISTINCT FROM 'cancelled'
     AND NEW.deleted_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'inactive iCal reservations cannot be reactivated';
  END IF;
  v_authorized_review := COALESCE(
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') = 'service_role'
    AND current_setting('lodgra.ical_review_reservation_id', true) = NEW.id::text, false);
  IF (OLD.status = 'pending' OR OLD.reservation_status = 'pending')
     AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.reservation_status IS DISTINCT FROM OLD.reservation_status)
     AND NEW.status IS DISTINCT FROM 'cancelled' AND NEW.reservation_status IS DISTINCT FROM 'cancelled'
     AND NOT (v_authorized_review AND NEW.status = 'confirmed' AND NEW.reservation_status = 'confirmed') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'pending iCal reservations must be confirmed through host review';
  END IF;
  IF OLD.status IS DISTINCT FROM 'pending' AND OLD.reservation_status IS DISTINCT FROM 'pending'
     AND (NEW.status = 'pending' OR NEW.reservation_status = 'pending') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'iCal reservations cannot be returned to pending by a stale edit';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS reservations_guard_ical_review_lifecycle ON public.reservations;
CREATE TRIGGER reservations_guard_ical_review_lifecycle BEFORE UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.guard_ical_reservation_lifecycle();
REVOKE ALL ON FUNCTION public.guard_ical_reservation_lifecycle() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_ical_reservation_lifecycle() TO service_role;

REVOKE ALL ON FUNCTION public.import_ical_pending_reservation(uuid,uuid,text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.review_ical_pending_reservation(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_ical_pending_reservation(uuid,uuid,text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_ical_pending_reservation(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_calendar_event_audit(p_organization_id uuid, p_property_id uuid, p_property_listing_id uuid, p_source_platform text, p_check_in date, p_check_out date, p_ical_uid text, p_raw_summary text, p_raw_vevent text, p_event_kind text, p_reservation_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') IS DISTINCT FROM 'service_role' THEN
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
      WHEN existing.status = 'ignored' AND existing.reservation_id IS NOT NULL THEN 'ignored'
      WHEN existing.reservation_id IS NOT NULL OR EXCLUDED.reservation_id IS NOT NULL THEN 'matched'
      WHEN EXCLUDED.event_kind = 'unknown' THEN 'ignored'
      ELSE 'unmatched'
    END,
    updated_at = now()
  RETURNING existing.id, existing.status;

  -- Publishing observation and advancing the availability version are atomic.
  -- A cleanup started before this audit must not cancel/delete these rows while
  -- the following import RPC is still waiting to run.
  UPDATE public.reservations r
  SET updated_at = GREATEST(r.updated_at, clock_timestamp())
  FROM public.calendar_events e
  WHERE e.organization_id = p_organization_id AND e.property_id = p_property_id
    AND e.property_listing_id = p_property_listing_id AND e.ical_uid = p_ical_uid
    AND r.id = e.reservation_id AND r.calendar_event_id = e.id
    AND r.organization_id = e.organization_id AND r.property_id = e.property_id
    AND r.property_listing_id = e.property_listing_id;
  UPDATE public.calendar_blocks b
  SET updated_at = GREATEST(b.updated_at, clock_timestamp())
  WHERE b.organization_id = p_organization_id AND b.property_id = p_property_id
    AND b.property_listing_id = p_property_listing_id AND b.external_uid = p_ical_uid
    AND b.block_type = 'platform_sync';
END;
$function$;

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
  v_external_id text;
  v_legacy_match_count integer;
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
    -- Dates establish availability, not reservation identity. Legacy adoption
    -- requires the exact channel confirmation code and an unambiguous scope.
    IF NULLIF(btrim(v_extraction.reservation_code), '') IS NOT NULL THEN
      SELECT count(*) INTO v_legacy_match_count FROM public.reservations r
      WHERE r.organization_id = v_extraction.organization_id
        AND r.property_id = v_event.property_id
        AND r.property_listing_id = v_event.property_listing_id
        AND COALESCE(r.booking_source, r.source) = v_extraction.source_platform
        AND (r.booking_reference = btrim(v_extraction.reservation_code)
          OR r.external_id = v_extraction.source_platform || '_' || btrim(v_extraction.reservation_code)
          OR r.external_reservation_id = v_extraction.source_platform || '_' || btrim(v_extraction.reservation_code));
      IF v_legacy_match_count > 1 THEN
        RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'ambiguous legacy reservation confirmation code';
      END IF;
      IF v_legacy_match_count = 1 THEN
        SELECT r.id, r.email_extraction_id, r.calendar_event_id
        INTO v_reservation_id, v_existing_extraction_id, v_existing_event_id
        FROM public.reservations r
        WHERE r.organization_id = v_extraction.organization_id
          AND r.property_id = v_event.property_id
          AND r.property_listing_id = v_event.property_listing_id
          AND COALESCE(r.booking_source, r.source) = v_extraction.source_platform
          AND (r.booking_reference = btrim(v_extraction.reservation_code)
            OR r.external_id = v_extraction.source_platform || '_' || btrim(v_extraction.reservation_code)
            OR r.external_reservation_id = v_extraction.source_platform || '_' || btrim(v_extraction.reservation_code))
        FOR UPDATE;
        IF v_existing_extraction_id IS NOT NULL AND v_existing_extraction_id <> v_extraction.id THEN
          RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'reservation already linked to another extraction';
        END IF;
        IF v_existing_event_id IS NOT NULL AND v_existing_event_id <> v_event.id THEN
          RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'reservation already linked to another calendar event';
        END IF;
      END IF;
    END IF;
  END IF;

  -- Email cannot undo host review, cancellation or deletion. Calendar identity
  -- and lifecycle belong to the already linked reservation, not the extraction.
  IF EXISTS (SELECT 1 FROM public.reservations WHERE id = v_reservation_id
      AND (status = 'cancelled' OR reservation_status = 'cancelled' OR deleted_at IS NOT NULL))
     OR (v_event.status = 'ignored' AND v_event.reservation_id IS NOT NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'inactive or ignored reservation cannot be reconciled';
  END IF;
  IF EXISTS (SELECT 1 FROM public.reservations WHERE id = v_reservation_id
      AND calendar_event_id IS NOT NULL
      AND (status = 'pending' OR reservation_status = 'pending')) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'pending iCal reservation requires host review before email reconciliation';
  END IF;

  v_external_id := CASE
    WHEN NULLIF(btrim(v_extraction.reservation_code), '') IS NOT NULL
      THEN v_extraction.source_platform || '_' || btrim(v_extraction.reservation_code)
    ELSE v_extraction.source_platform || '_' || split_part(v_event.ical_uid, '@', 1)
  END;

  IF v_reservation_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'existing confirmed reservation required before email reconciliation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.reservations WHERE id = v_reservation_id
      AND status = 'confirmed' AND reservation_status = 'confirmed'
      AND organization_id = v_event.organization_id AND property_id = v_event.property_id
      AND property_listing_id = v_event.property_listing_id) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'existing confirmed reservation required before email reconciliation';
  END IF;

    UPDATE public.reservations
    SET property_id = v_event.property_id,
        property_listing_id = v_event.property_listing_id,
        check_in = CASE WHEN v_existing_event_id IS NOT NULL THEN check_in ELSE v_extraction.check_in END,
        check_out = CASE WHEN v_existing_event_id IS NOT NULL THEN check_out ELSE v_extraction.check_out END,
        status = CASE WHEN v_existing_event_id IS NOT NULL THEN status ELSE 'confirmed' END,
        source = CASE WHEN v_existing_event_id IS NOT NULL THEN source ELSE v_extraction.source_platform END,
        booking_source = CASE WHEN v_existing_event_id IS NOT NULL THEN booking_source ELSE v_extraction.source_platform END,
        external_id = CASE WHEN v_existing_event_id IS NOT NULL THEN external_id ELSE v_external_id END,
        external_reservation_id = CASE WHEN v_existing_event_id IS NOT NULL THEN external_reservation_id ELSE v_external_id END,
        booking_reference = COALESCE(NULLIF(btrim(v_extraction.reservation_code), ''), booking_reference),
        calendar_event_id = v_event.id,
        email_extraction_id = v_extraction.id,
        confirmed_by_host = confirmed_by_host OR p_confirmed_by_host,
        platform_synced_at = now(),
        updated_at = now()
    WHERE id = v_reservation_id;

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
    'created', false
  );
END;
$function$;

COMMIT;
