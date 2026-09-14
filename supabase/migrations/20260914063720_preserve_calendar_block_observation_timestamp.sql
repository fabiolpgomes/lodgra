BEGIN;
-- NOW() is fixed at transaction start. A transaction waiting on a row lock
-- must publish a fresh observation version when it finally updates that row.
-- Keep this behavior local to calendar_blocks rather than altering the shared
-- timestamp function used by storage, properties, guests and other tables.
CREATE OR REPLACE FUNCTION public.set_calendar_block_observation_timestamp()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  NEW.updated_at := GREATEST(clock_timestamp(), NEW.updated_at,
    OLD.updated_at + interval '1 microsecond');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.set_calendar_block_observation_timestamp() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_calendar_block_observation_timestamp() TO service_role;
DROP TRIGGER IF EXISTS update_calendar_blocks_updated_at ON public.calendar_blocks;
CREATE TRIGGER update_calendar_blocks_updated_at BEFORE UPDATE ON public.calendar_blocks
FOR EACH ROW EXECUTE FUNCTION public.set_calendar_block_observation_timestamp();
COMMIT;
