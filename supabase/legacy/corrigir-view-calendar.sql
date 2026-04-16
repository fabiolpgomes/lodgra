-- ============================================================
-- CORRIGIR VIEW unified_calendar
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- Remover a view antiga (com SECURITY DEFINER)
DROP VIEW IF EXISTS unified_calendar CASCADE;

-- Recriar a view SEM SECURITY DEFINER
CREATE VIEW unified_calendar AS
SELECT 
  p.id as property_id,
  p.name as property_name,
  r.check_in,
  r.check_out,
  'reservation' as type,
  COALESCE(g.first_name || ' ' || g.last_name, 'Sem hóspede') as guest_name,
  r.status,
  pl.id as platform_listing_id
FROM reservations r
JOIN property_listings pl ON r.property_listing_id = pl.id
JOIN properties p ON pl.property_id = p.id
LEFT JOIN guests g ON r.guest_id = g.id

UNION ALL

SELECT 
  p.id as property_id,
  p.name as property_name,
  cb.start_date as check_in,
  cb.end_date as check_out,
  'block' as type,
  cb.block_type as guest_name,
  'blocked' as status,
  NULL as platform_listing_id
FROM calendar_blocks cb
JOIN properties p ON cb.property_id = p.id;

-- Verificar se a view foi criada
SELECT table_name, view_definition
FROM information_schema.views
WHERE table_schema = 'public' 
  AND table_name = 'unified_calendar';

-- ============================================================
-- RESULTADO ESPERADO
-- ============================================================
-- Deve aparecer a view 'unified_calendar' na lista
-- E não deve mais aparecer no Security Advisor
