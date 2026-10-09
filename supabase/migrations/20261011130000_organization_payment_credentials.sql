-- Credenciais do Asaas (PIX) por organização, em tabela própria só acessível pelo servidor.
--
-- Antes: organizations.asaas_api_key / asaas_environment (criadas fora do baseline) eram legíveis por qualquer
-- membro da organização via RLS e iam para o navegador. Agora a chave fica numa tabela sem acesso para
-- anon/authenticated: só o servidor (service_role) lê e grava.
-- asaas_webhook_token é um segredo próprio do webhook, distinto da chave de API.
--
-- Idempotente. Se as colunas antigas existirem, os valores são copiados e as colunas removidas, na mesma transação.

CREATE TABLE IF NOT EXISTS public.organization_payment_credentials (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  asaas_api_key text,
  asaas_environment text NOT NULL DEFAULT 'sandbox',
  asaas_webhook_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_payment_credentials_environment_check
    CHECK (asaas_environment IN ('sandbox', 'production'))
);

ALTER TABLE public.organization_payment_credentials ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.organization_payment_credentials FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.organization_payment_credentials TO service_role;

COMMENT ON TABLE public.organization_payment_credentials IS
  'Segredos de pagamento por organização. Sem políticas RLS e sem grants para anon/authenticated: acesso só pelo servidor (service_role).';

DROP TRIGGER IF EXISTS organization_payment_credentials_touch_updated_at ON public.organization_payment_credentials;
CREATE TRIGGER organization_payment_credentials_touch_updated_at
  BEFORE UPDATE ON public.organization_payment_credentials
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DO $migrate$
DECLARE
  has_key boolean;
  has_env boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'asaas_api_key') INTO has_key;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'asaas_environment') INTO has_env;

  IF has_key THEN
    EXECUTE format(
      $q$INSERT INTO public.organization_payment_credentials (organization_id, asaas_api_key, asaas_environment)
         SELECT id, asaas_api_key, %s FROM public.organizations WHERE asaas_api_key IS NOT NULL
         ON CONFLICT (organization_id) DO NOTHING$q$,
      CASE WHEN has_env
        THEN $e$CASE WHEN asaas_environment IN ('sandbox', 'production') THEN asaas_environment ELSE 'sandbox' END$e$
        ELSE $e$'sandbox'$e$
      END
    );
    EXECUTE 'ALTER TABLE public.organizations DROP COLUMN asaas_api_key';
  END IF;

  IF has_env THEN
    EXECUTE 'ALTER TABLE public.organizations DROP COLUMN asaas_environment';
  END IF;
END
$migrate$;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20261011130000', 'organization_payment_credentials')
ON CONFLICT DO NOTHING;
