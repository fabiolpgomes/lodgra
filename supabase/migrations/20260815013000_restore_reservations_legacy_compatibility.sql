-- Restore the brownfield reservations contract consumed by the Lodgra MVP.
--
-- The reverted 20260810 Multi-OTA foundation was deployed with the table name
-- `reservations`, although the approved epic specifies `ota_reservations` for
-- the new model. Production therefore retained the new columns after the Git
-- revert while the application continued using the legacy contract.
--
-- This migration is additive: it preserves the Multi-OTA columns and data,
-- restores the legacy API surface, and bridges legacy writes into the shared
-- property_id/external_reservation_id fields.

BEGIN;

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS property_listing_id UUID,
  ADD COLUMN IF NOT EXISTS guest_id UUID,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS platform_fee NUMERIC,
  ADD COLUMN IF NOT EXISTS net_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS source VARCHAR,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS booking_source TEXT DEFAULT 'ical',
  ADD COLUMN IF NOT EXISTS num_guests INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,4) DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS commission_calculated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS synced_to_platforms BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS synced_platforms_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_payment_link TEXT,
  ADD COLUMN IF NOT EXISTS asaas_status TEXT,
  ADD COLUMN IF NOT EXISTS raw_data JSONB,
  ADD COLUMN IF NOT EXISTS channel_id UUID,
  ADD COLUMN IF NOT EXISTS calendar_event_id UUID,
  ADD COLUMN IF NOT EXISTS email_extraction_id UUID,
  ADD COLUMN IF NOT EXISTS confirmed_by_host BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checkin_code TEXT,
  ADD COLUMN IF NOT EXISTS checkin_instructions TEXT,
  ADD COLUMN IF NOT EXISTS checkin_code_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manager_notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_confirm_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_notify_manager BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(100),
  ADD COLUMN IF NOT EXISTS platform_sync_url TEXT,
  ADD COLUMN IF NOT EXISTS platform_synced_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_fee_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_policy_id UUID,
  ADD COLUMN IF NOT EXISTS cancellation_policy_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT,
  ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_token TEXT,
  ADD COLUMN IF NOT EXISTS review_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manual_review_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_description TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_evidence_url TEXT,
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_reason TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Legacy iCal/manual writes do not own a Multi-OTA connection. A future
-- cutover may enforce this again on ota_reservations, never on this bridge.
ALTER TABLE public.reservations
  ALTER COLUMN channel_connection_id DROP NOT NULL;

-- Backfill the restored columns from the Multi-OTA representation.
UPDATE public.reservations r
SET external_id = COALESCE(r.external_id, r.external_reservation_id),
    total_amount = COALESCE(r.total_amount, r.total_price),
    status = COALESCE(r.status, r.reservation_status, 'confirmed'),
    synced_at = COALESCE(r.synced_at, r.last_sync_at),
    booking_source = COALESCE(
      r.booking_source,
      (SELECT CASE
         WHEN cc.channel LIKE 'booking%' THEN 'booking'
         WHEN cc.channel LIKE 'airbnb%' THEN 'airbnb'
         ELSE cc.channel
       END FROM public.channel_connections cc WHERE cc.id = r.channel_connection_id),
      'manual'
    ),
    source = COALESCE(r.source, r.enrichment_source, 'manual'),
    commission_calculated_at = COALESCE(r.commission_calculated_at, r.created_at, now());

