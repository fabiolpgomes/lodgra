# Setup Google OAuth — Passo a Passo

## 1️⃣ Google Cloud Console Setup

### Passo 1: Criar Projeto
1. Aceda a [Google Cloud Console](https://console.cloud.google.com)
2. Click em "Select a Project" (canto superior esquerdo)
3. Click "NEW PROJECT"
4. Nome: `HomeStay`
5. Click "CREATE"

---

### Passo 2: Ativar Google+ API
1. No menu lateral: "APIs & Services" → "Enabled APIs & services"
2. Click "+ ENABLE APIS AND SERVICES" (topo)
3. Procura: "Google+ API"
4. Click em "Google+ API"
5. Click "ENABLE"

---

### Passo 3: Criar OAuth 2.0 Credentials
1. Menu lateral: "APIs & Services" → "Credentials"
2. Click "+ CREATE CREDENTIALS" (topo)
3. Seleciona: "OAuth 2.0 Client IDs"
4. **Popup:** "You need to create an OAuth 2.0 consent screen first"
5. Click "CREATE CONSENT SCREEN"

---

### Passo 4: OAuth Consent Screen
1. **User Type:** Seleciona "External"
2. Click "CREATE"
3. **Preench o formulário:**
   ```
   App name: HomeStay
   User support email: seu-email@example.com
   App logo: (opcional)
   ```
4. Scroll para baixo, fill Developer contact info
5. Click "SAVE AND CONTINUE"

6. **Scopes screen:** Click "SAVE AND CONTINUE" (defaults OK)

7. **Test users:** Adiciona seu email como test user
   - Click "ADD USERS"
   - Digita: seu-email@example.com
   - Click "ADD"
   - Click "SAVE AND CONTINUE"

8. Click "BACK TO DASHBOARD"

---

### Passo 5: Voltar para Credentials
1. Menu lateral: "APIs & Services" → "Credentials"
2. Click "+ CREATE CREDENTIALS" (topo)
3. Seleciona: "OAuth 2.0 Client IDs"
4. **Application type:** "Web application"
5. **Name:** `HomeStay Web`
6. **Authorized JavaScript origins:**
   ```
   http://localhost:3000
   https://homestay.pt
   https://[seu-projeto].vercel.app
   ```
   (Adiciona todas as URLs onde vai rodar)

7. **Authorized redirect URIs:**
   ```
   http://localhost:3000/auth/callback
   https://homestay.pt/auth/callback
   https://[seu-projeto].vercel.app/auth/callback
   https://[seu-projeto].supabase.co/auth/v1/callback
   ```

8. Click "CREATE"

9. **Popup com credenciais:**
   - Copia `Client ID`
   - Copia `Client Secret`
   - Guarda num local seguro! ⚠️

---

## 2️⃣ Supabase Setup

### Passo 1: Configurar Google Provider
1. Aceda a [Supabase Dashboard](https://app.supabase.com)
2. Seleciona o projeto HomeStay
3. Menu lateral: "Authentication" → "Providers"
4. Procura "Google"
5. Click para expandir
6. Ativa o toggle (ON)
7. Cola as credenciais:
   ```
   Client ID: [cole do Google Cloud]
   Client Secret: [cole do Google Cloud]
   ```
8. Click "SAVE"

---

### Passo 2: Verificar Redirect URLs
1. Na mesma página (Providers), em cima vê "Redirect URL"
2. Exemplo: `https://[seu-projeto].supabase.co/auth/v1/callback`
3. **Adiciona esta URL no Google Cloud Console:**
   - Volta a Google Cloud Console
   - Credentials → Edita "HomeStay Web"
   - Authorized redirect URIs
   - Adiciona: `https://[seu-projeto].supabase.co/auth/v1/callback`
   - SAVE

---

## 3️⃣ Variáveis de Ambiente

### Arquivo: `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://[seu-projeto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[sua-chave]
```

**Nota:** Supabase cuida das credenciais internamente. Você não precisa adicionar GOOGLE_CLIENT_ID no .env!

---

## 4️⃣ Testar Localmente

```bash
npm run dev
# Abre http://localhost:3000/login

# Click "Continuar com Google"
# Deve redirecionar para Google login
# Depois voltar para /auth/callback
# E redirecionar para /dashboard ou /onboarding
```

**Se não funcionar:**
- Verifica se `http://localhost:3000` está em "Authorized JavaScript origins" (Google Cloud)
- Verifica se está logado com o email que adicionou como test user
- Limpa cookies (F12 → Application → Cookies → Delete)
- Tenta novamente

---

## 5️⃣ Deploy para Produção

### Vercel Environment Variables
1. [Vercel Dashboard](https://vercel.com) → Projeto HomeStay
2. Settings → Environment Variables
3. Não precisa adicionar GOOGLE_CLIENT_ID (Supabase gerencia)

### Google Cloud Console
1. Adiciona URLs de produção:
   - JavaScript origins: `https://homestay.pt`
   - Redirect URIs: `https://homestay.pt/auth/callback`

2. Se usar Vercel preview deployments:
   - Adiciona também: `https://[branch].homestay.vercel.app`
   - Redirect: `https://[branch].homestay.vercel.app/auth/callback`

---

## ✅ Checklist Final

- [ ] Google Cloud Project criado
- [ ] Google+ API ativada
- [ ] OAuth Consent Screen configurado
- [ ] Client ID e Secret gerados
- [ ] URLs adicionadas em Google Cloud
- [ ] Supabase: Google Provider ativado
- [ ] Supabase credentials adicionadas
- [ ] .env.local tem SUPABASE_URL + ANON_KEY
- [ ] Teste local: Google login funciona
- [ ] Teste production: Google login funciona

---

**⏱️ Tempo:** 15-20 minutos

**🔐 Segurança:** Guarda Client Secret num password manager, não no Git!
