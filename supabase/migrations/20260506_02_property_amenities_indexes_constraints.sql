-- Epic 18: Comodidades, Quartos, Banheiros, Taxas e Horários
-- Story 18.1 fix — índice e CHECK constraints (aplicado manualmente via Supabase editor em 2026-05-06)

-- ─── 1. Índice para queries inversas em property_amenities ─────────────────────
-- Permite pesquisar "quais propriedades têm a comodidade X" sem full table scan

CREATE INDEX IF NOT EXISTS idx_property_amenities_amenity_id
  ON property_amenities(amenity_id);

-- ─── 2. CHECK constraints para colunas fee_type ────────────────────────────────
-- Reforça no DB os mesmos valores que o TypeScript valida (FeeType)

ALTER TABLE properties
  ADD CONSTRAINT cleaning_fee_type_check
    CHECK (cleaning_fee_type IS NULL OR cleaning_fee_type IN ('per_stay', 'per_night')),
  ADD CONSTRAINT pet_fee_type_check
    CHECK (pet_fee_type IS NULL OR pet_fee_type IN ('per_stay', 'per_night'));
