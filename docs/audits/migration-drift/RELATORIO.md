# Auditoria de drift de migrations — 25/09/2026

Escopo: 220 arquivos em `supabase/migrations/` (commit `807f6ee`) × staging `wrqjpyyopwgyqluqkcga` × produção `brjumbfpvijrkhrherpt`.
Método: consultas **somente leitura** (endpoint `database/query/read-only` da Management API) em `supabase_migrations.schema_migrations` e no catálogo (`pg_class`, `pg_attribute`, `pg_proc`, `pg_policies`, `pg_trigger`, `pg_indexes`). Estado esperado do repo = replay heurístico (regex) de CREATE/DROP/ALTER dos 220 arquivos → 910 objetos finais (`parse_migrations.py`).

## 1. Veredito

| | Staging | Produção |
|---|---|---|
| Linhas no histórico | **109** | **208** |
| Arquivos locais registrados (mesma versão) | 109 | 190 |
| Registrados com **outra versão** (mesmo nome) | 0 | 14 |
| Registrados sem arquivo local | 0 | 5 |
| Arquivos locais **não registrados** | 111 | 16 |
| Registrados como `remote_placeholder` | 6 | 0 |

**O histórico de migrations não é confiável em nenhum dos dois ambientes.** O schema real, sim, é consistente entre eles:

- **Staging e produção têm schema idêntico** (tabelas, colunas, funções, policies, triggers, índices). Única diferença: produção tem a extensão `http` (14 funções `http_*`) e 4 policies antigas de storage (`... 107eh68_0`).
- Ou seja, staging recebeu tudo o que produção recebeu, mas **111 migrations não foram registradas** no histórico de staging (aplicadas fora do CLI).
- **Epic 47 (20260908–20260915) está no histórico e no schema de produção.** O registro anterior dizia "nada em produção ainda" — confirmar se isso foi intencional.

## 2. Achados críticos

### 2.1 33 tabelas que o repo cria e o código consulta **não existem em nenhum dos dois bancos**
Confirmado por `pg_class` em todos os schemas: `whatsapp_logs`, `whatsapp_message_templates`, `whatsapp_config`, `whatsapp_analytics`, `webhook_events`, `stripe_events`, `invoices`, `payments`, `organization_templates`, `organization_email_templates`, `email_sent`, `email_unsubscribes`, `organization_traffic_events`, `google_performance_metrics`, `google_performance_daily_summary`, `google_validation_logs`, `seasonal_pricing_rules`, `price_history`, `price_analytics`, `pricing_recommendations`, `extraction_corrections`, `revenue_forecasts`, `forecast_cache`, `forecast_assumptions`, `competitors`, `competitor_price_history`, `competitor_price_alerts`, `competitor_benchmark_cache`, `reservation_corrections`, `channel_listings`, `analytics_test_events`, `monthly_property_metrics`, `commission_summary`.

Várias constam como **aplicadas** no histórico de produção (ex.: `20260615000000_create_whatsapp_tables`, 12 statements). Então foram criadas e depois **removidas por algo fora do repo** (migration apagada, SQL manual ou reset). Há código em `src/` fazendo `.from(...)` em ~20 delas (whatsapp_logs 3, price_history 6, stripe_events 4, channel_listings 6…) → erro em runtime nessas rotas.

### 2.2 Colunas esperadas pelo repo e ausentes nos dois bancos
`organizations.{billing_country, billing_period_start/end, currency, stripe_br_customer_id, stripe_pt_connect_id}`, `properties.tier`, `guests.{name, loyalty_score, loyalty_score_updated_at, preferred_locale}`, `reservations.preferred_locale`, `user_profiles.preferred_locale`, `cleaning_checklist_templates.{is_default, is_global}`, `cleaner_access_tokens.updated_at`, `property_prices.{min,max}_nightly_price`, `whatsapp_logs.*`.

### 2.3 11 tabelas no banco que **nenhuma migration do repo cria**
`availability_blocks`, `channel_connections`, `channel_listing_mappings`, `reservation_conflicts`, `reservation_matches`, `reservation_sources` (vêm da migration apagada `20260810_multi_ota_phase1_foundation`), `property_documents`, `property_prices`, `pilot_organizations`, `email_parser_cron_log`, `reservation_org_backfill_20260719`.
→ Um banco novo recriado a partir do repo **não** reproduz produção.

