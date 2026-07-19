# ADR 0381: Decisões da Fase 0 para reconciliação e-mail ↔ iCal

**Status:** Aceita  
**Data:** 2026-07-19  
**Story:** 38.1 — Reconciliação Automática E-mail ↔ iCal  
**Responsável:** Aria (`@architect`)

## Contexto

A Story 38.1 introduz um estágio de eventos iCal, um estágio de e-mails brutos, extração via LLM e reconciliação determinística antes da criação da reserva consolidada. A base brownfield possui três divergências relevantes:

- o isolamento multi-tenant consolidado usa `organization_id`, enquanto a especificação usa `tenant_id`;
- o fluxo de e-mail existente usa Gmail OAuth/polling e cria diretamente uma reserva `draft`;
- o sync iCal persiste reservas diretamente em `reservations` e bloqueios em `calendar_blocks`; `unified_calendar_events` é uma view de leitura, não um estágio reconciliável.

As decisões abaixo resolvem somente essas incompatibilidades. O desenho físico de tabelas, índices, constraints, triggers e RLS deve ser detalhado e validado por `@data-engineer`.

## Decisão 1: `organization_id` é a chave canônica do tenant

`tenant_id` da especificação é um nome conceitual. No schema e no código Lodgra ele deve ser materializado como `organization_id UUID NOT NULL REFERENCES organizations(id)`.

Não será criada uma coluna `tenant_id` paralela. Todas as novas tabelas da story usarão `organization_id`, e filtros, unicidade, índices compostos e políticas RLS devem incluir ou derivar inequivocamente essa organização.

### Consequências

- Mantém uma única fronteira de tenancy e reutiliza `get_user_organization_id()`.
- Os índices pedidos como `(tenant_id, check_in, check_out)` tornam-se `(organization_id, check_in, check_out)`.
- Interfaces da feature podem usar o termo de domínio `tenant`, mas a persistência e os contratos internos usam `organization_id`.

## Decisão 2: Resend Inbound é a entrada canônica da feature

O caminho novo usará Resend Inbound, coerente com o provedor de e-mail já instalado no projeto. O evento `email.received` deve chegar a uma rota dedicada. A rota deve:

1. ler o corpo HTTP bruto e verificar a assinatura do webhook antes de confiar no payload;
2. aceitar somente o evento inbound esperado;
3. resolver a organização exclusivamente pelo destinatário dedicado;
4. recuperar o conteúdo completo pela Receiving API, pois o webhook transporta metadados, não o corpo;
5. persistir `raw_emails` e confirmar essa gravação antes de enfileirar extração;
6. deduplicar por identificador imutável do provedor dentro da organização.

O endereço funcional exigido continua `reservas+{organization_id}@lodgra.io`. A configuração de MX/encaminhamento deve preservar esse contrato sem substituir inadvertidamente o serviço de correio existente do domínio. A escolha operacional entre MX direto e encaminhamento é parte do Gate 1 e deve ser comprovada pelo teste de recebimento.

### Compatibilidade com Gmail OAuth

O Gmail OAuth/polling existente pode continuar disponível para organizações fora da feature flag, mas não é uma segunda entrada do pipeline novo. Para organizações com a Story 38.1 habilitada, o fluxo legado não pode criar reserva `draft` a partir do mesmo e-mail. Essa separação evita processamento duplicado e elimina o fallback atual que associa uma extração ao primeiro imóvel da organização.

## Decisão 3: `calendar_events` é staging canônico de VEVENTs

Será criada a tabela `calendar_events` exigida pela especificação. Ela representa o fato recebido do feed iCal antes de existir uma reserva consolidada.

- `calendar_events` não é substituída por `unified_calendar_events`, pois esta é uma projeção de leitura.
- `calendar_events` não é substituída por `calendar_blocks`, pois bloqueio operacional e candidato a reserva possuem ciclos de vida diferentes.
- `reservations` continua sendo o agregado final consumido pelo produto, mas deixa de ser o primeiro registro criado pelo iCal no fluxo habilitado.

O sync iCal deve normalizar e fazer upsert do VEVENT em `calendar_events`, preservando UID, resumo bruto, plataforma, imóvel, organização e datas. A chave idempotente deve incluir a fronteira organizacional e a identidade do feed/imóvel além do `ical_uid`; o desenho exato da constraint pertence ao Gate de dados.

Somente o serviço de reconciliação pode criar ou vincular a reserva consolidada para esse novo caminho. Eventos classificados inequivocamente como bloqueios operacionais continuam em `calendar_blocks` e não participam do matching de reservas.

### Migração brownfield

A alteração será protegida pela feature flag da Fase 7 desde o início:

- organizações sem flag mantêm o comportamento iCal atual;
- organizações com flag fazem upsert em `calendar_events` e seguem validação/reconciliação antes da consolidação;
- os dois caminhos não podem criar reservas para o mesmo evento;
- o rollout não exige backfill de reservas históricas para iniciar o piloto; somente novos eventos dentro da janela operacional entram no pipeline novo.

## Fluxo resultante

```text
Resend Inbound -> webhook verificado -> raw_emails -> extração LLM
                                                     |
                                                     v
iCal sync -> calendar_events ----------------> validação determinística
                                                     |
                                                     v
                                                reconciliação
                                                     |
                              +----------------------+------------------+
                              |                      |                  |
                         auto_matched           needs_review         no_match
                              |                      |                  |
                              +-----------> reservations <---- confirmação
```

Nenhum caminho pode executar `auto_matched` sem passar pela validação determinística da Fase 3.

## Evidência consultada

- `supabase/migrations/20260309010000_email_parsing.sql`
- `supabase/migrations/20260325020000_add_organization_id_to_tables.sql`
- `src/app/api/cron/email-parser/route.ts`
- `src/app/api/cron/sync-ical/route.ts`
- `src/app/api/sync/import/route.ts`
- `src/types/database.ts`
- Story 38.1 e sua especificação normativa
- Documentação oficial do Resend para Receiving e verificação de webhooks

## Handoff

1. `@data-engineer`: detalhar migration, constraints, RLS, índices e planos `EXPLAIN ANALYZE` conforme estas fronteiras.
2. `@po`: validar a Story 38.1 com este ADR como resolução dos conflitos da Fase 0.
3. `@dev`: implementar somente após a story sair de `Draft`, respeitando os gates sequenciais.
