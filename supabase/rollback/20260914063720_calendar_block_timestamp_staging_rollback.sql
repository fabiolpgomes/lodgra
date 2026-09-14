BEGIN;
DROP TRIGGER IF EXISTS update_calendar_blocks_updated_at ON public.calendar_blocks;
-- No update_calendar_blocks_updated_at trigger existed in staging.
DROP FUNCTION IF EXISTS public.set_calendar_block_observation_timestamp();
COMMIT;
