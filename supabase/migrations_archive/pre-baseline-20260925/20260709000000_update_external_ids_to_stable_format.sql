-- Migration: Atualizar external_ids existentes para formato estável
-- Razão: Novo sistema usa 'plataforma_numero' em vez de 'numero@plataforma.com'
-- Para evitar duplicação, precisamos atualizar IDs antigos
--
-- Conversões:
-- '6816972454@booking.com' → 'booking_6816972454'
-- '1234567890@airbnb.com' → 'airbnb_1234567890'
-- 'vrbo_xxxxx' → 'vrbo_xxxxx' (já no formato correto)
-- etc.

BEGIN;

-- Atualizar Booking.com
UPDATE reservations
SET external_id = 'booking_' || SPLIT_PART(external_id, '@', 1)
WHERE booking_source = 'ical_auto_sync'
AND external_id LIKE '%@booking.com'
AND external_id IS NOT NULL;

-- Atualizar Airbnb
UPDATE reservations
SET external_id = 'airbnb_' || SPLIT_PART(external_id, '@', 1)
WHERE booking_source = 'ical_auto_sync'
AND external_id LIKE '%@airbnb.com'
AND external_id IS NOT NULL;

-- Atualizar VRBO (converter para formato estável se necessário)
UPDATE reservations
SET external_id = 'vrbo_' || SUBSTRING(external_id, 1, POSITION('@' IN external_id) - 1)
WHERE booking_source = 'ical_auto_sync'
AND external_id LIKE '%vrbo%'
AND external_id LIKE '%@%'
AND external_id IS NOT NULL;

-- Atualizar Flatio
UPDATE reservations
SET external_id = 'flatio_' || SUBSTRING(external_id, 1, POSITION('@' IN external_id) - 1)
WHERE booking_source = 'ical_auto_sync'
AND external_id LIKE '%flatio%'
AND external_id LIKE '%@%'
AND external_id IS NOT NULL;

COMMIT;

-- Log: Mostrar quantas foram atualizadas por plataforma
SELECT
  'booking' as platform,
  COUNT(*) as count
FROM reservations
WHERE booking_source = 'ical_auto_sync'
AND external_id LIKE 'booking_%'

UNION ALL

SELECT
  'airbnb',
  COUNT(*)
FROM reservations
WHERE booking_source = 'ical_auto_sync'
AND external_id LIKE 'airbnb_%'

UNION ALL

SELECT
  'vrbo',
  COUNT(*)
FROM reservations
WHERE booking_source = 'ical_auto_sync'
AND external_id LIKE 'vrbo_%'

UNION ALL

SELECT
  'flatio',
  COUNT(*)
FROM reservations
WHERE booking_source = 'ical_auto_sync'
AND external_id LIKE 'flatio_%';
