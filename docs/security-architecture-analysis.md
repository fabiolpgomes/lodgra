# Análise de Arquitetura de Segurança & RLS
## HomeStay v1.1 — 26 de Março de 2026

---

## 📊 SITUAÇÃO ATUAL

### ✅ O que já existe (Bem Implementado)

#### 1. **Roles Definidos**
- `admin` — Acesso total ao sistema e organizações
- `manager` — Gerenciar propriedades atribuídas
- `viewer` — Apenas visualizar dados

#### 2. **RLS Database-Level**
- Função helper: `user_has_property_access(prop_id)` — Verifica acesso à propriedade
- Policies implementadas para: `reservations`, `expenses`, `properties`, `property_listings`
- Pattern: `SELECT/INSERT/UPDATE/DELETE` com validação de `user_properties`

#### 3. **API-Level Authentication**
- `requireRole()` function — Valida role e retorna `userId`, `role`, `organizationId`
- Usado em **todos** os endpoints sensíveis
- Cache Redis para performance (1ms vs 55ms)

#### 4. **Multi-Tenancy**
- `organization_id` isolamento em tables principais
- `get_user_organization_id()` RLS helper

#### 5. **Security Headers**
- HSTS, CSP, CSRF protection implementados
- Rate limiting por endpoint

---

## ❌ PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. **Roles Incompleto — Faltam: "Colaborador" & "Cliente"**
```
ATUAL:        admin | manager | viewer
SOLICITADO:   admin | manager | colaborador | visualizador/cliente
```

**Impacto:** Sem distinção clara entre "cliente" (hospede/visitante) e "colaborador interno".

---

### 2. **Controle de Acesso por Tela NÃO IMPLEMENTADO**
```
Exemplo: Um "viewer" hoje pode navegar para /dashboard/members
(admin-only page) e verá um erro genérico ou página branca.
```

**Problema:**
- Falta middleware/layout que filtra rotas por role
- Telas protegidas apenas no API level, não no UI level
- Sem redirecimento inteligente para /dashboard vs /p/[slug]

**Impacto:** UX confusa; usuários com acesso insuficiente veem layouts quebrados.

---

### 3. **RLS não Bloqueia Tabelas Críticas**
Tabelas **SEM** RLS policies implementadas:
- `user_profiles` — Qualquer usuário autenticado pode ler `GET /api/users`
- `organizations` — Sem restrição de escopo de org
- `audit_logs` — Sem restrição por org
- `user_properties` — RLS existe mas permissiva

**Atual:**
```sql
-- user_profiles tem apenas:
-- "Admins can manage" (para ALL)
-- "Users can view own" (para SELECT)
-- Mas sem proteção contra admin ler org_id errado
```

**Impacto:** Um admin de org A pode potencialmente ler dados da org B via SQL direto.

---

### 4. **API Endpoints Permitem Escalação de Privilégio**
```typescript
// ❌ PROBLEMA: POST /api/users permite manager criar user
export async function POST(request: Request) {
  const auth = await requireRole(['admin', 'manager'])

  // Manager pode criar user com role='admin' ❌
  const { role } = validation.data
  // Sem validação: manager não deveria poder criar admin
}
```

**Impacto:** Manager pode criar novo admin = escalação de privilégio.

---

### 5. **Sem Isolamento entre Organizações**
```typescript
// ❌ Manager da org A pode:
// - Ver usuários com org_id de org B (sem validação explícita)
// - Atribuir properties da org B a usuários
```

**Necessário:** Validar `organization_id` em CADA operação.

---

### 6. **Sem Controle CRUD Granular por Role**
Hoje: `admin` e `manager` têm acesso ao mesmo CRUD de resources.

**Necessário:**
- Admin: CRUD completo (tudo)
- Manager: CRUD de propriedades, reservas, despesas (escopo da org)
- Colaborador: CRUD limitado (apenas ler + criar dentro de limites)
- Visualizador: READ-ONLY tudo

---

### 7. **Sem Proteção contra "Admin User Tampering"**
```typescript
// ❌ Problema: Usuários podem ler user_profiles diretamente
const { data: profiles } = await supabase
  .from('user_profiles')
  .select('*') // Sem filtro de org_id na RLS
```

