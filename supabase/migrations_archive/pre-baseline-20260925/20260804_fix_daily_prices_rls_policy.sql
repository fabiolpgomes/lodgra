-- Fix daily_prices RLS policy to use owners.user_id instead of owner_id
-- The owner_id column references owners.id, not auth.users.id
-- We need to JOIN through owners table to get user_id

-- Drop the old incorrect policy
DROP POLICY IF EXISTS "Users can manage their property prices" ON public.daily_prices;

-- Drop the old public read policy
DROP POLICY IF EXISTS "Public read daily prices for public properties" ON public.daily_prices;

-- Create corrected policy: Users can manage prices for properties they own
CREATE POLICY "Users can manage their property prices"
  ON public.daily_prices
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT owners.user_id
      FROM public.properties
      JOIN public.owners ON properties.owner_id = owners.id
      WHERE properties.id = property_id
    )
  );

-- Public read policy (unchanged - for public properties)
CREATE POLICY "Public read daily prices for public properties"
  ON public.daily_prices FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM properties WHERE id = property_id AND is_public = true)
  );

-- Add service role bypass policy to allow admin operations
CREATE POLICY "Service role full access daily_prices"
  ON public.daily_prices FOR ALL TO service_role
  USING (true) WITH CHECK (true);
