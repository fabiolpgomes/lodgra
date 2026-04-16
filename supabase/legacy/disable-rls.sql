-- ============================================================
-- DESABILITAR RLS (Row Level Security) - APENAS DESENVOLVIMENTO
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- IMPORTANTE: Isso desabilita segurança para facilitar o desenvolvimento
-- Em produção, você deve configurar políticas RLS apropriadas

-- Desabilitar RLS em todas as tabelas
ALTER TABLE properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE platforms DISABLE ROW LEVEL SECURITY;
ALTER TABLE property_listings DISABLE ROW LEVEL SECURITY;
ALTER TABLE guests DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions DISABLE ROW LEVEL SECURITY;

-- Verificar status (deve mostrar 'f' para false em todas)
SELECT 
  schemaname,
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
