-- Epic 18: Comodidades, Quartos, Banheiros, Taxas e Horários
-- Story 18.1: Migração DB

-- ─── 1. Catálogo de comodidades ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS amenities (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text    NOT NULL,
  icon        text    NOT NULL,      -- nome do ícone Lucide (ex: 'wifi', 'tv')
  category    text    NOT NULL,      -- 'destaque','sala','quarto','cozinha','banheiro','seguranca','geral'
  sort_order  integer NOT NULL DEFAULT 0
);

-- Tabela de catálogo: leitura pública, escrita apenas via migrations/admin
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "amenities_select_all" ON amenities
  FOR SELECT USING (true);

-- ─── 2. Relação propriedade ↔ comodidades (N:N) ───────────────────────────────

CREATE TABLE IF NOT EXISTS property_amenities (
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  amenity_id  uuid NOT NULL REFERENCES amenities(id)  ON DELETE CASCADE,
  PRIMARY KEY (property_id, amenity_id)
);

ALTER TABLE property_amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_amenities_select" ON property_amenities
  FOR SELECT USING (
    property_id IN (
      SELECT id FROM properties
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "property_amenities_insert" ON property_amenities
  FOR INSERT WITH CHECK (
    property_id IN (
      SELECT id FROM properties
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "property_amenities_delete" ON property_amenities
  FOR DELETE USING (
    property_id IN (
      SELECT id FROM properties
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- ─── 3. Quartos ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS property_rooms (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id    uuid    NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name           text,                          -- ex: "Quarto Principal"
  bed_type       text    NOT NULL,              -- 'single','double','queen','king','sofa_bed','bunk'
  bed_count      integer NOT NULL DEFAULT 1,
  provides_linen boolean NOT NULL DEFAULT false,
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_rooms_property_id ON property_rooms(property_id);

ALTER TABLE property_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_rooms_select" ON property_rooms
  FOR SELECT USING (
    property_id IN (
      SELECT id FROM properties
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "property_rooms_insert" ON property_rooms
  FOR INSERT WITH CHECK (
    property_id IN (
      SELECT id FROM properties
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "property_rooms_update" ON property_rooms
  FOR UPDATE USING (
    property_id IN (
      SELECT id FROM properties
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "property_rooms_delete" ON property_rooms
  FOR DELETE USING (
    property_id IN (
      SELECT id FROM properties
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- ─── 4. Banheiros ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS property_bathrooms (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid    NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name            text,                         -- ex: "Casa de Banho 1"
  bathroom_type   text    NOT NULL,             -- 'wc', 'full'
  amenities       text[]  NOT NULL DEFAULT '{}',-- ['towels','hairdryer','soap','shampoo',...]
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_bathrooms_property_id ON property_bathrooms(property_id);

ALTER TABLE property_bathrooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_bathrooms_select" ON property_bathrooms
  FOR SELECT USING (
    property_id IN (
      SELECT id FROM properties
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "property_bathrooms_insert" ON property_bathrooms
  FOR INSERT WITH CHECK (
    property_id IN (
      SELECT id FROM properties
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "property_bathrooms_update" ON property_bathrooms
  FOR UPDATE USING (
    property_id IN (
      SELECT id FROM properties
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "property_bathrooms_delete" ON property_bathrooms
  FOR DELETE USING (
    property_id IN (
      SELECT id FROM properties
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- ─── 5. Taxas e horários na tabela properties ─────────────────────────────────

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS cleaning_fee       numeric,
  ADD COLUMN IF NOT EXISTS cleaning_fee_type  text,      -- 'per_stay' | 'per_night'
  ADD COLUMN IF NOT EXISTS pet_fee            numeric,
  ADD COLUMN IF NOT EXISTS pet_fee_type       text,      -- 'per_stay' | 'per_night'
  ADD COLUMN IF NOT EXISTS checkin_from       time,
  ADD COLUMN IF NOT EXISTS checkin_until      time,
  ADD COLUMN IF NOT EXISTS checkout_until     time;

-- ─── 6. Seed — catálogo de comodidades ───────────────────────────────────────

INSERT INTO amenities (name, icon, category, sort_order) VALUES
  -- Destaques
  ('Wi-Fi',                'Wifi',        'destaque', 1),
  ('Piscina',              'Waves',       'destaque', 2),
  ('Estacionamento',       'Car',         'destaque', 3),
  ('Ar Condicionado',      'Snowflake',   'destaque', 4),
  ('Máquina de Lavar',     'Wind',        'destaque', 5),
  ('Lareira',              'Flame',       'destaque', 6),
  ('Academia',             'Dumbbell',    'destaque', 7),
  ('Acessível',            'Accessibility','destaque',8),

  -- Sala
  ('TV',                   'Tv',          'sala', 1),
  ('TV a cabo/Streaming',  'MonitorPlay', 'sala', 2),
  ('Wi-Fi sala',           'Wifi',        'sala', 3),
  ('Ar Condicionado',      'Snowflake',   'sala', 4),
  ('Lareira',              'Flame',       'sala', 5),
  ('Varanda',              'TreePine',    'sala', 6),

  -- Quarto
  ('Ar Condicionado',      'Snowflake',   'quarto', 1),
  ('TV no quarto',         'Tv',          'quarto', 2),
  ('Roupeiro',             'Shirt',       'quarto', 3),
  ('Blackout',             'MoonStar',    'quarto', 4),
  ('Lençóis incluídos',    'BedDouble',   'quarto', 5),
  ('Cofre',                'Lock',        'quarto', 6),

  -- Cozinha
  ('Cozinha equipada',     'Utensils',    'cozinha', 1),
  ('Cafeteira',            'Coffee',      'cozinha', 2),
  ('Micro-ondas',          'Zap',         'cozinha', 3),
  ('Frigorífico',          'Refrigerator','cozinha', 4),
  ('Fogão',                'Flame',       'cozinha', 5),
  ('Forno',                'ChefHat',     'cozinha', 6),
  ('Máquina de café',      'Coffee',      'cozinha', 7),
  ('Frigobar',             'Wine',        'cozinha', 8),
  ('Lava-louças',          'Droplets',    'cozinha', 9),

  -- Banheiro
  ('Secador de cabelo',    'Wind',        'banheiro', 1),
  ('Toalhas incluídas',    'Layers',      'banheiro', 2),
  ('Sabonete',             'Droplets',    'banheiro', 3),
  ('Shampoo',              'Droplets',    'banheiro', 4),
  ('Banheira',             'Bath',        'banheiro', 5),
  ('Chuveiro',             'ShowerHead',  'banheiro', 6),

  -- Segurança
  ('Detector de fumaça',   'AlertTriangle','seguranca', 1),
  ('Extintor',             'Flame',        'seguranca', 2),
  ('Kit de primeiros socorros','HeartPulse','seguranca',3),
  ('Câmera de segurança',  'Camera',       'seguranca', 4),
  ('Detector de CO',       'AlertCircle',  'seguranca', 5),

  -- Geral
  ('Elevador',             'ArrowUpDown', 'geral', 1),
  ('Porteiro',             'UserCheck',   'geral', 2),
  ('Animais permitidos',   'PawPrint',    'geral', 3),
  ('Apto para crianças',   'Baby',        'geral', 4),
  ('Não fumadores',        'Ban',         'geral', 5)

ON CONFLICT DO NOTHING;
