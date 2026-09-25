-- Epic 43 Phase 2: Populate property_discounts with default tiers
-- Bug fix: Apply 10% discount for 7+ nights, 20% discount for 28+ nights

-- Insert discount rules for T2 Armação de Pera property
WITH property_ids AS (
  SELECT id
  FROM properties
  WHERE slug = 't2-armacao-de-pera-praia-dos-pescadores'
  LIMIT 1
)
INSERT INTO property_discounts (property_id, discount_type, percentage, min_nights)
SELECT
  pi.id,
  discount_type,
  percentage,
  min_nights
FROM property_ids pi,
(
  VALUES
    ('weekly', 10, 7),    -- 7-27 nights: 10% discount
    ('monthly', 20, 28)   -- 28+ nights: 20% discount
) AS discounts(discount_type, percentage, min_nights)
ON CONFLICT DO NOTHING;

-- Verify insertion
SELECT property_id, discount_type, percentage, min_nights, created_at
FROM property_discounts
WHERE discount_type IN ('weekly', 'monthly')
ORDER BY min_nights;
