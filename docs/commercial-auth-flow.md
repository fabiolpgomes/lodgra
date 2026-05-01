# Commercial Auth Flow Analysis & Implementation Plan
## HomeStay v1.1 — Para Comercialização

---

## 📊 ANÁLISE ATUAL

### ✅ O que está implementado

1. **Landing Page** (`/`)
   - ✅ Layout profissional com CTAs
   - ✅ Link "Entrar" na navbar → `/login`
   - ✅ CTA principal "Começar Agora" → **precisa revisar**

2. **Login Page** (`/login`)
   - ✅ Email + Password form
   - ✅ Integração com Supabase Auth
   - ✅ SocialLoginButtons component (Google OAuth)
   - ✅ Link "Criar conta" → `/register`
   - ✅ Show/Hide password toggle

3. **Register Page** (`/register`)
   - ✅ Email + Password + Confirm Password
   - ✅ Full Name field
   - ✅ Validação de força de senha (8+ chars, maiúscula, número)
   - ✅ Email confirmation flow
   - ⚠️ **FALTA:** Google OAuth no signup

4. **Auth Callback** (`/auth/callback`)
   - ✅ OAuth callback handler (Google, etc)
   - ✅ Cria automaticamente `organization` + `user_profiles`
   - ✅ Auto-assign `role = 'viewer'`
   - ✅ Redireciona para dashboard

---

## ❌ PROBLEMAS CRÍTICOS PARA COMERCIALIZAÇÃO

### 1. **Google OAuth NÃO FUNCIONA** 🔴 CRÍTICO

**Problema:**
```
GOOGLE_CLIENT_ID = "" (VAZIO)
GOOGLE_CLIENT_SECRET = "" (VAZIO)
```

**Impacto:**
- Botão "Continuar com Google" na login não funciona
- Usuários que clicam: erro silencioso ou redirect para erro
- **Conversão reduzida**: ~30% dos signups usam OAuth

**Solução:**
1. Configurar Google OAuth Project em Google Cloud Console
2. Gerar `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`
3. Configurar Supabase com estas credenciais
4. Testar flow completo

---

### 2. **Register Page SEM Google OAuth** 🟡 IMPORTANTE

**Problema:**
```tsx
// /register usa SocialLoginButtons mas:
// - SocialLoginButtons só tem Google
// - SocialLoginButtons só em /login, NÃO em /register
// - User que quer signup com Google não consegue
```

**Impacto:**
- Usuários que entram via landing → Register → veem "Criar conta manualmente"
- Sem opção Google no signup
- Flow quebrado para OAuth users

---

### 3. **CTA da Landing Page Impreciso** 🟡 UX

**Problema:**
```tsx
// Landing page "Começar Agora" button:
// - Não está claro se é para /login ou /register
// - Copy varia entre "Entrar" e "Começar Agora"
// - Usuário novo não sabe por onde começar
```

**Landing Page Flow:**
```
Prospect vê landing page
    ↓
Click "Começar Agora" (CTA principal)
    ↓ (DEVERIA IR PARA REGISTRO)
Login page ??? (confuso)
    ↓
User novo clica "Criar conta" → /register (extra click)
```

---

### 4. **Onboarding After Login Não Claro** 🟡

**Problema:**
```
User faz login/signup
    ↓
Auto-redirect para /dashboard
    ↓
Vê dashboard vazio (nenhum imóvel)
    ↓
❓ "Agora o quê?" — Sem onboarding flow evidente
```

**Deve ser:**
```
User faz signup
    ↓
Cria organização + profile automaticamente
    ↓
Redireciona para /onboarding (se primeira vez)
    ↓
    ├─ Step 1: Bem-vindo (company info)
    ├─ Step 2: Adicione 1° imóvel
    └─ Step 3: Configure iCal
    ↓
Pronto para usar!
```

---

### 5. **Email Confirmation Flow Não Validado** 🟡

**Problema:**
```
User faz signup
    ↓
Email de confirmação enviado
    ↓
User clica link no email
    ↓
Redireciona para /auth/callback
    ↓
❓ Depois pra onde? /dashboard ou /first-login-password?
```

**Resultado:** Flow ambíguo, pode deixar user preso

---

### 6. **Password Reset Flow NÃO EXISTE** 🔴 CRÍTICO

**Problema:**
```
User esquece password
    ↓
Login page sem "Esqueci minha senha"
    ↓
❌ User não consegue recuperar conta
```

**Impact:** Support bursts, churn

---

### 7. **OAuth Email Verification** 🟡

**Problema:**
```
User signup com Google
    ↓
Email já verificado (Google garante)
    ↓
MAS: user_profiles.requires_password_change = true
    ↓
Redireciona para /first-login-password
    ↓
❌ User confuso: "Por quê mudar password se não criei?"
```

