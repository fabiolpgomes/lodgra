-- Database trigger to enforce minimum stay requirement
-- Validates that reservation nights >= property.min_nights or applicable pricing rule

CREATE OR REPLACE FUNCTION validate_minimum_stay()
RETURNS TRIGGER AS $$
DECLARE
  nights INTEGER;
  property_min_nights INTEGER;
  rule_min_nights INTEGER;
  effective_min_nights INTEGER;
  v_property_id UUID;
BEGIN
  -- Skip validation for externally-synced reservations (iCal, Booking.com, Airbnb, etc.)
  -- These were already accepted by the source platform
  IF NEW.booking_source IN ('ical_import', 'ical_auto_sync', 'booking_webhook', 'stripe_booking') THEN
    RETURN NEW;
  END IF;

  -- Calculate number of nights (DATE - DATE = integer in PostgreSQL)
  nights := (NEW.check_out::DATE - NEW.check_in::DATE);

  -- Get property_id from listing
  SELECT pl.property_id INTO v_property_id
  FROM property_listings pl
  WHERE pl.id = NEW.property_listing_id;

  -- Fetch property min_nights
  SELECT COALESCE(p.min_nights, 1) INTO property_min_nights
  FROM properties p
  WHERE p.id = v_property_id;

  IF property_min_nights IS NULL THEN
    property_min_nights := 1;
  END IF;

  -- Find max min_nights from applicable pricing rules
  SELECT COALESCE(MAX(pr.min_nights), 0) INTO rule_min_nights
  FROM pricing_rules pr
  WHERE pr.property_id = v_property_id
    AND pr.start_date <= NEW.check_in::DATE
    AND pr.end_date >= NEW.check_out::DATE;

  -- Effective minimum is the maximum of property and rule minimums
  effective_min_nights := GREATEST(property_min_nights, rule_min_nights);

  -- Validate minimum stay requirement
  IF nights < effective_min_nights THEN
    RAISE EXCEPTION 'Minimum stay requirement: % nights required, only % nights provided',
      effective_min_nights, nights;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS check_minimum_stay_trigger ON reservations;

-- Create trigger on INSERT and UPDATE
CREATE TRIGGER check_minimum_stay_trigger
BEFORE INSERT OR UPDATE ON reservations
FOR EACH ROW
EXECUTE FUNCTION validate_minimum_stay();
