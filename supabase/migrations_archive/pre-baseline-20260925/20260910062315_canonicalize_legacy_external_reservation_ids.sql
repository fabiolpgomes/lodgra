BEGIN;

CREATE OR REPLACE FUNCTION public.bridge_legacy_reservation_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.property_listing_id IS NOT NULL AND (
    NEW.property_id IS NULL
    OR TG_OP = 'INSERT'
    OR NEW.property_listing_id IS DISTINCT FROM OLD.property_listing_id
  ) THEN
    SELECT pl.property_id INTO NEW.property_id
    FROM public.property_listings pl
    WHERE pl.id = NEW.property_listing_id;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.reservation_status := NEW.status;
  ELSIF TG_OP = 'UPDATE' AND NEW.reservation_status IS DISTINCT FROM OLD.reservation_status THEN
    NEW.status := NEW.reservation_status;
  ELSE
    NEW.reservation_status := COALESCE(NEW.reservation_status, NEW.status, 'confirmed');
    NEW.status := COALESCE(NEW.status, NEW.reservation_status, 'confirmed');
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.external_id IS DISTINCT FROM OLD.external_id THEN
    NEW.external_reservation_id := NEW.external_id;
  ELSIF TG_OP = 'UPDATE'
    AND NEW.external_reservation_id IS DISTINCT FROM OLD.external_reservation_id THEN
    NEW.external_id := NEW.external_reservation_id;
  ELSE
    NEW.external_reservation_id := COALESCE(
      NEW.external_id,
      NEW.external_reservation_id,
      NEW.id::text
    );
    NEW.external_id := NEW.external_reservation_id;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
    NEW.total_price := NEW.total_amount;
  ELSIF TG_OP = 'UPDATE' AND NEW.total_price IS DISTINCT FROM OLD.total_price THEN
    NEW.total_amount := NEW.total_price;
  ELSE
    NEW.total_price := COALESCE(NEW.total_price, NEW.total_amount);
    NEW.total_amount := COALESCE(NEW.total_amount, NEW.total_price);
  END IF;

  NEW.last_sync_at := COALESCE(NEW.last_sync_at, NEW.synced_at);
  RETURN NEW;
END;
$$;

COMMIT;
