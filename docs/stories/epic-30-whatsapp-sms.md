# Epic 30 — WhatsApp/SMS Automated Operations

**Produto:** Lodgra  
**PM:** Morgan  
**Criado em:** 2026-05-20  
**Status:** Draft  
**Planos:** Expansão + Premium (add-on disponível para Essential)

---

## Visão Geral

Automatização de comunicações operacionais via WhatsApp Cloud API. O sistema envia mensagens automáticas nos momentos críticos da jornada da reserva: código de check-in, reminder de checkout, e trigger de limpeza. O gestor edita os templates no painel.

---

## O que já existe (reaproveitado)

| Recurso | Localização | Uso |
|---------|-------------|-----|
| Sistema de reservas | `reservations` table | Triggers de envio |
| Email via Resend | `src/lib/email/` | Fallback se WhatsApp falhar |
| Webhook infrastructure | `/api/stripe/webhooks/` | Padrão para webhooks |
| i18n (PT-BR + ES) | `messages/` | Templates multilíngues |

---

## Regra de Negócio — Endereço Obrigatório

> **PRIMORDIAL:** Todas as mensagens automáticas DEVEM incluir o **Título da Propriedade** (`property_name`) e o **Endereço Completo** (`property_address`). Esta regra aplica-se a hóspedes, cleaners e gestores, sem excepção.

O endereço composto é: `{address}, {city} {postal_code} — {country}`  
Campos disponíveis na tabela `properties`: `name`, `address`, `city`, `postal_code`, `country`.

---

## Canais suportados

| Canal | Prioridade | Status |
|-------|-----------|--------|
| WhatsApp Cloud API | Primário | A implementar (30.1) |
| Resend (email) | Fallback | Já existe |
| Twilio SMS | Futuro | Fora do scope desta epic |

---

## Monetização

| Plano | Acesso |
|-------|--------|
| Essential | ❌ Bloqueado (add-on disponível) |
| Expansão | ✅ Incluído |
| Premium | ✅ Incluído |

---

## Stories

| Story | Título | Prioridade | Pontos |
|-------|--------|-----------|--------|
| 30.1 | WhatsApp Cloud API: Integração + Webhook | P0 | 8 |
| 30.2 | Template Manager: Editor de mensagens pelo gestor | P1 | 5 |
| 30.3 | Check-in Code: Envio automático de código de acesso | P1 | 5 |
| 30.4 | Checkout Reminder: Reminder automático 24h antes | P1 | 3 |
| 30.5 | Post-Checkout Cleaning Trigger: Notificar cleaner | P2 | 3 |
| 30.6 | Premium Add-on Gate: Feature flag + billing | P2 | 3 |

**Total:** 27 pontos (~3 semanas)

---

## Dependências

- **Epic 29 (30.5)** — Cleaner Portal para trigger de limpeza
- **Epic 12** (Stripe) — Story 30.6 depende da infra de billing
- **Facebook/Meta Business Account** — Necessário para WhatsApp Cloud API approval
- **Templates pré-aprovados** — WhatsApp exige aprovação de templates antes do envio

---

## Pré-requisitos Externos (Acção do Cliente)

1. Conta Meta Business verificada
2. WhatsApp Business Account (WABA) aprovada
3. Phone number registado no WABA
4. Templates de mensagem aprovados pela Meta (pode levar 24-48h)
5. `WHATSAPP_ACCESS_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID` no Vercel

---

## Métricas de Sucesso

- Taxa de entrega de mensagens WhatsApp ≥ 95%
- Redução de chamadas de suporte sobre check-in ≥ 40%
- NPS de hóspedes com check-in automático vs manual
