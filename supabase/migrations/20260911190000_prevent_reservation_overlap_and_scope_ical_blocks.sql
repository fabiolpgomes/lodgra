BEGIN;

-- A block belongs to the feed that created it. Without this provenance, syncing
-- another channel for the same property can remove a valid block.
ALTER TABLE public.calendar_blocks
  ADD COLUMN IF NOT EXISTS property_listing_id uuid;

WITH unambiguous_listing AS (
  SELECT
    cb.id AS calendar_block_id,
    min(ce.property_listing_id::text)::uuid AS property_listing_id
  FROM public.calendar_blocks cb
  JOIN public.calendar_events ce
    ON ce.organization_id = cb.organization_id
   AND ce.property_id = cb.property_id
   AND ce.ical_uid = cb.external_uid
  WHERE cb.property_listing_id IS NULL
    AND cb.external_uid IS NOT NULL
    AND ce.property_listing_id IS NOT NULL
  GROUP BY cb.id
  HAVING count(DISTINCT ce.property_listing_id) = 1
)
UPDATE public.calendar_blocks cb
SET property_listing_id = source.property_listing_id
FROM unambiguous_listing source
WHERE cb.id = source.calendar_block_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.calendar_blocks'::regclass
      AND conname = 'calendar_blocks_property_listing_id_fkey'
  ) THEN
    ALTER TABLE public.calendar_blocks
      ADD CONSTRAINT calendar_blocks_property_listing_id_fkey
      FOREIGN KEY (property_listing_id)
      REFERENCES public.property_listings(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_calendar_blocks_listing_external_uid
  ON public.calendar_blocks(property_listing_id, external_uid)
  WHERE property_listing_id IS NOT NULL AND external_uid IS NOT NULL;

COMMENT ON COLUMN public.calendar_blocks.property_listing_id IS
  'Feed/listing that owns a platform-synced block; used to isolate reconciliation cleanup.';

-- Existing brownfield overlaps are preserved for manual reconciliation. New
-- writes are serialized per property and rejected when their active stay range
-- intersects another active reservation. The [check_in, check_out) convention
-- allows a checkout and the next check-in on the same date.
CREATE OR REPLACE FUNCTION public.prevent_active_reservation_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  conflicting_reservation_id uuid;
BEGIN
  IF NEW.property_id IS NULL
     OR NEW.check_in IS NULL
     OR NEW.check_out IS NULL
     OR NEW.status IS NOT DISTINCT FROM 'cancelled' THEN
    RETURN NEW;
  END IF;

  IF NEW.check_out <= NEW.check_in THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'reservation check_out must be after check_in';
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.property_id IS NOT DISTINCT FROM OLD.property_id
     AND NEW.check_in IS NOT DISTINCT FROM OLD.check_in
     AND NEW.check_out IS NOT DISTINCT FROM OLD.check_out
     AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.property_id::text, 0));

  SELECT r.id
  INTO conflicting_reservation_id
  FROM public.reservations r
  WHERE r.property_id = NEW.property_id
    AND r.id IS DISTINCT FROM NEW.id
    AND r.status IS DISTINCT FROM 'cancelled'
    AND daterange(r.check_in, r.check_out, '[)')
        && daterange(NEW.check_in, NEW.check_out, '[)')
  LIMIT 1;

  IF conflicting_reservation_id IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23P01',
      MESSAGE = 'active reservation overlaps an existing reservation for this property',
      DETAIL = format('conflicting_reservation_id=%s', conflicting_reservation_id),
      HINT = 'Cancel or reconcile the existing reservation before creating another active stay.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservations_prevent_active_overlap
  ON public.reservations;

CREATE TRIGGER reservations_prevent_active_overlap
BEFORE INSERT OR UPDATE OF property_id, check_in, check_out, status
ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.prevent_active_reservation_overlap();

REVOKE ALL ON FUNCTION public.prevent_active_reservation_overlap()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_active_reservation_overlap()
  TO service_role;

COMMENT ON FUNCTION public.prevent_active_reservation_overlap() IS
  'Serializes reservation writes per property and prevents new active date overlaps while legacy conflicts are reconciled.';

COMMIT;
