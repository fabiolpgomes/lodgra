# Remover Env Vars Legadas de Stripe

## 📋 Situação

O `.env.local` tem **19 env vars legadas** de planos antigos que podem ser removidas:

### ❌ Planos Legados (Remover)

**STARTER (3 vars):**
- STRIPE_PRICE_ID_STARTER_EUR
- STRIPE_PRICE_ID_STARTER_BRL
- STRIPE_PRICE_ID_STARTER_USD

**GROWTH (4 vars base + 3 metered = 7 vars):**
- STRIPE_PRICE_ID_GROWTH_EUR
- STRIPE_PRICE_ID_GROWTH_BRL
- STRIPE_PRICE_ID_GROWTH_USD
- STRIPE_PRICE_ID_GROWTH_METERED_EUR
- STRIPE_PRICE_ID_GROWTH_METERED_BRL
- STRIPE_PRICE_ID_GROWTH_METERED_USD

**PRO (4 vars base + 3 metered = 7 vars):**
- STRIPE_PRICE_ID_PRO_EUR
- STRIPE_PRICE_ID_PRO_BRL
- STRIPE_PRICE_ID_PRO_USD
- STRIPE_PRICE_ID_PRO_METERED_EUR
- STRIPE_PRICE_ID_PRO_METERED_BRL
- STRIPE_PRICE_ID_PRO_METERED_USD

**PROFESSIONAL (2 vars):**
- STRIPE_PRICE_ID_PROFESSIONAL_EUR
- STRIPE_PRICE_ID_PROFESSIONAL_BRL

**BUSINESS (2 vars):**
- STRIPE_PRICE_ID_BUSINESS_EUR
- STRIPE_PRICE_ID_BUSINESS_BRL

**Total: 19 vars legadas**

---

## ✅ Planos Modernos (Manter)

**NÃO estão em .env.local** — provavelmente estão no **Vercel Dashboard**:
- STRIPE_PRICE_ID_ESSENCIAL_EUR
- STRIPE_PRICE_ID_ESSENCIAL_BRL
- STRIPE_PRICE_ID_ESSENCIAL_USD
- STRIPE_PRICE_ID_EXPANSAO_EUR
- STRIPE_PRICE_ID_EXPANSAO_BRL
- STRIPE_PRICE_ID_EXPANSAO_USD
- STRIPE_PRICE_ID_PREMIUM_EUR
- STRIPE_PRICE_ID_PREMIUM_BRL
- STRIPE_PRICE_ID_PREMIUM_USD

**Meter Events (Manter):**
- STRIPE_METER_EVENT_EXPANSAO (era GROWTH)
- STRIPE_METER_EVENT_PREMIUM (era PRO)

---

## 🎯 Como Remover

### Opção A: Remover de `.env.local`

```bash
# Remover STARTER, GROWTH, PRO, PROFESSIONAL, BUSINESS
grep -v "STRIPE_PRICE_ID_\(STARTER\|GROWTH\|PRO\|PROFESSIONAL\|BUSINESS\)" .env.local > .env.local.tmp
mv .env.local.tmp .env.local
```

**Status**: Pode fazer já - não prejudica nada (vars modernas estão no Vercel)

### Opção B: Remover do Vercel Dashboard

1. Acesse: https://vercel.com/
2. Projeto: **home-stay**
3. Settings → Environment Variables
4. Buscar e remover (uma por uma):
   - `STRIPE_PRICE_ID_STARTER_*`
   - `STRIPE_PRICE_ID_GROWTH_*`
   - `STRIPE_PRICE_ID_GROWTH_METERED_*`
   - `STRIPE_PRICE_ID_PRO_*`
   - `STRIPE_PRICE_ID_PRO_METERED_*`
   - `STRIPE_PRICE_ID_PROFESSIONAL_*`
   - `STRIPE_PRICE_ID_BUSINESS_*`

**Status**: Recomendado - deixa env vars do Vercel limpo

---

## 📊 Env Vars Legadas

Total a remover: **19 vars**

```
STRIPE_PRICE_ID_STARTER_EUR="price_1TRrfE2cJshbnOoQyyf0WpTM"
STRIPE_PRICE_ID_STARTER_BRL="price_1TRrZz2cJshbnOoQRp2gjkpi"
STRIPE_PRICE_ID_STARTER_USD="price_1TRrec2cJshbnOoQuK1jUJOV"
STRIPE_PRICE_ID_GROWTH_EUR="price_1TRrnn2cJshbnOoQdGUeGiaU"
STRIPE_PRICE_ID_GROWTH_BRL="price_1TRrn12cJshbnOoQb7bZ8cVb"
STRIPE_PRICE_ID_GROWTH_USD="price_1TRrnT2cJshbnOoQ9oI5Vm7e"
STRIPE_PRICE_ID_GROWTH_METERED_EUR="price_1TRsK32cJshbnOoQirjMF8eB"
STRIPE_PRICE_ID_GROWTH_METERED_BRL="price_1TRrzA2cJshbnOoQEJOrgrvP"
STRIPE_PRICE_ID_GROWTH_METERED_USD="price_1TRs0Z2cJshbnOoQ7qfCnRrs"
STRIPE_PRICE_ID_PRO_EUR="price_1TRsHO2cJshbnOoQ1ZbX83gW"
STRIPE_PRICE_ID_PRO_BRL="price_1TRsEM2cJshbnOoQiep19bFO"
STRIPE_PRICE_ID_PRO_USD="price_1TRsGy2cJshbnOoQBLFHPCcI"
STRIPE_PRICE_ID_PRO_METERED_EUR="price_1TRsK32cJshbnOoQirjMF8eB"
STRIPE_PRICE_ID_PRO_METERED_BRL="price_1TRsIo2cJshbnOoQb2wnbea4"
STRIPE_PRICE_ID_PRO_METERED_USD="price_1TRsJV2cJshbnOoQlZug8R0M"
STRIPE_PRICE_ID_PROFESSIONAL_EUR="price_1TCdI62cJshbnOoQrRkKlbQC"
STRIPE_PRICE_ID_PROFESSIONAL_BRL="price_1TCfGD2cJshbnOoQjbKjWmZR"
STRIPE_PRICE_ID_BUSINESS_EUR="price_1TCdI62cJshbnOoQrRkKlbQC"
STRIPE_PRICE_ID_BUSINESS_BRL="price_1TCfGh2cJshbnOoQYdqc60yY"
```

---

## ⚠️ Nota Importante

**Não remova do `.env.local` que você precisa para local dev!**

Se precisar das vars localmente para testar:
1. Mantenha o `.env.local`
2. Remova apenas do Vercel Dashboard
3. O código não as usa de qualquer forma (foram removidas da lógica)

---

## ✅ Checklist

- [ ] Remover de `.env.local` (opcional para dev)
- [ ] Remover do Vercel Dashboard (recomendado)
- [ ] Verificar que ESSENCIAL, EXPANSAO, PREMIUM estão no Vercel
- [ ] Deploy e test

