# Epic 15 — Integração API Booking.com (Canal Direto + Dados Completos)

**Tipo:** Brownfield Enhancement  
**PM:** Morgan (Strategist)  
**Prioridade:** 🔴 Máxima  
**Estado:** Planeado  
**Criado em:** 2026-04-29  

---

## Epic Goal

Substituir a sincronização iCal com Booking.com por integração via API oficial, passando a receber reservas com dados completos (nome do hóspede, contacto, valor, status) em tempo real via webhooks — eliminando 100% do input manual e habilitando automações operacionais.

---

## Contexto do Sistema Existente

- **Stack:** Next.js 16.2.3, Supabase (PostgreSQL + RLS), Vercel, Stripe
- **Sync atual:** iCal via `/api/cron/sync-ical` — recebe apenas datas (check-in / check-out)
- **Webhook existente (parcial):** `/api/webhooks/booking/reservation` — rota existe mas não processa dados da API oficial
- **Modelo de dados atual:** tabela `reservations` sem `external_id`, `channel_id`, `guest_id`, `raw_data`
- **Autenticação:** Supabase RLS com `user_profiles` e `organizations`
- **Pagamentos:** Stripe (reservas diretas via `/p/[slug]`)

---

## O Problema Real

O iCal envia **apenas blocos de datas**. Booking.com, Airbnb e outros OTAs omitem deliberadamente:

| Campo | iCal | API Oficial |
|---|---|---|
| Nome do hóspede | ❌ | ✅ |
| Email / telefone | ❌ | ✅ |
| Valor da reserva | ❌ | ✅ |
| Comissão / taxas | ❌ | ✅ |
| Status (confirmado, cancelado) | ❌ | ✅ |
| Alterações em tempo real | ❌ | ✅ via webhook |

**Impacto:** utilizadores inserem manualmente 5-10 campos por reserva. Com 20+ reservas/mês = horas de trabalho desperdiçadas.

---

## Enhancement Details

**O que vai ser adicionado:**

1. **Schema multi-channel** — tabelas `channels`, `channel_listings`, `guests` + colunas novas em `reservations`
2. **Webhook listener completo** — recebe, valida (idempotência) e processa eventos do Booking.com
3. **Pull engine** — sincronização inicial de reservas históricas via API pull

**Como integra com o sistema existente:**

- Schema Supabase via migração (backward compatible — colunas novas, sem alterar existentes)
- Webhook `/api/webhooks/booking/reservation` já existe — substituir stub por implementação real
- `reservations` table mantém estrutura existente + novos campos opcionais
- iCal sync mantido como fallback para propriedades sem API configurada

**Critérios de sucesso:**

- [ ] Nova reserva no Booking.com aparece automaticamente no dashboard em < 30 segundos
- [ ] Campos preenchidos: nome hóspede, valor, status, datas
- [ ] Zero input manual necessário para reservas via Booking.com
- [ ] iCal continua funcional para outros canais (Airbnb temporário)
- [ ] Sem regressões nas reservas diretas (canal `/p/[slug]`)

---

## Stories

### Story 15.1 — Schema Multi-Channel (Base de Dados)
**Descrição:** Estender o schema Supabase com modelo multi-channel: novas tabelas `channels`, `channel_listings`, `guests` e colunas adicionais em `reservations` (`external_id`, `channel_id`, `guest_id`, `raw_data`, `source`).

**Predicted Agents:** @dev, @db-sage (mudanças de schema com RLS)

**Quality Gates:**
- Pre-Commit: Validar RLS policies nas novas tabelas, service filters, foreign keys
- Pre-PR: Migration safety check (backward compatible), rollback script

**Acceptance Criteria:**
- [ ] Migração cria tabelas `channels`, `channel_listings`, `guests`
- [ ] `reservations` tem colunas `external_id`, `channel_id` (fk), `guest_id` (fk), `raw_data` (jsonb), `source`
- [ ] RLS policies aplicadas nas novas tabelas (mesmo padrão das existentes)
- [ ] Seed: canal "booking" e canal "direct" inseridos em `channels`
- [ ] Rollback script documentado
- [ ] Reservas existentes não afectadas (colunas novas nullable)

**Risco:** BAIXO — colunas nullable, sem breaking changes

---

### Story 15.2 — Webhook Listener Booking.com
**Descrição:** Implementar o processamento completo do endpoint `/api/webhooks/booking/reservation` para receber e processar eventos da API oficial do Booking.com: criação, modificação e cancelamento de reservas, com idempotência e validação de assinatura.

**Predicted Agents:** @dev, @architect (padrão de webhook + idempotência)

**Quality Gates:**
- Pre-Commit: Security scan (validação de assinatura HMAC), input validation, error handling
- Pre-PR: Testes de idempotência (mesmo evento 2x não duplica reserva), testes de cancelamento

