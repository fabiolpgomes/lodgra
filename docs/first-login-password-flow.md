# First-Login Password Change Flow
## HomeStay Security Implementation

---

## 📋 Requisito
Quando um usuário é criado por um admin/manager com **senha provisória**, o usuário:
1. Recebe email com a senha provisória
2. Faz login
3. **OBRIGATORIAMENTE** altera a senha antes de acessar o sistema
4. Após alterar, tem acesso normal ao dashboard

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN CRIA USUÁRIO                       │
│         POST /api/users {email, role, ...}                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ Gerar Senha Provisória│
         │ "Temp123456!"         │
         └───────────┬───────────┘
                     │
                     ▼
     ┌──────────────────────────────────┐
     │ Criar auth.users (Supabase)      │
     │ Criar user_profiles:             │
     │   - requires_password_change: 1  │
     └───────────┬──────────────────────┘
                 │
                 ▼
     ┌──────────────────────────────────┐
     │ Enviar Email com Senha Provisória│
     │ "Faça login e altere sua senha"  │
     └───────────┬──────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │  USER FAZE LOGIN   │
        │  Email + Temp Pwd  │
        └────────┬───────────┘
                 │
                 ▼
     ┌──────────────────────────────────┐
     │      MIDDLEWARE DETECTS:         │
     │  requires_password_change = 1    │
     └───────────┬──────────────────────┘
                 │
                 ▼
     ┌──────────────────────────────────┐
     │ REDIRECIONA PARA:                │
     │ /auth/first-login                │
     │ (Bloqueia acesso a dashboard)    │
     └───────────┬──────────────────────┘
                 │
                 ▼
    ┌──────────────────────────────────┐
    │ USER VÊ FORMULÁRIO:              │
    │ "Alterar Password Provisória"    │
    │ - Digite nova senha              │
    │ - Confirme nova senha            │
    │ - Botão "Alterar Password"       │
    └───────────┬──────────────────────┘
                │
                ▼
     ┌──────────────────────────────────┐
     │  POST /api/auth/                 │
     │  change-password-first-login     │
     │  {newPassword}                   │
     └───────────┬──────────────────────┘
                 │
                 ▼
    ┌─────────────────────────────────┐
    │  VALIDAÇÕES:                    │
    │  ✓ 8+ caracteres                │
    │  ✓ 1 maiúscula (A-Z)            │
    │  ✓ 1 número (0-9)               │
    │  ✓ Confirma = Nova              │
    │  ✓ Verifica                     │
    │    requires_password_change = 1 │
    └───────────┬──────────────────────┘
                 │
                 ▼
    ┌─────────────────────────────────┐
    │  ATUALIZAR:                     │
    │  1. auth.users.password         │
    │     (via Supabase admin)        │
    │  2. user_profiles:              │
    │     - requires_password_change=0│
    │     - password_changed_at=NOW   │
    │  3. Audit log                   │
    └───────────┬──────────────────────┘
                 │
                 ▼
   ┌──────────────────────────────────┐
   │ REDIRECIONA PARA:                │
   │ /dashboard                       │
   │ (Acesso normal garantido)        │
   └──────────────────────────────────┘
```

---

## 🛠️ Implementação Detalhada

### 1️⃣ Migration: Adicionar Coluna

**File:** `supabase/migrations/20260326_02_first_login_password_change.sql`

```sql
-- Rastrear se user já alterou password de provisória
ALTER TABLE user_profiles ADD COLUMN (
  requires_password_change BOOLEAN NOT NULL DEFAULT true,
  password_changed_at TIMESTAMP WITH TIME ZONE
);

-- Index para queries rápidas
CREATE INDEX idx_user_profiles_requires_password_change
ON user_profiles(requires_password_change)
WHERE requires_password_change = true;

-- RLS: User pode atualizar próprio perfil se precisa mudar password
CREATE POLICY "users_can_change_own_password_first_login"
  ON user_profiles FOR UPDATE
  USING (
    id = auth.uid()
    AND requires_password_change = true
  )
  WITH CHECK (
    id = auth.uid()
  );
```

---

### 2️⃣ API Endpoint

**File:** `src/app/api/auth/change-password-first-login/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeAuditLog } from '@/lib/audit'

interface ChangePasswordRequest {
  newPassword: string
}

// Validação de força de password
function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) {
    return 'Password deve ter pelo menos 8 caracteres'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password deve incluir pelo menos 1 letra maiúscula'
  }
  if (!/[0-9]/.test(password)) {
    return 'Password deve incluir pelo menos 1 número'
  }
  if (/\s/.test(password)) {
    return 'Password não pode conter espaços'
  }
  return null
}

