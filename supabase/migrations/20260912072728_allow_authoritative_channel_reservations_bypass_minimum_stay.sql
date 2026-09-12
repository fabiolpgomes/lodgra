BEGIN;

-- Minimum-stay rules govern inventory offered by Lodgra. They must never
-- reject an authoritative reservation already accepted by an OTA. The linked
-- calendar event is the durable provenance marker for reconciled iCal rows.
CREATE OR REPLACE FUNCTION public.validate_minimum_stay()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_nights integer;
  v_property_id uuid;
  v_property_min_nights integer;
  v_rule_min_nights integer;
  v_effective_min_nights integer;
BEGIN
  IF NEW.calendar_event_id IS NOT NULL
     OR NEW.booking_source IN (
       'ical_import',
       'ical_auto_sync',
       'booking_webhook',
       'manual',
       'direct'
     ) THEN
    RETURN NEW;
  END IF;

  v_nights := NEW.check_out::date - NEW.check_in::date;

  v_property_id := NEW.property_id;
  IF v_property_id IS NULL THEN
    SELECT pl.property_id
    INTO v_property_id
    FROM public.property_listings pl
    WHERE pl.id = NEW.property_listing_id;
  END IF;

  SELECT COALESCE(pa.min_nights, 1)
  INTO v_property_min_nights
  FROM public.property_availability pa
  WHERE pa.property_id = v_property_id;

  SELECT COALESCE(max(pr.min_nights), 0)
  INTO v_rule_min_nights
  FROM public.pricing_rules pr
  WHERE pr.property_id = v_property_id
    AND pr.start_date < NEW.check_out::date
    AND pr.end_date >= NEW.check_in::date;

  v_effective_min_nights := greatest(
    COALESCE(v_property_min_nights, 1),
    COALESCE(v_rule_min_nights, 0)
  );

  IF v_nights < v_effective_min_nights THEN
    RAISE EXCEPTION 'Minimum stay requirement: % nights required, only % nights provided',
      v_effective_min_nights, v_nights;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_minimum_stay() IS
  'Validates Lodgra-originated inventory rules; authoritative OTA/calendar reservations bypass using calendar_event_id provenance.';

COMMIT;