### 2.4 Correções de segurança recentes: aplicadas, mas não registradas
`20260918`–`20260923` (7 arquivos) não estão no histórico de nenhum ambiente, mas o efeito foi conferido nos dois: `properties_authenticated_select` com escopo de organização, `admins_all`/`users_select_own` via `is_org_admin()`, trigger `trg_property_images_immutable_fields`, `on_auth_user_created`. Exceção: `20260918084205_sanitize_production_data` → a função `sanitize_production_data` **não existe** em nenhum dos dois.

### 2.5 Nomes de arquivo e versões
- 20 arquivos com versão de 8 dígitos (`20260413_01_...`). A versão registrada é só a data.
- `20260808` duplicado: `add_email_enrichment_fields` está registrado; `add_property_listings_error_tracking` não (mas seu efeito existe). `supabase db push` vai conflitar.
- Produção: 14 migrations registradas com timestamp de aplicação ≠ nome do arquivo (ex.: local `20260814195031_atomic_tenant_onboarding` ↔ remoto `20260814195642`). Mais 5 registros sem arquivo local: `harden_property_limit_execution_context`, `refine_atomic_tenant_onboarding`, `harden_cleaning_child_rls`, `reconcile_organization_plan_values`, `cancellation_policies_schema (20260816092456)`.
- Staging: 6 registros `remote_placeholder` (20260512000002–20260517000001) → sinal de `migration repair` manual.

## 3. Classificação por migration
Detalhe em `objetos-ausentes-por-migration.txt` (objetos esperados ausentes / objetos esperados que sobrevivem).
- **Sem nenhum efeito nos dois bancos (40)**: a lista completa está no arquivo. As mais relevantes são whatsapp (92–96), google perf/validation (111–112), pricing/forecast/competitors (116–123), stripe_foundation (71, 20/23), organization_templates/email_templates (75–76), webhook_events (109), email_unsubscribes/traffic_events/booking_preferred_locale (164–166), sanitize_production_data (214).
- **Efeito parcial (22)**: em geral, policies e índices renomeados ou substituídos fora do repo (ex.: `bootstrap_core_tables` 10/19, `roles_gestor_guest` 3/15).
- **Sem objeto estrutural verificável (~67)**: migrations só de dados, grants ou `ALTER POLICY`, ou totalmente superadas. Não dá pra auditar por catálogo.

## 4. Limitações
Parser por regex: não lê colunas dentro de `CREATE TABLE`, `DROP` com múltiplos nomes nem `CASCADE`. Itens de 1–3 objetos (ex.: 24, 45, 46, 110, 128) podem ser falso positivo por renomeação. As 33 tabelas e as colunas da seção 2.2 foram **confirmadas por consulta direta**.

## 5. Decisões necessárias (não executadas)
1. **Fonte da verdade**: tratar o schema de produção como canônico e gerar uma baseline (`supabase db dump --schema-only`), arquivando as 220 migrations em `supabase/migrations/_archive/`. Alternativa: reconciliar migration por migration.
2. Features cujas tabelas não existem (WhatsApp logs/templates, Stripe events/invoices, pricing inteligente, forecasting, competitor monitoring, email unsubscribes, traffic events): recriar ou remover o código morto.
3. Epic 47 em produção: confirmar se foi intencional.
4. Depois da decisão 1: `migration repair` nos dois ambientes para alinhar o histórico.

## 6. Baseline gerada (25/09/2026)
- `20260925000000_baseline_producao.sql` (`supabase db dump` de produção, 8.970 linhas). Conferido contra o catálogo de produção: 73 tabelas, 73 com RLS, 184 policies, 48 funções (40 public + 8 lodgra_private), 21 triggers, 297 índices (179 + 118 de PK/UNIQUE/EXCLUDE), 1 view, 10 extensões, incluindo `http`.
- `20260925000001_baseline_auth_storage_cron.sql`: o que o dump não exporta. Trigger `on_auth_user_created`, 3 buckets, 7 policies de `storage.objects` e 3 jobs `pg_cron`. O segredo continua no Vault.
- As 220 migrations antigas foram movidas com `git mv` para `supabase/migrations_archive/pre-baseline-20260925/`.

### Riscos de segurança encontrados no storage (herdados de produção, não corrigidos)
1. **`property-documents`**: as policies SELECT/INSERT/DELETE exigem só `auth.role() = 'authenticated'`. Qualquer usuário logado, de qualquer organização, pode ler e apagar documentos de outras organizações.
2. **`property-images`**: as policies dependem dos claims `role`, `custom_claims_role` e `organization_id` no JWT. Se esses claims não forem emitidos, upload e delete autenticados falham. A leitura funciona porque o bucket é público.
3. **`cleaning-photos`**: não tem nenhuma policy. As migrations `cleaning_photos_bucket_*` nunca foram aplicadas, então só o service role acessa.
