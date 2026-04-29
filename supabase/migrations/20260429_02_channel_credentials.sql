-- Story 15.3: channel_credentials table
-- Stores API credentials per org+channel+property (server-side only — never exposed to client)
-- Rollback: DROP TABLE IF EXISTS public.channel_credentials;

CREATE TABLE IF NOT EXISTS public.channel_credentials (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel_id            UUID        NOT NULL REFERENCES public.channels(id) ON DELETE RESTRICT,
  external_property_id  TEXT        NOT NULL,  -- Booking.com property_id as string
  api_key               TEXT        NOT NULL,  -- API key (RLS-protected, never in client response)
  is_active             BOOLEAN     DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, channel_id, external_property_id)
);

-- RLS: only the owning org can read/write; service_role bypasses for server-side ops
ALTER TABLE public.channel_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channel_credentials_org_isolation"
  ON public.channel_credentials FOR ALL
  TO authenticated
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "channel_credentials_service_role_all"
  ON public.channel_credentials FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_channel_credentials_org_channel
  ON public.channel_credentials(organization_id, channel_id);
