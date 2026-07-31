-- Fix: Insert pricing data directly into daily_prices table
-- Root cause: July 31 migration tried to insert into property_daily_prices which was deleted on July 21

-- Populate daily prices for T2 Armação de Pera property
-- Base price: 90€ (as configured in admin UI)
WITH property_ids AS (
  SELECT id
  FROM properties
  WHERE slug = 't2-armacao-de-pera-praia-dos-pescadores'
  LIMIT 1
)
INSERT INTO daily_prices (property_id, date, base_price, created_at, updated_at)
SELECT
  pi.id,
  DATE '2026-09-01' + (i || ' days')::interval,
  90.00,
  NOW(),
  NOW()
FROM property_ids pi
CROSS JOIN GENERATE_SERIES(0, 89) AS i(i)
ON CONFLICT (property_id, date) DO NOTHING;

-- Verify insertion
SELECT COUNT(*) as inserted_records FROM daily_prices
WHERE date >= '2026-09-01' AND date < '2026-12-31';
