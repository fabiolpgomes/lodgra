BEGIN;

DROP TRIGGER IF EXISTS reservations_prevent_active_overlap
  ON public.reservations;
DROP FUNCTION IF EXISTS public.prevent_active_reservation_overlap();

DROP INDEX IF EXISTS public.idx_calendar_blocks_listing_external_uid;

ALTER TABLE public.calendar_blocks
  DROP CONSTRAINT IF EXISTS calendar_blocks_property_listing_id_fkey;

ALTER TABLE public.calendar_blocks
  DROP COLUMN IF EXISTS property_listing_id;

COMMIT;
