# 🚀 Upgrade para Plano Enterprise

## O Problema

Você tentou cadastrar o 10º imóvel, mas a criação foi bloqueada porque seu plano atual não suporta propriedades ilimitadas.

- **ID da organização:** `0000000000000001`
- **Imóvel que não foi criado:** `3891d667-47fe-4d6b-859a-c71b2a832cc5`
- **Status:** Bloqueado por limite de propriedades

## A Solução

Seu plano precisa ser atualizado para **"enterprise"** que suporta propriedades ilimitadas.

### Opção 1: Via seu computador local (RECOMENDADO)

Execute este comando **no seu computador** (onde você tem acesso ao `.env.local`):

```bash
# Clone o repositório e entre no diretório
cd ~/Projetos/lodgra

# Execute o script para atualizar o plano
npm run update-plan -- 0000000000000001 enterprise
```

### Opção 2: Via API HTTP

Se você tem acesso a um endpoint, faça um POST para atualizar:

```bash
curl -X PATCH \
  "http://localhost:3000/api/admin/organization/update-plan" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "organizationId": "0000000000000001",
    "plan": "enterprise"
  }'
```

### Opção 3: Diretamente no Supabase Dashboard

1. Acesse: https://app.supabase.com
2. Selecione seu projeto `brjumbfpvijrkhrheppt`
3. Vá para **SQL Editor**
4. Execute este query:

```sql
UPDATE organizations
SET 
  subscription_plan = 'enterprise',
  plan = 'enterprise',
  premium_extra_properties_count = 0
WHERE id = '0000000000000001';
```

## Verificar o Plano

Após atualizar, execute:

```bash
npm run check-plan -- 0000000000000001
```

Você deve ver:
```
subscription_plan: enterprise
plan: enterprise
premium_extra_properties_count: 0
```

## Próximos Passos

1. ✅ Atualizar plano para enterprise
2. ✅ Tentar criar novamente o 10º imóvel
3. ✅ Verificar se a propriedade aparece em `https://www.lodgra.io/pt-BR/properties/3891d667-47fe-4d6b-859a-c71b2a832cc5`

---

**Precisa de ajuda?** Ative o agente `@github-devops` para gerenciar isso.
