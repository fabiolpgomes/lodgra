-- ============================================================
-- RLS com filtro por propriedade
-- Aplicar no Supabase Dashboard > SQL Editor
--
-- Substitui as policies permissivas ("qualquer autenticado") por
-- policies que limitam managers ao escopo de propriedades atribuídas.
-- Admins e utilizadores com access_all_properties=true mantêm acesso total.
-- ============================================================

-- Helper: verifica se o utilizador tem acesso à propriedade
CREATE OR REPLACE FUNCTION user_has_property_access(prop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
      AND (
        role = 'admin'
        OR access_all_properties = TRUE
        OR EXISTS (
          SELECT 1 FROM user_properties
          WHERE user_id = auth.uid()
            AND property_id = prop_id
        )
      )
  );
$$;

-- ─── reservations ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Enable read for authenticated users" ON reservations;
DROP POLICY IF EXISTS "Enable write for admin and manager" ON reservations;

CREATE POLICY "reservations_select"
  ON reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM property_listings pl
      WHERE pl.id = property_listing_id
        AND user_has_property_access(pl.property_id)
    )
  );

CREATE POLICY "reservations_insert"
  ON reservations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
    AND EXISTS (
      SELECT 1 FROM property_listings pl
      WHERE pl.id = property_listing_id
        AND user_has_property_access(pl.property_id)
    )
  );

CREATE POLICY "reservations_update"
  ON reservations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
    AND EXISTS (
      SELECT 1 FROM property_listings pl
      WHERE pl.id = property_listing_id
        AND user_has_property_access(pl.property_id)
    )
  );

CREATE POLICY "reservations_delete"
  ON reservations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
    AND EXISTS (
      SELECT 1 FROM property_listings pl
      WHERE pl.id = property_listing_id
        AND user_has_property_access(pl.property_id)
    )
  );

-- ─── expenses ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Enable read for authenticated users" ON expenses;
DROP POLICY IF EXISTS "Enable write for admin and manager" ON expenses;

CREATE POLICY "expenses_select"
  ON expenses FOR SELECT
  USING (user_has_property_access(property_id));

CREATE POLICY "expenses_insert"
  ON expenses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
    AND user_has_property_access(property_id)
  );

CREATE POLICY "expenses_update"
  ON expenses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
    AND user_has_property_access(property_id)
  );

CREATE POLICY "expenses_delete"
  ON expenses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
    AND user_has_property_access(property_id)
  );

-- ─── properties ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Enable read for authenticated users" ON properties;

CREATE POLICY "properties_select"
  ON properties FOR SELECT
  USING (user_has_property_access(id));

-- ─── property_listings ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Enable read for authenticated users" ON property_listings;

CREATE POLICY "property_listings_select"
  ON property_listings FOR SELECT
  USING (user_has_property_access(property_id));
