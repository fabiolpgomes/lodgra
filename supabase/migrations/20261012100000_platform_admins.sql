-- Console do operador da plataforma: identidade e auditoria separadas dos tenants.
--
-- platform_admins: quem opera a plataforma Lodgra (não é um role dentro de uma organização).
-- platform_audit_log: registo de cada ação privilegiada do console (quem, o quê, quando).
--
-- Ambas as tabelas: RLS ligada, sem políticas e sem grants para anon/authenticated.
-- Só o servidor (service_role) lê e grava, no mesmo padrão de organization_payment_credentials.
-- Idempotente. O primeiro platform admin é inserido à mão (SQL fora do git: contém dados pessoais).

CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_audit_log_created_at_idx
  ON public.platform_audit_log (created_at DESC);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_audit_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.platform_admins FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.platform_audit_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.platform_admins TO service_role;
GRANT ALL ON TABLE public.platform_audit_log TO service_role;

COMMENT ON TABLE public.platform_admins IS
  'Operadores da plataforma Lodgra. Sem políticas RLS e sem grants para anon/authenticated: acesso só pelo servidor (service_role).';
COMMENT ON TABLE public.platform_audit_log IS
  'Auditoria das ações do console da plataforma. Nunca guardar segredos em metadata. Acesso só pelo servidor (service_role).';

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20261012100000', 'platform_admins')
ON CONFLICT DO NOTHING;
