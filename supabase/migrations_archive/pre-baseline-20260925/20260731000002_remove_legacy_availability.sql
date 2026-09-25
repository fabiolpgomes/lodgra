-- Story 43: Clean up legacy availability schema
-- Remove property_availability table (now managed via calendar pricing)
-- Remove min_nights column from properties (superseded by availability modal)

-- Drop the legacy property_availability table
DROP TABLE IF EXISTS property_availability CASCADE;

-- Remove min_nights column from properties
ALTER TABLE properties DROP COLUMN IF EXISTS min_nights CASCADE;

-- Document the cleanup
COMMENT ON TABLE properties IS 'Property information. All pricing, availability, and constraints now managed via calendar interface.';
