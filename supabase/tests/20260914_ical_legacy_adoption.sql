-- Covers brownfield reservations created before calendar_event_id was written.
BEGIN;
DO $$
DECLARE
  v_org uuid;
  v_property uuid;
  v_listing uuid;
  v_event uuid;
  v_other_event uuid;
  v_reservation uuid;
  v_duplicate uuid;
  v_uid text;
  v_external text;
  v_result jsonb;
  v_date date;
  v_case integer;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
    PERFORM set_config('request.jwt.claim.role','',true);
    SELECT organization_id,property_id,id INTO v_org,v_property,v_listing
    FROM public.property_listings WHERE organization_id IS NOT NULL ORDER BY created_at,id LIMIT 1;
    IF v_listing IS NULL THEN RAISE EXCEPTION 'listing fixture required'; END IF;
    FOR v_case IN 1..4 LOOP
      v_uid := 'legacy-adoption-'||gen_random_uuid()::text||'@booking.com';
      v_external := 'booking_'||split_part(v_uid,'@',1);
      v_date := DATE '2099-12-20' + v_case*5;
      INSERT INTO public.reservations (
        organization_id,property_id,property_listing_id,check_in,check_out,
        status,reservation_status,external_id,external_reservation_id,source,booking_source,
        guest_name,first_name,last_name,number_of_guests,total_amount,total_price,currency,deleted_at
      ) VALUES(v_org,v_property,v_listing,v_date,v_date+2,
        CASE WHEN v_case=2 THEN 'cancelled' ELSE 'confirmed' END,
        CASE WHEN v_case=2 THEN 'cancelled' ELSE 'confirmed' END,
        v_external,v_external,'booking','booking','Legacy Manual','Legacy','Manual',4,246.8,246.8,'USD',
        CASE WHEN v_case=3 THEN now() ELSE NULL END
      ) RETURNING id INTO v_reservation;
      -- Different dates establish that identity comes from the external id.
      SELECT id INTO v_event FROM public.upsert_calendar_event_audit(v_org,v_property,v_listing,
        'booking',v_date+1,v_date+3,v_uid,'CLOSED - Not available','','block',NULL);
      IF v_case=4 THEN
        INSERT INTO public.reservations (organization_id,property_id,property_listing_id,
          check_in,check_out,status,reservation_status,external_id)
        VALUES(v_org,v_property,v_listing,v_date+10,v_date+11,'cancelled','cancelled',v_external)
        RETURNING id INTO v_duplicate;
        BEGIN
          PERFORM public.import_ical_pending_reservation(v_org,v_event,ARRAY[v_external]);
          RAISE EXCEPTION 'ambiguous external id was adopted';
        EXCEPTION WHEN unique_violation THEN
          IF SQLERRM <> 'ambiguous legacy reservation external identity' THEN RAISE; END IF;
        END;
        IF EXISTS(SELECT 1 FROM public.reservations WHERE id IN(v_reservation,v_duplicate)
          AND calendar_event_id IS NOT NULL) THEN RAISE EXCEPTION 'ambiguous adoption left links'; END IF;
        CONTINUE;
      END IF;
      v_result := public.import_ical_pending_reservation(v_org,v_event,ARRAY[v_external]);
      IF (v_result->>'reservation_id')::uuid IS DISTINCT FROM v_reservation
         OR (v_result->>'created')::boolean IS DISTINCT FROM false
         OR (SELECT count(*) FROM public.reservations WHERE calendar_event_id=v_event)<>1 THEN
        RAISE EXCEPTION 'legacy adoption duplicated or replaced reservation';
      END IF;
      IF NOT EXISTS(SELECT 1 FROM public.reservations WHERE id=v_reservation
        AND external_id=v_external AND guest_name='Legacy Manual'
        AND number_of_guests=4 AND total_amount=246.8 AND currency='USD') THEN
        RAISE EXCEPTION 'legacy host values were overwritten';
      END IF;
      v_result := public.import_ical_pending_reservation(v_org,v_event,ARRAY[v_external]);
      IF v_case=1 THEN
        IF v_result->>'action' IS DISTINCT FROM 'updated' OR NOT EXISTS(
          SELECT 1 FROM public.reservations WHERE id=v_reservation
          AND status='confirmed' AND check_in=v_date+1 AND check_out=v_date+3
        ) THEN RAISE EXCEPTION 'active legacy reservation did not update feed dates'; END IF;
        SELECT id INTO v_other_event FROM public.upsert_calendar_event_audit(v_org,v_property,v_listing,
          'booking',v_date+1,v_date+3,v_uid||'-other','Reserved','','reservation',NULL);
        BEGIN
          PERFORM public.import_ical_pending_reservation(v_org,v_other_event,ARRAY[v_external]);
          RAISE EXCEPTION 'reservation already linked to another event was adopted';
        EXCEPTION WHEN unique_violation THEN
          IF SQLERRM <> 'legacy reservation is linked to another calendar event' THEN RAISE; END IF;
        END;
      ELSE
        IF v_result->>'action' IS DISTINCT FROM 'blocked'
           OR NOT EXISTS(SELECT 1 FROM public.calendar_blocks WHERE organization_id=v_org
             AND property_listing_id=v_listing AND external_uid=v_uid
             AND start_date=v_date+1 AND end_date=v_date+3) THEN
          RAISE EXCEPTION 'cancelled/deleted legacy reservation lost availability';
        END IF;
        IF NOT EXISTS(SELECT 1 FROM public.reservations WHERE id=v_reservation
          AND check_in=v_date AND check_out=v_date+2
          AND (status='cancelled' OR deleted_at IS NOT NULL)) THEN
          RAISE EXCEPTION 'inactive legacy reservation was resurrected';
        END IF;
      END IF;
    END LOOP;
    RAISE EXCEPTION USING ERRCODE='P3815',MESSAGE='rollback legacy adoption fixtures';
  EXCEPTION WHEN SQLSTATE 'P3815' THEN
    IF SQLERRM <> 'rollback legacy adoption fixtures' THEN RAISE; END IF;
  END;
  IF EXISTS(SELECT 1 FROM public.reservations WHERE id=v_reservation)
     OR EXISTS(SELECT 1 FROM public.calendar_events WHERE id=v_event) THEN
    RAISE EXCEPTION 'legacy adoption fixture leaked';
  END IF;
END $$;
ROLLBACK;
