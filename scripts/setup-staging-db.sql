-- Staging Database Seed Script
-- Creates test organization and supporting data for staging environment
-- Run this in Supabase Dashboard > SQL Editor for wrqjpyyopwgyqluqkcga project

-- 1. Create test organization
INSERT INTO organizations (name, slug, subscription_status, plan)
VALUES (
  'Staging Test Org',
  'staging-test-org',
  'active',
  'essencial'
)
ON CONFLICT DO NOTHING;

-- 2. Verify creation
SELECT 'Organizations' AS table_name, COUNT(*) AS count
FROM organizations
WHERE slug = 'staging-test-org'
UNION ALL
SELECT 'Total Organizations', COUNT(*)
FROM organizations;
