-- Restore the availability settings source of truth used by the calendar UI.
-- This is separate from the amended historical migration so environments that
-- already recorded 20260801000001 as applied are repaired as well.

CREATE TABLE IF NOT EXISTS public.property_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  min_nights INT DEFAULT 1 CHECK (min_nights >= 1),
  max_nights INT DEFAULT 365 CHECK (max_nights >= 1),
  advance_notice_days INT DEFAULT 0 CHECK (advance_notice_days >= 0),
  notice_for_same_day TIME DEFAULT '00:00',
  preparation_days INT DEFAULT 0 CHECK (preparation_days >= 0),
  allow_last_minute_bookings BOOLEAN DEFAULT false,
  availability_window_months INT DEFAULT 12 CHECK (availability_window_months IN (3, 6, 9, 12, 24)),
  allow_bookings_beyond_window BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(property_id)
);

ALTER TABLE public.property_availability
  ADD COLUMN IF NOT EXISTS notice_for_same_day TIME DEFAULT '00:00',
  ADD COLUMN IF NOT EXISTS preparation_days INT DEFAULT 0 CHECK (preparation_days >= 0),
  ADD COLUMN IF NOT EXISTS allow_last_minute_bookings BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS availability_window_months INT DEFAULT 12,
  ADD COLUMN IF NOT EXISTS allow_bookings_beyond_window BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_property_availability_property_id
  ON public.property_availability(property_id);

ALTER TABLE public.property_availability ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'property_availability'
      AND policyname = 'Users can view own property availability'
  ) THEN
    CREATE POLICY "Users can view own property availability"
      ON public.property_availability FOR SELECT
      USING (property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'property_availability'
      AND policyname = 'Users can manage own property availability'
  ) THEN
    CREATE POLICY "Users can manage own property availability"
      ON public.property_availability FOR ALL
      USING (property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid()))
      WITH CHECK (property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid()));
  END IF;
END $$;
