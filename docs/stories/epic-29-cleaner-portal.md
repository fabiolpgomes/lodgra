# Epic 29 — Cleaner Operations Portal

**Produto:** Lodgra  
**PM:** Morgan  
**Criado em:** 2026-05-20  
**Status:** Draft  
**Planos:** Expansão + Premium (add-on disponível para Essential)

---

## Visão Geral

Mini-app mobile-first para cleaners (limpadores) gerirem as suas tarefas de limpeza sem precisarem de acesso ao sistema de gestão principal.

O gestor atribui tarefas de limpeza a cleaners por reserva/propriedade. O cleaner recebe notificação via WhatsApp com link de acesso, vê a lista de tarefas, preenche checklists e faz upload de fotos como prova de conclusão. O gestor acompanha em tempo real.

---

## O que já existe (reaproveitado)

| Recurso | Localização | Uso |
|---------|-------------|-----|
| Upload de ficheiros (Supabase Storage) | `src/app/api/expenses/[id]/documents/` | Base para photo upload |
| RBAC com `guest_type` | `user_profiles.guest_type` | Novo tipo: `cleaner` |
| Multi-tenant (`organization_id`) | Todas as tabelas | Isolamento de dados |
| Supabase Realtime | Infra existente | Status em tempo real |
| Mobile-first (Tailwind) | Todo o sistema | UI base |
| Roles: `admin`, `gestor`, `viewer`, `guest` | RBAC existente | Cleaners como `guest/cleaner` |

---

## Regra de Negócio — Endereço Obrigatório

> **PRIMORDIAL:** Todas as notificações enviadas ao cleaner DEVEM incluir o **Título da Propriedade** e o **Endereço Completo**. O cleaner precisa de saber exactamente onde ir.

---

## Monetização

| Plano | Acesso |
|-------|--------|
| Essential | ❌ Bloqueado (add-on disponível: +R$XX/mês) |
| Expansão | ✅ Incluído |
| Premium | ✅ Incluído |

---

## Stories

| Story | Título | Prioridade | Pontos |
|-------|--------|-----------|--------|
| 29.1 | Database Foundation: Schema de limpeza | P0 | 3 |
| 29.2 | Cleaner Access: Autenticação via WhatsApp link | P0 | 5 |
| 29.3 | Cleaner Dashboard: Vista mobile de tarefas | P1 | 5 |
| 29.4 | Checklist Engine: Templates configuráveis pelo gestor | P1 | 8 |
| 29.5 | Photo Upload: Prova de limpeza em tempo real | P1 | 5 |
| 29.6 | Notificações WhatsApp ao cleaner | P2 | 5 |
| 29.7 | Manager View: Dashboard de status de limpeza | P2 | 5 |
| 29.8 | Premium Gate: Feature flag + add-on billing | P2 | 3 |

**Total:** 39 pontos (~4-5 semanas)

---

## Dependências

- **Epic 30** (WhatsApp API) — Story 29.6 depende de 30.1
- **Epic 12** (Stripe) — Story 29.8 depende da infra de billing
- **Supabase Storage** — já configurado

---

## Métricas de Sucesso

- % de tarefas concluídas com checklist preenchido ≥ 80%
- Tempo médio de reporte de limpeza < 5 min
- Adoção por gestoras com cleaners externos ≥ 60% nos primeiros 90 dias