**Necessário:** RLS deve restringir leitura de profiles a mesma org.

---

### 8. **Sem Segregação de Tipo de Usuário**
Hoje não há diferença entre:
- **Colaborador interno** (staff) — Acesso ao /dashboard
- **Cliente/Hóspede** (guest) — Acesso apenas ao /p/[slug]

Ambos têm `role='viewer'` mas precisam de UX diferentes.

---

## 🎯 RECOMENDAÇÕES ARQUITETURAIS

### **Tier 1: Crítica (Implementar Imediatamente)**

#### 1.0 **NOVO: First-Login Password Change Flow (Obrigatório)**

Quando um usuário é criado com senha provisória:

**Database Schema:**
```sql
-- Adicionar coluna em user_profiles
ALTER TABLE user_profiles ADD COLUMN (
  password_changed_at TIMESTAMP WITH TIME ZONE,
  requires_password_change BOOLEAN DEFAULT true
);

-- RLS: Usuário deve ter acesso apenas a próprio perfil na primeira login
CREATE POLICY "users_can_update_own_profile_on_first_login"
  ON user_profiles FOR UPDATE
  USING (
    id = auth.uid()
    AND requires_password_change = true
  );
```

**API Endpoint Novo: `POST /api/auth/change-password-first-login`**
```typescript
export async function POST(request: NextRequest) {
  const auth = await requireRole(['admin', 'manager', 'collaborator', 'guest'])
  if (!auth.authorized) return auth.response!

  const body = await request.json()
  const { newPassword } = body

  // Validação de força de senha
  if (newPassword.length < 8 || !/[A-Z]/.test(newPassword)) {
    return NextResponse.json(
      { error: 'Password must be 8+ chars with uppercase' },
      { status: 400 }
    )
  }

  // Verificar que user tem requires_password_change = true
  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('requires_password_change')
    .eq('id', auth.userId)
    .single()

  if (!profile?.requires_password_change) {
    return NextResponse.json(
      { error: 'Password already changed' },
      { status: 400 }
    )
  }

  // Atualizar senha via Supabase Auth
  const { error: authError } = await adminClient.auth.admin.updateUserById(
    auth.userId!,
    { password: newPassword }
  )

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  // Marcar que password foi alterada
  const { error: dbError } = await adminClient
    .from('user_profiles')
    .update({
      requires_password_change: false,
      password_changed_at: new Date().toISOString(),
    })
    .eq('id', auth.userId)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  await writeAuditLog({
    userId: auth.userId!,
    action: 'password_change_first_login',
    resourceType: 'user',
    resourceId: auth.userId!,
    details: { timestamp: new Date().toISOString() },
  })

  return NextResponse.json({ success: true })
}
```

**Frontend Component: `ChangePasswordOnFirstLogin.tsx`**
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ChangePasswordOnFirstLogin({ userEmail }: { userEmail: string }) {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('Passwords não correspondem')
      return
    }

    if (newPassword.length < 8) {
      setError('Password deve ter 8+ caracteres')
      return
    }

    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Password deve ter maiúscula e número')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/change-password-first-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao alterar password')
      }

      // Redirecionar para dashboard após sucesso
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Primeiro Acesso
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Altere sua password provisória
          </p>
          <p className="mt-1 text-center text-xs text-gray-500">
            Email: {userEmail}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
              Nova Password
            </label>
            <input
              id="newPassword"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 border text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
              placeholder="Mínimo 8 caracteres"
            />
            <p className="mt-1 text-xs text-gray-500">
              • 8+ caracteres<br/>
              • 1 maiúscula (A-Z)<br/>
              • 1 número (0-9)
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirmar Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 border text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
              placeholder="Repetir password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'A processar...' : 'Alterar Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

**Middleware: Force Redirect se `requires_password_change = true`**
```typescript
// middleware.ts — Adicionar
const { data: profile } = await adminClient
  .from('user_profiles')
  .select('requires_password_change')
  .eq('id', userId)
  .single()

if (profile?.requires_password_change && pathname !== '/auth/first-login') {
  return NextResponse.redirect(new URL('/auth/first-login', request.url))
}
```

