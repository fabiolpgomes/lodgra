-- ============================================================
-- VERIFICAR E POPULAR TABELA PLATFORMS
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. VERIFICAR SE A TABELA PLATFORMS TEM DADOS
SELECT * FROM platforms;

-- Se não retornar nada, execute o INSERT abaixo:

-- 2. INSERIR PLATAFORMAS PADRÃO
INSERT INTO platforms (name, display_name, is_active) VALUES
('airbnb', 'Airbnb', true),
('booking', 'Booking.com', true),
('vrbo', 'VRBO', true),
('manual', 'Manual / Outro', true)
ON CONFLICT (name) DO NOTHING;

-- 3. VERIFICAR SE FOI INSERIDO
SELECT id, name, display_name, is_active FROM platforms ORDER BY display_name;

-- ============================================================
-- RESULTADO ESPERADO
-- ============================================================
-- Deve mostrar 4 plataformas:
-- - Airbnb
-- - Booking.com  
-- - VRBO
-- - Manual / Outro
