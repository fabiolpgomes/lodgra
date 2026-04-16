# 🚀 GUIA DE DEPLOY - VERCEL

## ✅ **PRÉ-REQUISITOS**

Antes de começar:
1. Conta GitHub (https://github.com/signup)
2. Conta Vercel (https://vercel.com/signup)
3. Git instalado no Mac

---

## 📋 **PASSO A PASSO COMPLETO**

### **PASSO 1: CRIAR REPOSITÓRIO NO GITHUB**

1. Acesse: https://github.com/new
2. Nome do repositório: `home-stay`
3. Deixe **Private** (privado)
4. **NÃO** marque "Add a README"
5. Clique: **"Create repository"**

---

### **PASSO 2: SUBIR CÓDIGO PARA O GITHUB**

No terminal do Mac:

```bash
cd ~/Projetos/home-stay

# Inicializar Git
git init

# Adicionar todos os arquivos
git add .

# Primeiro commit
git commit -m "Sistema Home Stay completo v13"

# Conectar com GitHub (SUBSTITUA seu-usuario)
git remote add origin https://github.com/seu-usuario/home-stay.git

# Renomear branch para main
git branch -M main

# Enviar para GitHub
git push -u origin main
```

**ATENÇÃO:** Vai pedir usuário e senha do GitHub!
- Usuário: seu email do GitHub
- Senha: use um **Personal Access Token** (não a senha normal)

### **Como criar Personal Access Token:**
1. GitHub → Settings → Developer settings
2. Personal access tokens → Tokens (classic)
3. Generate new token
4. Marque: `repo` (full control)
5. Copie o token e use como senha

---

### **PASSO 3: CONECTAR VERCEL AO GITHUB**

1. Acesse: https://vercel.com/login
2. Faça login com GitHub
3. Autorize o Vercel

---

### **PASSO 4: FAZER DEPLOY**

1. No Vercel Dashboard, clique: **"Add New Project"**
2. Selecione: **"Import Git Repository"**
3. Encontre: `home-stay`
4. Clique: **"Import"**

**CONFIGURAÇÃO:**

- Framework Preset: **Next.js** (detecta automático)
- Root Directory: `.` (deixar assim)
- Build Command: `npm run build` (automático)

**IMPORTANTE - VARIÁVEIS DE AMBIENTE:**

Clique em: **"Environment Variables"**

Adicione:

```
Nome: NEXT_PUBLIC_SUPABASE_URL
Valor: https://brjumbfpvijrkhzherpt.supabase.co

Nome: NEXT_PUBLIC_SUPABASE_ANON_KEY
Valor: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyanVtYmZwdmlqcmtoemhlcnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NDY0NzQsImV4cCI6MjA4MzQyMjQ3NH0.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyanVtYmZwdmlqcmtoemhlcnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NDY0NzQsImV4cCI6MjA4MzQyMjQ3NH0

Nome: CRON_SECRET
Valor: homestay-prod-2026-MUDE-ESTA-CHAVE
```

5. Clique: **"Deploy"**

---

### **PASSO 5: AGUARDAR BUILD**

O Vercel vai:
1. Baixar código ✅
2. Instalar dependências ✅
3. Build do Next.js ✅
4. Deploy ✅

**Tempo:** 2-3 minutos

---

### **PASSO 6: ACESSAR SEU SISTEMA!**

Após o deploy, você terá:

```
https://home-stay-xxx.vercel.app
```

Clique no link e **PRONTO**! 🎉

---

## 🎯 **CONFIGURAR CRON JOBS**

Os cron jobs já estão configurados no `vercel.json`!

Eles vão rodar automaticamente:
- Sync iCal: A cada hora
- Check-ins: Todo dia às 8h
- Cleanup: Domingo às 2h

---

## 🔒 **SEGURANÇA**

### **Mudar CRON_SECRET:**

1. Vercel Dashboard → Seu projeto
2. Settings → Environment Variables
3. Editar `CRON_SECRET`
4. Valor novo: `homestay-[seu-nome]-[ano]-[palavra-secreta]`
5. Redeploy

### **Configurar Domínio Próprio (Opcional):**

1. Vercel → Seu projeto → Settings → Domains
2. Adicionar seu domínio
3. Configurar DNS

---

## 📱 **ACESSAR DE QUALQUER LUGAR**

Agora você pode acessar de:
- ✅ Computador
- ✅ Celular
- ✅ Tablet
- ✅ Qualquer navegador

---

## 🐛 **TROUBLESHOOTING**

### **Erro de Build:**
- Verifique se todas as variáveis de ambiente estão corretas
- Veja os logs no Vercel Dashboard

### **Erro 500:**
- Verifique conexão com Supabase
- Confira se as variáveis estão certas

### **Cron Jobs não funcionam:**
- Verifique se `CRON_SECRET` está configurado
- Aguarde 1 hora para primeiro sync

---

## ✅ **CHECKLIST FINAL**

- [ ] Código no GitHub
- [ ] Deploy no Vercel feito
- [ ] Variáveis de ambiente configuradas
- [ ] Site acessível
- [ ] Login funciona
- [ ] Dados aparecem
- [ ] CRON_SECRET mudado

---

## 🎊 **PARABÉNS!**

Seu sistema está **NO AR**! 🚀

Acesse de qualquer lugar:
`https://home-stay-xxx.vercel.app`

---

**Siga os passos acima e me avise quando chegar no PASSO 4!** 🎯
