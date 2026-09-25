-- ============================================================
-- Email Parsing: email_connections + email_parse_log
-- Story 3.1 — Automação & Integrações
-- ============================================================

-- Extensão pgcrypto para encriptação de tokens OAuth2
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- Tabela: email_connections
-- Armazena tokens OAuth2 Gmail por organização (encriptados)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  access_token    TEXT NOT NULL,   -- encriptado com pgp_sym_encrypt
  refresh_token   TEXT NOT NULL,   -- encriptado com pgp_sym_encrypt
  token_expiry    TIMESTAMPTZ NOT NULL,
  scope           TEXT NOT NULL DEFAULT 'https://www.googleapis.com/auth/gmail.readonly',
  connected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sync_at    TIMESTAMPTZ,
  CONSTRAINT email_connections_org_unique UNIQUE (organization_id)
);

ALTER TABLE public.email_connections ENABLE ROW LEVEL SECURITY;

-- RLS: utilizadores apenas vêem a sua organização
CREATE POLICY "email_connections_select"
  ON public.email_connections FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "email_connections_insert"
  ON public.email_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "email_connections_update"
  ON public.email_connections FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "email_connections_delete"
  ON public.email_connections FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- ============================================================
-- Tabela: email_parse_log
-- Registo de emails processados (deduplicação + auditoria)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_parse_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  message_id      TEXT NOT NULL,           -- Gmail message ID
  received_at     TIMESTAMPTZ NOT NULL,
  platform        TEXT,                    -- airbnb | booking | flatio | unknown
  status          TEXT NOT NULL,           -- parsed | skipped | error
  parsed_data     JSONB,                   -- output do Claude Haiku
  reservation_id  UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT email_parse_log_message_org_unique UNIQUE (message_id, organization_id)
);

ALTER TABLE public.email_parse_log ENABLE ROW LEVEL SECURITY;

-- RLS: utilizadores apenas vêem logs da sua organização
CREATE POLICY "email_parse_log_select"
  ON public.email_parse_log FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_email_connections_org ON public.email_connections (organization_id);
CREATE INDEX IF NOT EXISTS idx_email_parse_log_org ON public.email_parse_log (organization_id);
CREATE INDEX IF NOT EXISTS idx_email_parse_log_status ON public.email_parse_log (status);
CREATE INDEX IF NOT EXISTS idx_email_parse_log_created ON public.email_parse_log (created_at DESC);
