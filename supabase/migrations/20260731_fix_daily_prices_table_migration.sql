-- Fix: Migrate pricing data from orphaned property_daily_prices to active daily_prices table
-- Root cause: July 31 migration inserted into old table name

-- Migrate all pricing data to correct table
INSERT INTO daily_prices (property_id, date, base_price, created_at, updated_at)
SELECT property_id, date, price AS base_price, created_at, updated_at
FROM property_daily_prices
WHERE NOT EXISTS (
  SELECT 1 FROM daily_prices dp
  WHERE dp.property_id = property_daily_prices.property_id
  AND dp.date = property_daily_prices.date
)
ON CONFLICT (property_id, date) DO NOTHING;

-- Verify migration
SELECT
  COUNT(*) as total_migrated,
  COUNT(DISTINCT property_id) as properties_affected,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM daily_prices
WHERE date >= '2026-09-01' AND date < '2026-10-31';
