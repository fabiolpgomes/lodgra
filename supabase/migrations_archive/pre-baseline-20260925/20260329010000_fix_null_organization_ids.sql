-- Fix: Assign default organization to properties created before multi-tenant migration
-- Properties created before 2026-02-27 have NULL organization_id

UPDATE properties
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE owners
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE guests
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE property_listings
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;
