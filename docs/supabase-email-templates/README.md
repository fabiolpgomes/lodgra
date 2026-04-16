# 📧 Customização de Email Templates - Supabase

Guia completo para aplicar templates de email customizados no Supabase Auth.

---

## 📋 Templates Disponíveis

### 1. **Reset Password** (`reset-password-template.html`)
Email de recuperação de password com botão clicável.

**Quando é enviado:** Quando o utilizador clica em "Esqueci a password"

**Variáveis disponíveis:**
- `{{ .SiteURL }}` — URL da aplicação
- `{{ .Token }}` — Código de reset
- `{{ .Email }}` — Email do utilizador

**Cor:** Azul (`#2563eb`)

---

### 2. **Welcome Email** (`welcome-template.html`)
Email de boas-vindas com próximos passos e features.

**Quando é enviado:** Quando o utilizador se regista (após confirmação de email)

**Variáveis disponíveis:**
- `{{ .SiteURL }}` — URL da aplicação
- `{{ .Email }}` — Email do utilizador

**Cor:** Azul (`#2563eb`)

---

### 3. **Email Verification** (`email-verification-template.html`)
Email de confirmação de email com instruções de segurança.

**Quando é enviado:** Logo após registo, antes da conta ser ativada

**Variáveis disponíveis:**
- `{{ .SiteURL }}` — URL da aplicação
- `{{ .ConfirmationURL }}` — URL de confirmação completa
- `{{ .Email }}` — Email do utilizador

**Cor:** Azul (`#2563eb`)

**Características:**
- Botão "Confirmar Email"
- Box de segurança com aviso
- Instrções passo a passo
- Validade de 24 horas

---

### 4. **Magic Link** (`magic-link-template.html`)
Email de login passwordless (Magic Link).

**Quando é enviado:** Quando o utilizador usa login com email (sem password)

**Variáveis disponíveis:**
- `{{ .SiteURL }}` — URL da aplicação
- `{{ .Token }}` — Token do Magic Link
- `{{ .ConfirmationURL }}` — URL completa do link

**Cor:** Roxo (`#a855f7`)

**Características:**
- Botão "Fazer Login Agora"
- Timer de expiração (15 minutos)
- Aviso de segurança
- Features list (sem password, mais seguro, etc)

---

## 🚀 Como Aplicar cada Template

### Passo 1: Aceda ao Supabase Dashboard
```
https://supabase.com/dashboard
```
- Selecione o projeto **home-stay**

### Passo 2: Navegue até Email Templates
```
Authentication → Email Templates
```

### Passo 3: Procure o Template que Quer Editar

| Email | Localização no Supabase | Ficheiro |
|-------|------------------------|----------|
| Reset Password | "Reset Password" | `reset-password-template.html` |
| Boas-vindas | "Confirm signup" ou "Welcome" | `welcome-template.html` |
| Email Verification | "Confirm signup" (se não usar Welcome) | `email-verification-template.html` |
| Magic Link | "Magic Link" ou "Passwordless" | `magic-link-template.html` |

**Clique no ícone de editar (lápis) ao lado do template escolhido.**

### Passo 4: Copie e Cole o Novo Template

1. Abra o ficheiro HTML da pasta
2. **Selecione e copie TODO o conteúdo**
3. No Supabase, apague o conteúdo atual
4. **Cole o novo template**
5. Clique em **Save**

### Passo 5: Teste

1. Vá a `/auth/reset-password` (para Reset) ou `/login` → "Sign up" (para Welcome)
2. Introduza um email
3. Verifique a caixa de entrada
4. ✅ Confirme que o email tem o novo design

---

## 🎨 Personalização

### Mudar Cores

Abra o ficheiro HTML e procure a seção `<style>`.

**Cores populares:**

| Cor | Código | Gradient |
|-----|--------|----------|
| Azul (atual) | `#2563eb` | `linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)` |
| Verde | `#10b981` | `linear-gradient(135deg, #10b981 0%, #059669 100%)` |
| Laranja | `#f97316` | `linear-gradient(135deg, #f97316 0%, #ea580c 100%)` |
| Roxo | `#a855f7` | `linear-gradient(135deg, #a855f7 0%, #9333ea 100%)` |

