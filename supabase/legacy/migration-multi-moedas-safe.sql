-- ============================================
-- MIGRATION: SUPORTE MULTI-MOEDAS (SEGURO)
-- ============================================
-- Adiciona suporte para múltiplas moedas no sistema
-- Verifica se colunas já existem antes de adicionar

-- 1. Adicionar currency em properties (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='properties' AND column_name='currency'
    ) THEN
        ALTER TABLE properties 
        ADD COLUMN currency VARCHAR(3) DEFAULT 'EUR' NOT NULL;
        
        RAISE NOTICE 'Coluna currency adicionada em properties';
    ELSE
        RAISE NOTICE 'Coluna currency já existe em properties';
    END IF;
END $$;

-- 2. Adicionar currency em reservations (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='reservations' AND column_name='currency'
    ) THEN
        ALTER TABLE reservations 
        ADD COLUMN currency VARCHAR(3) DEFAULT 'EUR' NOT NULL;
        
        RAISE NOTICE 'Coluna currency adicionada em reservations';
    ELSE
        RAISE NOTICE 'Coluna currency já existe em reservations';
    END IF;
END $$;

-- 3. Criar índices (se não existirem)
CREATE INDEX IF NOT EXISTS idx_properties_currency ON properties(currency);
CREATE INDEX IF NOT EXISTS idx_reservations_currency ON reservations(currency);

-- 4. Atualizar reservas existentes com moeda da propriedade
UPDATE reservations r
SET currency = COALESCE(p.currency, 'EUR')
FROM properties p
INNER JOIN property_listings pl ON pl.property_id = p.id
WHERE r.property_listing_id = pl.id
  AND r.currency = 'EUR';  -- Só atualiza se ainda for EUR

-- 5. Verificar resultado
SELECT 
  'Properties' as tabela,
  currency as moeda,
  COUNT(*) as quantidade
FROM properties
GROUP BY currency
UNION ALL
SELECT 
  'Reservations' as tabela,
  currency as moeda,
  COUNT(*) as quantidade
FROM reservations
GROUP BY currency
ORDER BY tabela, moeda;
