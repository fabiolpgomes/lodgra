-- ============================================================
-- SECURITY FIX: Eliminar policies permissivas legadas
--
-- Problema descoberto durante db push: a DB tem policies legadas
-- criadas antes do sistema de migrações, que anulam todo o trabalho
-- de org isolation via OR (comportamento padrão do Postgres RLS):
--
--   "Permitir tudo em guests"          → USING (true)  ← qualquer pessoa
--   "Permitir tudo em property_listings" → USING (true) ← qualquer pessoa
--   "Permitir tudo em reservations"    → USING (true)  ← qualquer pessoa
--   "authenticated_by_role" (em 5 tabelas) → sem check de org
--
-- Antes de eliminar, adicionar policies de escrita em
-- property_listings e properties — que só tinham SELECT — para
-- garantir continuidade das operações browser-side.
-- ============================================================

-- ─── 1. Policies de escrita para property_listings ───────────────────────────
-- (browser-side: sync page, property settings)

DROP POLICY IF EXISTS "property_listings_insert" ON public.property_listings;
DROP POLICY IF EXISTS "property_listings_update" ON public.property_listings;
DROP POLICY IF EXISTS "property_listings_delete" ON public.property_listings;

CREATE POLICY "property_listings_insert"
  ON public.property_listings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND p.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "property_listings_update"
  ON public.property_listings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND p.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "property_listings_delete"
  ON public.property_listings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND p.organization_id = public.get_user_organization_id()
    )
  );

-- ─── 2. Policies de escrita para properties ──────────────────────────────────
-- (admin client bypasses RLS — estas policies protegem acesso browser-side)

DROP POLICY IF EXISTS "properties_insert" ON public.properties;
DROP POLICY IF EXISTS "properties_update" ON public.properties;
DROP POLICY IF EXISTS "properties_delete" ON public.properties;

CREATE POLICY "properties_insert"
  ON public.properties FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
    AND organization_id = public.get_user_organization_id()
  );

CREATE POLICY "properties_update"
  ON public.properties FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
    AND organization_id = public.get_user_organization_id()
    AND public.user_has_property_access(id)
  );

CREATE POLICY "properties_delete"
  ON public.properties FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    AND organization_id = public.get_user_organization_id()
  );

-- ─── 3. Eliminar policies permissivas legadas ─────────────────────────────────
-- Feito APÓS adicionar as policies de substituição acima.

-- USING (true) — acesso irrestrito a qualquer pessoa autenticada
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'guests') THEN
    DROP POLICY IF EXISTS "Permitir tudo em guests" ON public.guests;
    DROP POLICY IF EXISTS "authenticated_by_role" ON public.guests;
  END IF;
END $$;
DROP POLICY IF EXISTS "Permitir tudo em property_listings" ON public.property_listings;
DROP POLICY IF EXISTS "Permitir tudo em reservations"     ON public.reservations;

-- authenticated_by_role — sem check de org (qualquer viewer acede a tudo)
DROP POLICY IF EXISTS "authenticated_by_role" ON public.expenses;
DROP POLICY IF EXISTS "authenticated_by_role" ON public.properties;
DROP POLICY IF EXISTS "authenticated_by_role" ON public.property_listings;
DROP POLICY IF EXISTS "authenticated_by_role" ON public.reservations;
