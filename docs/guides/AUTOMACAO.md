# ⚙️ AUTOMAÇÃO E CRON JOBS

## ✅ O QUE FOI IMPLEMENTADO

### **1. Cron Jobs Automáticos**

**Sincronização iCal** (`/api/cron/sync-ical`)
- **Frequência:** A cada hora
- **Função:** Importa reservas automaticamente de todas as plataformas
- **Cron:** `0 * * * *`

**Check-ins Diários** (`/api/cron/daily-checkins`)
- **Frequência:** Diariamente às 8h
- **Função:** Lista check-ins e check-outs do dia
- **Cron:** `0 8 * * *`
- **Preparado para:** Envio de notificações por email

**Limpeza de Dados** (`/api/cron/cleanup`)
- **Frequência:** Semanalmente (Domingo às 2h)
- **Função:** Remove/arquiva reservas canceladas antigas (>2 anos)
- **Cron:** `0 2 * * 0`

---

### **2. Página de Administração** (`/admin`)
- Executar cron jobs manualmente
- Ver resultados em tempo real
- Monitorar status de execução
- Instruções de configuração

---

## 🚀 COMO USAR

### **Desenvolvimento (Local)**

1. Acesse: `http://localhost:3000/admin`
2. Clique em "Executar Agora" em qualquer job
3. Veja o resultado em tempo real

### **Produção (Vercel)**

1. **Deploy no Vercel**
   ```bash
   vercel --prod
   ```

2. **Configurar Variável de Ambiente**
   - Vá em: Vercel Dashboard → Settings → Environment Variables
   - Adicione: `CRON_SECRET` = `sua-chave-secreta-aqui`

3. **Verificar Logs**
   - Vercel Dashboard → Logs → Filtrar por "/api/cron"

---

## 🔒 SEGURANÇA

Todos os endpoints de cron jobs requerem autenticação via header:
```
Authorization: Bearer SEU_CRON_SECRET
```

**Importante:** Mude o valor padrão de `CRON_SECRET` em produção!

---

## 📝 FORMATO CRON

```
┌────────────── minuto (0 - 59)
│ ┌──────────── hora (0 - 23)
│ │ ┌────────── dia do mês (1 - 31)
│ │ │ ┌──────── mês (1 - 12)
│ │ │ │ ┌────── dia da semana (0 - 6) (0 = Domingo)
│ │ │ │ │
* * * * *
```

**Exemplos:**
- `0 * * * *` = A cada hora
- `0 8 * * *` = Diariamente às 8h
- `0 2 * * 0` = Domingos às 2h
- `*/30 * * * *` = A cada 30 minutos

---

## 🔧 ADICIONAR NOVOS CRON JOBS

### **Passo 1: Criar API Route**

```typescript
// src/app/api/cron/meu-job/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Verificar autenticação
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Sua lógica aqui
  
  return NextResponse.json({ success: true })
}
```

### **Passo 2: Adicionar em vercel.json**

```json
{
  "crons": [
    {
      "path": "/api/cron/meu-job",
      "schedule": "0 12 * * *"
    }
  ]
}
```

### **Passo 3: Adicionar no Admin**

Edite: `src/components/admin/CronJobsManager.tsx`

---

## 📊 MONITORAMENTO

### **Ver Logs em Produção:**
```bash
vercel logs --follow
```

### **Testar Localmente:**
```bash
curl -H "Authorization: Bearer your-secret" \
  http://localhost:3000/api/cron/sync-ical
```

---

## ⚡ MELHORIAS FUTURAS

**Notificações:**
- Integrar SendGrid/Resend para emails
- WhatsApp via Twilio
- Slack webhooks

**Backup:**
- Backup automático do Supabase
- Exportação de dados
- Histórico de backups

**Relatórios:**
- Relatórios semanais por email
- Alertas de ocupação baixa
- Notificações de pagamentos

---

## 🆘 TROUBLESHOOTING

**Cron não executa:**
- Verificar `vercel.json` está no root
- Verificar `CRON_SECRET` configurado
- Ver logs no Vercel Dashboard

**Erro 401 Unauthorized:**
- Verificar header de autorização
- Verificar valor de `CRON_SECRET`

**Timeout:**
- Cron jobs no Vercel têm limite de 10s (Hobby) ou 300s (Pro)
- Otimizar queries ou dividir em múltiplos jobs

---

## 📚 REFERÊNCIAS

- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Crontab Guru](https://crontab.guru/) - Testar expressões cron
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
