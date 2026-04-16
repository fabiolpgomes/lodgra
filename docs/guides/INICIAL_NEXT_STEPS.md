# 📋 PRÓXIMOS PASSOS - HOME STAY

## ✅ O que já está pronto

1. ✅ Projeto Next.js criado e configurado
2. ✅ Todas as dependências instaladas
3. ✅ Schema do banco de dados documentado
4. ✅ Tipos TypeScript criados
5. ✅ Estrutura de pastas organizada
6. ✅ Clients do Supabase configurados
7. ✅ Arquivos de governança no projeto

## 🎯 Próxima Tarefa: Configurar Supabase

### Passo 1: Criar conta no Supabase (5 minutos)

1. Acesse: https://supabase.com
2. Clique em "Start your project"
3. Faça login com GitHub (recomendado) ou email
4. Crie uma organização (pode ser seu nome)

### Passo 2: Criar projeto (3 minutos)

1. Clique em "New project"
2. Preencha:
   - **Name**: `home-stay`
   - **Database Password**: Crie uma senha forte (anote!)
   - **Region**: Europe West (London) - mais próximo de você
   - **Plan**: Free
3. Clique em "Create new project"
4. Aguarde 2-3 minutos enquanto provisiona

### Passo 3: Executar Schema SQL (5 minutos)

1. No menu lateral, clique em **SQL Editor**
2. Clique em "+ New query"
3. Abra o arquivo `supabase-schema.sql` do projeto
4. Copie TODO o conteúdo
5. Cole no editor SQL
6. Clique em "Run" (ou Ctrl/Cmd + Enter)
7. Aguarde completar - você verá "Success. No rows returned"

**✅ Verificação**: No menu lateral, clique em "Table Editor". Você deve ver 8 tabelas:
- calendar_blocks
- financial_transactions
- guests
- platforms
- properties
- property_listings
- reservations
- sync_logs

### Passo 4: Pegar credenciais da API (2 minutos)

1. No menu lateral, clique em **Settings** (ícone de engrenagem)
2. Clique em **API**
3. Na seção "Project API keys", copie:
   - **URL**: Algo como `https://xxxxxxx.supabase.co`
   - **anon public**: Uma chave longa começando com `eyJ...`

### Passo 5: Configurar variáveis de ambiente (2 minutos)

1. No projeto, abra o arquivo `.env.local`
2. Substitua os valores placeholder:

```env
NEXT_PUBLIC_SUPABASE_URL=https://sua-url-aqui.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

3. Salve o arquivo

### Passo 6: Testar conexão (2 minutos)

1. No terminal, na pasta do projeto:
```bash
npm run dev
```

2. Abra o navegador em: http://localhost:3000
3. Você deve ver a página inicial do Next.js

**Se tudo estiver OK, estamos prontos para desenvolver! 🎉**

---

## 🚀 Depois do Setup: Primeira Feature

Após configurar o Supabase, vamos desenvolver:

### Feature 1: Dashboard + CRUD de Propriedades

**O que vamos criar:**
1. Página de dashboard com estatísticas básicas
2. Listagem de propriedades
3. Formulário para adicionar propriedade
4. Editar e deletar propriedades

**Estimativa**: 2-3 horas de desenvolvimento

---

## 📞 Troubleshooting

### Problema: "Invalid API credentials"
**Solução**: Verifique se copiou as credenciais corretas do Supabase. URL e Key devem estar sem espaços.

### Problema: "Module not found"
**Solução**: Execute `npm install` novamente.

### Problema: Schema SQL deu erro
**Solução**: Certifique-se de copiar TODO o conteúdo do arquivo, incluindo as primeiras linhas.

### Problema: Porta 3000 já em uso
**Solução**: Execute `npm run dev -- -p 3001` para usar outra porta.

---

## 📝 Checklist de Setup

Marque conforme completa:

- [ ] Conta no Supabase criada
- [ ] Projeto "home-stay" criado no Supabase
- [ ] Schema SQL executado com sucesso
- [ ] 8 tabelas visíveis no Table Editor
- [ ] Credenciais (URL + Key) copiadas
- [ ] Arquivo `.env.local` atualizado
- [ ] `npm run dev` executando sem erros
- [ ] Página abrindo em http://localhost:3000

**Quando todos os itens estiverem marcados, me avise para começarmos o desenvolvimento do Dashboard! 🚀**
