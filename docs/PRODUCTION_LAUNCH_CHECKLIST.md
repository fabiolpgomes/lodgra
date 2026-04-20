# 🚀 Lodgra — Production Launch Checklist

**Data:** 2026-04-20  
**Status:** PRONTO PARA PRODUÇÃO (code freeze activo)

---

## 1. Supabase — Migrações SQL

Executar em ordem no dashboard do projeto Supabase **de produção**:

```
Supabase Dashboard → SQL Editor → (executar cada ficheiro abaixo)
```

Migrações pendentes (ainda não aplicadas em produção):

| Ficheiro | Descrição |
|----------|-----------|
| `20260413_01_sync_to_platforms.sql` | Sync de plataformas externas |
| `20260415_01_fix_sync_logs_fk.sql` | Fix FK nos logs de sync |
| `20260417_01_fix_property_currency_by_country.sql` | Currency por país |
| `20260419_01_cleaning_checklists.sql` | Tabelas de limpeza (nova feature) |
| `20260419_02_add_asaas_fields.sql` | Campos Asaas nas reservas |
| `20260419_03_asaas_config.sql` | Config Asaas nas organizações |

> **Nota:** Executar pela CLI é mais seguro:
> ```bash
> supabase db push --db-url "postgresql://..."
> ```

---

## 2. Vercel — Variáveis de Ambiente

Em **Vercel → Project → Settings → Environment Variables** (scope: Production):

### Obrigatórias

| Variável | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase prod |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key Supabase prod |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key Supabase prod |
| `STRIPE_SECRET_KEY` | `sk_live_...` (chave live) |
| `STRIPE_PRICE_ID` | Price ID do plano no Stripe live |
| `STRIPE_WEBHOOK_SECRET` | Secret do webhook Stripe (subscription) |
| `STRIPE_BOOKING_WEBHOOK_SECRET` | Secret do webhook Stripe (bookings) |
| `RESEND_API_KEY` | API key Resend produção |
| `EMAIL_FROM` | `Lodgra <info@lodgra.io>` |
| `EMAIL_ADMIN` | `admin@lodgra.io` |
| `NEXT_PUBLIC_APP_URL` | `https://lodgra.io` |
| `NEXT_PUBLIC_MONTHLY_PRICE` | `97` |
| `CRON_SECRET` | Secret aleatório (openssl rand -base64 32) |

### Opcionais (Rate Limiting)

| Variável | Valor |
|----------|-------|
| `UPSTASH_REDIS_REST_URL` | URL Redis Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | Token Redis Upstash |

---

## 3. Stripe — Configurar Webhooks

### 3.1 Webhook de Subscriptions (planos Lodgra)

```
Stripe Dashboard → Developers → Webhooks → Add endpoint
URL: https://lodgra.io/api/webhooks/stripe
Events:
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_succeeded
  - invoice.payment_failed
```

Copiar o `Signing secret` → colocar em `STRIPE_WEBHOOK_SECRET` no Vercel.

### 3.2 Webhook de Bookings (checkout de reservas)

```
URL: https://lodgra.io/api/webhooks/stripe/booking
Events:
  - checkout.session.completed
  - payment_intent.payment_failed
```

Copiar o `Signing secret` → colocar em `STRIPE_BOOKING_WEBHOOK_SECRET` no Vercel.

---

## 4. Asaas — Configurar Webhook (por organização)

O webhook Asaas é configurado **por organização** no painel Asaas de cada cliente.

```
Asaas Dashboard → Integrações → Webhooks → Adicionar
URL: https://lodgra.io/api/webhooks/asaas
Eventos: PAYMENT_RECEIVED, PAYMENT_CONFIRMED
```

> A validação é feita automaticamente: o Asaas envia o header `asaas-access-token`
> com a API key da conta. O Lodgra verifica contra o valor guardado na tabela
> `organizations.asaas_api_key`. Sem necessidade de secret global.

---

## 5. Domínio

```
Vercel → Project → Settings → Domains → Add
Domain: lodgra.io
```

Configurar DNS no registar:
```
A     @      76.76.21.21   (Vercel IP)
CNAME www    cname.vercel-dns.com
```

Aguardar propagação DNS (até 24h) e verificar HTTPS automático.

---

## 6. Deploy

```bash
# Garantir que está na branch main com tudo committed
git status
git push origin main

# Vercel faz deploy automático ao push para main
# Verificar em: https://vercel.com/dashboard
```

---

## 7. Smoke Tests pós-deploy

- [ ] `https://lodgra.io` carrega (landing page PT)
- [ ] `https://lodgra.io/pt-BR` carrega (landing page BR)
- [ ] `https://lodgra.io/en-US` carrega (landing page EN)
- [ ] `https://lodgra.io/es` carrega (landing page ES)
- [ ] `/login` funciona
- [ ] `/register` funciona e cria conta
- [ ] Dashboard carrega após login
- [ ] Criar reserva de teste → confirmar no banco de dados
- [ ] Webhook Stripe → testar com `stripe trigger checkout.session.completed`
- [ ] Webhook Asaas → testar com payload de teste

---

## ⚠️ Pontos de Atenção

1. **Asaas HMAC** — Implementado em `src/app/api/webhooks/asaas/route.ts`. Valida o token por organização via DB.
2. **Pricing** — Verificar que os Price IDs do Stripe live correspondem ao plano correto (R$97/R$297/R$497 para BRL, equivalente EUR para PT/ES).
3. **Email FROM** — Domínio `lodgra.io` precisa de SPF/DKIM configurado no Resend antes do envio de emails em produção.
4. **RLS** — Todas as tabelas novas (cleaning_checklists, etc.) têm RLS activo pelas migrações. Verificar após aplicar.
