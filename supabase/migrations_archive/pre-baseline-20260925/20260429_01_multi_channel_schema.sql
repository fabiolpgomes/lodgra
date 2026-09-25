-- Story 15.1: Schema Multi-Channel (channels, channel_listings, reservations extensions)
-- Rollback: see end of file

-- ─── 1. channels table ────────────────────────────────────────────────────────
-- Global lookup table — no org isolation (channels are platform-level)

CREATE TABLE IF NOT EXISTS public.channels (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR     NOT NULL UNIQUE,
  type        VARCHAR     NOT NULL, -- 'ota' | 'direct'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Read-only for all authenticated users (global table, no org isolation)
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channels_select_authenticated"
  ON public.channels FOR SELECT
  TO authenticated
  USING (true);

-- Service role retains full access (webhooks, admin operations)
CREATE POLICY "channels_service_role_all"
  ON public.channels FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed: canonical channel records
INSERT INTO public.channels (name, type) VALUES
  ('booking', 'ota'),
  ('direct',  'direct')
ON CONFLICT (name) DO NOTHING;

-- ─── 2. channel_listings table ───────────────────────────────────────────────
-- Maps internal property_listings to their external ID on each channel

CREATE TABLE IF NOT EXISTS public.channel_listings (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_listing_id   UUID        REFERENCES public.property_listings(id) ON DELETE CASCADE,
  channel_id            UUID        NOT NULL REFERENCES public.channels(id) ON DELETE RESTRICT,
  external_id           TEXT        NOT NULL,         -- external listing ID on the channel
  organization_id       UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  last_synced_at        TIMESTAMPTZ,
  sync_count            INTEGER     DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (channel_id, external_id)                    -- one external ID per channel
);

-- RLS: organization isolation (same pattern as all other tables)
ALTER TABLE public.channel_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channel_listings_org_isolation"
  ON public.channel_listings FOR ALL
  TO authenticated
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "channel_listings_service_role_all"
  ON public.channel_listings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes for webhook lookup (channel → external_id → listing)
CREATE INDEX IF NOT EXISTS idx_channel_listings_external_id
  ON public.channel_listings(external_id);

CREATE INDEX IF NOT EXISTS idx_channel_listings_property_listing
  ON public.channel_listings(property_listing_id);

CREATE INDEX IF NOT EXISTS idx_channel_listings_channel_id
  ON public.channel_listings(channel_id);

CREATE INDEX IF NOT EXISTS idx_channel_listings_org_id
  ON public.channel_listings(organization_id);

-- ─── 3. guests — add name column for full-name from channel APIs ──────────────
-- Existing columns: first_name, last_name, email, phone, organization_id
-- Adding: name TEXT (full name string as received from channel APIs like Booking.com)

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS name TEXT;

-- ─── 4. reservations — add channel columns ───────────────────────────────────
-- Existing: guest_name, guest_email, guest_phone (from 20260320030000_direct_bookings)
-- Adding: raw_data (full channel payload), channel_id (FK → channels)

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS raw_data   JSONB,
  ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL;

-- Partial index: only rows with a channel (avoids index bloat for direct bookings)
CREATE INDEX IF NOT EXISTS idx_reservations_channel_id
  ON public.reservations(channel_id)
  WHERE channel_id IS NOT NULL;

-- ─── ROLLBACK SCRIPT (run manually if needed) ────────────────────────────────
-- ALTER TABLE public.reservations DROP COLUMN IF EXISTS raw_data;
-- ALTER TABLE public.reservations DROP COLUMN IF EXISTS channel_id;
-- ALTER TABLE public.guests DROP COLUMN IF EXISTS name;
-- DROP TABLE IF EXISTS public.channel_listings CASCADE;
-- DROP TABLE IF EXISTS public.channels CASCADE;
