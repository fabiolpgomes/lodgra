-- ============================================================
-- REMOVER E RECRIAR VIEW unified_calendar (VERSÃO ROBUSTA)
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- Passo 1: Remover view com CASCADE (força remoção)
DROP VIEW IF EXISTS public.unified_calendar CASCADE;

-- Passo 2: Verificar se foi removida
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public' 
  AND table_name = 'unified_calendar';

-- Se o resultado acima mostrar a view, tente este comando mais forte:
-- DROP VIEW public.unified_calendar CASCADE;

-- Passo 3: Recriar view SEM SECURITY DEFINER
CREATE OR REPLACE VIEW public.unified_calendar AS
SELECT 
  p.id as property_id,
  p.name as property_name,
  r.check_in,
  r.check_out,
  'reservation'::text as type,
  COALESCE(g.first_name || ' ' || g.last_name, 'Sem hóspede') as guest_name,
  r.status,
  pl.id as platform_listing_id
FROM reservations r
INNER JOIN property_listings pl ON r.property_listing_id = pl.id
INNER JOIN properties p ON pl.property_id = p.id
LEFT JOIN guests g ON r.guest_id = g.id

UNION ALL

SELECT 
  p.id as property_id,
  p.name as property_name,
  cb.start_date as check_in,
  cb.end_date as check_out,
  'block'::text as type,
  cb.block_type as guest_name,
  'blocked'::text as status,
  NULL::uuid as platform_listing_id
FROM calendar_blocks cb
INNER JOIN properties p ON cb.property_id = p.id;

-- Passo 4: Verificar se foi criada corretamente
SELECT 
  table_name,
  is_updatable,
  is_insertable_into
FROM information_schema.views
WHERE table_schema = 'public' 
  AND table_name = 'unified_calendar';

-- Passo 5: Testar a view
SELECT * FROM unified_calendar LIMIT 5;

-- ============================================================
-- RESULTADO ESPERADO
-- ============================================================
-- A view deve existir e retornar dados (se houver reservas/bloqueios)
-- No Security Advisor, o erro deve desaparecer após Refresh
