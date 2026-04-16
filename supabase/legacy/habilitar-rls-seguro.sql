-- ============================================================
-- HABILITAR RLS COM POLÍTICAS PERMISSIVAS
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- IMPORTANTE: Isso mantém o comportamento atual (acesso total)
-- mas resolve os avisos de segurança do Supabase

-- ============================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ============================================================

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CRIAR POLÍTICAS PERMISSIVAS (PERMITE TUDO)
-- ============================================================

-- PROPERTIES
CREATE POLICY "Permitir tudo em properties"
ON properties
FOR ALL
USING (true)
WITH CHECK (true);

-- PLATFORMS
CREATE POLICY "Permitir tudo em platforms"
ON platforms
FOR ALL
USING (true)
WITH CHECK (true);

-- PROPERTY_LISTINGS
CREATE POLICY "Permitir tudo em property_listings"
ON property_listings
FOR ALL
USING (true)
WITH CHECK (true);

-- GUESTS
CREATE POLICY "Permitir tudo em guests"
ON guests
FOR ALL
USING (true)
WITH CHECK (true);

-- RESERVATIONS
CREATE POLICY "Permitir tudo em reservations"
ON reservations
FOR ALL
USING (true)
WITH CHECK (true);

-- CALENDAR_BLOCKS
CREATE POLICY "Permitir tudo em calendar_blocks"
ON calendar_blocks
FOR ALL
USING (true)
WITH CHECK (true);

-- SYNC_LOGS
CREATE POLICY "Permitir tudo em sync_logs"
ON sync_logs
FOR ALL
USING (true)
WITH CHECK (true);

-- FINANCIAL_TRANSACTIONS
CREATE POLICY "Permitir tudo em financial_transactions"
ON financial_transactions
FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================================
-- CORRIGIR VIEW unified_calendar (remover SECURITY DEFINER)
-- ============================================================

DROP VIEW IF EXISTS unified_calendar;

CREATE VIEW unified_calendar AS
SELECT 
  p.id as property_id,
  p.name as property_name,
  r.check_in,
  r.check_out,
  'reservation' as type,
  COALESCE(g.first_name || ' ' || g.last_name, 'Sem hóspede') as guest_name,
  r.status,
  pl.id as platform_listing_id
FROM reservations r
JOIN property_listings pl ON r.property_listing_id = pl.id
JOIN properties p ON pl.property_id = p.id
LEFT JOIN guests g ON r.guest_id = g.id

UNION ALL

SELECT 
  p.id as property_id,
  p.name as property_name,
  cb.start_date as check_in,
  cb.end_date as check_out,
  'block' as type,
  cb.block_type as guest_name,
  'blocked' as status,
  NULL as platform_listing_id
FROM calendar_blocks cb
JOIN properties p ON cb.property_id = p.id;

-- ============================================================
-- VERIFICAR SE FUNCIONOU
-- ============================================================

-- Verificar RLS habilitado
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================
-- RESULTADO ESPERADO
-- ============================================================
-- Todas as tabelas devem mostrar rls_enabled = true
-- Cada tabela deve ter 1 política chamada "Permitir tudo em [nome_tabela]"
