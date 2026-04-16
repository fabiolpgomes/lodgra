# 👥 SISTEMA MULTI-USUÁRIO - GUIA COMPLETO

## ✅ **O QUE FOI IMPLEMENTADO - PARTE 1:**

### **1. Autenticação Supabase** 🔐
- Login com email/senha
- Logout seguro
- Sessões persistentes
- Middleware de proteção

### **2. Sistema de Roles** 🔑
- **Admin** - Acesso total (você)
- **Manager** - Gerenciar propriedades/reservas
- **Viewer** - Apenas visualizar

### **3. Páginas Criadas** 📄
- `/login` - Página de login profissional
- Middleware - Proteção automática de rotas
- UserMenu - Componente com logout

### **4. Banco de Dados** 💾
- Tabela `user_profiles`
- Row Level Security (RLS)
- Políticas de acesso por role

---

## 📦 **INSTALAÇÃO - PASSO A PASSO:**

### **PASSO 1: Instalar Pacote**

```bash
cd ~/Projetos/home-stay

# Parar servidor (Ctrl+C)

# Extrair
tar -xzf ~/Downloads/home-stay-v20-multi-usuario-parte1.tar.gz --strip-components=1

# Instalar nova dependência
npm install @supabase/ssr

# Reiniciar
npm run dev
```

---

### **PASSO 2: Executar SQL no Supabase**

1. Acesse: https://supabase.com
2. Vá para seu projeto
3. SQL Editor
4. Abra o arquivo: `migration-auth-users.sql`
5. **Copie TODO o conteúdo**
6. Cole no SQL Editor
7. **Execute (Run)**

---

### **PASSO 3: Criar Sua Conta de Admin**

#### **A) Via Supabase Dashboard:**

1. Supabase → Authentication → Users
2. Clique: **"Add user"** → **"Create new user"**
3. Preencha:
   - Email: `seu-email@exemplo.com`
   - Password: (crie uma senha forte)
   - Auto Confirm User: ✅ (marque)
4. Clique: **"Create user"**

#### **B) Tornar Admin:**

No SQL Editor, execute:

```sql
UPDATE user_profiles 
SET role = 'admin', full_name = 'Fabio Gomes'
WHERE email = 'seu-email@exemplo.com';
```

**IMPORTANTE:** Substitua `seu-email@exemplo.com` pelo seu email real!

---

### **PASSO 4: Testar Login**

1. Acesse: `http://localhost:3000/login`
2. Digite seu email e senha
3. Clique "Entrar"
4. ✅ Deve redirecionar para dashboard

---

## 🧪 **TESTES:**

### **Teste 1: Login**
```
URL: http://localhost:3000/login
Email: seu-email@exemplo.com
Senha: (sua senha)
```
✅ Deve entrar no sistema

### **Teste 2: Proteção de Rotas**
```
1. Faça logout
2. Tente acessar: http://localhost:3000/properties
```
✅ Deve redirecionar para /login

### **Teste 3: UserMenu**
```
1. Faça login
2. Veja o canto superior direito
```
✅ Deve mostrar seu nome e botão "Sair"

---

## 👥 **CRIAR USUÁRIOS PARA OUTROS (Ex: Rôsangela):**

### **Via Supabase Dashboard:**

1. Authentication → Users
2. Add user → Create new user
3. Email: `rosangela@email.com`
4. Password: (defina uma senha)
5. Auto Confirm: ✅
6. Create

### **Definir Role:**

```sql
-- Manager (pode gerenciar, mas não criar usuários)
UPDATE user_profiles 
SET role = 'manager', full_name = 'Rôsangela'
WHERE email = 'rosangela@email.com';

-- OU Viewer (apenas visualizar)
UPDATE user_profiles 
SET role = 'viewer', full_name = 'Nome'
WHERE email = 'email@exemplo.com';
```

---

## 🔒 **PERMISSÕES POR ROLE:**

### **Admin (você):**
- ✅ Criar/editar/deletar propriedades
- ✅ Criar/editar/deletar reservas
- ✅ Criar/editar/deletar despesas
- ✅ Ver análise financeira
- ✅ **Criar/editar/deletar usuários**
- ✅ Acessar todas as páginas

### **Manager (Rôsangela):**
- ✅ Criar/editar/deletar propriedades
- ✅ Criar/editar/deletar reservas
- ✅ Criar/editar/deletar despesas
- ✅ Ver análise financeira
- ❌ Criar/deletar usuários
- ✅ Acessar todas as páginas

### **Viewer:**
- ✅ Ver propriedades
- ✅ Ver reservas
- ✅ Ver despesas
- ✅ Ver relatórios
- ❌ Criar/editar/deletar qualquer coisa
- ❌ Criar usuários

---

## 🚀 **PRÓXIMA FASE (Parte 2):**

Depois de testar a Parte 1, implementarei:

1. **Página de Gerenciar Usuários** (`/admin/users`)
2. **Verificação de Permissões** (bloquear botões por role)
3. **Logs de Atividade** (quem fez o quê)
4. **Avatar de Usuário** (foto de perfil)
5. **Trocar Senha** (self-service)

---

## ⚠️ **IMPORTANTE:**

### **Antes de fazer Deploy:**

Quando fizer deploy no Vercel, o sistema vai exigir login!

**Para acessar em produção:**
1. Vá para: `https://homestay.pt/login`
2. Use seu email/senha criado no Supabase
3. Entre normalmente

**Primeira vez:**
- Crie sua conta admin no Supabase ANTES do deploy
- Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no Vercel (já está configurado)

---

## 📝 **CHECKLIST DE IMPLEMENTAÇÃO:**

- [ ] Extrair pacote
- [ ] `npm install @supabase/ssr`
- [ ] Executar `migration-auth-users.sql` no Supabase
- [ ] Criar usuário admin no Supabase Dashboard
- [ ] Tornar o usuário admin via SQL
- [ ] Testar login local
- [ ] Criar conta para Rôsangela (opcional)
- [ ] Fazer deploy (git push)
- [ ] Testar login em produção

---

## 🎯 **BENEFÍCIOS:**

✅ Segurança: Apenas usuários autorizados
✅ Multi-usuário: Você e Rôsangela
✅ Rastreabilidade: Sabe quem fez o quê
✅ Controle: Diferentes níveis de acesso
✅ Profissional: Sistema enterprise-grade

---

**Execute a Parte 1 e me avise quando estiver funcionando!** 🚀🔐