**Layout: `src/app/auth/first-login/page.tsx`**
```typescript
import { ChangePasswordOnFirstLogin } from '@/components/auth/ChangePasswordOnFirstLogin'

export default function FirstLoginPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user.email) {
    redirect('/login')
  }

  return (
    <ChangePasswordOnFirstLogin userEmail={session.user.email} />
  )
}
```

**Fluxo Completo:**
```
1. Admin cria user com email: fabio@empresa.com
   → Password provisória gerada: "Temp123456!"
   → Email enviado com "Faça login e altere sua password"

2. User clica link no email ou faz login manualmente

3. Middleware detecta: requires_password_change = true
   → Redireciona para /auth/first-login

4. User vê formulário: "Alterar Password Provisória"
   → Digita nova password forte
   → Clica "Alterar Password"

5. Sistema:
   ✓ Valida força de password
   ✓ Atualiza auth.users (Supabase)
   ✓ Marca: requires_password_change = false
   ✓ Registra audit log
   ✓ Redireciona para /dashboard

6. Próximas logins:
   → User entra com nova password
   → Sem bloqueio de first-login
   → Acesso normal ao dashboard
```

**Segurança Implementada:**
- ✅ Password não pode ser reutilizada (Supabase change)
- ✅ Força mínima (8+ chars, maiúscula, número)
- ✅ User não pode skippar (middleware bloqueia)
- ✅ Audit trail (quem mudou, quando)
- ✅ Email enviado com instruções claras
- ✅ RLS garante que user só muda sua própria password

---

#### 1.1 Estender Roles para 4 Níveis
```typescript
type Role = 'admin' | 'manager' | 'collaborator' | 'guest'

interface RolePermissions {
  admin: {
    canManageUsers: true      // CRUD all users + change roles
    canManageOrg: true        // Org settings
    canViewAllProperties: true
    canViewAuditLogs: true
    accessLevel: 'FULL'
  }
  manager: {
    canManageUsers: false     // Apenas assign properties
    canManageOrg: false
    canViewAllProperties: false // Apenas assigned
    canViewAuditLogs: false
    accessLevel: 'PROPERTIES'
  }
  collaborator: {
    canManageUsers: false
    canManageOrg: false
    canViewAllProperties: false
    accessLevel: 'LIMITED'    // Apenas read + criar dentro de limites
  }
  guest: {
    canManageUsers: false
    canManageOrg: false
    canViewAllProperties: false
    accessLevel: 'READ_ONLY'  // Apenas reservas próprias
  }
}
```

#### 1.2 Implementar Route Protection Middleware
```typescript
// middleware.ts — Novo
const rolePathMap = {
  'admin': ['/dashboard', '/settings', '/reports'],
  'manager': ['/dashboard', '/properties'],
  'collaborator': ['/dashboard'], // Limited dashboard
  'guest': ['/p/'], // Public pages only
}

// Redirecionar se role não tem acesso a path
if (!hasAccessToPath(role, pathname)) {
  return NextResponse.redirect('/unauthorized')
}
```

#### 1.3 Reforçar RLS com Org Isolation
```sql
-- user_profiles — NOVA POLICY
CREATE POLICY "users_select_same_org"
  ON user_profiles FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    OR role = 'admin' -- Admins veem tudo
  );

-- organizations — NOVA POLICY
CREATE POLICY "org_select_own"
  ON organizations FOR SELECT
  USING (
    id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- user_properties — REFORCE
CREATE POLICY "user_properties_org_isolation"
  ON user_properties FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND organization_id = (
          SELECT organization_id FROM user_profiles WHERE id = user_id
        )
    )
  );
```

#### 1.4 Validar Org em CADA API Endpoint
```typescript
// Padrão: TODA operação começa com
export async function POST(request: NextRequest) {
  const auth = await requireRole(['admin', 'manager'])

  // ✅ OBRIGATÓRIO: Validar que org_id do request == auth.organizationId
  const body = await request.json()
  const { property_id } = body

  const prop = await adminClient
    .from('properties')
    .select('organization_id')
    .eq('id', property_id)
    .single()

  if (prop.organization_id !== auth.organizationId) {
    return NextResponse.json(
      { error: 'Acesso negado: propriedade não pertence à organização' },
      { status: 403 }
    )
  }
}
```

