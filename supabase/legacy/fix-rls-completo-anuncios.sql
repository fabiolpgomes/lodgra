-- ============================================================
-- CORRIGIR RLS COMPLETO - TODAS AS TABELAS
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- HABILITAR RLS (se não estiver)
ALTER TABLE property_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;

-- REMOVER POLÍTICAS ANTIGAS (se existirem)
DROP POLICY IF EXISTS "Permitir tudo em property_listings" ON property_listings;
DROP POLICY IF EXISTS "Permitir tudo em platforms" ON platforms;

-- CRIAR POLÍTICAS PERMISSIVAS
CREATE POLICY "Permitir tudo em property_listings"
ON property_listings
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir tudo em platforms"
ON platforms
FOR ALL
USING (true)
WITH CHECK (true);

-- VERIFICAR RESULTADO
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('property_listings', 'platforms')
ORDER BY tablename, policyname;

-- VERIFICAR RLS HABILITADO
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('property_listings', 'platforms')
ORDER BY tablename;

-- ============================================================
-- RESULTADO ESPERADO
-- ============================================================
-- Ambas as tabelas devem mostrar:
-- - rls_enabled = true
-- - 1 política "Permitir tudo em [nome_tabela]"
