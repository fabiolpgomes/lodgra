-- Rollback for Story 36.1: Pricing Schema + Backend Foundation
-- Drops all pricing-related tables in reverse order (respecting foreign keys)
-- This migration is for emergency recovery only

-- Drop tables in reverse order to avoid foreign key violations
DROP TABLE IF EXISTS property_daily_prices CASCADE;
DROP TABLE IF EXISTS property_availability CASCADE;
DROP TABLE IF EXISTS property_discounts CASCADE;
DROP TABLE IF EXISTS property_prices CASCADE;

-- Log rollback event
COMMENT ON SCHEMA public IS 'Pricing schema rolled back at ' || NOW()::text;
