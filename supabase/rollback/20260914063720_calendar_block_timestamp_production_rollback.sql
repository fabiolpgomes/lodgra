BEGIN;
DROP TRIGGER IF EXISTS update_calendar_blocks_updated_at ON public.calendar_blocks;
CREATE TRIGGER update_calendar_blocks_updated_at BEFORE UPDATE ON public.calendar_blocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.set_calendar_block_observation_timestamp();
COMMIT;
