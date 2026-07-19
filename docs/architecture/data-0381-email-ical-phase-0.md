# Data Design 0381: Fase 0 — reconciliação e-mail ↔ iCal

**Status:** Proposto para implementação
**Data:** 2026-07-19
**Story:** 38.1
**Decisão superior:** `docs/architecture/adr-0381-email-ical-phase-0.md`

## Escopo e invariantes

Este documento detalha o Gate 0 sem aplicar migration. `tenant_id` é materializado exclusivamente como `organization_id UUID NOT NULL`; nenhuma coluna `tenant_id` será criada. As tabelas novas ficam em `public`, usam `UUID`/`TIMESTAMPTZ`, RLS obrigatória e referências compostas quando a relação precisa provar que pai e filho pertencem à mesma organização.

Invariantes bloqueantes:

- um e-mail bruto é persistido antes de parsing e é único por `(organization_id, provider_message_id)`;
- um VEVENT é único por organização, imóvel, listing/feed e UID;
- `check_out > check_in` onde ambas as datas existem;
- somente uma reserva pode consumir cada `calendar_event` e cada `email_extraction`;
- relações entre organização, imóvel, evento, extração e reserva não aceitam cruzamento de tenant;
- a migration não altera o fluxo legado enquanto a feature flag da organização estiver desligada.

## Schema físico alvo

### `calendar_events`

| Coluna | Tipo/regras |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `organization_id` | `UUID NOT NULL` |
| `property_id` | `UUID NOT NULL` |
| `property_listing_id` | `UUID NOT NULL`; identifica feed/listing e elimina colisão de UID |
| `source_platform` | `TEXT NOT NULL CHECK IN ('airbnb','booking','vrbo')` |
| `check_in`, `check_out` | `DATE NOT NULL`, `CHECK (check_out > check_in)` |
| `ical_uid` | `TEXT NOT NULL CHECK (btrim(ical_uid) <> '')` |
| `raw_summary` | `TEXT` |
| `reservation_id` | `UUID NULL` |
| `status` | `TEXT NOT NULL DEFAULT 'unmatched' CHECK IN ('unmatched','matched','ignored')` |
| auditoria | `created_at`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` |

FKs: `(property_id, organization_id) -> properties(id, organization_id)`, `(property_listing_id, organization_id) -> property_listings(id, organization_id)` e `(reservation_id, organization_id) -> reservations(id, organization_id)`, todas `ON DELETE RESTRICT`, exceto `reservation_id` com `ON DELETE SET NULL` somente se PostgreSQL/versionamento permitir preservar `organization_id`; caso contrário, usar `ON DELETE RESTRICT`. Antes disso, criar `UNIQUE (id, organization_id)` nos três pais de forma idempotente.

Unicidade: `UNIQUE (organization_id, property_id, property_listing_id, ical_uid)`. `reservation_id` recebe índice único parcial `WHERE reservation_id IS NOT NULL`.

### `raw_emails`

| Coluna | Tipo/regras |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `organization_id` | `UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` |
| `provider` | `TEXT NOT NULL DEFAULT 'resend' CHECK IN ('resend')` |
| `provider_message_id` | `TEXT NOT NULL CHECK (btrim(provider_message_id) <> '')` |
| envelope | `recipient TEXT NOT NULL`, `sender TEXT NOT NULL`, `subject TEXT`, `received_at TIMESTAMPTZ NOT NULL` |
| conteúdo | `raw_content TEXT NOT NULL CHECK (octet_length(raw_content) > 0)` |
| estado | `processing_status TEXT NOT NULL DEFAULT 'pending' CHECK IN ('pending','processing','processed','retry','needs_review','rejected')` |
| retry/erro | `attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0)`, `last_error TEXT`, `processed_at TIMESTAMPTZ` |
| auditoria | `created_at`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` |

Unicidade: `UNIQUE (organization_id, provider_message_id)`. O corpo contém PII; usuários autenticados não recebem políticas de leitura/escrita nesta fase. Somente o backend confiável (`service_role`) opera a tabela.

### `email_extractions`