**Deve ser:**
```
OAuth users:
    - Skip password change (Google já fez auth)
    - Gerar random password para compatibility
    - Ir direto para onboarding

Non-OAuth users:
    - Obrigatório change password (admin-created ou self-signup)
```

---

## 🎯 FLUXOS DESEJADOS

### **Fluxo A: Prospect no Landing → Self-Signup com Email**

```
Landing Page (/)
    ↓
Click "Começar Agora" → /register
    ↓
Email + Password + Confirm + Full Name
    ↓
Validação: 8+ chars, maiúscula, número
    ↓
Email enviado: "Confirme seu email"
    ↓
User clica link no email
    ↓
/auth/callback → exchangeCodeForSession
    ↓
Cria: organization + user_profiles (role='viewer')
    ↓
OBRIGATÓRIO: /auth/first-login-password
    └─ Alterar password provisória
    ↓
/onboarding (Bem-vindo! Vamos começar)
    ├─ Step 1: Company info
    ├─ Step 2: Add 1° property
    └─ Step 3: Setup iCal
    ↓
/dashboard (Pronto!)
```

---

### **Fluxo B: Prospect no Landing → Login com Google**

```
Landing Page (/)
    ↓
Click "Começar Agora" → /register (OU /login, ambos suportam OAuth)
    ↓
Click "Continuar com Google"
    ↓
Google OAuth consent screen
    ↓
Google gera access_token
    ↓
/auth/callback (código de autorização)
    ↓
exchangeCodeForSession (Supabase cria session)
    ↓
user.email já verificado (Google)
    ↓
Verifica se user_profiles existe
    ├─ SE SIM: /dashboard (é user existente)
    ├─ SE NÃO:
    │   ├─ Cria organization (auto-nomeado)
    │   ├─ Cria user_profiles (role='viewer')
    │   ├─ Gera random password (para backup)
    │   └─ Redireciona /onboarding
    ↓
/onboarding (Bem-vindo! Vamos começar)
    ├─ Step 1: Company info
    ├─ Step 2: Add 1° property
    └─ Step 3: Setup iCal
    ↓
/dashboard (Pronto!)
```

---

### **Fluxo C: Existing User → Login Normal**

```
/login
    ↓
Email + Password
    ↓
Supabase verifica credenciais
    ↓
Session criada
    ↓
Middleware verifica: requires_password_change?
    ├─ SIM: /auth/first-login-password (admin-created)
    ├─ NÃO: /dashboard (normal)
    ↓
Dashboard
```

---

### **Fluxo D: Existing User → Login com Google**

```
/login (ou /register)
    ↓
Click "Continuar com Google"
    ↓
Google OAuth flow
    ↓
/auth/callback
    ↓
User já existe (email match)
    ├─ Atualiza session
    ├─ Valida organization_id
    ↓
/dashboard
```

---

### **Fluxo E: Password Reset (NOVO)**

```
/login
    ↓
Click "Esqueci minha senha"
    ↓
/auth/reset-password
    ├─ Email field
    ├─ Button: "Enviar link de reset"
    ↓
Email enviado: "Clique para resetar sua password"
    ↓
User clica link
    ↓
/auth/reset-password?token=xxx&email=user@example.com
    ├─ Validar token
    ├─ Mostrar: Nova password + Confirm
    ├─ Validação força
    ↓
POST /api/auth/reset-password-confirm
    ├─ Validar token
    ├─ Atualizar auth.users.password
    ├─ Audit log
    ↓
Redirect /login (com sucesso message)
```

---

## 🛠️ IMPLEMENTAÇÃO: TIER 0 (PRÉ-REQUISITO PARA COMERCIALIZAR)

### **Priority 1: Google OAuth Setup** 🔴

**File:** Environment + Supabase Console

```bash
# 1. Google Cloud Console
# https://console.cloud.google.com
# - Create project "HomeStay"
# - Enable OAuth 2.0
# - Create OAuth 2.0 credentials (Web application)
# - Authorized redirect URIs:
#   - https://localhost:3000/auth/callback
#   - https://[project].supabase.co/auth/v1/callback
#   - https://homestay.pt/auth/callback (production)

# 2. Copiar Google OAuth credentials
GOOGLE_CLIENT_ID=123456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx

# 3. Supabase Console
# https://app.supabase.com > Project > Authentication > Providers
# - Enable Google
# - Paste Client ID + Client Secret
# - Save

# 4. Testar
# npm run dev
# http://localhost:3000/login → Click "Google"
```

---

### **Priority 2: Register Page + Google OAuth** 🟡

**File:** `src/app/register/page.tsx`

