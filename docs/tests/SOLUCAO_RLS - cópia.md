# 🔓 SOLUÇÃO DEFINITIVA - Erro ao Criar Propriedade

## ❌ Problema Real

O erro `{}` (objeto vazio) acontece porque o **Row Level Security (RLS)** do Supabase está bloqueando a inserção de dados.

Por padrão, o Supabase ativa RLS em todas as tabelas, o que impede qualquer operação sem permissões explícitas.

---

## ✅ SOLUÇÃO RÁPIDA (Desenvolvimento)

### Passo 1: Acessar Supabase SQL Editor

1. Acesse: https://supabase.com/dashboard
2. Entre no seu projeto
3. No menu lateral, clique em **SQL Editor**
4. Clique em **New query**

### Passo 2: Executar Script

Cole este SQL e clique em **Run** (ou Ctrl+Enter):

```sql
-- Desabilitar RLS em todas as tabelas (apenas desenvolvimento)
ALTER TABLE properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE platforms DISABLE ROW LEVEL SECURITY;
ALTER TABLE property_listings DISABLE ROW LEVEL SECURITY;
ALTER TABLE guests DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions DISABLE ROW LEVEL SECURITY;
```

### Passo 3: Verificar

Execute este SQL para confirmar:

```sql
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

Todas as tabelas devem mostrar `rls_enabled = false` (ou "f").

### Passo 4: Testar Novamente

1. Volte para seu app: http://localhost:3000/properties/new
2. Preencha o formulário
3. Clique em "Salvar Propriedade"
4. **Deve funcionar agora!** ✅

---

## 🎯 Alternativa: Desabilitar via Interface

Se preferir usar a interface:

1. No Supabase Dashboard, vá em **Authentication** → **Policies**
2. Para cada tabela, clique em **Disable RLS**
3. Confirme

Ou:

1. Vá em **Table Editor**
2. Clique na tabela (ex: properties)
3. Vá na aba **RLS** (Row Level Security)
4. Clique em **Disable RLS for this table**

---

## ⚠️ IMPORTANTE - Segurança

**Para desenvolvimento local:**
- ✅ Desabilitar RLS está OK (você é o único usuário)
- ✅ Facilita testes e desenvolvimento rápido

**Para produção (futuramente):**
- ❌ NUNCA desabilite RLS em produção
- ✅ Configure políticas RLS apropriadas
- ✅ Implemente autenticação de usuários

---

## 🔐 RLS em Produção (Futuro)

Quando for lançar o sistema, você vai criar políticas como:

```sql
-- Exemplo: Permitir que usuário autenticado veja apenas suas propriedades
CREATE POLICY "Users can view own properties"
ON properties FOR SELECT
USING (auth.uid() = user_id);

-- Exemplo: Permitir que usuário crie propriedades
CREATE POLICY "Users can create properties"
ON properties FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

Mas isso é para depois! Por enquanto, desabilite o RLS.

---

## 📋 Checklist de Solução

- [ ] Abrir SQL Editor no Supabase
- [ ] Executar script de DISABLE ROW LEVEL SECURITY
- [ ] Verificar que todas as tabelas mostram RLS = false
- [ ] Testar criação de propriedade no app
- [ ] Sucesso! ✅

---

## 🐛 Ainda com Erro?

### Erro: "permission denied for table properties"
**Causa**: RLS ainda está ativo
**Solução**: Execute o SQL novamente e aguarde 10 segundos

### Erro: "new row violates row-level security policy"
**Causa**: Alguma tabela ainda tem RLS ativo
**Solução**: 
1. Vá em Table Editor
2. Verifique cada tabela individualmente
3. Desabilite RLS em todas

### Erro diferente do anterior
**Me envie screenshot do novo erro!**

---

## ✨ Depois de Funcionar

Quando criar sua primeira propriedade com sucesso:
1. Tire um print da tela
2. Me avise! 🎉
3. Vamos para o próximo passo: Detalhes da Propriedade

---

## 📝 Resumo Visual

```
ANTES (com RLS):
User → Insert → Supabase ❌ "Access Denied"

DEPOIS (sem RLS):
User → Insert → Supabase ✅ "Success"
```

Execute o SQL e me avise quando funcionar! 🚀
