-- ============================================================
-- Multi-tenancy: Organizations
-- ============================================================

-- Tabela de organizações (um registo por cliente SaaS)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Função helper: retorna organization_id do user autenticado
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
$$;

-- Política: membros da org vêem apenas a sua organização
DROP POLICY IF EXISTS "org_members_select" ON public.organizations;
CREATE POLICY "org_members_select" ON public.organizations
  FOR SELECT USING (id = get_user_organization_id());

-- Inserir org default para dados existentes (dados do single-tenant inicial)
INSERT INTO public.organizations (id, name, slug, subscription_status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default', 'default', 'active')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Adicionar organization_id a user_profiles
-- ============================================================
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.user_profiles
  SET organization_id = '00000000-0000-0000-0000-000000000001'
  WHERE organization_id IS NULL;

-- ============================================================
-- Adicionar organization_id a properties
-- Substituir policies existentes por versões com isolamento de org
-- ============================================================
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.properties
  SET organization_id = '00000000-0000-0000-0000-000000000001'
  WHERE organization_id IS NULL;

-- Remover policies antigas (sem filtro de org)
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.properties;
DROP POLICY IF EXISTS "properties_select" ON public.properties;
DROP POLICY IF EXISTS "org_isolation" ON public.properties;

-- Nova policy SELECT: org + acesso à propriedade dentro da org
CREATE POLICY "properties_select"
  ON public.properties FOR SELECT
  USING (
    organization_id = get_user_organization_id()
    AND user_has_property_access(id)
  );

-- ============================================================
-- Adicionar organization_id a property_listings
-- ============================================================
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.property_listings;
DROP POLICY IF EXISTS "property_listings_select" ON public.property_listings;

CREATE POLICY "property_listings_select"
  ON public.property_listings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND p.organization_id = get_user_organization_id()
        AND user_has_property_access(p.id)
    )
  );

-- ============================================================
-- Adicionar organization_id a owners
-- Substituir "USING (true)" pela versão com isolamento de org
-- ============================================================
ALTER TABLE public.owners
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.owners
  SET organization_id = '00000000-0000-0000-0000-000000000001'
  WHERE organization_id IS NULL;

-- Remover policies antigas (a SELECT era USING true — sem isolamento)
DROP POLICY IF EXISTS "Authenticated users can view owners" ON public.owners;
DROP POLICY IF EXISTS "Admin and manager can insert owners" ON public.owners;
DROP POLICY IF EXISTS "Admin and manager can update owners" ON public.owners;
DROP POLICY IF EXISTS "Admin can delete owners" ON public.owners;
DROP POLICY IF EXISTS "org_isolation" ON public.owners;

-- Novas policies com isolamento de org
CREATE POLICY "owners_select"
  ON public.owners FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "owners_insert"
  ON public.owners FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "owners_update"
  ON public.owners FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "owners_delete"
  ON public.owners FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- Adicionar organization_id a guests (resolver conflito de email entre orgs)
-- ============================================================
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.guests
  SET organization_id = '00000000-0000-0000-0000-000000000001'
  WHERE organization_id IS NULL;

-- Substituir unique(email) por unique(email, organization_id)
ALTER TABLE public.guests DROP CONSTRAINT IF EXISTS guests_email_key;
ALTER TABLE public.guests
  ADD CONSTRAINT IF NOT EXISTS guests_email_org_unique UNIQUE (email, organization_id);

-- Remover policies antigas de guests (se existirem)
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.guests;
DROP POLICY IF EXISTS "Enable write for admin and manager" ON public.guests;
DROP POLICY IF EXISTS "org_isolation" ON public.guests;

-- Novas policies com isolamento de org
CREATE POLICY "guests_select"
  ON public.guests FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "guests_insert"
  ON public.guests FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "guests_update"
  ON public.guests FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_organization_id());

-- ============================================================
-- Actualizar reservations: filtro já usa property_listing → property
-- A função user_has_property_access verifica acesso — como properties
-- agora tem filtro de org, as reservations herdam o isolamento indirectamente.
-- Mas para garantir, actualizar as policies de reservations também.
-- ============================================================
DROP POLICY IF EXISTS "reservations_select" ON public.reservations;
DROP POLICY IF EXISTS "reservations_insert" ON public.reservations;
DROP POLICY IF EXISTS "reservations_update" ON public.reservations;
DROP POLICY IF EXISTS "reservations_delete" ON public.reservations;

CREATE POLICY "reservations_select"
  ON public.reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.property_listings pl
      JOIN public.properties p ON p.id = pl.property_id
      WHERE pl.id = property_listing_id
        AND p.organization_id = get_user_organization_id()
        AND user_has_property_access(pl.property_id)
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
        AND p.organization_id = get_user_organization_id()
        AND user_has_property_access(pl.property_id)
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
        AND p.organization_id = get_user_organization_id()
        AND user_has_property_access(pl.property_id)
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
        AND p.organization_id = get_user_organization_id()
        AND user_has_property_access(pl.property_id)
    )
  );
