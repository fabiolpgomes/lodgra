-- ============================================================
-- CORRIGIR ESTRUTURA DA TABELA PLATFORMS
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. VERIFICAR ESTRUTURA ATUAL
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'platforms'
ORDER BY ordinal_position;

-- 2. ADICIONAR COLUNA display_name (se não existir)
ALTER TABLE platforms 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 3. INSERIR PLATAFORMAS (sem display_name por enquanto)
INSERT INTO platforms (name, is_active) VALUES
('airbnb', true),
('booking', true),
('vrbo', true),
('manual', true)
ON CONFLICT (name) DO NOTHING;

-- 4. ATUALIZAR display_name
UPDATE platforms SET display_name = 'Airbnb' WHERE name = 'airbnb';
UPDATE platforms SET display_name = 'Booking.com' WHERE name = 'booking';
UPDATE platforms SET display_name = 'VRBO' WHERE name = 'vrbo';
UPDATE platforms SET display_name = 'Manual / Outro' WHERE name = 'manual';

-- 5. VERIFICAR RESULTADO
SELECT id, name, display_name, is_active 
FROM platforms 
ORDER BY display_name;

-- ============================================================
-- RESULTADO ESPERADO
-- ============================================================
-- Deve mostrar 4 plataformas com display_name preenchido
