-- Email reconciliation must never identify a legacy reservation by dates alone.
BEGIN;
DO $$
DECLARE
  v_org uuid;
  v_property uuid;
  v_listing uuid;
  v_event uuid;
  v_raw uuid;
  v_extraction uuid;
  v_reservation uuid;
  v_result jsonb;
  v_tag text;
  v_code text;
  v_date date;
  v_case integer;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
    SELECT organization_id,property_id,id INTO v_org,v_property,v_listing
    FROM public.property_listings WHERE organization_id IS NOT NULL ORDER BY created_at,id LIMIT 1;
    IF v_listing IS NULL THEN RAISE EXCEPTION 'listing fixture required'; END IF;
    FOR v_case IN 1..4 LOOP
      v_tag := 'email-identity-'||gen_random_uuid()::text;
      v_code := 'code-'||v_tag;
      v_date := DATE '2099-03-01' + v_case*5;
      INSERT INTO public.reservations(organization_id,property_id,property_listing_id,
        check_in,check_out,status,reservation_status,source,booking_source,external_id,
        booking_reference,guest_name,number_of_guests,total_amount,total_price,currency)
      VALUES(v_org,v_property,v_listing,v_date,v_date+2,'confirmed','confirmed','booking','booking',
        'booking_'||v_code,v_code,'Host Manual',3,123.45,123.45,'USD') RETURNING id INTO v_reservation;
      SELECT id INTO v_event FROM public.upsert_calendar_event_audit(v_org,v_property,v_listing,
        'booking',v_date,v_date+2,v_tag||'@booking.com','CLOSED - Not available','','block',NULL);
      INSERT INTO public.raw_emails(organization_id,provider_message_id,recipient,sender,subject,
        received_at,raw_content,processing_status,attempt_count)
      VALUES(v_org,v_tag,'test@example.invalid','noreply@booking.com','Synthetic identity fixture',
        now(),'synthetic','processing',1) RETURNING id INTO v_raw;
      INSERT INTO public.email_extractions(organization_id,raw_email_id,source_platform,confidence,
        guest_name,check_in,check_out,reservation_code,total_value,guest_count,currency,match_status)
      VALUES(v_org,v_raw,'booking',0.99,'Conflicting Email',v_date,v_date+2,
        CASE WHEN v_case=2 THEN 'different-code' WHEN v_case=3 THEN NULL ELSE v_code END,
        999,9,'EUR','auto_matched') RETURNING id INTO v_extraction;
      IF v_case=1 THEN
        v_result := public.reconcile_email_extraction(v_extraction,v_event,false);
        IF (v_result->>'reservation_id')::uuid IS DISTINCT FROM v_reservation
          OR NOT EXISTS(SELECT 1 FROM public.reservations WHERE id=v_reservation
            AND calendar_event_id=v_event AND email_extraction_id=v_extraction
            AND guest_name='Host Manual' AND number_of_guests=3 AND total_amount=123.45 AND currency='USD') THEN
          RAISE EXCEPTION 'exact-code adoption lost identity or manual data';
        END IF;
      ELSIF v_case IN (2,3) THEN
        BEGIN
          PERFORM public.reconcile_email_extraction(v_extraction,v_event,false);
          RAISE EXCEPTION 'same dates incorrectly identified an unrelated reservation';
        EXCEPTION WHEN invalid_parameter_value THEN
          IF SQLERRM <> 'existing confirmed reservation required before email reconciliation' THEN RAISE; END IF;
        END;
        IF EXISTS(SELECT 1 FROM public.reservations WHERE id=v_reservation
          AND (calendar_event_id IS NOT NULL OR email_extraction_id IS NOT NULL)) THEN
          RAISE EXCEPTION 'failed identity check left an incorrect link';
        END IF;
      ELSE
        INSERT INTO public.reservations(organization_id,property_id,property_listing_id,
          check_in,check_out,status,reservation_status,source,booking_source,external_id,booking_reference)
        VALUES(v_org,v_property,v_listing,v_date+10,v_date+11,'cancelled','cancelled','booking','booking',
          'duplicate-'||v_tag,v_code);
        BEGIN
          PERFORM public.reconcile_email_extraction(v_extraction,v_event,false);
          RAISE EXCEPTION 'ambiguous confirmation code was adopted';
        EXCEPTION WHEN unique_violation THEN
          IF SQLERRM <> 'ambiguous legacy reservation confirmation code' THEN RAISE; END IF;
        END;
      END IF;
    END LOOP;
    RAISE EXCEPTION USING ERRCODE='P3816',MESSAGE='rollback email identity fixtures';
  EXCEPTION WHEN SQLSTATE 'P3816' THEN
    IF SQLERRM <> 'rollback email identity fixtures' THEN RAISE; END IF;
  END;
  IF EXISTS(SELECT 1 FROM public.reservations WHERE id=v_reservation)
    OR EXISTS(SELECT 1 FROM public.calendar_events WHERE id=v_event) THEN
    RAISE EXCEPTION 'email identity fixture leaked';
  END IF;
END $$;
ROLLBACK;
