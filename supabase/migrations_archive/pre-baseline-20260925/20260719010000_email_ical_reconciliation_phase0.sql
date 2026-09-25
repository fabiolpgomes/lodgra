-- Story 38.1 / Phase 0: email <-> iCal reconciliation data foundation.
-- This migration is intentionally backward-compatible: the feature flag defaults off.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Abort before DDL when existing tenant relationships are unsafe.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.properties WHERE organization_id IS NULL) THEN
    RAISE EXCEPTION 'phase0 preflight: properties.organization_id contains NULL';
  END IF;

  IF EXISTS (SELECT 1 FROM public.property_listings WHERE organization_id IS NULL) THEN
    RAISE EXCEPTION 'phase0 preflight: property_listings.organization_id contains NULL';
  END IF;

  IF EXISTS (SELECT 1 FROM public.reservations WHERE organization_id IS NULL) THEN
    RAISE EXCEPTION 'phase0 preflight: reservations.organization_id contains NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.property_listings pl
    JOIN public.properties p ON p.id = pl.property_id
    WHERE pl.organization_id IS DISTINCT FROM p.organization_id
  ) THEN
    RAISE EXCEPTION 'phase0 preflight: property_listings cross organization boundary';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.reservations r
    JOIN public.property_listings pl ON pl.id = r.property_listing_id
    WHERE r.organization_id IS DISTINCT FROM pl.organization_id
  ) THEN
    RAISE EXCEPTION 'phase0 preflight: reservations cross organization boundary';
  END IF;
END
$$;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS email_ical_reconciliation_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.organizations.email_ical_reconciliation_enabled IS
  'Story 38.1 rollout flag. Defaults off; Phase 7 controls pilot activation.';

