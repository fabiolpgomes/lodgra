-- ============================================
-- TABELA: EXPENSES (DESPESAS)
-- ============================================
-- Gerenciamento de despesas por propriedade

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Dados da despesa
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  category VARCHAR(50) NOT NULL,
  
  -- Datas
  expense_date DATE NOT NULL,
  
  -- Metadados
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_expenses_property_id ON expenses(property_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_currency ON expenses(currency);

-- Comentários
COMMENT ON TABLE expenses IS 'Despesas relacionadas às propriedades';
COMMENT ON COLUMN expenses.category IS 'Categorias: cleaning, maintenance, utilities, taxes, insurance, supplies, repairs, marketing, other';
COMMENT ON COLUMN expenses.currency IS 'Código ISO 4217 da moeda (EUR, BRL, USD, etc)';

-- ============================================
-- CATEGORIAS DE DESPESAS:
-- ============================================
-- cleaning       - Limpeza
-- maintenance    - Manutenção
-- utilities      - Utilidades (água, luz, gás)
-- taxes          - Impostos
-- insurance      - Seguros
-- supplies       - Suprimentos (toalhas, produtos)
-- repairs        - Reparos
-- marketing      - Marketing/Anúncios
-- management     - Gestão
-- mortgage       - Hipoteca/Financiamento
-- other          - Outros

-- ============================================
-- DADOS DE EXEMPLO (OPCIONAL)
-- ============================================
/*
INSERT INTO expenses (property_id, description, amount, currency, category, expense_date, notes)
SELECT 
  p.id,
  'Limpeza mensal',
  80.00,
  p.currency,
  'cleaning',
  CURRENT_DATE - INTERVAL '15 days',
  'Limpeza após check-out'
FROM properties p
LIMIT 1;
*/

-- Verificar tabela criada
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'expenses'
ORDER BY ordinal_position;
