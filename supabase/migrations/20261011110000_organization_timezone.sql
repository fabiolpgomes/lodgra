-- Fuso de negócio por organização. O código (dashboard, relatórios, crons, iCal) lê organizations.timezone
-- para saber o que é "hoje" e "este mês"; sem esta coluna a leitura falha e tudo cai no fuso por omissão.
-- Idempotente: se a coluna já existir em produção (criada fora das migrations), não faz nada.
--
-- Depois de aplicar, definir o fuso de cada organização, por exemplo:
--   UPDATE public.organizations SET timezone = 'America/Sao_Paulo', currency = 'BRL' WHERE id = '<org do Brasil>';
-- Fusos válidos: SELECT name FROM pg_timezone_names ORDER BY 1;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/Lisbon';

-- Moeda por omissão da organização: o dashboard e o ia-native fazem select('currency, timezone') num único
-- pedido, por isso sem esta coluna o pedido inteiro falha mesmo com timezone presente.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EUR';

COMMENT ON COLUMN public.organizations.timezone IS
  'Fuso IANA da organização (ex.: America/Sao_Paulo, Europe/Lisbon, Europe/Madrid). Define "hoje" e o mês corrente.';

COMMENT ON COLUMN public.organizations.currency IS
  'Moeda ISO 4217 por omissão da organização (EUR, BRL...).';

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20261011110000', 'organization_timezone')
ON CONFLICT DO NOTHING;
