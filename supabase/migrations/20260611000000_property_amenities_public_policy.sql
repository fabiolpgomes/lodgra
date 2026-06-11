-- Fix: Comodidades não aparecem na página de booking (público)
-- Issue: Faltava política RLS pública para property_amenities
-- Impact: Página /booking não conseguia ler comodidades de propriedades públicas

-- ─── 1. Adicionar política pública de leitura ──────────────────────────────────
-- Permite qualquer usuário (autenticado ou não) ler comodidades de propriedades públicas
-- Necessário para que a página de booking pública (nomedaempresa.lodgra.io/booking)
-- consiga exibir as comodidades das propriedades

CREATE POLICY "property_amenities_select_public" ON property_amenities
  FOR SELECT USING (
    property_id IN (
      SELECT id FROM properties
      WHERE is_public = true
    )
  );

-- ─── 2. Documentação ───────────────────────────────────────────────────────────
-- RLS Policies on property_amenities:
--
--   1. property_amenities_select_public
--      - Scope: Qualquer usuário (público)
--      - Action: SELECT
--      - Condition: property_id WHERE is_public = true
--      - Usage: Página de booking pública, API pública
--
--   2. property_amenities_select
--      - Scope: Usuários autenticados (admin/gestor da organização)
--      - Action: SELECT
--      - Condition: Propriedades da mesma organização
--      - Usage: Edit page, painel administrativo
--
--   3. property_amenities_insert
--      - Scope: Usuários autenticados (admin/gestor da organização)
--      - Action: INSERT
--      - Condition: Propriedades da mesma organização
--      - Usage: API PUT /api/properties/{id}/amenities
--
--   4. property_amenities_delete
--      - Scope: Usuários autenticados (admin/gestor da organização)
--      - Action: DELETE
--      - Condition: Propriedades da mesma organização
--      - Usage: API PUT /api/properties/{id}/amenities (quando limpa seleção)
