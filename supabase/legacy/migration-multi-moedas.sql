-- ============================================
-- MIGRATION: SUPORTE MULTI-MOEDAS
-- ============================================
-- Adiciona suporte para múltiplas moedas no sistema
-- Permite propriedades e reservas em EUR, BRL, USD, etc

-- 1. Adicionar coluna currency nas propriedades
ALTER TABLE properties 
ADD COLUMN currency VARCHAR(3) DEFAULT 'EUR' NOT NULL;

-- 2. Adicionar coluna currency nas reservas
ALTER TABLE reservations 
ADD COLUMN currency VARCHAR(3) DEFAULT 'EUR' NOT NULL;

-- 3. Criar índice para melhor performance
CREATE INDEX idx_properties_currency ON properties(currency);
CREATE INDEX idx_reservations_currency ON reservations(currency);

-- 4. Adicionar comentários
COMMENT ON COLUMN properties.currency IS 'Código ISO 4217 da moeda (EUR, BRL, USD, GBP, etc)';
COMMENT ON COLUMN reservations.currency IS 'Código ISO 4217 da moeda (EUR, BRL, USD, GBP, etc)';

-- ============================================
-- MOEDAS SUPORTADAS:
-- EUR - Euro (€)
-- BRL - Real Brasileiro (R$)
-- USD - Dólar Americano ($)
-- GBP - Libra Esterlina (£)
-- CHF - Franco Suíço (CHF)
-- JPY - Iene Japonês (¥)
-- CAD - Dólar Canadense (C$)
-- AUD - Dólar Australiano (A$)
-- ============================================

-- 5. Atualizar reservas existentes com moeda da propriedade
UPDATE reservations r
SET currency = p.currency
FROM properties p
INNER JOIN property_listings pl ON pl.property_id = p.id
WHERE r.property_listing_id = pl.id;

-- 6. Verificar se foi aplicado corretamente
SELECT 
  'Properties' as table_name,
  currency,
  COUNT(*) as count
FROM properties
GROUP BY currency
UNION ALL
SELECT 
  'Reservations' as table_name,
  currency,
  COUNT(*) as count
FROM reservations
GROUP BY currency;