| Coluna | Tipo/regras |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `organization_id` | `UUID NOT NULL` |
| `raw_email_id` | `UUID NOT NULL` |
| `source_platform` | `TEXT NOT NULL CHECK IN ('airbnb','booking','vrbo')` |
| `confidence` | `NUMERIC(5,4) NOT NULL CHECK (confidence BETWEEN 0 AND 1)` |
| hóspede | `guest_name TEXT`, `guest_count INTEGER CHECK (guest_count > 0)` |
| estadia | `check_in DATE`, `check_out DATE`, `CHECK (check_in IS NULL OR check_out IS NULL OR check_out > check_in)` |
| financeiro | `total_value NUMERIC(14,2) CHECK (total_value >= 0)`, `currency TEXT CHECK (currency ~ '^[A-Z]{3}$')` |
| referência | `reservation_code TEXT`, `property_identifier_raw TEXT`, `raw_email_snippet TEXT` |
| matching | `matched_event_id UUID`, `match_status TEXT NOT NULL DEFAULT 'pending' CHECK IN ('pending','auto_matched','needs_review','no_match')` |
| auditoria | `created_at`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` |

FKs compostas: `(raw_email_id, organization_id) -> raw_emails(id, organization_id)` e `(matched_event_id, organization_id) -> calendar_events(id, organization_id)`. Criar `UNIQUE (id, organization_id)` nos pais. Unicidade `UNIQUE (organization_id, raw_email_id)` impede duas extrações finais para o mesmo e-mail; retries atualizam a mesma linha. Índice único parcial em `matched_event_id WHERE matched_event_id IS NOT NULL` impede duas extrações consumirem o mesmo evento.

### Ajustes em `reservations`

Preservar os nomes brownfield existentes: `number_of_guests`, `total_amount`, `source`, `guest_name`, `check_in`, `check_out` e `currency`. Não criar aliases físicos `guest_count`, `total_value` ou `source_platform`.

Adicionar nullable, para rollout compatível:

- `property_id UUID` (backfill derivável por `property_listing_id`, depois `NOT NULL` apenas em migration futura e após auditoria);
- `calendar_event_id UUID`;
- `email_extraction_id UUID`;
- `confirmed_by_host BOOLEAN NOT NULL DEFAULT false`.

Criar `UNIQUE (id, organization_id)` e FKs compostas para propriedade, evento e extração. Criar índices únicos parciais em `(organization_id, calendar_event_id)` e `(organization_id, email_extraction_id)` onde o vínculo não é nulo. Isso torna a criação consolidada idempotente mesmo sob concorrência; o serviço deve usar `INSERT ... ON CONFLICT` e transação, mas a garantia final fica no banco.

`extraction_corrections` pertence à Fase 6 e não deve ser criada na migration do Gate 0.

## Estratégia de migration segura e idempotente

Implementar em migration versionada, dentro de transação, nesta ordem:

1. preflight somente leitura: contar `organization_id IS NULL`, propriedades/listings divergentes, duplicidades de UID/vínculos e datas inválidas; qualquer resultado incompatível aborta antes do DDL;
2. criar constraints `UNIQUE (id, organization_id)` nos pais com nomes estáveis; em tabela grande, construir índice `UNIQUE CONCURRENTLY` fora da transação e anexar com `USING INDEX` em uma migration operacional separada;
3. criar tabelas novas com `CREATE TABLE IF NOT EXISTS`, mas validar também a definição pelo catálogo — `IF NOT EXISTS` não prova equivalência;
4. adicionar colunas nullable em `reservations` com `ADD COLUMN IF NOT EXISTS`; backfill de `property_id` em lotes a partir de `property_listings`;
5. adicionar FKs brownfield como `NOT VALID`, validar com `ALTER TABLE ... VALIDATE CONSTRAINT` após o backfill;
6. criar índices com nomes estáveis; em staging vazio/pequeno pode ser transacional, em produção usar `CREATE INDEX CONCURRENTLY` em migration sem transaction wrapper;
7. habilitar e forçar RLS nas tabelas novas, criar políticas explícitas e executar testes positivos/negativos;
8. somente após staging, executar os `EXPLAIN (ANALYZE, BUFFERS)` abaixo e guardar planos/evidências no Gate 0.

Todo bloco condicional de constraint deve consultar `pg_constraint` por schema+tabela+nome. Não usar `DROP`, mudança de tipo ou `SET NOT NULL` brownfield nesta entrega. O trigger `updated_at` existente pode ser reutilizado apenas se sua assinatura for confirmada; caso contrário, a aplicação atualiza `updated_at` até uma migration dedicada.

### Rollback

Antes de aplicar: snapshot lógico de schema e contagens/IDs dos vínculos. O rollback seguro desliga a feature flag de todas as organizações primeiro, interrompe writers novos, verifica que não existem reservas com os novos vínculos e então:

1. remove políticas e FKs/índices novos por nome com `IF EXISTS`;
2. remove tabelas novas somente se estiverem vazias ou após exportação auditável;
3. remove colunas adicionadas a `reservations` somente se todas forem nulas/default e nenhum consumidor depender delas.

Se já houver dados reconciliados, o rollback é **forward-fix**: manter schema/dados, desligar a flag e reverter apenas o roteamento da aplicação. Nunca apagar e-mails, extrações ou reservas reais automaticamente.

## RLS e testes de isolamento

Habilitar `ENABLE ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY` em `calendar_events`, `raw_emails` e `email_extractions`.

- `calendar_events`: `SELECT` para `authenticated` quando `organization_id = public.get_user_organization_id()`; mutações somente `service_role` no Gate 0.
- `email_extractions`: `SELECT` para a mesma organização; mutações somente `service_role` até a UI de revisão definir permissões explícitas.
- `raw_emails`: nenhuma policy para `authenticated`; acesso somente pelo backend com `service_role`, que deve sempre enviar e filtrar `organization_id` mesmo podendo ignorar RLS.
- não criar policy permissiva `USING (true)` para `anon` ou `authenticated`.

Matriz obrigatória em staging, usando JWTs reais (não `service_role`):

| Caso | Resultado esperado |
|---|---|
| usuário Org A seleciona eventos/extrações Org A | linhas da Org A |
| usuário Org A seleciona eventos/extrações Org B | zero linhas |
| usuário Org A tenta inserir/atualizar/deletar tabelas de pipeline | negado |
| usuário Org A seleciona `raw_emails` da própria organização | negado/zero linhas |
| `anon` seleciona qualquer tabela nova | negado/zero linhas |
| FK tenta ligar propriedade/evento/extração de Org B a registro Org A | violação de FK |

## Índices derivados dos acessos

```sql
CREATE INDEX idx_calendar_events_org_status_dates
  ON public.calendar_events (organization_id, status, check_in, check_out);