-- Composite parent keys prove tenant consistency in child foreign keys.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.properties'::regclass
      AND conname = 'properties_id_organization_key'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_id_organization_key UNIQUE (id, organization_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.property_listings'::regclass
      AND conname = 'property_listings_id_organization_key'
  ) THEN
    ALTER TABLE public.property_listings
      ADD CONSTRAINT property_listings_id_organization_key UNIQUE (id, organization_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.reservations'::regclass
      AND conname = 'reservations_id_organization_key'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_id_organization_key UNIQUE (id, organization_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL,
  property_listing_id UUID NOT NULL,
  source_platform TEXT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  ical_uid TEXT NOT NULL,
  raw_summary TEXT,
  reservation_id UUID,
  status TEXT NOT NULL DEFAULT 'unmatched',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT calendar_events_source_platform_check
    CHECK (source_platform IN ('airbnb', 'booking', 'vrbo')),
  CONSTRAINT calendar_events_dates_check CHECK (check_out > check_in),
  CONSTRAINT calendar_events_ical_uid_check CHECK (btrim(ical_uid) <> ''),
  CONSTRAINT calendar_events_status_check
    CHECK (status IN ('unmatched', 'matched', 'ignored')),
  CONSTRAINT calendar_events_property_org_fk
    FOREIGN KEY (property_id, organization_id)
    REFERENCES public.properties(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT calendar_events_listing_org_fk
    FOREIGN KEY (property_listing_id, organization_id)
    REFERENCES public.property_listings(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT calendar_events_org_property_listing_uid_key
    UNIQUE (organization_id, property_id, property_listing_id, ical_uid),
  CONSTRAINT calendar_events_id_organization_key UNIQUE (id, organization_id)
);

CREATE TABLE IF NOT EXISTS public.raw_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT NOT NULL,
  recipient TEXT NOT NULL,
  sender TEXT NOT NULL,
  subject TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  raw_content TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT raw_emails_provider_check CHECK (provider = 'resend'),
  CONSTRAINT raw_emails_provider_message_id_check CHECK (btrim(provider_message_id) <> ''),
  CONSTRAINT raw_emails_content_check CHECK (octet_length(raw_content) > 0),
  CONSTRAINT raw_emails_processing_status_check
    CHECK (processing_status IN ('pending', 'processing', 'processed', 'retry', 'needs_review', 'rejected')),
  CONSTRAINT raw_emails_attempt_count_check CHECK (attempt_count >= 0),
  CONSTRAINT raw_emails_org_provider_message_key UNIQUE (organization_id, provider_message_id),
  CONSTRAINT raw_emails_id_organization_key UNIQUE (id, organization_id)
);

CREATE TABLE IF NOT EXISTS public.email_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  raw_email_id UUID NOT NULL,
  source_platform TEXT NOT NULL,
  confidence NUMERIC(5,4) NOT NULL,
  guest_name TEXT,
  guest_count INTEGER,
  check_in DATE,
  check_out DATE,
  total_value NUMERIC(14,2),
  currency TEXT,
  reservation_code TEXT,
  property_identifier_raw TEXT,
  raw_email_snippet TEXT,
  matched_event_id UUID,
  match_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_extractions_source_platform_check
    CHECK (source_platform IN ('airbnb', 'booking', 'vrbo')),
  CONSTRAINT email_extractions_confidence_check CHECK (confidence BETWEEN 0 AND 1),
  CONSTRAINT email_extractions_guest_count_check CHECK (guest_count IS NULL OR guest_count > 0),
  CONSTRAINT email_extractions_dates_check
    CHECK (check_in IS NULL OR check_out IS NULL OR check_out > check_in),
  CONSTRAINT email_extractions_total_value_check CHECK (total_value IS NULL OR total_value >= 0),
  CONSTRAINT email_extractions_currency_check CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  CONSTRAINT email_extractions_match_status_check
    CHECK (match_status IN ('pending', 'auto_matched', 'needs_review', 'no_match')),
  CONSTRAINT email_extractions_raw_email_org_fk
    FOREIGN KEY (raw_email_id, organization_id)
    REFERENCES public.raw_emails(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT email_extractions_event_org_fk
    FOREIGN KEY (matched_event_id, organization_id)
    REFERENCES public.calendar_events(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT email_extractions_org_raw_email_key UNIQUE (organization_id, raw_email_id),
  CONSTRAINT email_extractions_id_organization_key UNIQUE (id, organization_id)
);

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS property_id UUID,
  ADD COLUMN IF NOT EXISTS calendar_event_id UUID,
  ADD COLUMN IF NOT EXISTS email_extraction_id UUID,
  ADD COLUMN IF NOT EXISTS confirmed_by_host BOOLEAN NOT NULL DEFAULT false;

UPDATE public.reservations r
SET property_id = pl.property_id
FROM public.property_listings pl
WHERE r.property_listing_id = pl.id
  AND r.organization_id = pl.organization_id
  AND r.property_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.reservations'::regclass
      AND conname = 'reservations_property_org_fk'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_property_org_fk
      FOREIGN KEY (property_id, organization_id)
      REFERENCES public.properties(id, organization_id)
      ON DELETE RESTRICT NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.reservations'::regclass
      AND conname = 'reservations_calendar_event_org_fk'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_calendar_event_org_fk
      FOREIGN KEY (calendar_event_id, organization_id)
      REFERENCES public.calendar_events(id, organization_id)
      ON DELETE RESTRICT NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.reservations'::regclass
      AND conname = 'reservations_email_extraction_org_fk'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_email_extraction_org_fk
      FOREIGN KEY (email_extraction_id, organization_id)
      REFERENCES public.email_extractions(id, organization_id)
      ON DELETE RESTRICT NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.calendar_events'::regclass
      AND conname = 'calendar_events_reservation_org_fk'
  ) THEN
    ALTER TABLE public.calendar_events
      ADD CONSTRAINT calendar_events_reservation_org_fk
      FOREIGN KEY (reservation_id, organization_id)
      REFERENCES public.reservations(id, organization_id)
      ON DELETE RESTRICT NOT VALID;
  END IF;
END
$$;

ALTER TABLE public.reservations VALIDATE CONSTRAINT reservations_property_org_fk;
ALTER TABLE public.reservations VALIDATE CONSTRAINT reservations_calendar_event_org_fk;
ALTER TABLE public.reservations VALIDATE CONSTRAINT reservations_email_extraction_org_fk;
ALTER TABLE public.calendar_events VALIDATE CONSTRAINT calendar_events_reservation_org_fk;

CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_events_reservation_unique
  ON public.calendar_events (organization_id, reservation_id)
  WHERE reservation_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_extractions_event_unique
  ON public.email_extractions (organization_id, matched_event_id)
  WHERE matched_event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_calendar_event_unique
  ON public.reservations (organization_id, calendar_event_id)
  WHERE calendar_event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_email_extraction_unique
  ON public.reservations (organization_id, email_extraction_id)
  WHERE email_extraction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_org_status_dates
  ON public.calendar_events (organization_id, status, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_email_extractions_org_status_dates
  ON public.email_extractions (organization_id, match_status, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_email_extractions_property_trgm
  ON public.email_extractions USING gin (property_identifier_raw extensions.gin_trgm_ops)
  WHERE property_identifier_raw IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_raw_emails_org_status_received
  ON public.raw_emails (organization_id, processing_status, received_at, id);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.raw_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_emails FORCE ROW LEVEL SECURITY;
ALTER TABLE public.email_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_extractions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS calendar_events_select_organization ON public.calendar_events;
CREATE POLICY calendar_events_select_organization
  ON public.calendar_events FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS email_extractions_select_organization ON public.email_extractions;
CREATE POLICY email_extractions_select_organization
  ON public.email_extractions FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

COMMENT ON TABLE public.calendar_events IS 'Story 38.1 canonical staging for reservation-like iCal VEVENTs.';
COMMENT ON TABLE public.raw_emails IS 'Story 38.1 private inbound email staging; service-role only.';
COMMENT ON TABLE public.email_extractions IS 'Story 38.1 structured LLM extraction before deterministic validation and matching.';

COMMIT;
