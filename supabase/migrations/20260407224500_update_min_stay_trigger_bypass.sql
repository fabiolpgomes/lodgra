-- Update minimum stay trigger to skip validation for manual and direct bookings
-- This allows admins to create reservations that don't meet the min nights requirement
-- while still enforcing it for automated syncing or public bookings.

CREATE OR REPLACE FUNCTION validate_minimum_stay()
RETURNS TRIGGER AS $$
DECLARE
  nights INTEGER;
  property_min_nights INTEGER;
  rule_min_nights INTEGER;
  effective_min_nights INTEGER;
  v_property_id UUID;
BEGIN
  -- Skip validation for manual overrides or externally-synced reservations
  -- Added 'manual' and 'direct' to the bypass list
  IF NEW.booking_source IN (
    'ical_import', 
    'ical_auto_sync', 
    'booking_webhook', 
    'stripe_booking', 
    'manual', 
    'direct'
  ) THEN
    RETURN NEW;
  END IF;

  -- Calculate number of nights
  nights := (NEW.check_out::DATE - NEW.check_in::DATE);

  -- Get property_id from listing
  SELECT pl.property_id INTO v_property_id
  FROM property_listings pl
  WHERE pl.id = NEW.property_listing_id;

  -- Fetch property min_nights
  SELECT COALESCE(p.min_nights, 1) INTO property_min_nights
  FROM properties p
  WHERE p.id = v_property_id;

  -- Find max min_nights from applicable pricing rules
  SELECT COALESCE(MAX(pr.min_nights), 0) INTO rule_min_nights
  FROM pricing_rules pr
  WHERE pr.property_id = v_property_id
    AND pr.start_date <= NEW.check_in::DATE
    AND pr.end_date >= NEW.check_out::DATE;

  -- Effective minimum is the maximum of property and rule minimums
  effective_min_nights := GREATEST(COALESCE(property_min_nights, 1), COALESCE(rule_min_nights, 0));

  -- Validate minimum stay requirement
  IF nights < effective_min_nights THEN
    RAISE EXCEPTION 'Minimum stay requirement: % nights required, only % nights provided',
      effective_min_nights, nights;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