---

### **Tier 2: Importante (Próximas 2 Semanas)**

#### 2.1 Implementar Role-Based Permissions Matrix
```typescript
// src/lib/auth/permissions.ts — NOVO
export const RolePermissions = {
  admin: {
    users: { create: true, read: true, update: true, delete: true },
    properties: { create: true, read: true, update: true, delete: true },
    reservations: { create: true, read: true, update: true, delete: true },
    expenses: { create: true, read: true, update: true, delete: true },
    reports: { read: true },
  },
  manager: {
    users: { create: false, read: false, update: false, delete: false },
    properties: { create: true, read: 'assigned', update: 'assigned', delete: 'assigned' },
    reservations: { create: true, read: 'assigned', update: 'assigned', delete: 'assigned' },
    expenses: { create: true, read: 'assigned', update: 'assigned', delete: 'assigned' },
    reports: { read: 'assigned' },
  },
  // ... etc
}

// Usar em endpoints:
export async function POST(request) {
  const auth = await requireRole(['manager'])

  const canCreate = hasPermission(auth.role, 'properties', 'create')
  if (!canCreate) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

#### 2.2 UI Component Gating por Role
```typescript
// ✅ Remover telas do router se role não tem acesso
// src/components/RoleGate.tsx
export function RoleGate({
  roles: string[],
  children,
  fallback = null
}) {
  const { role } = useAuth()
  return roles.includes(role) ? children : fallback
}

// Uso:
<RoleGate roles={['admin']}>
  <Link href="/dashboard/members">Gestão de Membros</Link>