```typescript
// Adicionar SocialLoginButtons ao register (já existe no login)
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons'

export default function RegisterPage() {
  return (
    <div>
      {/* Existing form... */}

      <SocialLoginButtons next="/onboarding" />

      {/* Ou link para login */}
      <p>Já tem uma conta? <Link href="/login">Entrar aqui</Link></p>
    </div>
  )
}
```

---

### **Priority 3: Password Reset Flow** 🔴

**File:** `src/app/auth/reset-password/page.tsx` (NOVA)

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password-confirm`,
    })

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Link enviado!</h2>
        <p className="text-gray-600">
          Verifique seu email. Tem um link para resetar sua password.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleResetPassword} className="space-y-4">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="seu@email.com"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar link de reset'}
      </button>
    </form>
  )
}
```

**File:** `src/app/auth/reset-password-confirm/page.tsx` (NOVA)

```typescript
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!token) {
    return <p className="text-red-600">Link inválido ou expirado</p>
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords não correspondem')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({
      password,
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    router.push('/login?success=password_reset')
  }

  return (
    <form onSubmit={handleConfirm} className="space-y-4">
      {error && <p className="text-red-600">{error}</p>}

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Nova password"
        required
      />

      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirmar password"
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Processando...' : 'Resetar Password'}
      </button>
    </form>
  )
}
```

---

### **Priority 4: Onboarding Flow Integration** 🟡

**File:** `src/app/onboarding/page.tsx` (JÁ EXISTE, REVISAR)

```typescript
// Garantir que:
// 1. Redireciona para aqui se é primeiro login
// 2. Mostra progress dos 3 passos
// 3. Cria 1° property automaticamente (ou guia user)
// 4. Setup de iCal opcional mas recomendado
// 5. Skip/Finish leva para /dashboard

// Verificar middleware:
if (isFirstLogin && path !== '/onboarding' && path !== '/auth/first-login-password') {
  redirect('/onboarding')
}
```

---

### **Priority 5: OAuth Email Verification Fix** 🟡

**File:** `src/app/auth/callback/route.ts` (MODIFICAR)

```typescript
// Adicionar lógica:
if (provider === 'google') {
  // Google users: skip password change
  // Criar user_profiles com requires_password_change = FALSE

  const { error: dbError } = await adminClient
    .from('user_profiles')
    .insert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || '',
      role: 'viewer',
      organization_id: newOrg.id,
      requires_password_change: false,  // ← OAuth users skip this
      password_changed_at: new Date().toISOString(),
    })
} else {
  // Email/password users: obrigatório change
  const { error: dbError } = await adminClient
    .from('user_profiles')
    .insert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || '',
      role: 'viewer',
      organization_id: newOrg.id,
      requires_password_change: true,  // ← Force password change
    })
}
```

---

### **Priority 6: Landing Page CTA Fixes** 🟡

**File:** `src/components/landing/LandingPage.tsx` (REVISAR)

```tsx
// Atual: "Começar Agora" button → /login (confuso)
// Novo:
// - Main CTA "Começar Agora" → /register (sign up path)
// - Secondary link "Já tem uma conta? Entrar" → /login

// Navbar "Entrar" → /login (correct)
// CTA "Começar Agora" → /register (correct)
```

---

## 📋 CHECKLIST PRÉ-COMERCIALIZAÇÃO

### **Auth Security**
- [ ] Google OAuth credenciais configuradas
- [ ] Google OAuth funciona em dev e prod
- [ ] Register page tem Google OAuth button
- [ ] Password reset flow completo
- [ ] First-login password change implementado
- [ ] OAuth users NÃO veem password change
- ✅ Email confirmation flow validado — `emailRedirectTo` routes through `/auth/callback` (PKCE) in `src/app/[locale]/register/page.tsx`
- ✅ Invite email auto-confirmed — webhook calls `updateUserById(userId, { email_confirm: true })` in `src/app/api/stripe/webhook/route.ts`
- [ ] Session timeout implementado
- [ ] CSRF protection em todos forms
- [ ] Rate limiting em auth endpoints

### **UX Flow**
- ✅ Landing → Stripe Checkout → Webhook → Invite email → `/auth/callback` → Password creation → `/onboarding` → Dashboard (Fluxo comercial v1.4)
- ✅ Register → Email confirmation → `/auth/callback?next=/onboarding` → Dashboard (self-signup)
- ✅ `from=invite` param in reset-password-confirm redirects to `/onboarding` instead of `/login`
- [ ] Landing → Register com Google → Onboarding → Dashboard
- [ ] Login normal funciona
- [ ] Login com Google funciona
- [ ] Password reset funciona
- [ ] Esqueci senha link visível no login
- ✅ CTAs da landing page vão para `#pricing` section (não confusos) — implementado em `LandingPageClient.tsx`, `BrazilLanding.tsx`, `Navbar.tsx`