export async function POST(request: NextRequest) {
  // Qualquer user autenticado pode mudar sua própria password na primeira login
  const auth = await requireRole(['admin', 'manager', 'collaborator', 'guest'])
  if (!auth.authorized) return auth.response!

  if (!auth.userId) {
    return NextResponse.json(
      { error: 'User ID não encontrado' },
      { status: 401 }
    )
  }

  let body: ChangePasswordRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Body JSON inválido' },
      { status: 400 }
    )
  }

  const { newPassword } = body

  if (!newPassword || typeof newPassword !== 'string') {
    return NextResponse.json(
      { error: 'newPassword é obrigatório e deve ser string' },
      { status: 400 }
    )
  }

  // Validar força da password
  const strengthError = validatePasswordStrength(newPassword)
  if (strengthError) {
    return NextResponse.json(
      { error: strengthError },
      { status: 400 }
    )
  }

  const adminClient = createAdminClient()

  // 1️⃣ Verificar que user tem requires_password_change = true
  const { data: profile, error: profileError } = await adminClient
    .from('user_profiles')
    .select('requires_password_change')
    .eq('id', auth.userId)
    .single()

  if (profileError) {
    console.error('[auth/change-password] Profile fetch error:', profileError)
    return NextResponse.json(
      { error: 'Erro ao buscar perfil do utilizador' },
      { status: 500 }
    )
  }

  if (!profile) {
    return NextResponse.json(
      { error: 'Perfil do utilizador não encontrado' },
      { status: 404 }
    )
  }

  if (!profile.requires_password_change) {
    return NextResponse.json(
      { error: 'Password já foi alterada anteriormente' },
      { status: 400 }
    )
  }

  // 2️⃣ Atualizar password via Supabase Auth Admin API
  const { error: authError } = await adminClient.auth.admin.updateUserById(
    auth.userId,
    { password: newPassword }
  )

  if (authError) {
    console.error('[auth/change-password] Auth update error:', authError)
    return NextResponse.json(
      { error: `Erro ao atualizar password: ${authError.message}` },
      { status: 500 }
    )
  }

  // 3️⃣ Marcar que password foi alterada
  const { error: dbError } = await adminClient
    .from('user_profiles')
    .update({
      requires_password_change: false,
      password_changed_at: new Date().toISOString(),
    })
    .eq('id', auth.userId)

  if (dbError) {
    console.error('[auth/change-password] DB update error:', dbError)
    return NextResponse.json(
      { error: `Erro ao atualizar perfil: ${dbError.message}` },
      { status: 500 }
    )
  }

  // 4️⃣ Registar audit log
  try {
    await writeAuditLog({
      userId: auth.userId,
      action: 'password_change_first_login',
      resourceType: 'user',
      resourceId: auth.userId,
      details: {
        timestamp: new Date().toISOString(),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    })
  } catch (err) {
    console.error('[auth/change-password] Audit log error:', err)
    // Não bloqueia a resposta se audit falhar
  }

  return NextResponse.json({
    success: true,
    message: 'Password alterada com sucesso',
  })
}
```

---

### 3️⃣ Frontend Component

**File:** `src/components/auth/ChangePasswordOnFirstLogin.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'

interface Props {
  userEmail: string
}

export function ChangePasswordOnFirstLogin({ userEmail }: Props) {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Validação em tempo real
  const passwordStrength = {
    hasLength: newPassword.length >= 8,
    hasUppercase: /[A-Z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    match: newPassword === confirmPassword && newPassword.length > 0,
  }

  const isValid =
    passwordStrength.hasLength &&
    passwordStrength.hasUppercase &&
    passwordStrength.hasNumber &&
    passwordStrength.match

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isValid) {
      setError('Password não cumpre os requisitos')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/change-password-first-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao alterar password')
      }

      // Redirecionar para dashboard
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Primeiro Acesso
          </h1>
          <p className="text-gray-600">
            Altere sua password provisória
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {userEmail}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nova Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Nova Password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Password Requirements */}
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      passwordStrength.hasLength ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      passwordStrength.hasLength ? 'text-green-700' : 'text-gray-500'
                    }`}
                  >
                    Mínimo 8 caracteres
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      passwordStrength.hasUppercase ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      passwordStrength.hasUppercase ? 'text-green-700' : 'text-gray-500'
                    }`}
                  >
                    Incluir 1 letra maiúscula (A-Z)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      passwordStrength.hasNumber ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      passwordStrength.hasNumber ? 'text-green-700' : 'text-gray-500'
                    }`}
                  >
                    Incluir 1 número (0-9)
                  </span>
                </div>
              </div>
            </div>

            {/* Confirmar Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {confirmPassword && !passwordStrength.match && (
                <p className="mt-1 text-xs text-red-600">Passwords não correspondem</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isValid || loading}
              className="w-full py-2 px-4 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'A processar...' : 'Alterar Password'}
            </button>
          </form>

          {/* Info Box */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-xs text-blue-700">
              <strong>Nota:</strong> Esta password será utilizada para todas as próximas logins. Guarde-a num local seguro.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

### 4️⃣ Page Component

**File:** `src/app/auth/first-login/page.tsx`

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChangePasswordOnFirstLogin } from '@/components/auth/ChangePasswordOnFirstLogin'

export const metadata = {
  title: 'Primeiro Acesso — HomeStay',
  robots: { index: false },
}

export default async function FirstLoginPage() {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user?.email) {
    redirect('/login')
  }

  return (
    <ChangePasswordOnFirstLogin userEmail={session.user.email} />
  )
}
```

