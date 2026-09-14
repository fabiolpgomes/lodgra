-- Requires migrations 20260914052845, 20260914053242 and 20260914054000.
-- All fixtures are synthetic and rolled back inside the DO block as well as outside it.
BEGIN;
DO $$
DECLARE
  v_org uuid;
  v_property uuid;
  v_listing uuid;
  v_event uuid;
  v_reservation uuid;
  v_result jsonb;
  v_raw uuid;
  v_extraction uuid;
  v_uid text;
  v_case integer;
  v_claim text;
  v_action text;
  v_check_in date;
  v_block_count integer;
  v_expected_currency text;
  v_identity_column text;
  v_sync_started_at timestamptz;
BEGIN
  BEGIN
    IF has_function_privilege('anon','public.import_ical_pending_reservation(uuid,uuid,text[])','EXECUTE')
       OR has_function_privilege('authenticated','public.import_ical_pending_reservation(uuid,uuid,text[])','EXECUTE')
       OR has_function_privilege('anon','public.review_ical_pending_reservation(uuid,uuid,text)','EXECUTE')
       OR has_function_privilege('authenticated','public.review_ical_pending_reservation(uuid,uuid,text)','EXECUTE') THEN
      RAISE EXCEPTION 'pending RPC must be service-role only';
    END IF;
    FOREACH v_claim IN ARRAY ARRAY['{}','{"role":"anon"}','{"role":"authenticated"}'] LOOP
      PERFORM set_config('request.jwt.claims',v_claim,true);
      PERFORM set_config('request.jwt.claim.role','service_role',true);
      BEGIN
        PERFORM public.import_ical_pending_reservation(gen_random_uuid(),gen_random_uuid());
        RAISE EXCEPTION 'invalid import caller accepted';
      EXCEPTION WHEN insufficient_privilege THEN NULL; END;
      BEGIN
        PERFORM public.review_ical_pending_reservation(gen_random_uuid(),gen_random_uuid(),'confirm');
        RAISE EXCEPTION 'invalid review caller accepted';
      EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    END LOOP;
    PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
    PERFORM set_config('request.jwt.claim.role','',true);
    SELECT organization_id,property_id,id INTO v_org,v_property,v_listing
    FROM public.property_listings WHERE organization_id IS NOT NULL ORDER BY created_at,id LIMIT 1;
    IF v_listing IS NULL THEN RAISE EXCEPTION 'listing fixture required'; END IF;

    FOR v_case IN 1..2 LOOP
      v_expected_currency := CASE WHEN v_case=1 THEN 'EUR' ELSE NULL END;
      -- This fixture-only configuration update is rolled back with all rows.
      UPDATE public.properties SET currency=v_expected_currency WHERE id=v_property;
      v_uid := 'pending-test-' || gen_random_uuid()::text || '@booking.com';
      v_check_in := DATE '2099-11-20' + v_case * 5;
      SELECT id INTO v_event FROM public.upsert_calendar_event_audit(
        v_org,v_property,v_listing,'booking',v_check_in,v_check_in+2,
        v_uid,'CLOSED - Not available','','block',NULL);
      BEGIN
        PERFORM public.import_ical_pending_reservation(gen_random_uuid(),v_event);
        RAISE EXCEPTION 'cross-tenant import accepted';
      EXCEPTION WHEN no_data_found THEN NULL; END;
      v_result := public.import_ical_pending_reservation(v_org,v_event);
      v_reservation := (v_result->>'reservation_id')::uuid;
      IF (v_result->>'action') IS DISTINCT FROM 'created' OR NOT EXISTS (
        SELECT 1 FROM public.reservations WHERE id=v_reservation
        AND status='pending' AND reservation_status='pending'
        AND confirmed_by_host=false AND guest_name IS NULL AND first_name IS NULL AND last_name IS NULL
        AND number_of_guests IS NULL AND total_amount IS NULL AND total_price IS NULL
        AND currency IS NOT DISTINCT FROM v_expected_currency
        AND calendar_event_id=v_event AND property_listing_id=v_listing
      ) THEN RAISE EXCEPTION 'pending import invented booking data'; END IF;
      v_result := public.import_ical_pending_reservation(v_org,v_event);
      IF (v_result->>'reservation_id')::uuid IS DISTINCT FROM v_reservation
         OR (v_result->>'action') IS DISTINCT FROM 'updated'
         OR (SELECT count(*) FROM public.reservations WHERE calendar_event_id=v_event)<>1 THEN
        RAISE EXCEPTION 'import is not idempotent';
      END IF;
      -- Direct writes cannot bypass review, even when the caller is service_role.
      EXECUTE 'SET LOCAL ROLE service_role';
      BEGIN
        UPDATE public.reservations SET status='confirmed',reservation_status='confirmed' WHERE id=v_reservation;
        RAISE EXCEPTION 'direct service write bypassed host review';
      EXCEPTION WHEN invalid_parameter_value THEN
        IF SQLERRM <> 'pending iCal reservations must be confirmed through host review' THEN RAISE; END IF;
      END;
      EXECUTE 'RESET ROLE';
      FOREACH v_identity_column IN ARRAY ARRAY['organization_id','property_id','property_listing_id'] LOOP
        BEGIN
          EXECUTE format('UPDATE public.reservations SET %I=gen_random_uuid() WHERE id=$1', v_identity_column)
            USING v_reservation;
          RAISE EXCEPTION 'direct write moved iCal reservation ownership';
        EXCEPTION WHEN invalid_parameter_value THEN
          IF SQLERRM <> 'iCal reservation organization and property identity cannot be changed' THEN RAISE; END IF;
        END;
      END LOOP;
      BEGIN
        UPDATE public.reservations SET calendar_event_id=NULL WHERE id=v_reservation;
        RAISE EXCEPTION 'unlinking bypassed the iCal lifecycle guard';
      EXCEPTION WHEN invalid_parameter_value THEN
        IF SQLERRM <> 'iCal reservation event identity cannot be removed or replaced' THEN RAISE; END IF;
      END;
      -- An authenticated claim cannot spoof the private flag even if set by SQL.
      PERFORM set_config('request.jwt.claims','{"role":"authenticated"}',true);
      PERFORM set_config('lodgra.ical_review_reservation_id',v_reservation::text,true);
      BEGIN
        UPDATE public.reservations SET status='confirmed',reservation_status='confirmed' WHERE id=v_reservation;
        RAISE EXCEPTION 'authenticated claim spoofed internal review flag';
      EXCEPTION WHEN invalid_parameter_value THEN
        IF SQLERRM <> 'pending iCal reservations must be confirmed through host review' THEN RAISE; END IF;
      END;
      PERFORM set_config('lodgra.ical_review_reservation_id','',true);
      -- RLS may reject or hide the row from an unassigned authenticated user;
      -- either way a real authenticated SQL role cannot promote the candidate.
      EXECUTE 'SET LOCAL ROLE authenticated';
      BEGIN
        UPDATE public.reservations SET status='confirmed',reservation_status='confirmed' WHERE id=v_reservation;
      EXCEPTION WHEN invalid_parameter_value OR insufficient_privilege THEN NULL;
      END;
      EXECUTE 'RESET ROLE';
      IF EXISTS(SELECT 1 FROM public.reservations WHERE id=v_reservation AND status='confirmed') THEN
        RAISE EXCEPTION 'authenticated SQL role bypassed review';
      END IF;
      PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
      BEGIN
        PERFORM public.review_ical_pending_reservation(gen_random_uuid(),v_reservation,'confirm');
        RAISE EXCEPTION 'cross-tenant review accepted';
      EXCEPTION WHEN no_data_found THEN NULL; END;

      -- Email must not bypass the user's review of an ambiguous occupation.
      INSERT INTO public.raw_emails (organization_id,provider_message_id,recipient,sender,subject,
        received_at,raw_content,processing_status,attempt_count)
      VALUES(v_org,v_uid,'test@example.invalid','noreply@booking.com','Synthetic pending fixture',
        now(),'synthetic','processing',1) RETURNING id INTO v_raw;
      INSERT INTO public.email_extractions (organization_id,raw_email_id,source_platform,confidence,
        guest_name,guest_count,check_in,check_out,total_value,currency,reservation_code,match_status)
      VALUES(v_org,v_raw,'booking',0.99,'Email Person',2,v_check_in,v_check_in+2,900,'EUR',v_uid,'auto_matched')
      RETURNING id INTO v_extraction;
      BEGIN
        PERFORM public.reconcile_email_extraction(v_extraction,v_event,false);
        RAISE EXCEPTION 'email confirmed an unreviewed iCal candidate';
      EXCEPTION WHEN invalid_parameter_value THEN
        IF SQLERRM <> 'pending iCal reservation requires host review before email reconciliation' THEN RAISE; END IF;
      END;

      UPDATE public.reservations SET guest_name='Manual Person',first_name='Manual',last_name='Person',
        total_amount=123.45,number_of_guests=3,currency='USD' WHERE id=v_reservation;
      v_sync_started_at := clock_timestamp();
      PERFORM public.upsert_calendar_event_audit(v_org,v_property,v_listing,'booking',
        v_check_in+1,v_check_in+3,v_uid,'CLOSED - Not available','','block',NULL);
      IF NOT EXISTS(SELECT 1 FROM public.reservations WHERE id=v_reservation
          AND updated_at >= v_sync_started_at AND status='pending' AND guest_name='Manual Person') THEN
        RAISE EXCEPTION 'audit did not protect linked reservation before import';
      END IF;
      PERFORM public.import_ical_pending_reservation(v_org,v_event);
      IF NOT EXISTS (SELECT 1 FROM public.reservations WHERE id=v_reservation
        AND check_in=v_check_in+1 AND check_out=v_check_in+3 AND guest_name='Manual Person'
        AND total_amount=123.45 AND number_of_guests=3 AND currency='USD' AND status='pending') THEN
        RAISE EXCEPTION 'date update overwrote manual fields or lifecycle';
      END IF;
      v_action := CASE WHEN v_case=1 THEN 'confirm' ELSE 'block' END;
      UPDATE public.email_extractions SET check_in=v_check_in+1,check_out=v_check_in+3
        WHERE id=v_extraction;
      PERFORM public.review_ical_pending_reservation(v_org,v_reservation,v_action);
      PERFORM public.review_ical_pending_reservation(v_org,v_reservation,v_action);
      IF NULLIF(current_setting('lodgra.ical_review_reservation_id',true),'') IS NOT NULL THEN
        RAISE EXCEPTION 'review RPC leaked its privileged transition flag';
      END IF;
      IF v_case=1 THEN
        IF NOT EXISTS (SELECT 1 FROM public.reservations WHERE id=v_reservation
          AND status='confirmed' AND reservation_status='confirmed' AND confirmed_by_host=true
          AND guest_name='Manual Person' AND total_amount=123.45) THEN
          RAISE EXCEPTION 'confirmation lost data or failed';
        END IF;
        BEGIN
          UPDATE public.reservations SET status='pending',reservation_status='pending' WHERE id=v_reservation;
          RAISE EXCEPTION 'stale edit returned a confirmed reservation to pending';
        EXCEPTION WHEN invalid_parameter_value THEN
          IF SQLERRM <> 'iCal reservations cannot be returned to pending by a stale edit' THEN RAISE; END IF;
        END;
        -- Confirmed iCal identity and manual data survive later email enrichment.
        PERFORM public.reconcile_email_extraction(v_extraction,v_event,false);
        IF NOT EXISTS (SELECT 1 FROM public.reservations WHERE id=v_reservation
          AND external_id='ical_'||v_event::text AND external_reservation_id='ical_'||v_event::text
          AND status='confirmed' AND reservation_status='confirmed'
          AND source='booking' AND booking_source='booking'
          AND guest_name='Manual Person' AND total_amount=123.45 AND currency='USD') THEN
          RAISE EXCEPTION 'later email overwrote iCal identity or host data';
        END IF;
        BEGIN
          PERFORM public.review_ical_pending_reservation(v_org,v_reservation,'block');
          RAISE EXCEPTION 'confirmed booking converted through pending-only action';
        EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
        -- A cancelled booking is not resurrected while its feed still blocks dates.
        UPDATE public.reservations SET deleted_at=now() WHERE id=v_reservation;
        v_result := public.import_ical_pending_reservation(v_org,v_event);
        IF v_result->>'action' IS DISTINCT FROM 'blocked' THEN RAISE EXCEPTION 'deleted booking resurrected'; END IF;
        BEGIN
          PERFORM public.review_ical_pending_reservation(v_org,v_reservation,'confirm');
          RAISE EXCEPTION 'soft-deleted reservation accepted host review';
        EXCEPTION WHEN invalid_parameter_value THEN
          IF SQLERRM <> 'deleted iCal reservations cannot be reviewed' THEN RAISE; END IF;
        END;
        BEGIN
          PERFORM public.reconcile_email_extraction(v_extraction,v_event,false);
          RAISE EXCEPTION 'email revived a soft-deleted reservation';
        EXCEPTION WHEN invalid_parameter_value THEN
          IF SQLERRM <> 'inactive or ignored reservation cannot be reconciled' THEN RAISE; END IF;
        END;
        UPDATE public.reservations SET status='cancelled',reservation_status='cancelled',deleted_at=NULL WHERE id=v_reservation;
        v_result := public.import_ical_pending_reservation(v_org,v_event);
        IF v_result->>'action' IS DISTINCT FROM 'blocked' THEN RAISE EXCEPTION 'cancelled booking resurrected'; END IF;
      ELSE
        -- Updating an ignored linked event must preserve the host decision.
        v_sync_started_at := clock_timestamp();
        PERFORM public.upsert_calendar_event_audit(v_org,v_property,v_listing,'booking',
          v_check_in+1,v_check_in+3,v_uid,'CLOSED - Not available','','block',NULL);
        IF NOT EXISTS(SELECT 1 FROM public.calendar_blocks WHERE organization_id=v_org
            AND property_id=v_property AND property_listing_id=v_listing AND external_uid=v_uid
            AND block_type='platform_sync' AND updated_at >= v_sync_started_at) THEN
          RAISE EXCEPTION 'audit did not protect block before import';
        END IF;
        v_result := public.import_ical_pending_reservation(v_org,v_event);
        IF v_result->>'action' IS DISTINCT FROM 'ignored'
           OR NOT EXISTS(SELECT 1 FROM public.calendar_events WHERE id=v_event AND status='ignored') THEN
          RAISE EXCEPTION 'host block decision lost on repeat sync';
        END IF;
      END IF;
      SELECT count(*) INTO v_block_count FROM public.calendar_blocks WHERE organization_id=v_org
        AND property_listing_id=v_listing AND external_uid=v_uid
        AND start_date=v_check_in+1 AND end_date=v_check_in+3;
      IF v_block_count<>1 OR NOT EXISTS(SELECT 1 FROM public.reservations WHERE id=v_reservation
        AND status='cancelled' AND reservation_status='cancelled') THEN
        RAISE EXCEPTION 'cancelled/ignored event does not preserve availability';
      END IF;
      BEGIN
        UPDATE public.reservations SET status='confirmed',reservation_status='confirmed',deleted_at=NULL WHERE id=v_reservation;
        RAISE EXCEPTION 'direct write revived a cancelled or blocked reservation';
      EXCEPTION WHEN invalid_parameter_value THEN
        IF SQLERRM <> 'inactive iCal reservations cannot be reactivated' THEN RAISE; END IF;
      END;
      BEGIN
        PERFORM public.reconcile_email_extraction(v_extraction,v_event,true);
        RAISE EXCEPTION 'email revived a cancelled or host-blocked reservation';
      EXCEPTION WHEN invalid_parameter_value THEN
        IF SQLERRM <> 'inactive or ignored reservation cannot be reconciled' THEN RAISE; END IF;
      END;
    END LOOP;
    RAISE EXCEPTION USING ERRCODE='P3814',MESSAGE='rollback pending import fixtures';
  EXCEPTION WHEN SQLSTATE 'P3814' THEN
    IF SQLERRM <> 'rollback pending import fixtures' THEN RAISE; END IF;
  END;
  IF EXISTS(SELECT 1 FROM public.reservations WHERE id=v_reservation)
     OR EXISTS(SELECT 1 FROM public.calendar_events WHERE id=v_event) THEN
    RAISE EXCEPTION 'pending import fixture leaked';
  END IF;
END $$;
ROLLBACK;
