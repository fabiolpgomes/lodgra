-- Fix: validate_minimum_stay() was trying to access deleted column properties.min_nights
-- This caused "column p.min_nights does not exist" errors when updating reservations
-- Root cause: Column was removed by migration 20260731000002_remove_legacy_availability.sql
-- but function was not updated

-- The function now skips validation for iCal imports (already validated by platform)
-- and only validates pricing rules for web bookings (not property.min_nights which no longer exists)

CREATE OR REPLACE FUNCTION validate_minimum_stay()
RETURNS TRIGGER AS $$
DECLARE
  nights INTEGER;
  rule_min_nights INTEGER;
  effective_min_nights INTEGER;
  v_property_id UUID;
BEGIN
  -- Skip validation for iCal imports (externally synced - already validated by platform)
  IF NEW.booking_source IN (
    'ical_import',
    'ical_auto_sync',
    'booking_webhook'
  ) THEN
    RETURN NEW;
  END IF;

  -- Skip validation for manual overrides or direct bookings (admin-created)
  IF NEW.booking_source IN ('manual', 'direct') THEN
    RETURN NEW;
  END IF;

  -- For public/web bookings: validate min_nights from pricing rules only
  -- (property.min_nights was removed - use property_availability table instead)
  nights := (NEW.check_out::DATE - NEW.check_in::DATE);

  -- Get property_id from listing
  SELECT pl.property_id INTO v_property_id
  FROM property_listings pl
  WHERE pl.id = NEW.property_listing_id;

  -- Find max min_nights from applicable pricing rules
  SELECT COALESCE(MAX(pr.min_nights), 1) INTO rule_min_nights
  FROM pricing_rules pr
  WHERE pr.property_id = v_property_id
    AND pr.start_date <= NEW.check_in::DATE
    AND pr.end_date >= NEW.check_out::DATE;

  -- For now: use rule_min_nights only (property.min_nights is gone)
  -- TODO: Fetch from property_availability table when pricing rules don't apply
  effective_min_nights := COALESCE(rule_min_nights, 1);

  -- Validate minimum stay requirement
  IF nights < effective_min_nights THEN
    RAISE EXCEPTION 'Minimum stay requirement: % nights required, only % nights provided',
      effective_min_nights, nights;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
