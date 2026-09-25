-- Store the guest language choice on both the reservation and guest profile.
-- This lets the booking flow reuse the language on future reservations.

BEGIN;

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS preferred_locale VARCHAR(10);

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS preferred_locale VARCHAR(10);

CREATE INDEX IF NOT EXISTS idx_reservations_preferred_locale
  ON public.reservations(preferred_locale)
  WHERE preferred_locale IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guests_preferred_locale
  ON public.guests(preferred_locale)
  WHERE preferred_locale IS NOT NULL;

COMMENT ON COLUMN public.reservations.preferred_locale IS
  'Preferred guest locale for the reservation (e.g. pt-PT, en-US, es-ES).';

COMMENT ON COLUMN public.guests.preferred_locale IS
  'Preferred guest locale for reuse on future bookings (e.g. pt-PT, en-US, es-ES).';

COMMIT;
