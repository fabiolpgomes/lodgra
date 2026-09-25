-- Migration: Adicionar campos de platform booking IDs e sync metadata
-- Story 36.2: Platform Booking IDs Refactor
-- Purpose: Estruturar dados de sincronização (booking_reference, booking_source, platform_sync_url)

BEGIN;

-- Adicionar colunas à tabela reservations
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(100),
ADD COLUMN IF NOT EXISTS booking_source VARCHAR(50),
ADD COLUMN IF NOT EXISTS platform_sync_url TEXT,
ADD COLUMN IF NOT EXISTS platform_synced_at TIMESTAMP;

-- Índices para lookup rápido
CREATE INDEX IF NOT EXISTS idx_reservations_booking_reference
ON reservations(booking_source, booking_reference)
WHERE booking_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_platform_source
ON reservations(booking_source, platform_synced_at)
WHERE booking_source != 'manual';

-- Comentários descritivos
COMMENT ON COLUMN reservations.booking_reference IS 'ID da reserva na plataforma (ex: 6816972454 para Booking)';
COMMENT ON COLUMN reservations.booking_source IS 'Plataforma de origem (booking, airbnb, vrbo, flatio)';
COMMENT ON COLUMN reservations.platform_sync_url IS 'URL direto para a reserva na plataforma original';
COMMENT ON COLUMN reservations.platform_synced_at IS 'Timestamp da última sincronização via webhook/iCal';

-- Atualizar reservas antigas: preencher booking_source baseado em external_id
UPDATE reservations
SET booking_source = CASE
  WHEN external_id LIKE 'booking_%' THEN 'booking'
  WHEN external_id LIKE 'airbnb_%' THEN 'airbnb'
  WHEN external_id LIKE 'vrbo_%' THEN 'vrbo'
  WHEN external_id LIKE 'flatio_%' THEN 'flatio'
  ELSE 'unknown'
END
WHERE booking_source IS NULL
AND external_id IS NOT NULL
AND booking_source != 'manual';

-- Atualizar reservas antigas: preencher booking_reference
UPDATE reservations
SET booking_reference = CASE
  WHEN external_id LIKE 'booking_%' THEN SUBSTRING(external_id, 9)
  WHEN external_id LIKE 'airbnb_%' THEN SUBSTRING(external_id, 9)
  WHEN external_id LIKE 'vrbo_%' THEN SUBSTRING(external_id, 6)
  WHEN external_id LIKE 'flatio_%' THEN SUBSTRING(external_id, 8)
  ELSE NULL
END
WHERE booking_reference IS NULL
AND external_id IS NOT NULL;

-- Log das mudanças
SELECT
  COUNT(*) as total_updated,
  COUNT(CASE WHEN booking_source = 'booking' THEN 1 END) as booking_count,
  COUNT(CASE WHEN booking_source = 'airbnb' THEN 1 END) as airbnb_count,
  COUNT(CASE WHEN booking_source = 'vrbo' THEN 1 END) as vrbo_count,
  COUNT(CASE WHEN booking_source = 'flatio' THEN 1 END) as flatio_count
FROM reservations
WHERE booking_source IS NOT NULL
AND booking_source != 'unknown'
AND booking_source != 'manual';

COMMIT;
