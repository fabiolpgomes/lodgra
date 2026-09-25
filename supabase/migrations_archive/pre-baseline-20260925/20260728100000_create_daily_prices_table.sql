-- Create daily_prices table for storing per-day pricing overrides
CREATE TABLE IF NOT EXISTS public.daily_prices (
  id BIGSERIAL PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  base_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint on property_id + date combination
  CONSTRAINT unique_property_date UNIQUE(property_id, date)
);

-- Create index for fast lookups by property and date range
CREATE INDEX IF NOT EXISTS idx_daily_prices_property_date
  ON public.daily_prices(property_id, date);

-- Enable RLS (Row Level Security)
ALTER TABLE public.daily_prices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view/modify prices for their own properties
CREATE POLICY "Users can manage their property prices"
  ON public.daily_prices
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.properties WHERE id = property_id
    )
  );

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_prices_updated_at_trigger
  BEFORE UPDATE ON public.daily_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_prices_updated_at();
