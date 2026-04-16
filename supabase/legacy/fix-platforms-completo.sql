-- ============================================================
-- VERIFICAR E CORRIGIR ESTRUTURA COMPLETA DE PLATFORMS
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. VER ESTRUTURA COMPLETA DA TABELA
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'platforms'
ORDER BY ordinal_position;

-- 2. SE A COLUNA 'code' EXISTIR E FOR NOT NULL, precisamos incluí-la
-- Vamos fazer um INSERT completo com todos os campos necessários

-- Primeiro, limpar
DELETE FROM platforms;

-- Inserir com TODOS os campos (ajuste conforme a estrutura real)
INSERT INTO platforms (name, code, display_name, is_active) VALUES
('airbnb', 'AIRBNB', 'Airbnb', true),
('booking', 'BOOKING', 'Booking.com', true),
('vrbo', 'VRBO', 'VRBO', true),
('manual', 'MANUAL', 'Manual / Outro', true);

-- Se 'code' não existir, tente sem ele:
-- INSERT INTO platforms (name, display_name, is_active) VALUES
-- ('airbnb', 'Airbnb', true),
-- ('booking', 'Booking.com', true),
-- ('vrbo', 'VRBO', true),
-- ('manual', 'Manual / Outro', true);

-- 3. VERIFICAR RESULTADO
SELECT * FROM platforms ORDER BY display_name;

-- ============================================================
-- INSTRUÇÕES
-- ============================================================
-- 1. Execute primeiro o SELECT para ver a estrutura
-- 2. Veja quais colunas são NOT NULL
-- 3. Execute o DELETE e INSERT apropriado
