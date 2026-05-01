# Criação de Preços Stripe — 3 Mercados (EUR / BRL / USD)

**Data:** 2026-04-29 → 2026-05-01  
**Sessão:** Configuração inicial de billing multi-mercado  
**Ambientes:** Staging (`wrqjpyyopwgyqluqkcga`) + Production (`brjumbfpvijrkhrherpt`)

---

## Objetivo

Configurar no Stripe todos os produtos e preços necessários para comercializar o Lodgra em 3 mercados:

| Mercado | Moeda | Símbolo | País principal |
|---------|-------|---------|----------------|
| Brasil | BRL | R$ | Brasil |
| Europa | EUR | € | Portugal, Espanha |
| EUA / Internacional | USD | $ | Estados Unidos |

---

## Modelo de Billing Escolhido

**Per-unit + Metered hybrid** (modelo Stripe recomendado para SaaS com uso variável)

- **Per-unit:** Taxa mensal fixa por assinatura (independente do uso)
- **Metered:** Taxa variável baseada em eventos reportados (reservas ou receita)
- Planos com metered têm 2 subscription items: um per-unit + um metered
- Starter: apenas per-unit (sem metered)

---

## Produtos Criados no Stripe

### 1. Lodgra Starter (Essencial)

**Descrição:** Plano base para anfitriões individuais. Taxa fixa mensal, sem cobrança por uso.

| Moeda | Preço/mês | Price ID |
|-------|-----------|----------|
| EUR | €19 | `price_1TRrfE2cJshbnOoQyyf0WpTM` |
| BRL | R$59 | `price_1TRrZz2cJshbnOoQRp2gjkpi` |
| USD | $19 | `price_1TRrec2cJshbnOoQuK1jUJOV` |

---

### 2. Lodgra Growth (Expansão)

**Descrição:** Para hosts em crescimento. Taxa fixa + cobrança por reserva confirmada.

**Billing Meter:** `booking_fee`  
**Custo por reserva:** R$5 (BRL) | €2 (EUR) | $2 (USD)

| Moeda | Tipo | Preço | Price ID |
|-------|------|-------|----------|
| EUR | Per-unit | €49/mês | configurado |
| EUR | Metered | €2/reserva | configurado |
| BRL | Per-unit | R$89/mês | configurado |
| BRL | Metered | R$5/reserva | configurado |
| USD | Per-unit | $49/mês | configurado |
| USD | Metered | $2/reserva | configurado |

---

### 3. Lodgra Pro

**Descrição:** Para gestores profissionais. Taxa fixa + percentagem da receita gerada.

**Billing Meter:** `revenue_fee`  
**Custo por receita reportada:** 1% do valor

| Moeda | Tipo | Preço | Price ID |
|-------|------|-------|----------|
| EUR | Per-unit | €99/mês | configurado |
| EUR | Metered | 1% receita | configurado |
| BRL | Per-unit | R$130/mês | configurado |
| BRL | Metered | 1% receita | configurado |
| USD | Per-unit | $99/mês | configurado |
| USD | Metered | 1% receita | configurado |

---

## Billing Meters Configurados

### `booking_fee`

```
Nome: booking_fee
Tipo: sum (soma de eventos)
Usado por: Growth (Expansão)
Evento: cada reserva confirmada = 1 unidade
Custo: R$5/unidade (BRL) | €2/unidade (EUR) | $2/unidade (USD)
```

**Como reportar um evento:**
```typescript
await stripe.billing.meterEvents.create({
  event_name: 'booking_fee',
  payload: {
    stripe_customer_id: organization.stripe_customer_id,
    value: '1',
  },
})
```

### `revenue_fee`

```
Nome: revenue_fee
Tipo: sum (soma de valor monetário)
Usado por: Pro
Evento: receita total do período
Custo: 1% do valor reportado
```

**Como reportar um evento:**
```typescript
await stripe.billing.meterEvents.create({
  event_name: 'revenue_fee',
  payload: {
    stripe_customer_id: organization.stripe_customer_id,
    value: String(revenueAmountInCents),
  },
})
```

---

## Integração com a Base de Dados

Colunas adicionadas à tabela `organizations` (migration `20260429_03_billing_columns.sql`):

```sql
stripe_subscription_item_id TEXT  -- item per-unit do plano (si_xxx)
stripe_metered_item_id      TEXT  -- item metered do plano (si_xxx), NULL para Starter
billing_unit_count          INTEGER DEFAULT 1  -- nº de unidades licenciadas
```

O webhook `checkout.session.completed` armazena estes IDs após o pagamento.

---

## Resolução de Price IDs no Código

Ficheiro: `src/lib/billing/plans.ts`

A função `getPriceIdForPlan(plan, currency)` retorna o(s) Price ID(s) corretos com base no plano e na moeda. Exemplo:

```typescript
const priceIds = getPriceIdForPlan('growth', 'brl')
// Retorna: { perUnit: 'price_xxx', metered: 'price_xxx' }
```

A API `/api/stripe/checkout` chama esta função para construir os `line_items` da Checkout Session.

---

## Localização dos Preços na Landing Page

| Locale | Moeda | Plano exibido | Landing Component |
|--------|-------|---------------|-------------------|
| `/br` | BRL | Essencial R$59 / Expansão R$89 / Pro R$130 | `BrazilLanding.tsx` |
| `/pt` | EUR | Starter €19 / Growth €49 / Pro €99 | `LandingPageClient.tsx` |
| `/en-US` | USD | Starter $19 / Growth $49 / Pro $99 | `LandingPageClient.tsx` |
| `/es` | EUR | Starter €19 / Growth €49 / Pro €99 | `LandingPageClient.tsx` |

> A moeda é determinada pelo locale e passada como parâmetro `currency` na chamada ao checkout endpoint.

---

## Notas de Implementação

1. **Todos os Price IDs estão em variáveis de ambiente** — nunca hardcoded no código.
2. **Pro está desabilitado na UI** (`disabled` state no botão) — aguarda validação de mercado.
3. **EUR passthrough corrigido** — bug em `EuropeLanding.tsx` que convertia `pt` → `pt-BR` foi corrigido na v1.4.
4. **Garantia de 7 dias** incluída em todas as landing pages como elemento de confiança.
5. **Checkout Session** usa `mode: 'subscription'` com múltiplos `line_items` para planos com metered.

---

*Documento criado durante sessão 2026-04-29 → 2026-05-01*  
*Para detalhes completos de configuração, ver `docs/guides/STRIPE_BILLING_SETUP.md`*
