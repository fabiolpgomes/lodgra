-- Story 39.1: Fundação de Dados — Schema + monthly_property_metrics
-- Epic 39: Evolução do Dashboard — Analytics do Gestor
--
-- Adiciona os dois campos de reservations que ainda faltavam para o modelo de
-- receita da spec-fonte (docs/specs/lodgra-dashboard-spec-consolidada.md §1) e
-- cria monthly_property_metrics, a materialized view que 39.2/39.3/39.4/39.6/39.7
-- vão consumir para badges MoM/YoY, ADR/RevPAR, mix de canais e ranking, sem
-- recálculo em tempo real a cada carregamento do dashboard.
--
-- Já existem e NÃO são recriados aqui: reservations.commission_amount /
-- commission_rate / commission_calculated_at + commission_summary (migration
-- 20260326020000_add_commission_tracking.sql), properties.management_percentage,
-- properties.cleaning_fee/cleaning_fee_type/pet_fee/pet_fee_type,
-- reservations.booking_source.

-- ─── 1. Novos campos em reservations ──────────────────────────────────────────

-- discount_amount: valor de desconto aplicado à reserva. Ausência de desconto
-- É zero por padrão (diferente da regra "nunca assumir zero" que se aplica a
-- receita/canal ausente, não a desconto).
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0;

-- service_fee_amount: soma das taxas de serviço aplicáveis (limpeza + animais),
-- copiada da propriedade (properties.cleaning_fee/pet_fee, respeitando
-- cleaning_fee_type/pet_fee_type) no momento da CRIAÇÃO da reserva — não é
-- recalculada retroativamente se o valor-base da propriedade mudar depois.
-- Ver src/lib/reservations/serviceFee.ts para a lógica de cálculo usada nos
-- pontos de criação de reserva (sync iCal, criação manual, Booking.com API,
-- reserva direta via Stripe, email parser).
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS service_fee_amount NUMERIC(12,2) DEFAULT 0;

-- ─── 2. Backfill de service_fee_amount para reservas existentes ──────────────
-- Aproximação documentada (aceita pela story): usa o valor ATUAL da
-- propriedade, não o valor histórico no momento em que cada reserva foi
-- criada (que não foi armazenado antes desta migration). Idempotente — só
-- atualiza linhas que ainda estão no default 0, então pode ser reexecutada
-- sem sobrescrever valores já calculados por código novo.
UPDATE reservations r
SET service_fee_amount = ROUND(
  COALESCE(
    (CASE
      WHEN p.cleaning_fee IS NOT NULL AND p.cleaning_fee > 0 THEN
        CASE
          WHEN p.cleaning_fee_type = 'per_night' THEN p.cleaning_fee * GREATEST(r.check_out - r.check_in, 0)
          ELSE p.cleaning_fee
        END
      ELSE 0
    END)
    +
    (CASE
      WHEN p.pet_fee IS NOT NULL AND p.pet_fee > 0 THEN
        CASE
          WHEN p.pet_fee_type = 'per_night' THEN p.pet_fee * GREATEST(r.check_out - r.check_in, 0)
          ELSE p.pet_fee
        END
      ELSE 0
    END),
    0
  ),
  2
)
FROM property_listings pl
JOIN properties p ON p.id = pl.property_id
WHERE r.property_listing_id = pl.id
  AND r.service_fee_amount = 0
  AND r.check_in IS NOT NULL
  AND r.check_out IS NOT NULL;