**Exemplo - trocar para verde:**
```css
.header {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}
.cta-button {
    background-color: #10b981;
}
.cta-button:hover {
    background-color: #059669;
}
```

### Mudar Texto do Botão

Procure:
```html
<a href="{{ .SiteURL }}/..." class="cta-button">
    AQUI VAI O TEXTO
</a>
```

### Adicionar Logo

Adicione no topo do `.header`:
```html
<img src="https://seu-dominio.com/logo.png" alt="Home Stay" 
     style="height: 40px; margin-bottom: 15px;">
```

### Mudar Texto de Saudação (Welcome)

Procure:
```html
<h1>🏠 Bem-vindo ao Home Stay!</h1>
<p>Bem-vindo à <span class="highlight">Home Stay</span>, a plataforma...</p>
```

---

## 📊 Checklist de Aplicação

- [ ] **Reset Password**
  - [ ] Abri Supabase Dashboard
  - [ ] Naveguei até Authentication → Email Templates
  - [ ] Localizei "Reset Password"
  - [ ] Copiei todo o conteúdo de `reset-password-template.html`
  - [ ] Colei no editor do Supabase
  - [ ] Cliquei em Save
  - [ ] Testei clicando "Esqueci a password"

- [ ] **Welcome Email**
  - [ ] Localizei "Confirm signup" ou "Welcome"
  - [ ] Copiei todo o conteúdo de `welcome-template.html`
  - [ ] Colei no editor do Supabase
  - [ ] Cliquei em Save
  - [ ] Testei registando nova conta

- [ ] **Email Verification**
  - [ ] Localizei "Confirm signup" (se usar este em vez de Welcome)
  - [ ] Copiei todo o conteúdo de `email-verification-template.html`
  - [ ] Colei no editor do Supabase
  - [ ] Cliquei em Save
  - [ ] Testei com novo registo

- [ ] **Magic Link** (Opcional - se usar passwordless)
  - [ ] Localizei "Magic Link" ou "Passwordless"
  - [ ] Copiei todo o conteúdo de `magic-link-template.html`
  - [ ] Colei no editor do Supabase
  - [ ] Cliquei em Save
  - [ ] Testei solicitando Magic Link no login

---

## 🔧 Resolução de Problemas

### "Template não atualiza"
✅ **Solução:** Limpe a cache do navegador
- Mac: `Cmd + Shift + R`
- Windows: `Ctrl + Shift + R`
- Aguarde 5 minutos para propagação

### "Email ainda mostra texto antigo"
✅ **Solução:** 
- Verifique se clicou em **Save** no Supabase
- Tente registar um novo utilizador ou resetar com outro email
- Alguns clientes de email têm cache próprio

### "Caracteres estranhos ou quebrados"
✅ **Solução:**
- Certifique-se que copiar/colar preserva a formatação HTML
- Tente copiar direto do ficheiro sem passar por editor intermediário

### "Botão não é clicável"
✅ **Solução:**
- Alguns clientes de email antigos (ex: Outlook 2016) não suportam botões HTML bem
- O template tem fallback com URL em texto
- O utilizador pode copiar/colar o link manualmente

---

## 📁 Estrutura de Ficheiros

```
docs/supabase-email-templates/
├── README.md                      ← Este ficheiro
├── INSTRUCOES.md                  ← Instruções detalhadas (antigo)
├── reset-password-template.html   ← Template de reset de password
└── welcome-template.html          ← Template de boas-vindas
```

---

## 🎯 Próximos Passos (Opcional)

✅ **Já criados:**
- Email Verification — Confirmar novo email
- Magic Link — Login com link (passwordless)

**Pode criar mais se necessário:**
1. **Account Locked** — Tentativas de login falhadas
2. **Team Invitation** — Convidar utilizador para organização
3. **Email Changed** — Mudança de email
4. **Phone Verification** — Confirmação de telemóvel

Contacte `@dev` se quiser criar mais templates.

---

## 📞 Suporte

- **Documentação Supabase:** https://supabase.com/docs/guides/auth/custom-emails
- **Email da aplicação:** support@homestay.pt
- **Desenvolvedor:** @dev (Dex)

---

**Última atualização:** 13 de Abril de 2026  
**Status:** ✅ Pronto para aplicar  
**Versão:** 1.0
