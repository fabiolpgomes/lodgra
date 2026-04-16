-- ============================================================
-- HOME STAY - SCHEMA COMPLETO
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELAS
-- ============================================================

-- 1. PROPERTIES
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Informações Básicas
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  
  -- Capacidade
  bedrooms INTEGER,
  bathrooms INTEGER,
  max_guests INTEGER,
  
  -- Tipo
  property_type VARCHAR(50),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. PLATFORMS
CREATE TABLE platforms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  
  -- Configuração de API
  api_endpoint TEXT,
  requires_oauth BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. PROPERTY LISTINGS
CREATE TABLE property_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  platform_id UUID REFERENCES platforms(id) ON DELETE CASCADE,
  
  -- ID externo na plataforma
  external_listing_id VARCHAR(255) NOT NULL,
  
  -- URL do anúncio
  listing_url TEXT,
  
  -- Configuração de sincronização
  sync_enabled BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP,
  
  -- iCal para fallback
  ical_url TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(platform_id, external_listing_id)
);

-- 4. GUESTS
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Informações Pessoais
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50),
  
  -- Estatísticas
  total_bookings INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. RESERVATIONS
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relações
  property_listing_id UUID REFERENCES property_listings(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id),
  
  -- ID externo na plataforma
  external_reservation_id VARCHAR(255),
  
  -- Datas
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  
  -- Hóspedes
  number_of_guests INTEGER,
  
  -- Financeiro
  total_amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'EUR',
  platform_fee DECIMAL(10,2),
  net_amount DECIMAL(10,2),
  
  -- Status
  status VARCHAR(50) NOT NULL,
  
  -- Rastreamento de mudanças
  synced_at TIMESTAMP,
  source VARCHAR(50),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(property_listing_id, external_reservation_id)
);

-- 6. CALENDAR BLOCKS
CREATE TABLE calendar_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Período
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Motivo
  block_type VARCHAR(50),
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. SYNC LOGS
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  property_listing_id UUID REFERENCES property_listings(id) ON DELETE CASCADE,
  
  -- Detalhes da sincronização
  sync_type VARCHAR(50),
  direction VARCHAR(20),
  
  -- Status
  status VARCHAR(50),
  error_message TEXT,
  
  -- Dados
  records_processed INTEGER,
  records_created INTEGER,
  records_updated INTEGER,
  records_failed INTEGER,
  
  -- Timestamp
  synced_at TIMESTAMP DEFAULT NOW()
);

-- 8. FINANCIAL TRANSACTIONS
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  
  -- Tipo
  transaction_type VARCHAR(50),
  category VARCHAR(100),
  
  -- Valor
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  
  -- Descrição
  description TEXT,
  
  -- Data
  transaction_date DATE NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_reservations_property_dates 
ON reservations(property_listing_id, check_in, check_out);

CREATE INDEX idx_guests_email 
ON guests(email);

CREATE INDEX idx_sync_logs_listing_date 
ON sync_logs(property_listing_id, synced_at DESC);

CREATE INDEX idx_transactions_property_date 
ON financial_transactions(property_id, transaction_date DESC);

-- ============================================================
-- VIEWS
-- ============================================================

CREATE VIEW unified_calendar AS
SELECT 
  p.id as property_id,
  p.name as property_name,
  r.check_in,
  r.check_out,
  'reservation' as type,
  CONCAT(g.first_name, ' ', g.last_name) as guest_name,
  r.status,
  pl.platform_id
FROM reservations r
JOIN property_listings pl ON r.property_listing_id = pl.id
JOIN properties p ON pl.property_id = p.id
LEFT JOIN guests g ON r.guest_id = g.id

UNION ALL

SELECT 
  p.id as property_id,
  p.name as property_name,
  cb.start_date as check_in,
  cb.end_date as check_out,
  'block' as type,
  cb.block_type as guest_name,
  'blocked' as status,
  NULL as platform_id
FROM calendar_blocks cb
JOIN properties p ON cb.property_id = p.id;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Função para prevenir conflitos de reservas
CREATE OR REPLACE FUNCTION check_reservation_conflict()
RETURNS TRIGGER AS $$
BEGIN
  -- Verifica se já existe reserva no período
  IF EXISTS (
    SELECT 1 FROM reservations r
    JOIN property_listings pl ON r.property_listing_id = pl.id
    WHERE pl.property_id = (
      SELECT property_id 
      FROM property_listings 
      WHERE id = NEW.property_listing_id
    )
    AND r.status NOT IN ('cancelled')
    AND r.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (NEW.check_in >= r.check_in AND NEW.check_in < r.check_out)
      OR (NEW.check_out > r.check_in AND NEW.check_out <= r.check_out)
      OR (NEW.check_in <= r.check_in AND NEW.check_out >= r.check_out)
    )
  ) THEN
    RAISE EXCEPTION 'Conflito de reserva detectado para estas datas';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para prevenir conflitos
CREATE TRIGGER prevent_reservation_conflicts
BEFORE INSERT OR UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION check_reservation_conflict();

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de updated_at em todas as tabelas relevantes
CREATE TRIGGER update_properties_updated_at
BEFORE UPDATE ON properties
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_listings_updated_at
BEFORE UPDATE ON property_listings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guests_updated_at
BEFORE UPDATE ON guests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at
BEFORE UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_blocks_updated_at
BEFORE UPDATE ON calendar_blocks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DADOS INICIAIS (SEED)
-- ============================================================

-- Plataformas principais
INSERT INTO platforms (name, code, is_active) VALUES
('Airbnb', 'airbnb', true),
('Booking.com', 'booking', true),
('Vrbo', 'vrbo', false),
('Manual', 'manual', true);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Opcional para MVP
-- ============================================================
-- Descomente se quiser ativar RLS (recomendado para produção)

-- ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE property_listings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE calendar_blocks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- Política exemplo (ajustar conforme necessidade)
-- CREATE POLICY "Enable read access for all users" ON properties
-- FOR SELECT USING (true);
