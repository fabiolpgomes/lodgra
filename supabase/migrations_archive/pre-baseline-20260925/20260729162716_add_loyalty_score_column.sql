-- Add loyalty_score column to guests table
-- This tracks the guest's loyalty points based on booking history
-- Max value: 100 points

ALTER TABLE IF EXISTS public.guests
ADD COLUMN IF NOT EXISTS loyalty_score INTEGER DEFAULT 0 CHECK (loyalty_score >= 0 AND loyalty_score <= 100),
ADD COLUMN IF NOT EXISTS loyalty_score_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for quick lookups by loyalty score
CREATE INDEX IF NOT EXISTS idx_guests_loyalty_score ON public.guests(loyalty_score DESC);

-- Add comment to document the column
COMMENT ON COLUMN public.guests.loyalty_score IS 'Loyalty points based on booking history (0-100). Points are calculated from: completed stays (+5 each), zero cancellation bonus (+10 each), and successful referrals (+15 each)';
COMMENT ON COLUMN public.guests.loyalty_score_updated_at IS 'Timestamp of when loyalty score was last calculated';
