-- COMPREHENSIVE RLS POLICY FIX (2026-08-06)
-- Consolidates and corrects all broken RLS policies across 4 tables
-- Issues fixed:
-- 1. Pricing/Discounts/Cancellation: Comparing owner_id (UUID) with auth.uid() instead of via owners table
-- 2. Reservations: Using property_id instead of property_listing_id
-- 3. Daily Prices: Missing policies or incomplete WITH CHECK clauses

-- ==============================================================================
-- STEP 1: Fix property_prices table RLS (Base Price)
-- ==============================================================================

DROP POLICY IF EXISTS "Owners can read own pricing" ON public.property_prices;
DROP POLICY IF EXISTS "Owners can write own pricing" ON public.property_prices;

CREATE POLICY "property_prices_select"
  ON public.property_prices FOR SELECT
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "property_prices_insert"
  ON public.property_prices FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "property_prices_update"
  ON public.property_prices FOR UPDATE
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "property_prices_delete"
  ON public.property_prices FOR DELETE
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Service role bypass property_prices"
  ON public.property_prices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- STEP 2: Fix property_discounts table RLS
-- ==============================================================================

DROP POLICY IF EXISTS "Owners can read own discounts" ON public.property_discounts;
DROP POLICY IF EXISTS "Owners can write own discounts" ON public.property_discounts;
DROP POLICY IF EXISTS "discounts_select" ON public.property_discounts;
DROP POLICY IF EXISTS "discounts_insert" ON public.property_discounts;
DROP POLICY IF EXISTS "discounts_update" ON public.property_discounts;
DROP POLICY IF EXISTS "discounts_delete" ON public.property_discounts;

CREATE POLICY "property_discounts_select"
  ON public.property_discounts FOR SELECT
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "property_discounts_insert"
  ON public.property_discounts FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "property_discounts_update"
  ON public.property_discounts FOR UPDATE
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "property_discounts_delete"
  ON public.property_discounts FOR DELETE
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Service role bypass property_discounts"
  ON public.property_discounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- STEP 3: Fix property_cancellation_policies table RLS
-- ==============================================================================

DROP POLICY IF EXISTS "Owners can read own cancellation policies" ON public.property_cancellation_policies;
DROP POLICY IF EXISTS "Owners can write own cancellation policies" ON public.property_cancellation_policies;
DROP POLICY IF EXISTS "cancellation_policies_select" ON public.property_cancellation_policies;
DROP POLICY IF EXISTS "cancellation_policies_insert" ON public.property_cancellation_policies;
DROP POLICY IF EXISTS "cancellation_policies_update" ON public.property_cancellation_policies;
DROP POLICY IF EXISTS "cancellation_policies_delete" ON public.property_cancellation_policies;

CREATE POLICY "property_cancellation_policies_select"
  ON public.property_cancellation_policies FOR SELECT
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "property_cancellation_policies_insert"
  ON public.property_cancellation_policies FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "property_cancellation_policies_update"
  ON public.property_cancellation_policies FOR UPDATE
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "property_cancellation_policies_delete"
  ON public.property_cancellation_policies FOR DELETE
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Service role bypass property_cancellation_policies"
  ON public.property_cancellation_policies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- STEP 4: Fix property_daily_prices table RLS (Corrected)
-- ==============================================================================

DROP POLICY IF EXISTS "daily_prices_select" ON public.property_daily_prices;
DROP POLICY IF EXISTS "daily_prices_insert" ON public.property_daily_prices;
DROP POLICY IF EXISTS "daily_prices_update" ON public.property_daily_prices;
DROP POLICY IF EXISTS "daily_prices_delete" ON public.property_daily_prices;

CREATE POLICY "property_daily_prices_select"
  ON public.property_daily_prices FOR SELECT
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "property_daily_prices_insert"
  ON public.property_daily_prices FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "property_daily_prices_update"
  ON public.property_daily_prices FOR UPDATE
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "property_daily_prices_delete"
  ON public.property_daily_prices FOR DELETE
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Service role bypass property_daily_prices"
  ON public.property_daily_prices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- STEP 5: Fix reservations table RLS (Already corrected but ensure consistency)
-- ==============================================================================

DROP POLICY IF EXISTS "Managers can review reservations" ON public.reservations;
DROP POLICY IF EXISTS "reservations_select" ON public.reservations;
DROP POLICY IF EXISTS "reservations_insert" ON public.reservations;
DROP POLICY IF EXISTS "reservations_update" ON public.reservations;
DROP POLICY IF EXISTS "reservations_delete" ON public.reservations;
DROP POLICY IF EXISTS "reservations_update_own_org" ON public.reservations;
DROP POLICY IF EXISTS "Service role full access reservations" ON public.reservations;

CREATE POLICY "reservations_select"
  ON public.reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.property_listings pl
      JOIN public.properties p ON p.id = pl.property_id
      WHERE pl.id = property_listing_id
        AND p.organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
        AND (
          EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()
              AND (
                role = 'admin'
                OR access_all_properties = TRUE
                OR EXISTS (
                  SELECT 1 FROM public.user_properties
                  WHERE user_id = auth.uid()
                    AND property_id = p.id
                )
              )
          )
        )
    )
  );

CREATE POLICY "reservations_insert"
  ON public.reservations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
    AND EXISTS (
      SELECT 1 FROM public.property_listings pl
      JOIN public.properties p ON p.id = pl.property_id
      WHERE pl.id = property_listing_id
        AND p.organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
        AND (
          EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()
              AND (
                role = 'admin'
                OR access_all_properties = TRUE
                OR EXISTS (
                  SELECT 1 FROM public.user_properties
                  WHERE user_id = auth.uid()
                    AND property_id = p.id
                )
              )
          )
        )
    )
  );

CREATE POLICY "reservations_update"
  ON public.reservations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
    AND EXISTS (
      SELECT 1 FROM public.property_listings pl
      JOIN public.properties p ON p.id = pl.property_id
      WHERE pl.id = property_listing_id
        AND p.organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
        AND (
          EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()
              AND (
                role = 'admin'
                OR access_all_properties = TRUE
                OR EXISTS (
                  SELECT 1 FROM public.user_properties
                  WHERE user_id = auth.uid()
                    AND property_id = p.id
                )
              )
          )
        )
    )
  );

CREATE POLICY "reservations_delete"
  ON public.reservations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
    AND EXISTS (
      SELECT 1 FROM public.property_listings pl
      JOIN public.properties p ON p.id = pl.property_id
      WHERE pl.id = property_listing_id
        AND p.organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
        AND (
          EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()
              AND (
                role = 'admin'
                OR access_all_properties = TRUE
                OR EXISTS (
                  SELECT 1 FROM public.user_properties
                  WHERE user_id = auth.uid()
                    AND property_id = p.id
                )
              )
          )
        )
    )
  );

CREATE POLICY "Service role full access reservations"
  ON public.reservations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
