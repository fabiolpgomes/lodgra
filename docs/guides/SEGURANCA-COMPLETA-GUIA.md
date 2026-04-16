# 🔐 SEGURANÇA COMPLETA - GUIA DE IMPLEMENTAÇÃO

## ✅ **O QUE FOI IMPLEMENTADO:**

### **1. Row Level Security (RLS)** 🛡️
- Políticas baseadas em roles (admin/manager/viewer)
- Proteção no nível do banco de dados
- Cada role vê apenas o que tem permissão

### **2. Middleware de Autenticação** 🔒
- Verifica sessão em todas as rotas
- Redireciona não autenticados para /login
- Redireciona autenticados para / se tentam acessar /login

### **3. Hook useAuth** 🎣
- Hook React para verificar permissões
- Componente `usePermissions()` para bloquear ações
- Fácil de usar em qualquer página

---

## 📦 **INSTALAÇÃO:**

### **PASSO 1: Instalar Pacote**

```bash
cd ~/Projetos/home-stay

# Parar servidor (Ctrl+C)

# Extrair
tar -xzf ~/Downloads/home-stay-v23-security-complete.tar.gz --strip-components=1

# Instalar dependência (se ainda não tiver)
npm install @supabase/ssr

# Reiniciar
npm run dev
```

---

### **PASSO 2: Executar SQL de Segurança**

1. Acesse: https://supabase.com/dashboard/project/brjumbfpvijrkhrherpt
2. SQL Editor
3. Abra o arquivo: `migration-security-rls.sql`
4. **Copie TODO o conteúdo**
5. Cole no SQL Editor
6. **Execute (Run)**

**Importante:** Isso vai re-ativar RLS com políticas corretas!

---

### **PASSO 3: Verificar Execução**

No final do SQL, você verá:

```
✅ Lista de políticas criadas
✅ Status de RLS (todas tabelas com rowsecurity = true)
```

---

## 🧪 **TESTES:**

### **Teste 1: Fazer Logout e Tentar Acessar**

```bash
# Acesse local
http://localhost:3000

# Faça logout
# Tente acessar: http://localhost:3000/properties
```

**✅ RESULTADO ESPERADO:**
- Redireciona automaticamente para `/login`

---

### **Teste 2: Login como Admin**

```bash
# Faça login com: fabiolpgomes@gmail.com
# Acesse: http://localhost:3000/properties/new
```

**✅ RESULTADO ESPERADO:**
- Consegue criar propriedade normalmente

---

### **Teste 3: Criar Usuário Viewer e Testar**

#### **A) Criar usuário Viewer:**

No Supabase Dashboard:
1. Authentication → Users → Add user
2. Email: `teste.viewer@email.com`
3. Password: `senha123`
4. Auto Confirm: ✅
5. Create

#### **B) Tornar Viewer via SQL:**

```sql
UPDATE user_profiles 
SET role = 'viewer', full_name = 'Teste Viewer'
WHERE email = 'teste.viewer@email.com';
```

#### **C) Testar permissões:**

1. Logout
2. Login com `teste.viewer@email.com`
3. Tente criar propriedade

**✅ RESULTADO ESPERADO:**
- Vê o formulário MAS ao salvar dá erro (sem permissão)

---

## 🎯 **USANDO O HOOK usePermissions:**

### **Exemplo: Bloquear Botão por Role**

```typescript
'use client'

import { usePermissions } from '@/hooks/useAuth'

export function PropertyForm() {
  const { can } = usePermissions()

  return (
    <button 
      disabled={!can.create()}
      className={!can.create() ? 'opacity-50 cursor-not-allowed' : ''}
    >
      {can.create() ? 'Criar Propriedade' : 'Sem Permissão'}
    </button>
  )
}
```

### **Exemplo: Mostrar/Ocultar Botão Delete**

```typescript
const { can } = usePermissions()

{can.delete() && (
  <button onClick={handleDelete}>
    Deletar
  </button>
)}
```

---

## 📋 **MATRIZ DE PERMISSÕES:**

### **VIEWER:**
```
✅ VER: Propriedades, Reservas, Despesas, Relatórios
❌ CRIAR: Nada
❌ EDITAR: Nada
❌ DELETAR: Nada
❌ GERENCIAR: Usuários
```

### **MANAGER (Rôsangela):**
```
✅ VER: Tudo
✅ CRIAR: Propriedades, Reservas, Despesas
✅ EDITAR: Propriedades, Reservas, Despesas
❌ DELETAR: Nada
❌ GERENCIAR: Usuários
```

### **ADMIN (Você):**
```
✅ VER: Tudo
✅ CRIAR: Tudo
✅ EDITAR: Tudo
✅ DELETAR: Tudo
✅ GERENCIAR: Usuários
```

---

## 🚀 **DEPLOY EM PRODUÇÃO:**

Depois de testar local:

```bash
cd ~/Projetos/home-stay

git add .
git commit -m "Add complete security with RLS and middleware"
git push origin main
```

**Aguarde deploy (2-3 min) e teste em:**
```
https://homestay.pt
```

---

## ⚠️ **IMPORTANTE:**

### **Antes de fazer deploy:**

1. ✅ Teste LOCAL primeiro
2. ✅ Execute o SQL no Supabase
3. ✅ Verifique que VOCÊ consegue criar/editar
4. ✅ Só depois faça deploy

### **Se algo der errado:**

**ROLLBACK rápido (desabilitar RLS):**

```sql
ALTER TABLE properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE property_listings DISABLE ROW LEVEL SECURITY;
ALTER TABLE guests DISABLE ROW LEVEL SECURITY;
```

---

## 🎯 **PRÓXIMOS PASSOS (PARTE B):**

Depois que a segurança estiver funcionando:

1. **Bloquear botões** nas páginas (usando usePermissions)
2. **Mensagens de erro** apropriadas
3. **Página de gerenciar usuários** (admin only)
4. **Logs de atividade** (quem fez o quê)

---

## ✅ **CHECKLIST:**

```
☐ Extrair pacote
☐ npm install @supabase/ssr
☐ Executar migration-security-rls.sql
☐ Testar logout → redireciona para /login
☐ Testar login admin → funciona normal
☐ Criar usuário viewer
☐ Testar viewer → não consegue criar/editar
☐ Fazer deploy
☐ Testar em produção
```

---

**Execute a Parte 1 e me avise quando estiver funcionando!** 🔐🚀