**Acceptance Criteria:**
- [ ] Endpoint valida assinatura do Booking.com (HMAC-SHA256)
- [ ] Idempotência: evento repetido retorna 200 sem duplicar dados
- [ ] Cria/atualiza `guest` (upsert por email ou nome)
- [ ] Cria/atualiza `reservation` com todos os campos disponíveis
- [ ] Guarda `raw_data` (jsonb) com payload completo
- [ ] Retorna 200 em < 3 segundos (Booking.com tem timeout curto)
- [ ] Logs de erro estruturados (Sentry)
- [ ] Funciona em modo sandbox (credenciais de teste)

**Risco:** MÉDIO — integração externa, validação de assinatura crítica para segurança

---

### Story 15.3 — Pull Sync & Painel de Configuração de Canal
**Descrição:** Implementar sincronização inicial (pull) de reservas históricas via API Booking.com e criar interface no dashboard para o utilizador configurar as credenciais do canal e mapear propriedades aos listings externos (`channel_listings`).

**Predicted Agents:** @dev, @architect (padrão de sync engine)

**Quality Gates:**
- Pre-Commit: Validação de credenciais antes de guardar, erro handling de API externa
- Pre-PR: Testes de sincronização completa (sandbox), verificar que iCal fallback mantém-se activo
- Pre-Deployment: Smoke test em produção com propriedade real

**Acceptance Criteria:**
- [ ] Página de configuração: `/[locale]/settings/channels` (ou integrada em Settings)
- [ ] Utilizador introduz `property_id` e `api_key` do Booking.com
- [ ] Sistema valida credenciais antes de guardar
- [ ] Pull inicial importa reservas dos últimos 90 dias
- [ ] Indicador visual: "último sync", "X reservas importadas"
- [ ] iCal sync mantém-se activo para canais sem API configurada
- [ ] Botão "Sincronizar agora" (pull manual)

**Risco:** MÉDIO — UI nova + integração API externa. Feature flag recomendada para rollout gradual.

---

## Compatibility Requirements

- [ ] API routes existentes (`/api/cron/sync-ical`, `/api/reservations/*`) sem alterações
- [ ] Schema changes backward compatible (colunas nullable, sem remover existentes)
- [ ] UI do dashboard existente sem regressões
- [ ] Reservas diretas via Stripe (`/p/[slug]`) continuam funcionais
- [ ] RLS policies seguem padrão existente do projecto

---

## Risk Mitigation

**Risco Principal:** Credenciais de API expostas ou webhook sem validação de assinatura → reservas falsas injectadas

**Mitigação:**
- Credenciais guardadas como environment variables no Vercel (nunca em DB)
- Validação HMAC obrigatória em Story 15.2
- Webhook em modo sandbox durante desenvolvimento

**Rollback Plan:**
- Story 15.1: Migration reversível (DROP TABLE / DROP COLUMN)
- Story 15.2: Endpoint pode ser desactivado via env var (`BOOKING_WEBHOOK_ENABLED=false`)
- Story 15.3: Feature flag no dashboard (`BOOKING_CHANNEL_ENABLED=false`)
- iCal sync mantém-se activo como fallback em qualquer momento

---

## Prerequisite (Fora do Scope Técnico)

Antes de Story 15.3 ir para produção:

**Aplicar ao Booking.com Connectivity Partner Program:**
- URL: https://connectivity.booking.com
- Posicionar como "automation platform for short-term rental managers"
- Ter Story 15.1 e 15.2 completas (demonstrar capacidade técnica)
- Credenciais sandbox disponíveis imediatamente após aprovação inicial

---

## Definition of Done

- [ ] Stories 15.1, 15.2, 15.3 concluídas com acceptance criteria cumpridos
- [ ] Nova reserva Booking.com → dashboard em < 30s (sandbox validado)
- [ ] Zero regressões nas features existentes
- [ ] Documentação de configuração para o utilizador
- [ ] Monitoring activo (Sentry alerts para falhas de webhook)

---

## Sequência de Execução

```
Story 15.1 (Schema) → Story 15.2 (Webhook) → [Aplicar Connectivity Program] → Story 15.3 (Pull + UI)
```

15.1 e 15.2 podem ser executadas em paralelo após 15.1 estar em staging.

---

## Handoff para @sm

> **Para River (Story Manager):**
> 
> Criar stories detalhadas para o Epic 15 com base nas 3 stories acima.
> Stack: Next.js 16 (App Router), Supabase, TypeScript, Tailwind CSS v4.
> Padrões existentes: API routes em `/src/app/api/`, componentes em `/src/components/`, migrations em `/supabase/migrations/`.
> RLS crítico: todas as tabelas novas precisam de policies seguindo o padrão de `organizations` do projecto.
> Story 15.1 é prerequisito de 15.2 e 15.3.
> Prioridade máxima — bloqueia monetização real do produto.
