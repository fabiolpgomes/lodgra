-- ============================================================
-- ADICIONAR CAMPOS DE CANCELAMENTO
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- Adicionar colunas para rastreamento de cancelamento
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Criar índice para facilitar busca de reservas canceladas
CREATE INDEX IF NOT EXISTS idx_reservations_cancelled_at 
ON reservations(cancelled_at) 
WHERE cancelled_at IS NOT NULL;

-- Verificar se as colunas foram adicionadas
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'reservations'
  AND column_name IN ('cancellation_reason', 'cancelled_at')
ORDER BY column_name;

-- ============================================================
-- RESULTADO ESPERADO
-- ============================================================
-- Deve mostrar as duas novas colunas:
-- cancellation_reason | text | YES
-- cancelled_at | timestamp with time zone | YES
