-- Production already has this nullable column; staging lacked the prerequisite.
-- Preserve the observed production type, rather than silently changing timezone semantics.
BEGIN;
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS deleted_at timestamp without time zone;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.reservations'::regclass AND attname = 'deleted_at'
      AND atttypid = 'timestamp without time zone'::regtype AND NOT attnotnull
  ) THEN
    RAISE EXCEPTION 'reservations.deleted_at must match the nullable production timestamp type';
  END IF;
END $$;
COMMIT;
