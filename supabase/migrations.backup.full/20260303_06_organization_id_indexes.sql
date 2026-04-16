-- ============================================================
-- Performance: índices em organization_id e foreign keys críticas
--
-- Problema: todas as colunas organization_id adicionadas nas
-- migrações de multi-tenancy ficaram sem índice. Como são usadas
-- em cada RLS policy (via get_user_organization_id()), cada query
-- fazia full table scan por row retornada.
--
-- Impacto: O(n) → O(log n) em todas as políticas RLS de:
--   user_profiles, properties, guests, owners
--
-- property_listings.property_id também não tinha índice — é a
-- chave de junção em todas as políticas de reservations e listings.
-- ============================================================

-- user_profiles.organization_id
-- Usado em: get_user_organization_id(), user_has_property_access()
-- e em qualquer query que filtra por org no painel de admin
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization_id
  ON public.user_profiles (organization_id);

-- properties.organization_id
-- Usado em: properties_select, e como subquery em policies de
-- property_listings, reservations e expenses
CREATE INDEX IF NOT EXISTS idx_properties_organization_id
  ON public.properties (organization_id);

-- guests.organization_id
-- Usado em: guests_select, guests_insert, guests_update
CREATE INDEX IF NOT EXISTS idx_guests_organization_id
  ON public.guests (organization_id);

-- owners.organization_id
-- Usado em: owners_select, owners_insert, owners_update, owners_delete
CREATE INDEX IF NOT EXISTS idx_owners_organization_id
  ON public.owners (organization_id);

-- property_listings.property_id
-- Usado em: todos os JOINs property_listings → properties nas policies
-- de reservations, property_listings_select, e no iCal sync
CREATE INDEX IF NOT EXISTS idx_property_listings_property_id
  ON public.property_listings (property_id);
