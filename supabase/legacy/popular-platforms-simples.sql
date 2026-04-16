-- ============================================================
-- POPULAR PLATFORMS - VERSÃO SIMPLIFICADA
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. ADICIONAR COLUNA display_name (se não existir)
ALTER TABLE platforms 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 2. LIMPAR TABELA (se tiver dados antigos)
DELETE FROM platforms;

-- 3. INSERIR PLATAFORMAS (sem ON CONFLICT)
INSERT INTO platforms (name, display_name, is_active) VALUES
('airbnb', 'Airbnb', true),
('booking', 'Booking.com', true),
('vrbo', 'VRBO', true),
('manual', 'Manual / Outro', true);

-- 4. VERIFICAR RESULTADO
SELECT id, name, display_name, is_active 
FROM platforms 
ORDER BY display_name;

-- ============================================================
-- RESULTADO ESPERADO
-- ============================================================
-- Deve mostrar 4 plataformas:
-- airbnb | Airbnb | true
-- booking | Booking.com | true
-- vrbo | VRBO | true
-- manual | Manual / Outro | true
