BEGIN;

-- Staging exposed brownfield drift: these compatibility columns exist in the
-- canonical migration chain but were absent in one live environment. Keep the
-- reconciliation RPC portable and idempotent across every deployed schema.
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS booking_reference varchar(100),
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS platform_synced_at timestamp;

CREATE INDEX IF NOT EXISTS idx_reservations_booking_reference
  ON public.reservations (booking_source, booking_reference)
  WHERE booking_reference IS NOT NULL;

-- `date` exists only in some brownfield environments. Install its compatibility
-- invariant only where the legacy column is present; canonical environments use
-- start_date/end_date exclusively.
DO $compatibility$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'calendar_blocks'
      AND column_name = 'date'
  ) THEN
    EXECUTE $function$
      CREATE OR REPLACE FUNCTION public.normalize_calendar_block_legacy_date()
      RETURNS trigger
      LANGUAGE plpgsql
      SET search_path = pg_catalog, public
      AS $body$
      BEGIN
        NEW.date := COALESCE(NEW.start_date, NEW.date);
        RETURN NEW;
      END;
      $body$
    $function$;

    DROP TRIGGER IF EXISTS trg_calendar_blocks_normalize_legacy_date
      ON public.calendar_blocks;
    CREATE TRIGGER trg_calendar_blocks_normalize_legacy_date
      BEFORE INSERT OR UPDATE OF start_date, date
      ON public.calendar_blocks
      FOR EACH ROW
      EXECUTE FUNCTION public.normalize_calendar_block_legacy_date();

    UPDATE public.calendar_blocks
    SET date = start_date
    WHERE start_date IS NOT NULL
      AND date IS DISTINCT FROM start_date;
  END IF;
END;
$compatibility$;

COMMIT;
