-- Story 37.2: Remove properties.base_price column
-- All pricing is now managed via daily_prices table

ALTER TABLE public.properties
DROP COLUMN IF EXISTS base_price CASCADE;

-- Document the change
COMMENT ON TABLE public.properties IS 'Property information. Pricing is now managed via daily_prices table (Story 37.2).';