-- Recover a listing relation for migrated rows. Prefer the matching platform;
-- fall back deterministically to an active listing of the same property/org.
UPDATE public.reservations r
SET property_listing_id = (
  SELECT pl.id
  FROM public.property_listings pl
  LEFT JOIN public.platforms pf ON pf.id = pl.platform_id
  LEFT JOIN public.channel_connections cc ON cc.id = r.channel_connection_id
  WHERE pl.property_id = r.property_id
    AND pl.organization_id = r.organization_id
  ORDER BY
    CASE
      WHEN cc.channel LIKE 'booking%' AND lower(COALESCE(pf.name, pf.display_name, '')) LIKE '%booking%' THEN 0
      WHEN cc.channel LIKE 'airbnb%' AND lower(COALESCE(pf.name, pf.display_name, '')) LIKE '%airbnb%' THEN 0
      WHEN cc.channel = 'manual' AND lower(COALESCE(pf.name, pf.display_name, '')) LIKE '%direct%' THEN 0
      ELSE 1
    END,
    pl.is_active DESC,
    pl.created_at,
    pl.id
  LIMIT 1
)
WHERE r.property_listing_id IS NULL;

ALTER TABLE public.property_listings
  ADD COLUMN IF NOT EXISTS last_sync_error TEXT,
  ADD COLUMN IF NOT EXISTS sync_error_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_property_listings_sync_error
  ON public.property_listings(sync_error_count DESC)
  WHERE sync_enabled = true AND sync_error_count > 0;

CREATE OR REPLACE FUNCTION public.bridge_legacy_reservation_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.property_listing_id IS NOT NULL AND (
    NEW.property_id IS NULL
    OR TG_OP = 'INSERT'
    OR NEW.property_listing_id IS DISTINCT FROM OLD.property_listing_id
  ) THEN
    SELECT pl.property_id INTO NEW.property_id
    FROM public.property_listings pl
    WHERE pl.id = NEW.property_listing_id;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.reservation_status := NEW.status;
  ELSIF TG_OP = 'UPDATE' AND NEW.reservation_status IS DISTINCT FROM OLD.reservation_status THEN
    NEW.status := NEW.reservation_status;
  ELSE
    NEW.reservation_status := COALESCE(NEW.reservation_status, NEW.status, 'confirmed');
    NEW.status := COALESCE(NEW.status, NEW.reservation_status, 'confirmed');
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.external_id IS DISTINCT FROM OLD.external_id THEN
    NEW.external_reservation_id := NEW.external_id;
  ELSE
    NEW.external_reservation_id := COALESCE(
      NEW.external_reservation_id,
      NEW.external_id,
      NEW.id::TEXT
    );
    NEW.external_id := COALESCE(NEW.external_id, NEW.external_reservation_id);
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
    NEW.total_price := NEW.total_amount;
  ELSIF TG_OP = 'UPDATE' AND NEW.total_price IS DISTINCT FROM OLD.total_price THEN
    NEW.total_amount := NEW.total_price;
  ELSE
    NEW.total_price := COALESCE(NEW.total_price, NEW.total_amount);
    NEW.total_amount := COALESCE(NEW.total_amount, NEW.total_price);
  END IF;
  NEW.last_sync_at := COALESCE(NEW.last_sync_at, NEW.synced_at);
  NEW.commission_calculated_at := COALESCE(NEW.commission_calculated_at, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bridge_legacy_reservation_write_trigger ON public.reservations;
CREATE TRIGGER bridge_legacy_reservation_write_trigger
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.bridge_legacy_reservation_write();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.reservations'::regclass
      AND conname = 'reservations_property_listing_id_fkey'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_property_listing_id_fkey
      FOREIGN KEY (property_listing_id)
      REFERENCES public.property_listings(id) ON DELETE SET NULL
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.reservations'::regclass
      AND conname = 'reservations_guest_id_fkey'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_guest_id_fkey
      FOREIGN KEY (guest_id)
      REFERENCES public.guests(id) ON DELETE SET NULL
      NOT VALID;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_reservations_listing
  ON public.reservations(property_listing_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status
  ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_legacy_property_dates
  ON public.reservations(property_id, check_in, check_out)
  WHERE status IS DISTINCT FROM 'cancelled';

COMMENT ON FUNCTION public.bridge_legacy_reservation_write() IS
  'Temporary brownfield bridge. Keeps the Lodgra MVP reservation contract compatible while Multi-OTA uses an isolated future model.';

COMMIT;
