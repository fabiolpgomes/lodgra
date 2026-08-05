-- FIX: RLS Policies Architecture Bug (SAFE VERSION)
-- Drops old policies only if tables exist, then creates corrected ones

-- ==== PROPERTY_PRICES ====
DROP POLICY IF EXISTS "Users can view own property prices" ON property_prices;
DROP POLICY IF EXISTS "Users can update own property prices" ON property_prices;
DROP POLICY IF EXISTS "Users can insert own property prices" ON property_prices;

CREATE POLICY "property_prices_select"
  ON property_prices FOR SELECT
  USING (
    property_id IN (
      SELECT p.id FROM properties p
      JOIN owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
  );

CREATE POLICY "property_prices_insert"
  ON property_prices FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT p.id FROM properties p
      JOIN owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
  );

CREATE POLICY "property_prices_update"
  ON property_prices FOR UPDATE
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
