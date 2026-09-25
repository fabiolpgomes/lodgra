-- Normalize Booking.com monetary values migrated into the canonical Multi-OTA
-- reservations table. Booking amounts are minor units (cents); the migration
-- originally copied them as major units and did not carry the currency.
--
-- Idempotency: only rows with currency IS NULL are touched. Once normalized,
-- a second execution updates zero rows and cannot divide the amount again.
-- Scope: Booking channel only. Airbnb/manual rows with missing currency are not
-- modified because their ingestion contracts use major units.

DO $$
DECLARE
  affected_rows integer;
BEGIN
  SELECT count(*)
    INTO affected_rows
  FROM public.reservations r
  JOIN public.channel_connections cc ON cc.id = r.channel_connection_id
  JOIN public.properties p ON p.id = r.property_id
  WHERE lower(cc.channel) = 'booking'
    AND r.currency IS NULL;

  RAISE NOTICE 'Normalizing % Booking reservation monetary rows', affected_rows;
END $$;

UPDATE public.reservations r
SET
  total_price = CASE
    WHEN r.total_price IS NULL THEN NULL
    ELSE round(r.total_price / 100.0, 2)
  END,
  currency = upper(coalesce(nullif(trim(p.currency), ''), 'EUR')),
  updated_at = now()
FROM public.channel_connections cc, public.properties p
WHERE cc.id = r.channel_connection_id
  AND p.id = r.property_id
  AND lower(cc.channel) = 'booking'
  AND r.currency IS NULL;
