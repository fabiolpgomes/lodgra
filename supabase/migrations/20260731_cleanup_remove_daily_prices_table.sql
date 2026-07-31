-- Cleanup: Remove daily_prices table - no longer used
-- Source of truth is now pricing_rules table
-- APIs have been updated to use pricing_rules

DROP TABLE IF EXISTS public.daily_prices CASCADE;

-- Verify cleanup
SELECT 'daily_prices table removed' as status;
