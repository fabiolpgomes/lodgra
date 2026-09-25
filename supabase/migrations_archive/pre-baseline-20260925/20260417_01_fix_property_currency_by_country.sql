-- Fix property currency based on country
-- Properties in Brazil should have BRL instead of EUR
-- This migration updates existing properties to correct currencies

BEGIN;

-- Update Brazilian properties to BRL
UPDATE properties
SET currency = 'BRL'
WHERE country = 'Brasil' AND (currency = 'EUR' OR currency IS NULL);

-- Update Portuguese properties to EUR (ensure they stay correct)
UPDATE properties
SET currency = 'EUR'
WHERE country IN ('Portugal', 'Portugal.') AND (currency IS NULL OR currency = 'BRL');

-- Update US properties to USD
UPDATE properties
SET currency = 'USD'
WHERE country IN ('United States', 'USA', 'US') AND (currency = 'EUR' OR currency IS NULL);

-- Ensure all properties have a currency (fallback to EUR if still NULL)
UPDATE properties
SET currency = 'EUR'
WHERE currency IS NULL;

COMMIT;
