-- Epic 9 — Direct booking fields on reservations + direct platform

-- 1. Extend reservations table for direct bookings
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS booking_source TEXT DEFAULT 'ical',
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT,
  ADD COLUMN IF NOT EXISTS guest_phone TEXT,
  ADD COLUMN IF NOT EXISTS num_guests INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_reservations_stripe_session
  ON reservations(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_booking_source
  ON reservations(booking_source);

-- 2. Insert "direct" platform (for direct bookings via website)
-- Use DO block to handle both schemas (with or without 'code' column)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='platforms' AND column_name='code') THEN
    INSERT INTO platforms (name, code, display_name, is_active)
    VALUES ('direct', 'DIRECT', 'Reserva Directa', true)
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO platforms (name, display_name, is_active)
    VALUES ('direct', 'Reserva Directa', true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 3. Allow public (unauthenticated) insert into guests for direct bookings
-- Direct bookings use the admin client server-side, so RLS bypass is handled there.
-- This policy allows the service role to insert guests without org check
-- (org is supplied programmatically from the property owner's org)
