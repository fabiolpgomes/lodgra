# 📊 Guia Comparativo de Templates de Email

Diferenças, casos de uso, e quando usar cada template.

---

## 🔄 Email Verification vs Magic Link vs Welcome

| Aspecto | Email Verification | Magic Link | Welcome |
|--------|-------------------|-----------|---------|
| **Quando é enviado** | Logo após registo | Quando pede login sem password | Após confirmar email |
| **Propósito** | Confirmar propriedade do email | Login instantâneo | Boas-vindas + próximos passos |
| **Ação requerida** | Clicar para ativar conta | Clicar para fazer login | Apenas ler (informativo) |
| **Duração do link** | 24 horas | 15 minutos | Sem link (apenas informação) |
| **Fluxo típico** | Registo → Confirm Email → Criar Password → Login | Pedir Magic Link → Clicar link → Login instantâneo | - |
| **Segurança** | Média (confirma email) | Alta (link temporário) | Nenhuma (informativo) |
| **Cor** | Azul | Roxo | Azul |

---

## 🎯 Casos de Uso

### Email Verification (Confirmação de Email)
**Use quando:**
- ✅ Quer confirmar que o utilizador tem acesso ao email informado
- ✅ Quer evitar spam/emails falsos no registo
- ✅ Precisa de ativar a conta manualmente antes de usar
- ✅ Usa autenticação com password tradicional

**Fluxo:**
```
1. Utilizador regista-se
2. Recebe email com botão "Confirmar Email"
3. Clica no botão
4. Conta é ativada
5. Pode fazer login com password
```

**Bom para:** Aplicações que usam password tradicional e querem segurança extra.

---

### Magic Link (Passwordless)
**Use quando:**
- ✅ Quer eliminar passwords completamente
- ✅ Quer experiência de login mais rápida
- ✅ Quer máxima segurança (sem risco de passwords fracas)
- ✅ Quer permitir login em múltiplos dispositivos

**Fluxo:**
```
1. Utilizador entra email no login
2. Recebe email com botão "Fazer Login Agora"
3. Clica no botão
4. Faz login instantaneamente
5. Sem necessidade de password
```

**Bom para:** Aplicações modernas que prioritizam UX e segurança.

---

### Welcome Email (Boas-vindas)
**Use quando:**
- ✅ Quer dar boas-vindas à nova conta
- ✅ Quer dar próximos passos claros
- ✅ Quer mostrar features da plataforma
- ✅ Quer reduzir confusion em novo utilizador

**Fluxo:**
```
1. Utilizador se registou e confirmou email
2. Recebe email de boas-vindas
3. Lê instruções e próximos passos
4. Vai para dashboard
```

**Bom para:** Onboarding melhorado + redução de suporte inicial.

---

## 🛠️ Recomendação para Home Stay

### Cenário 1: Foco em Segurança (Recomendado)
```
Email Verification + Password Tradicional
├── Novo utilizador regista-se
├── Recebe: Email Verification
├── Clica para ativar conta
├── Escolhe password
├── Recebe: Welcome Email (opcional)
└── Faz login normalmente
```

**Vantagens:**
- ✅ Segurança tradicional comprovada
- ✅ Controlo total do utilizador
- ✅ Familiar para maioria dos utilizadores
- ✅ Compatível com 2FA

---

### Cenário 2: Foco em UX Rápida (Moderno)
```
Magic Link (Sem Password)
├── Novo utilizador entra email
├── Recebe: Magic Link
├── Clica para fazer login
├── Já está autenticado
└── Acesso instantâneo
```

**Vantagens:**
- ✅ Login em 1 clique
- ✅ Sem passwords para memorizar
- ✅ Máxima segurança
- ✅ Melhor UX

---

### Cenário 3: Híbrido (Melhor Balanceado)
```
Email Verification + Welcome + Opcional Magic Link
├── Novo utilizador regista-se
├── Recebe: Email Verification
├── Ativa conta + cria password
├── Recebe: Welcome Email
├── Login com password (normal) ou Magic Link (opcional)
└── Flexibilidade máxima
```

**Vantagens:**
- ✅ Segurança completa
- ✅ Flexibilidade (password ou magic link)
- ✅ Boas-vindas integradas
- ✅ Melhor onboarding

---

## 🚀 Implementação Recomendada para Home Stay

**Recomendação: Cenário 3 (Híbrido)**

1. **Email Verification** — Para confirmar propriedade do email
2. **Welcome Email** — Para boas-vindas e onboarding
3. **Magic Link** (opcional) — Para login alternativo

**Razões:**
- Home Stay é uma plataforma SaaS profissional
- Utilizadores já conhecem password
- Mas apreciam velocidade (Magic Link)
- Email Verification reduz spam/fake accounts
- Welcome ajuda novo utilizadores

---

## 🔧 Como Implementar

### Passo 1: Email Verification
```
Supabase Dashboard
→ Authentication → Email Templates
→ "Confirm signup"
→ Colar: email-verification-template.html
→ Save
```

### Passo 2: Welcome Email
```
Supabase Dashboard
→ Authentication → Email Templates
→ "Confirm signup" (seção de welcome/post-confirmation)
→ Colar: welcome-template.html
→ Save
```

Nota: Alguns Supabase projects têm "Confirm signup" separado de "Welcome". Verifique qual existe no seu projeto.

### Passo 3: Magic Link (Opcional)
```
Supabase Dashboard
→ Authentication → Email Templates
→ "Magic Link"
→ Colar: magic-link-template.html
→ Save
```

**Só faça isto se já permitir passwordless na app.**

---

## ⚠️ Cuidados Importantes

### Email Verification
- ✅ Link expira em 24 horas (padrão Supabase)
- ✅ Utilizador não pode fazer login até confirmar
- ⚠️ Se email expirar, pode permitir novo envio

### Magic Link
- ✅ Link expira em 15 minutos (mais seguro)
- ✅ Sem password = sem reset de password
- ⚠️ Se perder email, pode pedir novo Magic Link
- ⚠️ Não funciona se email não receber a mensagem

### Welcome Email
- ✅ Apenas informativo (sem action requerida)
- ⚠️ Usar após Email Verification estar confirmado

---

## 📞 Próximas Questões?

- **Qual cenário escolher?** → Recomendamos o Híbrido (3)
- **Posso usar ambos?** → Sim! Email Verification + Magic Link coexistem
- **E se mudar de ideia?** → Pode trocar templates a qualquer momento no Supabase
- **Preciso de códigos?** → Não, templates Supabase são suficientes

---

**Data:** 13 de Abril de 2026  
**Recomendação:** Cenário 3 (Híbrido) para Home Stay  
**Status:** Pronto para implementar
