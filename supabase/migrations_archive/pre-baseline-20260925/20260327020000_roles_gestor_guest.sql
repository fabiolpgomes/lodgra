-- ─────────────────────────────────────────────────────────────────────────────
-- Semana 1: Reorganizar papéis (manager→gestor, + novo papel guest)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Adicionar guest_type à tabela user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS guest_type TEXT
    CHECK (guest_type IN ('staff', 'owner'));

-- 2. Renomear todos os manager → gestor
UPDATE public.user_profiles
  SET role = 'gestor'
  WHERE role = 'manager';

-- 3. Atualizar a função get_my_profile() para retornar guest_type
-- Drop first because return type is changing (adding guest_type)
DROP FUNCTION IF EXISTS public.get_my_profile();
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE (user_id UUID, role TEXT, access_all_properties BOOLEAN, organization_id UUID, guest_type TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
    SELECT
      up.id,
      up.role,
      up.access_all_properties,
      up.organization_id,
      up.guest_type
    FROM user_profiles up
    WHERE up.id = auth.uid();
END;
$$;

-- 4. Atualizar trigger que cria propriedades para novos managers → gestor
CREATE OR REPLACE FUNCTION public.handle_manager_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Quando um novo gestor é criado, atribuir todas as propriedades da org automaticamente
  IF NEW.role = 'gestor' THEN
    INSERT INTO public.user_properties (user_id, property_id)
    SELECT NEW.id, id
    FROM public.properties
    WHERE organization_id = NEW.organization_id
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Garantir que o trigger está ativo (pode ter sido criado antes com nome on_manager_created)
DROP TRIGGER IF EXISTS on_manager_created ON public.user_profiles;
CREATE TRIGGER on_manager_created
AFTER INSERT ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_manager_created();

-- 5. Atualizar RLS policies para usar 'gestor' em vez de 'manager'

-- ─── RESERVATIONS ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "reservations_insert" ON public.reservations;
CREATE POLICY "reservations_insert" ON public.reservations
  FOR INSERT
  WITH CHECK (
    (SELECT user_profiles.organization_id FROM user_profiles WHERE id = auth.uid()) = organization_id
    AND (SELECT user_profiles.role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'gestor')
    AND public.user_has_property_access((SELECT pl.property_id FROM property_listings pl WHERE pl.id = property_listing_id))
  );

DROP POLICY IF EXISTS "reservations_update" ON public.reservations;
CREATE POLICY "reservations_update" ON public.reservations
  FOR UPDATE
  USING (
    (SELECT user_profiles.organization_id FROM user_profiles WHERE id = auth.uid()) = organization_id
    AND (SELECT user_profiles.role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'gestor')
    AND public.user_has_property_access((SELECT pl.property_id FROM property_listings pl WHERE pl.id = property_listing_id))
  );

DROP POLICY IF EXISTS "reservations_delete" ON public.reservations;
CREATE POLICY "reservations_delete" ON public.reservations
  FOR DELETE
  USING (
    (SELECT user_profiles.organization_id FROM user_profiles WHERE id = auth.uid()) = organization_id
    AND (SELECT user_profiles.role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'gestor')
    AND public.user_has_property_access((SELECT pl.property_id FROM property_listings pl WHERE pl.id = property_listing_id))
  );

-- ─── EXPENSES ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
CREATE POLICY "expenses_insert" ON public.expenses
  FOR INSERT
  WITH CHECK (
    (SELECT user_profiles.organization_id FROM user_profiles WHERE id = auth.uid()) = organization_id
    AND (SELECT user_profiles.role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'gestor')
    AND public.user_has_property_access(property_id)
  );

DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
CREATE POLICY "expenses_update" ON public.expenses
  FOR UPDATE
  USING (
    (SELECT user_profiles.organization_id FROM user_profiles WHERE id = auth.uid()) = organization_id
    AND (SELECT user_profiles.role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'gestor')
    AND public.user_has_property_access(property_id)
  );

DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;
CREATE POLICY "expenses_delete" ON public.expenses
  FOR DELETE
  USING (
    (SELECT user_profiles.organization_id FROM user_profiles WHERE id = auth.uid()) = organization_id
    AND (SELECT user_profiles.role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'gestor')
    AND public.user_has_property_access(property_id)
  );

-- ─── PROPERTIES ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "properties_insert" ON public.properties;
CREATE POLICY "properties_insert" ON public.properties
  FOR INSERT
  WITH CHECK (
    (SELECT user_profiles.organization_id FROM user_profiles WHERE id = auth.uid()) = organization_id
    AND (SELECT user_profiles.role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'gestor')
  );

DROP POLICY IF EXISTS "properties_update" ON public.properties;
CREATE POLICY "properties_update" ON public.properties
  FOR UPDATE
  USING (
    (SELECT user_profiles.organization_id FROM user_profiles WHERE id = auth.uid()) = organization_id
    AND (SELECT user_profiles.role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'gestor')
  );

DROP POLICY IF EXISTS "properties_delete" ON public.properties;
CREATE POLICY "properties_delete" ON public.properties
  FOR DELETE
  USING (
    (SELECT user_profiles.organization_id FROM user_profiles WHERE id = auth.uid()) = organization_id
    AND (SELECT user_profiles.role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- ─── PROPERTY_LISTINGS ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "property_listings_insert" ON public.property_listings;
CREATE POLICY "property_listings_insert" ON public.property_listings
  FOR INSERT
  WITH CHECK (
    (SELECT user_profiles.organization_id FROM user_profiles WHERE id = auth.uid()) = organization_id
    AND (SELECT user_profiles.role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'gestor')
    AND public.user_has_property_access(property_id)
  );

DROP POLICY IF EXISTS "property_listings_update" ON public.property_listings;
CREATE POLICY "property_listings_update" ON public.property_listings
  FOR UPDATE
  USING (
    (SELECT user_profiles.organization_id FROM user_profiles WHERE id = auth.uid()) = organization_id
    AND (SELECT user_profiles.role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'gestor')
    AND public.user_has_property_access(property_id)
  );

DROP POLICY IF EXISTS "property_listings_delete" ON public.property_listings;
CREATE POLICY "property_listings_delete" ON public.property_listings
  FOR DELETE
  USING (
    (SELECT user_profiles.organization_id FROM user_profiles WHERE id = auth.uid()) = organization_id
    AND (SELECT user_profiles.role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- ─── OWNERS ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "owners_insert" ON public.owners;
CREATE POLICY "owners_insert" ON public.owners
  FOR INSERT
  WITH CHECK (
    (SELECT user_profiles.organization_id FROM user_profiles WHERE id = auth.uid()) = organization_id
    AND (SELECT user_profiles.role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'gestor')
  );

DROP POLICY IF EXISTS "owners_update" ON public.owners;
CREATE POLICY "owners_update" ON public.owners
  FOR UPDATE
  USING (
    (SELECT user_profiles.organization_id FROM user_profiles WHERE id = auth.uid()) = organization_id
    AND (SELECT user_profiles.role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'gestor')
  );

DROP POLICY IF EXISTS "owners_delete" ON public.owners;
CREATE POLICY "owners_delete" ON public.owners
  FOR DELETE
  USING (
    (SELECT user_profiles.organization_id FROM user_profiles WHERE id = auth.uid()) = organization_id
    AND (SELECT user_profiles.role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- ─── GUESTS ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "guests_insert" ON public.guests;
CREATE POLICY "guests_insert" ON public.guests
  FOR INSERT
  WITH CHECK (
    (SELECT user_profiles.organization_id FROM user_profiles WHERE id = auth.uid()) = organization_id
    AND (SELECT user_profiles.role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'gestor')
  );

DROP POLICY IF EXISTS "guests_update" ON public.guests;
CREATE POLICY "guests_update" ON public.guests
  FOR UPDATE
  USING (
    (SELECT user_profiles.organization_id FROM user_profiles WHERE id = auth.uid()) = organization_id
    AND (SELECT user_profiles.role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'gestor')
  );
