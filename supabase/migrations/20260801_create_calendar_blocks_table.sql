-- Create calendar_blocks table for blocking dates
-- Used to mark dates as unavailable for booking (maintenance, cleaning, etc)

CREATE TABLE IF NOT EXISTS public.calendar_blocks (
  id BIGSERIAL PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT DEFAULT 'blocked-by-owner',
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unblocked_at TIMESTAMP WITH TIME ZONE,

  -- Prevent duplicate blocks for same property+date
  CONSTRAINT unique_property_block UNIQUE(property_id, date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_property_date
  ON public.calendar_blocks(property_id, date);

CREATE INDEX IF NOT EXISTS idx_calendar_blocks_property_active
  ON public.calendar_blocks(property_id)
  WHERE unblocked_at IS NULL;

-- Enable RLS
ALTER TABLE public.calendar_blocks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only manage blocks for their own properties
CREATE POLICY "Users can manage property calendar blocks"
  ON public.calendar_blocks
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.properties WHERE id = property_id
    )
  );

-- Public read for public properties
CREATE POLICY "Public read calendar blocks for public properties"
  ON public.calendar_blocks FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM properties WHERE id = property_id AND is_public = true)
  );

-- Verify table creation
SELECT 'calendar_blocks table created' as status;
