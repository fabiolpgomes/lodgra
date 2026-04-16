-- ============================================
-- Migração: Cadastro de Proprietários (Owners)
-- ============================================

-- 1. Criar tabela owners
CREATE TABLE owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  tax_id TEXT,              -- NIF (PT) ou CPF/CNPJ (BR)
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Portugal',
  postal_code TEXT,
  -- Dados bancários Portugal
  bank_name_pt TEXT,
  swift_code TEXT,
  iban TEXT,
  mbway_phone TEXT,
  -- Dados bancários Brasil
  bank_name_br TEXT,
  agency_number TEXT,
  account_number TEXT,
  pix_key TEXT,
  -- Meta
  preferred_currency VARCHAR(3) DEFAULT 'EUR',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices
CREATE INDEX idx_owners_user_id ON owners(user_id);
CREATE INDEX idx_owners_email ON owners(email);
CREATE INDEX idx_owners_is_active ON owners(is_active);

-- 3. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_owners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_owners_updated_at
  BEFORE UPDATE ON owners
  FOR EACH ROW
  EXECUTE FUNCTION update_owners_updated_at();

-- 4. RLS (Row Level Security)
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;

-- Política: utilizadores autenticados podem ver todos os proprietários
CREATE POLICY "Authenticated users can view owners"
  ON owners FOR SELECT
  TO authenticated
  USING (true);

-- Política: admin e manager podem inserir
CREATE POLICY "Admin and manager can insert owners"
  ON owners FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Política: admin e manager podem atualizar
CREATE POLICY "Admin and manager can update owners"
  ON owners FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Política: apenas admin pode eliminar
CREATE POLICY "Admin can delete owners"
  ON owners FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- 5. Adicionar owner_id à tabela properties
ALTER TABLE properties ADD COLUMN owner_id UUID REFERENCES owners(id) ON DELETE SET NULL;
CREATE INDEX idx_properties_owner_id ON properties(owner_id);
