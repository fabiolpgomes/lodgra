-- Tornar external_listing_id opcional (muitas plataformas não têm ID visível)
ALTER TABLE property_listings ALTER COLUMN external_listing_id DROP NOT NULL;
