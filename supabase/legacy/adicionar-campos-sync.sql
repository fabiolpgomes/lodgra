-- ============================================================
-- ADICIONAR CAMPOS PARA SINCRONIZAÇÃO iCAL
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- Adicionar colunas para rastreamento de sincronização
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS booking_source TEXT;

-- Criar índice único para external_id (evitar duplicatas)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_external_id 
ON reservations(external_id) 
WHERE external_id IS NOT NULL;

-- Criar índice para booking_source
CREATE INDEX IF NOT EXISTS idx_reservations_booking_source 
ON reservations(booking_source) 
WHERE booking_source IS NOT NULL;

-- Verificar se as colunas foram adicionadas
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'reservations'
  AND column_name IN ('external_id', 'booking_source')
ORDER BY column_name;

-- ============================================================
-- RESULTADO ESPERADO
-- ============================================================
-- Deve mostrar as duas novas colunas:
-- booking_source | text | YES
-- external_id | text | YES
