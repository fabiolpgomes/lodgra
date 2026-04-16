-- ============================================================
-- Invariante: organization_id nunca pode ser NULL
--
-- Problema: as migrações anteriores adicionaram organization_id
-- como coluna nullable. Se o código da aplicação falhar entre
-- steps (ex: org criada mas profile update falhou), o registo
-- fica órfão — invisível via RLS e inacessível.
--
-- Correcção:
--   1. Preencher qualquer NULL remanescente com a org default
--      (rede de segurança para dados legacy).
--   2. ALTER COLUMN SET NOT NULL — a partir daqui, a DB rejeita
--      inserções sem org_id com erro explícito, convertendo
--      falhas silenciosas em falhas audíveis (antifragilidade).
--
-- Tabelas afectadas:
--   user_profiles, properties, owners, guests
--
-- Não afectadas (sem coluna org_id, isolamento por join):
--   property_listings, reservations, expenses, user_properties
-- ============================================================

-- ─── 1. Preencher NULLs remanescentes ────────────────────────────────────────
-- (a migração _03_organizations já fez isto; este passo é uma rede de segurança)

UPDATE public.user_profiles
  SET organization_id = '00000000-0000-0000-0000-000000000001'
  WHERE organization_id IS NULL;

UPDATE public.properties
  SET organization_id = '00000000-0000-0000-0000-000000000001'
  WHERE organization_id IS NULL;

UPDATE public.owners
  SET organization_id = '00000000-0000-0000-0000-000000000001'
  WHERE organization_id IS NULL;

UPDATE public.guests
  SET organization_id = '00000000-0000-0000-0000-000000000001'
  WHERE organization_id IS NULL;

-- ─── 2. Tornar NOT NULL ───────────────────────────────────────────────────────
-- A partir daqui, qualquer INSERT sem organization_id falha com
-- violação de constraint — erro claro em vez de registo órfão.

ALTER TABLE public.user_profiles
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.properties
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.owners
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.guests
  ALTER COLUMN organization_id SET NOT NULL;
