-- Observed 2026-09-14; shared timestamp function is not changed by this migration.
CREATE TRIGGER update_calendar_blocks_updated_at BEFORE UPDATE ON public.calendar_blocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
