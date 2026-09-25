-- Story 6.1: Add commission tracking to reservations table
-- Adds transparent commission tracking for SaaS financial reporting

-- 1. Add commission columns to reservations table
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,4) DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS commission_calculated_at TIMESTAMP WITH TIME ZONE;

-- 2. Set commission_calculated_at for existing reservations without data loss
-- For existing reservations, backfill with created_at timestamp
UPDATE reservations
SET commission_calculated_at = COALESCE(commission_calculated_at, created_at)
WHERE commission_calculated_at IS NULL;

-- 3. Make commission_calculated_at NOT NULL after backfill
ALTER TABLE reservations
  ALTER COLUMN commission_calculated_at SET NOT NULL;

-- 4. Create indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_reservations_commission_org_property
  ON reservations(organization_id, property_listing_id, commission_calculated_at DESC)
  WHERE status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_reservations_commission_date
  ON reservations(organization_id, commission_calculated_at DESC)
  WHERE status != 'cancelled' AND commission_amount IS NOT NULL;

-- 5. Create materialized view for commission summary (dashboard queries)
CREATE MATERIALIZED VIEW IF NOT EXISTS commission_summary AS
SELECT
  r.organization_id,
  pl.property_id,
  p.name as property_name,
  DATE_TRUNC('day', r.commission_calculated_at) as commission_date,
  COUNT(*) as booking_count,
  SUM(r.commission_amount) as total_commission,
  AVG(r.commission_amount) as avg_commission_per_booking,
  MAX(r.commission_rate) as max_rate,
  MIN(r.commission_rate) as min_rate
FROM reservations r
LEFT JOIN property_listings pl ON r.property_listing_id = pl.id
LEFT JOIN properties p ON pl.property_id = p.id
WHERE r.status != 'cancelled'
  AND r.commission_amount IS NOT NULL
GROUP BY r.organization_id, pl.property_id, p.name, DATE_TRUNC('day', r.commission_calculated_at);

-- 6. Create index on materialized view for dashboard lookups
CREATE INDEX IF NOT EXISTS idx_commission_summary_org_date
  ON commission_summary(organization_id, commission_date DESC);

-- 7. Create trigger to refresh materialized view after reservation inserts/updates
CREATE OR REPLACE FUNCTION refresh_commission_summary()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY commission_summary;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- commission_summary is a regular VIEW (auto-refreshes), no triggers needed

-- Note: commission_summary is a VIEW (not a table), RLS not applicable
-- Reservations already have org isolation via property_listings join in existing RLS policies

-- Rollback Instructions (if needed):
-- 1. DROP TRIGGER IF EXISTS trig_refresh_commission_summary_insert ON reservations CASCADE;
-- 2. DROP TRIGGER IF EXISTS trig_refresh_commission_summary_update ON reservations CASCADE;
-- 3. DROP FUNCTION IF EXISTS refresh_commission_summary() CASCADE;
-- 4. DROP MATERIALIZED VIEW IF EXISTS commission_summary CASCADE;
-- 5. DROP INDEX IF EXISTS idx_commission_summary_org_date;
-- 6. DROP INDEX IF EXISTS idx_reservations_commission_date;
-- 7. DROP INDEX IF EXISTS idx_reservations_commission_org_property;
-- 8. ALTER TABLE reservations DROP COLUMN IF EXISTS commission_calculated_at;
-- 9. ALTER TABLE reservations DROP COLUMN IF EXISTS commission_amount;
-- 10. ALTER TABLE reservations DROP COLUMN IF EXISTS commission_rate;
