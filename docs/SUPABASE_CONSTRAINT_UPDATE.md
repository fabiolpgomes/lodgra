# Atualizar Constraint de Planos - Supabase

## 🎯 Objetivo
Adicionar o novo plano `development` à constraint `organizations_subscription_plan_check` do Supabase.

## 📋 Instruções

### 1️⃣ Abrir SQL Editor
- Acesse: https://app.supabase.com/
- Projeto: **Algarve Home Stay** (brjumbfpvijrkhrherpt)
- Menu: **SQL Editor** → **New Query**

### 2️⃣ Cole o SQL abaixo (TODO EM UMA VEZ)

```sql
-- Remove constraint antiga
ALTER TABLE public.organizations 
DROP CONSTRAINT IF EXISTS organizations_subscription_plan_check;

-- Cria constraint nova com planos modernos + development
ALTER TABLE public.organizations
ADD CONSTRAINT organizations_subscription_plan_check
CHECK (subscription_plan IN (
  'essencial',
  'expansao',
  'premium',
  'enterprise',
  'development'
));

-- Atualiza Algarve Home Stay para plano development (99 propriedades)
UPDATE public.organizations
SET subscription_plan = 'development'
WHERE name = 'Algarve Home Stay';

-- Verifica a atualização
SELECT id, name, subscription_plan 
FROM public.organizations
WHERE name = 'Algarve Home Stay';
```

### 3️⃣ Clique em **Run**

### ✅ Resultado Esperado

```
id      | name              | subscription_plan
--------|-------------------|-------------------
xxxxx   | Algarve Home Stay | development
```

---

## 📊 Resultado Final

**Algarve Home Stay terá:**
- ✅ Plano: `development`
- ✅ Limite: **99 propriedades**
- ✅ Status: **Laboratório de testes ativo**

A métrica na página de propriedades mostrará:
```
Total de Propriedades: 10 / 99  ✅
```

---

## ⚠️ Notas Importantes

1. **Sem risco**: Constraint apenas adiciona `development` aos valores válidos
2. **Sem impacto**: Outras organizações continuam funcionando normalmente
3. **Reversível**: Se necessário, pode remover `development` da constraint depois
4. **Stripe**: EUR e BRL continuam funcionando sem mudanças

---

## Próximo Passo (Opcional)

Após atualizar a constraint, você pode remover as env vars legadas:

```bash
# Remover do .env (opcional - apenas cleanup)
STRIPE_PRICE_ID_STARTER_EUR
STRIPE_PRICE_ID_STARTER_BRL
STRIPE_PRICE_ID_STARTER_USD
STRIPE_PRICE_ID_GROWTH_EUR
STRIPE_PRICE_ID_GROWTH_BRL
STRIPE_PRICE_ID_GROWTH_USD
# ... etc
```

Mas o código já não os usa, então é apenas limpeza.