---

### 5️⃣ Middleware Update

**File:** `src/middleware.ts` — Adicionar ao existente

```typescript
// Após session refresh e antes de subscription check
async function checkFirstLoginPasswordChange(request: NextRequest, userId: string) {
  const { pathname } = request.nextUrl

  // Paths que podem ser acedidos mesmo com requires_password_change = true
  const allowedPaths = [
    '/auth/first-login',
    '/auth/logout',
    '/api/auth/change-password-first-login',
    '/api/auth/', // Permitir logout etc
  ]

  const isAllowedPath = allowedPaths.some(path => pathname.startsWith(path))
  if (isAllowedPath) {
    return null
  }

  // Verificar if user requires password change
  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('requires_password_change')
    .eq('id', userId)
    .single()

  if (profile?.requires_password_change) {
    return NextResponse.redirect(new URL('/auth/first-login', request.url))
  }

  return null
}

// No middleware handler:
export async function middleware(request: NextRequest) {
  // ... existing code ...

  if (session?.user?.id) {
    const passwordChangeResponse = await checkFirstLoginPasswordChange(
      request,
      session.user.id
    )
    if (passwordChangeResponse) return passwordChangeResponse
  }

  // ... rest of middleware ...
}
```

---

### 6️⃣ Email Update

**File:** `src/lib/email/templates/user-created.ts` — Atualizar

```typescript
export const userCreatedTemplate = (params: {
  email: string
  password: string
  loginUrl: string
  firstName: string
}) => ({
  subject: 'Bem-vindo a HomeStay — Altere sua Password',
  html: `
    <h2>Bem-vindo, ${params.firstName}!</h2>
    <p>A sua conta foi criada com sucesso.</p>

    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Seu Email:</strong> ${params.email}</p>
      <p><strong>Password Provisória:</strong> <code>${params.password}</code></p>
    </div>

    <h3>Próximos Passos:</h3>
    <ol>
      <li>Aceda a <a href="${params.loginUrl}">HomeStay</a></li>
      <li>Faça login com seu email e a password acima</li>
      <li><strong>OBRIGATÓRIO:</strong> Altere a password provisória por uma segura</li>
      <li>Após alteração, terá acesso completo ao dashboard</li>
    </ol>

    <p style="color: #666; font-size: 12px; margin-top: 30px;">
      ⚠️ <strong>Segurança:</strong> Esta é uma senha temporária. Após fazer login, deverá alterá-la imediatamente.
    </p>
  `,
})
```

---

## ✅ Checklist de Testes

- [ ] Admin cria user via `/api/users`
- [ ] Email é enviado com senha provisória
- [ ] User não consegue fazer login com senhas erradas
- [ ] User faz login com senha provisória
- [ ] Middleware redireciona para `/auth/first-login`
- [ ] User vê formulário de alterar password
- [ ] Validações de força aparecem em tempo real
- [ ] Submit desativado até requisitos serem cumpridos
- [ ] Password alterada com sucesso
- [ ] User é redirecionar para `/dashboard`
- [ ] Próximo login com nova password funciona
- [ ] `requires_password_change` = false em DB
- [ ] Audit log registra a mudança
- [ ] User NÃO consegue fazer password change 2x

---

## 🔐 Requisitos de Segurança Atendidos

✅ Senha provisória obrigatória — Impede que senhas fracas sejam usadas permanentemente
✅ Bloqueio obrigatório no primeiro login — User não consegue skippar
✅ Validação de força — Mínimo 8 chars, maiúscula, número
✅ Auditoria — Registra quando/quem mudou password
✅ Isolamento RLS — User só consegue mudar sua própria password
✅ Fluxo seguro — Middleware força redirect antes de acesso ao dashboard
✅ Email claro — Instruções explícitas no email de boas-vindas

---

**Documento Completo para Implementação Imediata** ✅