CREATE INDEX idx_email_extractions_org_status_dates
  ON public.email_extractions (organization_id, match_status, check_in, check_out);
CREATE INDEX idx_email_extractions_property_trgm
  ON public.email_extractions USING gin (property_identifier_raw gin_trgm_ops)
  WHERE property_identifier_raw IS NOT NULL;
CREATE INDEX idx_raw_emails_org_status_received
  ON public.raw_emails (organization_id, processing_status, received_at, id);
```

`pg_trgm` deve ser criado em schema de extensões conforme o padrão Supabase existente. O GIN trigram serve apenas ao shortlist já limitado por organização/status/datas; nunca executar fuzzy search global. Índices únicos/FKs descritos no schema completam a estratégia.

## EXPLAIN exato e gate objetivo

Preparar staging com pelo menos 10.000 linhas por tabela, no mínimo duas organizações, distribuição realista de status e datas, e executar `ANALYZE`. Substituir os UUIDs abaixo por fixtures conhecidas.

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT id, property_id, source_platform, check_in, check_out, ical_uid, raw_summary
FROM public.calendar_events
WHERE organization_id = '11111111-1111-1111-1111-111111111111'
  AND status = 'unmatched'
  AND check_in <= DATE '2026-08-11'
  AND check_out >= DATE '2026-08-09'
ORDER BY check_in, id
LIMIT 100;

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT id, source_platform, check_in, check_out, reservation_code, property_identifier_raw
FROM public.email_extractions
WHERE organization_id = '11111111-1111-1111-1111-111111111111'
  AND match_status = 'pending'
  AND check_in <= DATE '2026-08-11'
  AND check_out >= DATE '2026-08-09'
ORDER BY check_in, id
LIMIT 100;

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT id, similarity(property_identifier_raw, 'Apartamento Marina') AS score
FROM public.email_extractions
WHERE organization_id = '11111111-1111-1111-1111-111111111111'
  AND match_status = 'pending'
  AND check_in <= DATE '2026-08-11'
  AND check_out >= DATE '2026-08-09'
  AND property_identifier_raw % 'Apartamento Marina'
ORDER BY score DESC, id
LIMIT 3;

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT id
FROM public.raw_emails
WHERE organization_id = '11111111-1111-1111-1111-111111111111'
  AND processing_status IN ('pending', 'retry')
ORDER BY received_at, id
LIMIT 50;
```

Gate aprovado somente se, após `ANALYZE`: (a) os dois shortlists usam `idx_*_org_status_dates` por `Index Scan` ou `Bitmap Index Scan`; (b) fuzzy usa o GIN trigram além do filtro tenant/status/datas, sem scan global; (c) fila usa `idx_raw_emails_org_status_received`; (d) `Rows Removed by Filter` não indica leitura cross-tenant material; (e) nenhum plano faz `Seq Scan` das tabelas completas com ≥10.000 linhas; e (f) mediana de cinco execuções quentes é ≤50 ms em staging. Se o planner escolher seq scan por fixture pequena, o teste não vale: aumentar a massa; não usar `enable_seqscan = off` como evidência.

## Brownfield e feature flag

- schema novo pode existir para todas as organizações, mas writers/leitores novos só rodam quando a flag por `organization_id` estiver ativa;
- flag nasce `false`; Airbnb e Booking são os únicos valores habilitáveis no piloto; Vrbo permanece desativado até o Gate 7;
- sync iCal legado continua criando reservas quando flag está `false`; com flag `true`, o mesmo VEVENT faz upsert apenas em `calendar_events`;
- Gmail legado não cria `draft` para organização habilitada; Resend é o único writer de `raw_emails` nesse caminho;
- não há backfill histórico obrigatório; novos vínculos em `reservations` permanecem nullable;
- desligar a flag restaura o roteamento legado sem remover schema nem dados, mas o `provider_message_id`/UID deve continuar impedindo reprocessamento duplicado.

## Evidência exigida para encerrar Gate 0

Migration e rollback revisados, dry-run local, aplicação em staging, catálogo/constraints conferidos, matriz RLS positiva/negativa aprovada, quatro planos `EXPLAIN` anexados, contagens de preflight sem divergências e confirmação de feature flag desligada por padrão. Este documento não constitui aprovação do Gate 0: a evidência operacional ainda precisa ser executada e registrada na story.
