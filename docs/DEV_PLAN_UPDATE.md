# Atualização do Plano Development para Algarve Home Stay

## Status

✅ **Código:** Implementado e testado
⏳ **Banco de dados:** Aguardando execução manual no Supabase Dashboard

## O Que Foi Feito

### Código (Completo)
- ✅ Adicionado novo tipo de plano `'development'` em `src/lib/billing/plans.ts`
- ✅ Limite: **99 propriedades** (perfeito para laboratório de testes)
- ✅ Sem custos Stripe (não é um plano comercial)
- ✅ Atualizado `PlanManagement.tsx` com label 'Development (Lab)'
- ✅ Adicionado `PLAN_DISPLAY` para documentação
- ✅ Criada migração Supabase: `20260731000004_add_development_plan.sql`

### Banco de Dados (Aguardando)
A constraint `organizations_subscription_plan_check` precisa ser atualizada para aceitar o novo plano.

## Próximos Passos (Manuais)

### 1. Abrir Supabase SQL Editor
- Ir para: https://app.supabase.com/
- Projeto: `Algarve Home Stay` (brjumbfpvijrkhrherpt)
- Menu: `SQL Editor` → `New Query`

### 2. Executar SQL para Remover Constraint Antigo
```sql
ALTER TABLE public.organizations 
DROP CONSTRAINT IF EXISTS organizations_subscription_plan_check;
```

### 3. Adicionar Constraint com Novo Plano
```sql
ALTER TABLE public.organizations
ADD CONSTRAINT organizations_subscription_plan_check
CHECK (
  subscription_plan IN (
    'essencial', 'expansao', 'premium', 'enterprise',
    'starter', 'growth', 'professional', 'business', 'pro',
    'development'
  )
);
```

### 4. Atualizar Organização para Development Plan
```sql
UPDATE public.organizations
SET subscription_plan = 'development'
WHERE name = 'Algarve Home Stay';
```

### 5. Verificar a Atualização
```sql
SELECT id, name, subscription_plan FROM public.organizations
WHERE name = 'Algarve Home Stay';
```

Deve mostrar: `development`

## Resultado Final

Após executar os passos acima:

```
🏢 Organização: Algarve Home Stay
📦 Plano: development
📊 Limite: 99 propriedades
✨ Status: Laboratório de testes ativo
```

## Limites por Plano

| Plano | Limite | Uso |
|-------|--------|-----|
| essencial | 1 | Produção |
| expansao | 3 | Produção |
| premium | 10 | Produção |
| enterprise | ∞ | Produção (grandes volumes) |
| **development** | **99** | **Desenvolvimento/Testes** |

## Impacto

- Algarve Home Stay poderá ter até 99 propriedades cadastradas
- A métrica "Total de Propriedades" na página de propriedades refletirá: `X / 99`
- Alerta será mostrado apenas se exceder 99 propriedades
- Plano claramente marcado como laboratório no sistema

---

**Nota:** Este plano é exclusivo para desenvolvimento. Não criar múltiplas organizações com este plano.
