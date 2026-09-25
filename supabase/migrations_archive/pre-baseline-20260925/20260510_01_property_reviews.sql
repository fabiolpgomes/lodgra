-- Epic 25: OTA Reviews — Social Proof na Página de Reserva Direta
-- Story 25.1: Migração DB — tabela property_reviews + RLS + índices

-- ─── 1. Tabela principal ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS property_reviews (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid         NOT NULL REFERENCES organizations(id),
  property_id     uuid         NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  source          text         NOT NULL CHECK (source IN ('booking', 'airbnb', 'google', 'tripadvisor', 'direct', 'other')),
  reviewer_name   text         NOT NULL,
  rating          numeric(3,1) NOT NULL CHECK (rating >= 1.0 AND rating <= 10.0),
  review_text     text         CHECK (review_text IS NULL OR char_length(review_text) <= 500),
  review_date     date         NOT NULL,
  is_featured     boolean      NOT NULL DEFAULT false,
  created_at      timestamptz  DEFAULT now(),
  updated_at      timestamptz  DEFAULT now()
);

-- ─── 2. Row Level Security ────────────────────────────────────────────────────

ALTER TABLE property_reviews ENABLE ROW LEVEL SECURITY;

-- SELECT público: página de reserva direta não requer autenticação
CREATE POLICY "property_reviews_select" ON property_reviews
  FOR SELECT USING (true);

-- INSERT restrito à organização do utilizador autenticado
CREATE POLICY "property_reviews_insert" ON property_reviews
  FOR INSERT WITH CHECK (
    organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- UPDATE restrito à organização do utilizador autenticado
CREATE POLICY "property_reviews_update" ON property_reviews
  FOR UPDATE USING (
    organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- DELETE restrito à organização do utilizador autenticado
CREATE POLICY "property_reviews_delete" ON property_reviews
  FOR DELETE USING (
    organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ─── 3. Índices ───────────────────────────────────────────────────────────────

-- Query da página pública: reviews em destaque por propriedade
CREATE INDEX IF NOT EXISTS idx_property_reviews_property_featured
  ON property_reviews (property_id, is_featured);

-- Query admin: reviews por organização
CREATE INDEX IF NOT EXISTS idx_property_reviews_org_id
  ON property_reviews (organization_id);
