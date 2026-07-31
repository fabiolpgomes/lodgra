-- Epic 43 Phase 2: Seed default cancellation policies for T2 Armação
-- Bug fix #3: Display cancellation policy on property page

-- Insert default cancellation policies (Moderate policy for short-stay and long-stay)
WITH property_ids AS (
  SELECT id
  FROM properties
  WHERE slug = 't2-armacao-de-pera-praia-dos-pescadores'
  LIMIT 1
)
INSERT INTO property_cancellation_policies (
  property_id,
  policy_type,
  is_long_stay,
  full_refund_days,
  partial_refund_days,
  partial_refund_percent,
  is_active
)
SELECT
  pi.id,
  policy_type,
  is_long_stay,
  full_refund_days,
  partial_refund_days,
  partial_refund_percent,
  true
FROM property_ids pi,
(
  VALUES
    -- Moderate policy for short-stay (<28 nights)
    ('moderate'::text, false, 5, 5, 50),
    -- Moderate policy for long-stay (28+ nights)
    ('moderate'::text, true, 14, 7, 50)
) AS policies(policy_type, is_long_stay, full_refund_days, partial_refund_days, partial_refund_percent)
ON CONFLICT DO NOTHING;

-- Verify insertion
SELECT property_id, policy_type, is_long_stay, full_refund_days, partial_refund_days, partial_refund_percent
FROM property_cancellation_policies
WHERE policy_type = 'moderate'
ORDER BY is_long_stay;
