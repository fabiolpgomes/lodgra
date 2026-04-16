# SETUP GUIDE - HOME STAY

## Status do Projeto
✅ Projeto Next.js criado e configurado
✅ Dependências instaladas (Supabase, Tailwind, TypeScript)
✅ Schema do banco de dados definido
⏳ Configuração do Supabase Cloud
⏳ Migração do schema para Supabase
⏳ Primeira tela funcional

---

## PASSO 1: Criar Conta no Supabase

1. Acesse: https://supabase.com
2. Clique em **"Start your project"**
3. Faça login com GitHub (recomendado) ou email
4. É grátis até 500MB de database + 1GB de storage

---

## PASSO 2: Criar Projeto no Supabase

1. No dashboard, clique em **"New Project"**
2. Preencha:
   - **Name**: `home-stay` (ou qualquer nome)
   - **Database Password**: Crie uma senha forte (GUARDE ESTA SENHA!)
   - **Region**: `Europe (eu-central-1)` (mais próximo de Antuérpia)
   - **Pricing Plan**: Free
3. Clique em **"Create new project"**
4. Aguarde ~2 minutos (o projeto está sendo criado)

---

## PASSO 3: Copiar Credenciais

Quando o projeto estiver pronto:

1. No menu lateral, clique em **"Project Settings"** (ícone de engrenagem)
2. Clique em **"API"**
3. Você verá:
   - **Project URL** (algo como: `https://xyzabc123.supabase.co`)
   - **anon public** (chave pública - grande string)
   - **service_role** (chave privada - clique em "Reveal" para ver)

---

## PASSO 4: Configurar Variáveis de Ambiente

1. No seu projeto local, abra o arquivo `.env.local`
2. Substitua os valores:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-aqui
```

3. Salve o arquivo

---

## PASSO 5: Migrar Schema do Banco de Dados

Você tem 2 opções:

### Opção A: SQL Editor (Mais Rápido) ✅ RECOMENDADO

1. No Supabase Dashboard, clique em **"SQL Editor"** (menu lateral)
2. Clique em **"New query"**
3. Abra o arquivo `supabase-schema.sql` que está na raiz do projeto
4. Copie TODO o conteúdo
5. Cole no SQL Editor do Supabase
6. Clique em **"Run"** (ou pressione Ctrl+Enter)
7. Se aparecer "Success. No rows returned", está perfeito!

### Opção B: Supabase CLI (Mais Profissional)

```bash
# Instalar CLI
npm install -g supabase

# Login
supabase login

# Link com projeto
supabase link --project-ref SEU-PROJECT-REF

# Aplicar migrations
supabase db push
```

---

## PASSO 6: Verificar Tabelas Criadas

1. No Supabase Dashboard, clique em **"Table Editor"**
2. Você deve ver as tabelas:
   - properties
   - platforms
   - property_listings
   - guests
   - reservations
   - calendar_blocks
   - sync_logs
   - financial_transactions

3. Se estiver tudo aí, **schema migrado com sucesso!** ✅

---

## PASSO 7: Inserir Dados Iniciais (Seed)

No SQL Editor, execute:

```sql
-- Inserir plataformas
INSERT INTO platforms (name, code, is_active) VALUES
('Airbnb', 'airbnb', true),
('Booking.com', 'booking', true),
('Vrbo', 'vrbo', false),
('Manual', 'manual', true);
```

---

## PASSO 8: Testar Conexão Local

```bash
cd /home/claude/home-stay
npm run dev
```

Abra: http://localhost:3000

Se aparecer a página do Next.js, está funcionando!

---

## PASSO 9: Testar Supabase Client

Vou criar um arquivo de teste para você verificar se a conexão está OK.

---

## Próximos Passos Após Setup

1. ✅ Configurar autenticação (login/logout)
2. ✅ Criar dashboard inicial
3. ✅ Criar tela de propriedades
4. ✅ Criar calendário unificado

---

## Troubleshooting

### Erro: "Invalid API key"
- Verifique se copiou as chaves corretas
- Verifique se não tem espaços extras no .env.local

### Erro: "Failed to fetch"
- Verifique se o Project URL está correto
- Verifique sua conexão com internet

### Tabelas não aparecem
- Execute novamente o SQL do schema
- Verifique se não houve erros no SQL Editor

---

## Me avise quando completar os passos 1-6!

Assim que você:
1. Criar o projeto no Supabase
2. Copiar as credenciais para `.env.local`
3. Migrar o schema

Eu crio a primeira tela funcional do sistema! 🚀
