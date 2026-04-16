-- ============================================
-- Home Stay — E2E Test Seed Data
-- ============================================
-- Creates a complete test environment with:
--   1 organization, 1 admin user profile,
--   2 properties, 2 listings, 5 reservations,
--   3 expenses, 1 owner, pricing rules
--
-- PREREQUISITES:
--   1. Create auth user via Supabase Dashboard or API:
--      Email: value of TEST_USER_EMAIL (.env.test)
--      Password: value of TEST_USER_PASSWORD (.env.test)
--   2. Copy the auth user UUID and replace 'AUTH_USER_ID' below
--   3. Run: psql <connection_string> -f supabase/seed-e2e-tests.sql
--      Or paste in Supabase Dashboard → SQL Editor
-- ============================================

-- ⚠️  REPLACE THIS with the real auth.users UUID from step 1
\set test_user_id '00000000-0000-0000-0000-000000000e2e'
\set test_org_id  '00000000-0000-0000-0000-00000000e2e1'

BEGIN;

-- Temporarily bypass RLS
SET LOCAL role = 'postgres';

-- ──────────────────────────────────────────
-- 1. Organization
-- ──────────────────────────────────────────
INSERT INTO organizations (id, name, plan, currency, created_at, updated_at)
VALUES (:'test_org_id', 'E2E Test Organization', 'professional', 'EUR', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET plan = 'professional', updated_at = NOW();

-- ──────────────────────────────────────────
-- 2. User Profile (must match auth.users id)
-- ──────────────────────────────────────────
INSERT INTO user_profiles (user_id, email, full_name, role, organization_id, created_at, updated_at)
VALUES (:'test_user_id', 'e2e-test@homestay.pt', 'E2E Admin', 'admin', :'test_org_id', NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET role = 'admin', organization_id = :'test_org_id', updated_at = NOW();

-- ──────────────────────────────────────────
-- 3. Properties
-- ──────────────────────────────────────────
INSERT INTO properties (id, name, slug, address, organization_id, status, min_nights, created_at, updated_at)
VALUES
  ('e2e-prop-001', 'Apartamento Alfama', 'apartamento-alfama', 'Rua da Alfama 10, Lisboa', :'test_org_id', 'active', 2, NOW(), NOW()),
  ('e2e-prop-002', 'Villa Cascais', 'villa-cascais', 'Av. Marginal 45, Cascais', :'test_org_id', 'active', 3, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────
-- 4. Property Listings (Booking.com, Direct)
-- ──────────────────────────────────────────
INSERT INTO property_listings (id, property_id, platform, external_listing_id, commission_rate, organization_id, created_at, updated_at)
VALUES
  ('e2e-list-001', 'e2e-prop-001', 'booking.com', 'BK-ALF-001', 15.0, :'test_org_id', NOW(), NOW()),
  ('e2e-list-002', 'e2e-prop-001', 'direct', NULL, 0, :'test_org_id', NOW(), NOW()),
  ('e2e-list-003', 'e2e-prop-002', 'booking.com', 'BK-CAS-001', 15.0, :'test_org_id', NOW(), NOW()),
  ('e2e-list-004', 'e2e-prop-002', 'direct', NULL, 0, :'test_org_id', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────
-- 5. User ↔ Property assignment
-- ──────────────────────────────────────────
INSERT INTO user_properties (user_id, property_id)
VALUES
  (:'test_user_id', 'e2e-prop-001'),
  (:'test_user_id', 'e2e-prop-002')
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────
-- 6. Owner
-- ──────────────────────────────────────────
INSERT INTO owners (id, name, email, phone, nif, organization_id, created_at, updated_at)
VALUES ('e2e-owner-001', 'João Silva', 'joao@example.com', '+351912345678', '123456789', :'test_org_id', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────
-- 7. Reservations (mix of past, current, future)
-- ──────────────────────────────────────────
INSERT INTO reservations (id, property_listing_id, guest_name, guest_email, check_in, check_out, total_amount, status, created_at, updated_at)
VALUES
  -- Past reservation (Booking.com)
  ('e2e-res-001', 'e2e-list-001', 'Maria Santos', 'maria@example.com',
   (CURRENT_DATE - INTERVAL '30 days')::date, (CURRENT_DATE - INTERVAL '25 days')::date,
   500.00, 'confirmed', NOW(), NOW()),
  -- Past reservation (Direct)
  ('e2e-res-002', 'e2e-list-002', 'John Smith', 'john@example.com',
   (CURRENT_DATE - INTERVAL '20 days')::date, (CURRENT_DATE - INTERVAL '15 days')::date,
   400.00, 'confirmed', NOW(), NOW()),
  -- Current reservation
  ('e2e-res-003', 'e2e-list-003', 'Ana Costa', 'ana@example.com',
   (CURRENT_DATE - INTERVAL '2 days')::date, (CURRENT_DATE + INTERVAL '3 days')::date,
   750.00, 'confirmed', NOW(), NOW()),
  -- Future reservation (next week)
  ('e2e-res-004', 'e2e-list-001', 'Pedro Ferreira', 'pedro@example.com',
   (CURRENT_DATE + INTERVAL '3 days')::date, (CURRENT_DATE + INTERVAL '7 days')::date,
   600.00, 'confirmed', NOW(), NOW()),
  -- Future reservation (next month)
  ('e2e-res-005', 'e2e-list-004', 'Sophie Müller', 'sophie@example.com',
   (CURRENT_DATE + INTERVAL '30 days')::date, (CURRENT_DATE + INTERVAL '35 days')::date,
   900.00, 'confirmed', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────
-- 8. Expenses
-- ──────────────────────────────────────────
INSERT INTO expenses (id, property_id, description, amount, category, expense_date, created_at, updated_at)
VALUES
  ('e2e-exp-001', 'e2e-prop-001', 'Limpeza semanal', 80.00, 'cleaning', (CURRENT_DATE - INTERVAL '7 days')::date, NOW(), NOW()),
  ('e2e-exp-002', 'e2e-prop-001', 'Manutenção caldeira', 150.00, 'maintenance', (CURRENT_DATE - INTERVAL '14 days')::date, NOW(), NOW()),
  ('e2e-exp-003', 'e2e-prop-002', 'Electricidade Março', 95.00, 'utilities', (CURRENT_DATE - INTERVAL '5 days')::date, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────
-- 9. Pricing Rules
-- ──────────────────────────────────────────
INSERT INTO pricing_rules (id, property_id, name, price_per_night, min_nights, start_date, end_date, priority, organization_id, created_at, updated_at)
VALUES
  ('e2e-price-001', 'e2e-prop-001', 'Época Alta', 120.00, 3, (CURRENT_DATE + INTERVAL '60 days')::date, (CURRENT_DATE + INTERVAL '120 days')::date, 10, :'test_org_id', NOW(), NOW()),
  ('e2e-price-002', 'e2e-prop-002', 'Verão', 180.00, 5, (CURRENT_DATE + INTERVAL '60 days')::date, (CURRENT_DATE + INTERVAL '120 days')::date, 10, :'test_org_id', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ──────────────────────────────────────────
-- Verify seed data
-- ──────────────────────────────────────────
SELECT '✅ Organization' AS entity, count(*) FROM organizations WHERE id = :'test_org_id'
UNION ALL
SELECT '✅ User Profile', count(*) FROM user_profiles WHERE user_id = :'test_user_id'
UNION ALL
SELECT '✅ Properties', count(*) FROM properties WHERE organization_id = :'test_org_id'
UNION ALL
SELECT '✅ Listings', count(*) FROM property_listings WHERE organization_id = :'test_org_id'
UNION ALL
SELECT '✅ Reservations', count(*) FROM reservations WHERE id LIKE 'e2e-%'
UNION ALL
SELECT '✅ Expenses', count(*) FROM expenses WHERE id LIKE 'e2e-%'
UNION ALL
SELECT '✅ Pricing Rules', count(*) FROM pricing_rules WHERE id LIKE 'e2e-%';
