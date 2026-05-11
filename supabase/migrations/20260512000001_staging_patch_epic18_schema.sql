-- Staging patch: recreate Epic 18.1 schema elements that were missing from staging
-- Uses IF NOT EXISTS / idempotent DDL throughout — safe to run on any state

-- ─── 1. Catálogo de comodidades ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS amenities (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text    NOT NULL,
  icon        text    NOT NULL,
  category    text    NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0
);

ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'amenities' AND policyname = 'amenities_select_all'
  ) THEN
    CREATE POLICY "amenities_select_all" ON amenities FOR SELECT USING (true);
  END IF;
END $$;

-- ─── 2. property_amenities (N:N) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_amenities (
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  amenity_id  uuid NOT NULL REFERENCES amenities(id)  ON DELETE CASCADE,
  PRIMARY KEY (property_id, amenity_id)
);

ALTER TABLE property_amenities ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_amenities' AND policyname = 'property_amenities_select') THEN
    CREATE POLICY "property_amenities_select" ON property_amenities
      FOR SELECT USING (
        property_id IN (
          SELECT id FROM properties
          WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_amenities' AND policyname = 'property_amenities_insert') THEN
    CREATE POLICY "property_amenities_insert" ON property_amenities
      FOR INSERT WITH CHECK (
        property_id IN (
          SELECT id FROM properties
          WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_amenities' AND policyname = 'property_amenities_delete') THEN
    CREATE POLICY "property_amenities_delete" ON property_amenities
      FOR DELETE USING (
        property_id IN (
          SELECT id FROM properties
          WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        )
      );
  END IF;
END $$;

-- ─── 3. property_rooms ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_rooms (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id    uuid    NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name           text,
  bed_type       text    NOT NULL,
  bed_count      integer NOT NULL DEFAULT 1,
  provides_linen boolean NOT NULL DEFAULT false,
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_rooms_property_id ON property_rooms(property_id);

ALTER TABLE property_rooms ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_rooms' AND policyname = 'property_rooms_select') THEN
    CREATE POLICY "property_rooms_select" ON property_rooms
      FOR SELECT USING (
        property_id IN (
          SELECT id FROM properties
          WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_rooms' AND policyname = 'property_rooms_insert') THEN
    CREATE POLICY "property_rooms_insert" ON property_rooms
      FOR INSERT WITH CHECK (
        property_id IN (
          SELECT id FROM properties
          WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_rooms' AND policyname = 'property_rooms_update') THEN
    CREATE POLICY "property_rooms_update" ON property_rooms
      FOR UPDATE USING (
        property_id IN (
          SELECT id FROM properties
          WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_rooms' AND policyname = 'property_rooms_delete') THEN
    CREATE POLICY "property_rooms_delete" ON property_rooms
      FOR DELETE USING (
        property_id IN (
          SELECT id FROM properties
          WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        )
      );
  END IF;
END $$;

-- ─── 4. property_bathrooms ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_bathrooms (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid    NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name            text,
  bathroom_type   text    NOT NULL,
  amenities       text[]  NOT NULL DEFAULT '{}',
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_bathrooms_property_id ON property_bathrooms(property_id);

ALTER TABLE property_bathrooms ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_bathrooms' AND policyname = 'property_bathrooms_select') THEN
    CREATE POLICY "property_bathrooms_select" ON property_bathrooms
      FOR SELECT USING (
        property_id IN (
          SELECT id FROM properties
          WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_bathrooms' AND policyname = 'property_bathrooms_insert') THEN
    CREATE POLICY "property_bathrooms_insert" ON property_bathrooms
      FOR INSERT WITH CHECK (
        property_id IN (
          SELECT id FROM properties
          WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_bathrooms' AND policyname = 'property_bathrooms_update') THEN
    CREATE POLICY "property_bathrooms_update" ON property_bathrooms
      FOR UPDATE USING (
        property_id IN (
          SELECT id FROM properties
          WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_bathrooms' AND policyname = 'property_bathrooms_delete') THEN
    CREATE POLICY "property_bathrooms_delete" ON property_bathrooms
      FOR DELETE USING (
        property_id IN (
          SELECT id FROM properties
          WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        )
      );
  END IF;
END $$;

-- ─── 5. Fee/schedule columns on properties ───────────────────────────────────
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS cleaning_fee       numeric,
  ADD COLUMN IF NOT EXISTS cleaning_fee_type  text,
  ADD COLUMN IF NOT EXISTS pet_fee            numeric,
  ADD COLUMN IF NOT EXISTS pet_fee_type       text,
  ADD COLUMN IF NOT EXISTS checkin_from       time,
  ADD COLUMN IF NOT EXISTS checkin_until      time,
  ADD COLUMN IF NOT EXISTS checkout_until     time;

-- CHECK constraints
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cleaning_fee_type_check') THEN
    ALTER TABLE properties
      ADD CONSTRAINT cleaning_fee_type_check
        CHECK (cleaning_fee_type IS NULL OR cleaning_fee_type IN ('per_stay', 'per_night'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pet_fee_type_check') THEN
    ALTER TABLE properties
      ADD CONSTRAINT pet_fee_type_check
        CHECK (pet_fee_type IS NULL OR pet_fee_type IN ('per_stay', 'per_night'));
  END IF;
END $$;

-- ─── 6. Amenities seed (only if empty) ──────────────────────────────────────
INSERT INTO amenities (name, icon, category, sort_order) VALUES
  ('Wi-Fi','Wifi','destaque',1),('Piscina','Waves','destaque',2),('Estacionamento','Car','destaque',3),
  ('Ar Condicionado','Snowflake','destaque',4),('Máquina de Lavar','Wind','destaque',5),
  ('Lareira','Flame','destaque',6),('Academia','Dumbbell','destaque',7),('Acessível','Accessibility','destaque',8),
  ('TV','Tv','sala',1),('TV a cabo/Streaming','MonitorPlay','sala',2),('Wi-Fi sala','Wifi','sala',3),
  ('Ar Condicionado','Snowflake','sala',4),('Lareira','Flame','sala',5),('Varanda','TreePine','sala',6),
  ('Ar Condicionado','Snowflake','quarto',1),('TV no quarto','Tv','quarto',2),('Roupeiro','Shirt','quarto',3),
  ('Blackout','MoonStar','quarto',4),('Lençóis incluídos','BedDouble','quarto',5),('Cofre','Lock','quarto',6),
  ('Cozinha equipada','Utensils','cozinha',1),('Cafeteira','Coffee','cozinha',2),('Micro-ondas','Zap','cozinha',3),
  ('Frigorífico','Refrigerator','cozinha',4),('Fogão','Flame','cozinha',5),('Forno','ChefHat','cozinha',6),
  ('Máquina de café','Coffee','cozinha',7),('Frigobar','Wine','cozinha',8),('Lava-louças','Droplets','cozinha',9),
  ('Secador de cabelo','Wind','banheiro',1),('Toalhas incluídas','Layers','banheiro',2),
  ('Sabonete','Droplets','banheiro',3),('Shampoo','Droplets','banheiro',4),
  ('Banheira','Bath','banheiro',5),('Chuveiro','ShowerHead','banheiro',6),
  ('Detector de fumaça','AlertTriangle','seguranca',1),('Extintor','Flame','seguranca',2),
  ('Kit de primeiros socorros','HeartPulse','seguranca',3),('Câmera de segurança','Camera','seguranca',4),
  ('Detector de CO','AlertCircle','seguranca',5),
  ('Elevador','ArrowUpDown','geral',1),('Porteiro','UserCheck','geral',2),
  ('Animais permitidos','PawPrint','geral',3),('Apto para crianças','Baby','geral',4),
  ('Não fumadores','Ban','geral',5)
ON CONFLICT DO NOTHING;
