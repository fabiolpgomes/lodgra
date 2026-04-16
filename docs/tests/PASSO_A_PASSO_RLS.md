# 🔧 GUIA PASSO A PASSO - DESABILITAR RLS

## ⚠️ IMPORTANTE
O erro `{}` que você está vendo significa que o Row Level Security (RLS) ainda está ATIVO no Supabase.

Siga EXATAMENTE estes passos:

---

## PASSO 1: Abrir Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Faça login
3. Clique no seu projeto (deve aparecer na lista)

---

## PASSO 2: Ir para SQL Editor

1. No menu lateral ESQUERDO, procure por **"SQL Editor"** (ícone de </> código)
2. Clique em **"SQL Editor"**
3. Clique no botão verde **"+ New query"** (canto superior direito)

---

## PASSO 3: Colar e Executar o SQL

Cole EXATAMENTE este código no editor:

```sql
-- Desabilitar RLS em todas as tabelas
ALTER TABLE properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE platforms DISABLE ROW LEVEL SECURITY;
ALTER TABLE property_listings DISABLE ROW LEVEL SECURITY;
ALTER TABLE guests DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions DISABLE ROW LEVEL SECURITY;
```

Depois clique no botão **"Run"** (ou pressione Ctrl+Enter / Cmd+Enter)

**RESULTADO ESPERADO:**
- Deve aparecer "Success. No rows returned" 
- Ou "ALTER TABLE" para cada linha

---

## PASSO 4: Verificar se Funcionou

Cole e execute este SQL para CONFIRMAR:

```sql
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

**RESULTADO ESPERADO:**
Você deve ver uma tabela com TODAS as suas tabelas mostrando `rls_enabled = false` (ou "f")

```
tablename               | rls_enabled
------------------------+-------------
calendar_blocks         | f
financial_transactions  | f
guests                  | f
platforms               | f
properties              | f
property_listings       | f
reservations            | f
sync_logs               | f
```

Se alguma tabela mostrar `rls_enabled = true` (ou "t"), o RLS ainda está ativo!

---

## PASSO 5: Testar no App

Depois de confirmar que todas as tabelas têm RLS = false:

1. Volte para o app: http://localhost:3000/properties/new
2. Preencha o formulário
3. Clique em "Salvar"
4. **DEVE FUNCIONAR!**

---

## 🎯 ALTERNATIVA: Desabilitar via Interface

Se o SQL não funcionou, tente pela interface:

### Opção 1: Authentication Policies
1. No Supabase, vá em **Authentication** → **Policies**
2. Procure por cada tabela (properties, platforms, etc)
3. Clique no toggle para **DESABILITAR** RLS

### Opção 2: Table Editor
1. Vá em **Table Editor**
2. Clique na tabela **properties**
3. No canto superior direito, procure o menu de 3 pontos (⋮)
4. Clique em **"Disable RLS"** ou similar
5. Confirme
6. Repita para TODAS as tabelas

---

## 🔍 DIAGNÓSTICO

### Verificar se o problema é RLS:

Execute este SQL:
```sql
-- Tentar inserir diretamente no SQL
INSERT INTO properties (name, address, city, country, property_type)
VALUES ('Teste SQL', 'Rua Teste 123', 'Antuérpia', 'Bélgica', 'apartment');
```

**Se der erro:**
- Erro menciona "policy" ou "row level security" → RLS ainda está ativo
- Erro menciona "permission denied" → RLS ainda está ativo

**Se funcionar:**
- A propriedade "Teste SQL" aparece na tabela → RLS foi desabilitado corretamente
- Mas o app ainda dá erro → Problema nas credenciais do .env.local

---

## 📸 ME ENVIE SCREENSHOTS

Para eu te ajudar melhor, tire prints de:

1. **Resultado do SQL de verificação** (SELECT tablename, rowsecurity...)
2. **Tela do SQL Editor** mostrando o resultado de "ALTER TABLE"
3. **Console do navegador** com o erro completo expandido (clique na seta do erro)

---

## ❓ FAQ

**P: Onde fica o SQL Editor?**
R: Menu lateral esquerdo no Supabase Dashboard, ícone de código </>

**P: Como sei se executou com sucesso?**
R: Aparece mensagem verde "Success. No rows returned" ou "ALTER TABLE"

**P: Tenho que fazer isso para cada tabela separadamente?**
R: NÃO! Cole TODAS as linhas de uma vez e execute

**P: É seguro desabilitar RLS?**
R: SIM para desenvolvimento local. NÃO para produção (mas isso é problema futuro)

---

## 🆘 AINDA COM PROBLEMA?

Me envie:
1. Screenshot do resultado da verificação (SELECT tablename...)
2. Screenshot do erro no console do navegador
3. Confirme: "Executei o SQL e todas as tabelas mostram rls_enabled = false"

Vou investigar mais a fundo!