-- ─── 3. monthly_property_metrics ──────────────────────────────────────────────
-- Mesmo padrão de commission_summary: materialized view, índice único para
-- permitir REFRESH CONCURRENTLY, índice de consulta separado para lookups do
-- dashboard. Reservas com booking_source OU total_amount ausentes são
-- EXCLUÍDAS do agregado principal (gross_revenue/nights_sold/booking_count) e
-- contadas separadamente em incomplete_data_count — nunca tratadas como zero.
--
-- Atribuição de mês: metric_month = mês do check_in da reserva (toda a
-- receita/noites da estadia são atribuídas ao mês de check-in). Simplificação
-- documentada — estadias que atravessam a virada do mês não têm a receita/
-- noites divididas proporcionalmente entre os dois meses. Aceitável para o
-- volume/perfil de estadias atual (curta duração); revisitar se 39.2+
-- precisar de precisão por noite.
--
-- available_nights: dias corridos do mês civil (metric_month), como proxy de
-- capacidade — NÃO desconta calendar_blocks (bloqueios manuais/sync). Ver
-- Dev Notes da story 39.1 para a decisão completa.
CREATE MATERIALIZED VIEW IF NOT EXISTS monthly_property_metrics AS
WITH classified AS (
  SELECT
    r.id,
    r.organization_id,
    pl.property_id,
    DATE_TRUNC('month', r.check_in)::date AS metric_month,
    r.status,
    r.total_amount,
    (r.check_out - r.check_in) AS nights,
    (
      r.status != 'cancelled'
      AND (r.booking_source IS NULL OR r.total_amount IS NULL)
    ) AS is_incomplete
  FROM reservations r
  LEFT JOIN property_listings pl ON r.property_listing_id = pl.id
  WHERE r.check_in IS NOT NULL AND r.check_out IS NOT NULL
)
SELECT
  c.organization_id,
  c.property_id,
  p.name AS property_name,
  c.metric_month,
  COALESCE(SUM(c.total_amount) FILTER (
    WHERE c.status != 'cancelled' AND NOT c.is_incomplete
  ), 0) AS gross_revenue,
  COALESCE(SUM(c.nights) FILTER (
    WHERE c.status != 'cancelled' AND NOT c.is_incomplete
  ), 0) AS nights_sold,
  EXTRACT(DAY FROM (c.metric_month + INTERVAL '1 month' - INTERVAL '1 day'))::int AS available_nights,
  COUNT(*) FILTER (
    WHERE c.status != 'cancelled' AND NOT c.is_incomplete
  ) AS booking_count,
  COUNT(*) FILTER (WHERE c.status = 'cancelled') AS cancelled_count,
  COUNT(*) FILTER (
    WHERE c.status != 'cancelled' AND c.is_incomplete
  ) AS incomplete_data_count
FROM classified c
LEFT JOIN properties p ON c.property_id = p.id
WHERE c.organization_id IS NOT NULL AND c.property_id IS NOT NULL
GROUP BY c.organization_id, c.property_id, p.name, c.metric_month;

-- ─── 4. Índices ────────────────────────────────────────────────────────────────

-- Índice único — necessário para REFRESH MATERIALIZED VIEW CONCURRENTLY
-- (mesmo padrão de idx_commission_summary_unique, migration
-- 20260327010000_fix_commission_tracking.sql).
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_property_metrics_unique
  ON monthly_property_metrics(organization_id, property_id, metric_month);

-- Índice de consulta para lookups do dashboard (badges MoM/YoY, listagens por mês).
CREATE INDEX IF NOT EXISTS idx_monthly_property_metrics_org_month
  ON monthly_property_metrics(organization_id, metric_month DESC);

-- Note: monthly_property_metrics é uma MATERIALIZED VIEW — RLS não é
-- aplicável diretamente (mesma ressalva documentada em commission_summary).
-- Controle de acesso via camada de API/query, sempre filtrando por
-- organization_id (nunca expor esta view sem esse filtro).

-- Rollback Instructions (if needed):
-- 1. DROP INDEX IF EXISTS idx_monthly_property_metrics_org_month;
-- 2. DROP INDEX IF EXISTS idx_monthly_property_metrics_unique;
-- 3. DROP MATERIALIZED VIEW IF EXISTS monthly_property_metrics CASCADE;
-- 4. ALTER TABLE reservations DROP COLUMN IF EXISTS service_fee_amount;
-- 5. ALTER TABLE reservations DROP COLUMN IF EXISTS discount_amount;