</RoleGate>
```

#### 2.3 Impedir Escalação de Privilégio
```typescript
// POST /api/users — Validar role max
export async function POST(request: Request) {
  const auth = await requireRole(['admin', 'manager'])
  const { role: newRole } = validation.data

  // ❌ Manager não pode criar admin
  if (auth.role === 'manager' && newRole === 'admin') {
    return NextResponse.json(
      { error: 'Managers cannot create admins' },
      { status: 403 }
    )
  }

  // ❌ Ninguém pode criar role superior ao seu
  const roleHierarchy = { admin: 3, manager: 2, collaborator: 1, guest: 0 }
  if (roleHierarchy[newRole] > roleHierarchy[auth.role]) {
    return NextResponse.json(
      { error: 'Cannot create user with higher role' },
      { status: 403 }
    )
  }
}
```

---

### **Tier 3: Melhorias (Próximo Sprint)**

#### 3.1 Audit Trail Detalhado
```typescript
// Registar TODAS operações com contexto
interface AuditEntry {
  userId: string
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
  resource: string
  resourceId: string
  organizationId: string
  timestamp: Date
  ipAddress: string
  status: 'SUCCESS' | 'FAILURE'
  reason?: string // "Permission denied", etc.
}
```

#### 3.2 Data Classification & Redaction
```typescript
// Dados sensíveis nunca retornam sem autorização
// Ex: Phone, email, payment info
if (!canViewSensitiveData(auth.role)) {
  data.phone = '***-****'
  data.email = 'm***@example.com'
}
```

#### 3.3 Implementar Session Management
```typescript
// Logout automático após inatividade
// Invalidar cache de session se role mudar
// Max de N sessões ativas por usuário
```

---

## 📋 PLANO DE IMPLEMENTAÇÃO

### **Semana 0: PRÉ-REQUISITO COMERCIALIZAÇÃO** 🚨

**Crítico para venda do produto:**

- [ ] **Google OAuth Setup** (CRÍTICO)
  - [ ] Configurar Google Cloud Console
  - [ ] Gerar GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
  - [ ] Configurar no Supabase
  - [ ] Testar em dev + staging

- [ ] **Register Page + Google OAuth**
  - [ ] Adicionar SocialLoginButtons a /register
  - [ ] Same flow que /login

- [ ] **Password Reset Flow** (NOVO)
  - [ ] `/auth/reset-password` page
  - [ ] `/auth/reset-password-confirm` page
  - [ ] Email com link de reset
  - [ ] Validação de força de password

- [ ] **OAuth Email Verification Fix**
  - [ ] OAuth users: `requires_password_change = FALSE`
  - [ ] Email users: `requires_password_change = TRUE`
  - [ ] Redirecionar OAuth users direto para onboarding

- [ ] **Landing Page CTA Fixes**
  - [ ] "Começar Agora" → `/register`
  - [ ] "Entrar" → `/login`
  - [ ] Links diretos e claros

- [ ] **Onboarding Flow Validation**
  - [ ] Redireciona users novos para /onboarding
  - [ ] Skip password change para OAuth
  - [ ] 3 steps: Welcome → Property → iCal

**Referência:** `/docs/commercial-auth-flow.md`

---

### **Semana 1: Fundação**
- [ ] **First-Login Password Change** (CRÍTICO)
  - [ ] Adicionar `requires_password_change` em `user_profiles` (migration)
  - [ ] Criar `/api/auth/change-password-first-login` endpoint
  - [ ] Criar `ChangePasswordOnFirstLogin` component
  - [ ] Adicionar middleware redirect para `/auth/first-login`
  - [ ] Criar page `/auth/first-login`
  - [ ] Atualizar email de user creation com instruções
  - [ ] Testes: verificar flow completo

- [ ] Estender `Role` type para 4 valores
- [ ] Implementar `requireRole()` com validação de escalation
- [ ] Reforçar RLS com `organization_id` checks
- [ ] Validar org em TODOS endpoints (safety sweep)

### **Semana 2: Routes & UI**
- [ ] Implementar middleware de rota por role
- [ ] Criar `RoleGate` component
- [ ] Esconder telas/botões por role
- [ ] Testes: verificar redirecionamentos

### **Semana 3: Permissões Granulares**
- [ ] Matrix de permissions por role
- [ ] Aplicar em API endpoints
- [ ] Implementar `hasPermission()` helper

### **Semana 4: Auditoria & Testes**
- [ ] Audit logs detalhados
- [ ] Testes de segurança (privilege escalation, org crossing)
- [ ] Documentação final

---

## 🔐 CHECKLIST DE SEGURANÇA

- [ ] **First-Login Password Change Obrigatório**
  - [ ] Campo `requires_password_change` em `user_profiles`
  - [ ] API endpoint `/api/auth/change-password-first-login`
  - [ ] Middleware redireciona para `/auth/first-login` se necessário
  - [ ] UI component com validação de força
  - [ ] Email enviado com instruções ao criar user
  - [ ] Audit log registra mudança de password

- [ ] Todo endpoint API valida `organization_id`
- [ ] Nenhuma tela protegida apenas no API (middleware também)
- [ ] RLS policies implementadas para TODAS tables with user data
- [ ] Nenhum user pode ler/modificar dados de outra org
- [ ] Manager não pode criar/demover admin
- [ ] Audit log registra TODAS operações sensitivas
- [ ] Rate limits em auth endpoints (10/15min)
- [ ] CSRF protection ativo
- [ ] CSP headers configurados
- [ ] Testes de privilege escalation automatizados
- [ ] Testes de first-login password change flow

---

## 📊 ANTES vs DEPOIS

### Antes
```
Um manager ❌ vê SQL errors quando tenta ver reservas
❌ Sem validação de escalation
❌ Sem distinção entre "cliente" e "staff"
❌ Telas quebradas se role insuficiente
```

### Depois
```
Manager ✅ vê apenas propriedades atribuídas
✅ Validação de privilege escalation
✅ 4 roles com permissões claras
✅ Redireciona automaticamente se sem acesso
✅ Sem necessidade de SQL manual
```

---

## 📚 Referências & Templates

**Files a criar/modificar:**
- `src/lib/auth/permissions.ts` — Nova
- `src/middleware.ts` — Adicionar route protection
- `src/components/RoleGate.tsx` — Nova
- `supabase/migrations/` — RLS reforçado
- `src/app/api/**/*.ts` — Adicionar org validation

---

**Próximo Passo:** Você quer que eu comece com a **Tier 1 (Crítica)**?
