-- ============================================================
-- ADICIONAR POLÍTICA RLS PARA property_listings
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'property_listings';

-- Se não estiver habilitado, habilitar
ALTER TABLE property_listings ENABLE ROW LEVEL SECURITY;

-- Criar política permissiva (permite tudo)
DROP POLICY IF EXISTS "Permitir tudo em property_listings" ON property_listings;

CREATE POLICY "Permitir tudo em property_listings"
ON property_listings
FOR ALL
USING (true)
WITH CHECK (true);

-- Verificar se a política foi criada
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'property_listings';

-- Testar insert manual
INSERT INTO property_listings (
  property_id,
  external_listing_id,
  sync_enabled,
  is_active
) VALUES (
  (SELECT id FROM properties LIMIT 1),
  'TESTE-MANUAL',
  true,
  true
);

-- Se funcionou, deletar o teste
DELETE FROM property_listings WHERE external_listing_id = 'TESTE-MANUAL';

-- ============================================================
-- RESULTADO ESPERADO
-- ============================================================
-- Deve mostrar a política criada
-- Insert manual deve funcionar
-- Depois disso, o formulário deve funcionar também
