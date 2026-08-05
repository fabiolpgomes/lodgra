-- FIX: Safe RLS Policy Fix with existence checks
-- CRITICAL: All tables must use owners table JOIN pattern (owner_id → owners.user_id)
-- Applied: 2026-08-09
-- NOTE: Only fixes tables that exist - safely skips missing tables

-- Helper: Fix table policies if table exists
-- We check by attempting to drop and recreate policies

-- ==== PROPERTY_CANCELLATION_POLICIES (if exists) ====
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'property_cancellation_policies'
  ) THEN
    DROP POLICY IF EXISTS "Users can view own property cancellation policies" ON property_cancellation_policies;
    DROP POLICY IF EXISTS "Users can manage own property cancellation policies" ON property_cancellation_policies;

    CREATE POLICY "property_cancellation_policies_select"
      ON property_cancellation_policies FOR SELECT
      USING (
        property_id IN (
          SELECT p.id FROM properties p
          JOIN owners o ON p.owner_id = o.id
          WHERE o.user_id = auth.uid()
        )
      );

    CREATE POLICY "property_cancellation_policies_all"
      ON property_cancellation_policies FOR ALL
      USING (
        property_id IN (
          SELECT p.id FROM properties p
          JOIN owners o ON p.owner_id = o.id
          WHERE o.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ==== DAILY_PRICES (if exists) ====
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'daily_prices'
  ) THEN
    DROP POLICY IF EXISTS "Users can view own property daily prices" ON daily_prices;
    DROP POLICY IF EXISTS "Users can update own property daily prices" ON daily_prices;
    DROP POLICY IF EXISTS "Users can insert own property daily prices" ON daily_prices;

    CREATE POLICY "daily_prices_select"
      ON daily_prices FOR SELECT
      USING (
        property_id IN (
          SELECT p.id FROM properties p
          JOIN owners o ON p.owner_id = o.id
          WHERE o.user_id = auth.uid()
        )
      );

    CREATE POLICY "daily_prices_insert"
      ON daily_prices FOR INSERT
      WITH CHECK (
        property_id IN (
          SELECT p.id FROM properties p
          JOIN owners o ON p.owner_id = o.id
          WHERE o.user_id = auth.uid()
        )
      );

    CREATE POLICY "daily_prices_update"
      ON daily_prices FOR UPDATE
      USING (
        property_id IN (
          SELECT p.id FROM properties p
          JOIN owners o ON p.owner_id = o.id
          WHERE o.user_id = auth.uid()
        )
      )
      WITH CHECK (
        property_id IN (
          SELECT p.id FROM properties p
          JOIN owners o ON p.owner_id = o.id
          WHERE o.user_id = auth.uid()
        )
      );
  END IF;
END $$;