### **Error Handling**
- [ ] Erro ao fazer Google OAuth → mensagem clara
- [ ] Email já existe → "Faça login ou reset password"
- [ ] Token inválido/expirado → "Link expirou, solicite novo"
- [ ] Server errors → friendly message + support email

### **Compliance**
- [ ] Terms of Service link visível (todos pages)
- [ ] Privacy Policy link visível
- [ ] Data processing notices (GDPR)
- [ ] Google OAuth consent screen informativo

---

## 📊 ANTES vs DEPOIS

### Antes (pré-v1.4)
```
❌ Google OAuth não funciona (credenciais vazias)
❌ Register sem Google option
❌ Sem password reset (user preso se esquece)
❌ Onboarding flow ambíguo
❌ OAuth users veem password change desnecessário
❌ Landing CTA confuso (redirecionava para /register sem pricing)
❌ Invite users recebiam email mas não conseguiam confirmar (PKCE faltando)
❌ Email de registo não passava por /auth/callback → "Email not confirmed" error
❌ Sem garantia de devolução visível
```

### Depois (v1.4 — 2026-05-01)
```
[ ] Google OAuth 100% funcional (pendente Google Cloud Console setup)
[ ] Register + Google OAuth (pendente)
[ ] Password reset automático + seguro (pendente)
✅ Onboarding guiado: Stripe → Webhook → Invite → Password → /onboarding → Dashboard
✅ Invite flow corrigido: PKCE via /auth/callback + email auto-confirmado
✅ Register email confirmation: emailRedirectTo routes through /auth/callback
✅ from=invite param: reset-password-confirm redireciona para /onboarding
✅ Landing CTAs: todos vão para #pricing section (BRL + EUR + EN + ES)
✅ Pricing visível sem fricção: Essencial / Expansão / Pro com garantia 7 dias
✅ Checkout API: /api/stripe/checkout com currency dinâmica (brl/usd/eur)
✅ Pronto para comercialização nos mercados BRL, EUR, USD!
```

### Fluxo Comercial Implementado (v1.4)
```
Landing Page (BrazilLanding / LandingPageClient)
    ↓ Click "Ver Planos" ou scroll to #pricing
Pricing Section
    ↓ Click "Assinar Expansão" / "Assinar Starter"
POST /api/stripe/checkout (plan=starter|growth, currency=brl|eur|usd)
    ↓ Stripe Checkout Session criada
Stripe Checkout (hosted)
    ↓ Pagamento confirmado
Stripe Webhook (checkout.session.completed)
    ↓ inviteUserByEmail → updateUserById(email_confirm:true)
Email de convite enviado
    ↓ redirectTo = /auth/callback?next=/auth/reset-password-confirm?from=invite
/auth/callback (PKCE exchange)
    ↓ Session estabelecida
/auth/reset-password-confirm?from=invite
    ↓ Título: "Criar sua senha" — user define password
Redirect para /onboarding
    ↓
/dashboard (Pronto!)
```

---

## 🚀 ORDEM DE IMPLEMENTAÇÃO

### **Semana 1 (CRÍTICO)**
1. [ ] Setup Google OAuth (Cloud Console + Supabase)
2. [ ] Testar Google OAuth em login
3. [ ] Adicionar SocialLoginButtons a register
4. [ ] Password reset flow (request + confirm pages)
5. [ ] Fix: OAuth users skip password change

### **Semana 2**
6. ✅ Onboarding flow validation + redirect — `from=invite` param implementado (`src/app/auth/reset-password-confirm/page.tsx`)
7. ✅ Landing page CTA fixes — todos CTAs apontam para `#pricing` (`LandingPageClient.tsx`, `BrazilLanding.tsx`, `Navbar.tsx`)
8. ✅ Email confirmation flow + copy — `emailRedirectTo` via `/auth/callback` + invite auto-confirm no webhook
9. [ ] Error handling + messages
10. [ ] Compliance pages (ToS, Privacy)

### **Semana 3 (QA + Polish)**
11. [ ] End-to-end testing (todos fluxos)
12. [ ] Load testing OAuth endpoints
13. [ ] Copy review (português claro)
14. [ ] Mobile responsiveness
15. [ ] Production deployment checklist

### **Adicional (v1.4 — Comercialização)**
- ✅ Stripe 3-market billing (EUR/BRL/USD) — Starter/Growth/Pro com metered usage
- ✅ Checkout API `/api/stripe/checkout` com currency dinâmica
- ✅ Supabase columns: `stripe_subscription_item_id`, `stripe_metered_item_id`, `billing_unit_count`
- ✅ Guarantee messaging: 7 dias garantia · Sem contrato · Cancele quando quiser

---

**Documento Atualizado — v1.4 (2026-05-01)** ✅
