# ⚙️ AUTOMAÇÃO E CRON JOBS - GUIA COMPLETO

## ✅ O QUE FOI IMPLEMENTADO

### **3 Cron Jobs Automáticos:**

1. **Sincronização iCal** 🔄
   - Frequência: A cada hora
   - Função: Importa reservas automaticamente
   - Endpoint: `/api/cron/sync-ical`

2. **Check-ins Diários** 📅
   - Frequência: Diariamente às 8h
   - Função: Lista check-ins e check-outs do dia
   - Endpoint: `/api/cron/daily-checkins`

3. **Limpeza de Dados** 🧹
   - Frequência: Semanalmente (Domingo 2h)
   - Função: Remove reservas canceladas antigas
   - Endpoint: `/api/cron/cleanup`

### **Página de Admin:** `/admin`
- Executar jobs manualmente
- Ver resultados em tempo real
- Instruções de configuração

---

## 📦 INSTALAÇÃO

```bash
cd ~/Projetos/home-stay

# Parar (Ctrl+C)
tar -xzf ~/Downloads/home-stay-v10-automacao-completa.tar.gz --strip-components=1

# Configurar .env.local
nano .env.local
# Adicione:
# CRON_SECRET=sua-chave-secreta-super-forte

# Limpar cache
rm -rf .next

# Iniciar
npm run dev
```

---

## 🧪 COMO TESTAR

### **Passo 1: Acessar Admin**

1. Vá para: `http://localhost:3000/admin`
2. Veja os 3 cron jobs disponíveis

---

### **Passo 2: Testar Sincronização iCal**

**Pré-requisito:** Tenha pelo menos 1 anúncio com:
- `sync_enabled = true`
- `ical_url` preenchida

**Teste:**
1. Na página `/admin`
2. Encontre **"Sincronização iCal"**
3. Clique em **"Executar Agora"**
4. Aguarde (~5-10 segundos)
5. Veja resultado:
   ```json
   {
     "success": true,
     "synced": 1,
     "created": 3,
     "updated": 0,
     "skipped": 1
   }
   ```

**Verificar:**
- Vá para `/reservations`
- Procure reservas com `booking_source = ical_auto_sync`

---

### **Passo 3: Testar Check-ins Diários**

**Teste:**
1. Crie uma reserva com `check_in = hoje`
2. No `/admin`, execute **"Check-ins Diários"**
3. Veja resultado:
   ```json
   {
     "success": true,
     "checkIns": { "count": 1 },
     "checkOuts": { "count": 0 }
   }
   ```

---

### **Passo 4: Testar Limpeza**

**Teste:**
1. Execute **"Limpeza de Dados"**
2. Veja quantas reservas antigas foram contadas
3. Resultado esperado:
   ```json
   {
     "success": true,
     "oldCancelledReservations": 0,
     "action": "counted"
   }
   ```

---

## 🔒 SEGURANÇA

### **Configurar CRON_SECRET**

**No arquivo `.env.local`:**
```bash
CRON_SECRET=minha-chave-super-secreta-123456
```

**Gere uma chave forte:**
```bash
openssl rand -base64 32
```

---

## 🚀 DEPLOY EM PRODUÇÃO (VERCEL)

### **Passo 1: Deploy**
```bash
vercel --prod
```

### **Passo 2: Configurar Variável**
1. Vercel Dashboard → Seu Projeto
2. Settings → Environment Variables
3. Adicionar:
   - Name: `CRON_SECRET`
   - Value: `sua-chave-secreta`
   - Environment: Production

### **Passo 3: Verificar Crons**
1. Vercel Dashboard → Cron Jobs
2. Deve mostrar os 3 jobs configurados
3. Ver próxima execução

### **Passo 4: Monitorar Logs**
```bash
vercel logs --follow
```

Ou via Dashboard:
- Vercel → Logs → Filtrar: "/api/cron"

---

## 📊 FORMATO DAS RESPOSTAS

### **Sincronização iCal - Sucesso:**
```json
{
  "success": true,
  "synced": 2,
  "created": 5,
  "updated": 3,
  "skipped": 1,
  "errors": 0,
  "timestamp": "2026-01-14T10:00:00Z"
}
```

### **Check-ins - Sucesso:**
```json
{
  "success": true,
  "date": "2026-01-14",
  "checkIns": {
    "count": 2,
    "reservations": [...]
  },
  "checkOuts": {
    "count": 1,
    "reservations": [...]
  }
}
```

### **Limpeza - Sucesso:**
```json
{
  "success": true,
  "cutoffDate": "2024-01-14",
  "oldCancelledReservations": 5,
  "action": "counted"
}
```

---

## 🔧 TESTAR MANUALMENTE VIA CURL

### **Sincronização:**
```bash
curl -X GET http://localhost:3000/api/cron/sync-ical \
  -H "Authorization: Bearer sua-chave-secreta"
```

### **Check-ins:**
```bash
curl -X GET http://localhost:3000/api/cron/daily-checkins \
  -H "Authorization: Bearer sua-chave-secreta"
```

### **Limpeza:**
```bash
curl -X GET http://localhost:3000/api/cron/cleanup \
  -H "Authorization: Bearer sua-chave-secreta"
```

---

## ⚠️ TROUBLESHOOTING

### **Erro 401 Unauthorized:**
- Verificar `CRON_SECRET` no `.env.local`
- Verificar header `Authorization: Bearer ...`

### **Cron não executa em produção:**
- Verificar `vercel.json` está no root do projeto
- Verificar `CRON_SECRET` configurado no Vercel
- Ver logs: `vercel logs`

### **Timeout:**
- Vercel Hobby: limite de 10 segundos
- Vercel Pro: limite de 300 segundos
- Otimizar queries se necessário

---

## 📝 AGENDAMENTOS CONFIGURADOS

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-ical",
      "schedule": "0 * * * *"  // A cada hora
    },
    {
      "path": "/api/cron/daily-checkins",
      "schedule": "0 8 * * *"  // Diariamente às 8h
    },
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * 0"  // Domingos às 2h
    }
  ]
}
```

---

## 🎯 PRÓXIMOS PASSOS

### **Adicionar Notificações:**
1. Integrar SendGrid/Resend
2. Enviar email nos check-ins
3. Alertas de sincronização falhada

### **Adicionar Backup:**
1. Backup automático do Supabase
2. Exportar dados mensalmente
3. Armazenar no S3/Cloudflare R2

### **Melhorar Relatórios:**
1. Relatório semanal por email
2. Alerta de ocupação baixa
3. Resumo financeiro mensal

---

## ✅ CHECKLIST DE TESTE

- [ ] Acessar `/admin`
- [ ] Executar "Sincronização iCal"
- [ ] Executar "Check-ins Diários"
- [ ] Executar "Limpeza"
- [ ] Verificar resultados em tempo real
- [ ] Verificar novas reservas em `/reservations`
- [ ] Testar com cURL
- [ ] Configurar `CRON_SECRET`
- [ ] Deploy no Vercel
- [ ] Verificar logs em produção

---

## 🎊 SISTEMA COMPLETO!

Você agora tem:
- ✅ Sincronização automática de reservas
- ✅ Verificação diária de check-ins
- ✅ Limpeza automática de dados
- ✅ Interface de administração
- ✅ Execução manual para testes
- ✅ Pronto para produção no Vercel

---

**Teste tudo e aproveite a automação!** ⚙️🚀
