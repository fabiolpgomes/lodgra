BEGIN;

ALTER TABLE public.calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_source_platform_check;

ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_source_platform_check
    CHECK (source_platform IN ('airbnb', 'booking', 'flatio', 'vrbo', 'unknown'));

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS raw_vevent TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS event_kind TEXT NOT NULL DEFAULT 'unknown';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.calendar_events'::regclass
      AND conname = 'calendar_events_event_kind_check'
  ) THEN
    ALTER TABLE public.calendar_events
      ADD CONSTRAINT calendar_events_event_kind_check
      CHECK (event_kind IN ('reservation', 'block', 'unknown'));
  END IF;
END
$$;

COMMENT ON COLUMN public.calendar_events.raw_vevent IS
  'Raw VEVENT payload stored for audit and classification evolution.';
COMMENT ON COLUMN public.calendar_events.event_kind IS
  'Normalized classification of the raw iCal event: reservation, block or unknown.';

COMMIT;
