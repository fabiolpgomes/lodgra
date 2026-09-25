-- Fix: Prevent overbooking by including pending_payment in conflict checks
-- Race condition: Two clients could book same dates if both finish payment before either is confirmed
-- Solution: Include pending_payment status in conflict detection
-- Change: status = 'confirmed' → status IN ('confirmed', 'pending_payment')

CREATE OR REPLACE FUNCTION check_reservation_conflict()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's already a confirmed or pending_payment reservation in the period
  IF EXISTS (
    SELECT 1 FROM reservations r
    JOIN property_listings pl ON r.property_listing_id = pl.id
    WHERE pl.property_id = (
      SELECT property_id
      FROM property_listings
      WHERE id = NEW.property_listing_id
    )
    AND r.status IN ('confirmed', 'pending_payment')
    AND r.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (NEW.check_in >= r.check_in AND NEW.check_in < r.check_out)
      OR (NEW.check_out > r.check_in AND NEW.check_out <= r.check_out)
      OR (NEW.check_in <= r.check_in AND NEW.check_out >= r.check_out)
    )
  ) THEN
    RAISE EXCEPTION 'Conflito de reserva detectado para estas datas';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
