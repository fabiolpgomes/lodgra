BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'calendar_blocks'
      AND column_name = 'property_listing_id'
  ) THEN
    RAISE EXCEPTION 'calendar_blocks.property_listing_id is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.reservations'::regclass
      AND tgname = 'reservations_prevent_active_overlap'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'reservation overlap prevention trigger is required';
  END IF;

  IF position('pg_advisory_xact_lock' IN pg_get_functiondef(
    'public.prevent_active_reservation_overlap()'::regprocedure
  )) = 0 THEN
    RAISE EXCEPTION 'overlap prevention must serialize concurrent property writes';
  END IF;
END
$$;

ROLLBACK;
