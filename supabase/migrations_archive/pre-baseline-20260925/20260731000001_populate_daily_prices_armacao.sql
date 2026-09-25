-- Populate daily prices for T2 Armação de Pera property
-- Base price: 90€ (as configured in admin UI)

WITH property_ids AS (
  SELECT id 
  FROM properties 
  WHERE slug = 't2-armacao-de-pera-praia-dos-pescadores'
  LIMIT 1
)
INSERT INTO property_daily_prices (property_id, date, price)
SELECT 
  pi.id,
  DATE '2026-09-01' + (i || ' days')::interval,
  90.00
FROM property_ids pi
CROSS JOIN GENERATE_SERIES(0, 89) AS i(i)
ON CONFLICT (property_id, date) DO NOTHING;

-- Verify insertion
SELECT property_id, date, price, COUNT(*) as count
FROM property_daily_prices
WHERE date >= '2026-09-01' AND date < '2026-12-31'
GROUP BY property_id, date
LIMIT 5;
