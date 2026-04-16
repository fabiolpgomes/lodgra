# Booking.com Integration — Deployment & Next Steps

**Status:** Implementation COMPLETE (120/120 tests, QA PASS 9.3/10)
**Date:** 2026-03-31
**Decision:** Option C (Webhook) ✅ DEPLOY | Option A (iCal) ❌ SKIP | Option B (Zapier) ❌ NOT NEEDED

---

## 🎯 Strategic Decision

### Why NOT Implement Option A (iCal Feed)

| Aspecto | Option A (iCal) | Option C (Webhook) |
|---------|-----------------|-------------------|
| **Status Implementação** | Precisa implementar | ✅ Já implementado |
| **Tests** | — | 120/120 PASSING |
| **QA Gate** | — | PASS (9.3/10) |
| **Real-time** | ❌ Manual sync (15 min) | ✅ Instant (webhook) |
| **Features** | ❌ Só importa reservas | ✅ Importa + exporta preços + availability |
| **Esforço dev** | 0 (nativo Booking) | ✅ Já feito |
| **Custo** | Grátis | Grátis (self-hosted) |

**Conclusão:** Option C ganhou. O webhook está pronto para produção. Não adicione redundância com iCal.

---

## 📋 Implementação Completada

### ✅ O que já está feito

1. **Webhook Validation** (Phase 1)
   - HMAC-SHA256 signature validation (timing-safe)
   - Rate limiting (5 req/min per property)
   - Payload parsing & validation (29 security tests)
   - File: `src/lib/integrations/booking/webhook-validator.ts`

2. **Reservation Sync** (Phase 2)
   - Duplicate detection via `external_id` (idempotent)
   - Guest creation/upsert
   - Commission calculation
   - Organization isolation (RLS)
   - File: `src/lib/integrations/booking/reservation-sync.ts`

3. **API Client** (Phase 3)
   - Price push (single + batch)
   - Availability push (single + batch)
   - Exponential backoff retry logic (1s→2s→4s→8s)
   - Rate limit awareness
   - File: `src/lib/integrations/booking/client.ts`

4. **Sync Service** (Phase 4)
   - Fetch prices from database
   - Calculate availability
   - Push to Booking.com
   - Batch all properties
   - Scheduled cron jobs
   - File: `src/lib/integrations/booking/sync-service.ts`

5. **API Endpoints**
   - `POST /api/webhooks/booking/reservation` — Webhook receiver
   - `GET /api/cron/sync-booking` — Scheduled sync (all properties)
   - `POST /api/cron/sync-booking` — Manual sync (specific property)
   - Files: `src/app/api/webhooks/booking/reservation/route.ts`, `src/app/api/cron/sync-booking/route.ts`

### ✅ Test Coverage

- **Total Tests:** 120/120 PASSING (100%)
- **Security Tests:** 29 (webhook-validator-security.test.ts)
- **Business Logic Tests:** 28 (sync-logic.test.ts)
- **API Client Tests:** 16 (client.test.ts)
- **Sync Service Tests:** 12 (sync-service.test.ts)
- **Integration Tests:** Framework ready (mocked)

### ✅ QA Review

- **QA Score:** 9.3/10 PASS
- **Code Quality:** 9/10
- **Security:** 10/10 ✅
- **Test Coverage:** 10/10 ✅
- **Performance:** 9/10
- **Error Handling:** 10/10 ✅
- **Documentation:** 10/10 ✅
- **Requirements Traceability:** 10/10 ✅
- **Integration Readiness:** 9/10
- **Technical Debt:** 8/10

Full QA report: `docs/qa/qa_report_booking_integration.md`

---

## 🚀 Deployment Steps (5 Fases)

### Fase 1️⃣: Obter Acesso Booking.com Partner Portal

**Objetivo:** Registar o webhook em Booking.com (requer admin access)

**Opção A — Recomendada (account existente):**
1. Identificar quem criou a conta Booking.com da empresa
2. Contactá-lo e pedir acesso ao Partner Portal
3. URL do portal: https://admin.booking.com
4. Pedir para adicionar-te como **"Technical Administrator"** ou **"Account Manager"**
5. Confirmar acesso (verificar email de convite)

**Opção B — Fallback (sem account access):**
1. Criar nova conta Booking.com em nome da empresa
2. Registar como "software partner" (aplicação formal)
3. Aguardar 2-4 semanas para homologação
4. Usar credenciais próprias para testes

**Checklist:**
- [ ] Contactado o account owner
- [ ] Acesso ao Partner Portal confirmado
- [ ] Role verificado (Technical Administrator ou equivalente)

---

### Fase 2️⃣: Registar Webhook em Booking.com

**Objetivo:** Configurar Booking.com para enviar webhooks para seu servidor

**Passos:**

1. **Login no Partner Portal**
   - URL: https://admin.booking.com
   - Ir para: **Settings → Integrations → Webhooks**

2. **Adicionar novo Webhook**
   - **Webhook URL:** `https://seu-dominio.com/api/webhooks/booking/reservation`
   - **Events to receive:**
     - `reservation.created`
     - `reservation.updated`
     - `reservation.cancelled`
   - **Secret key:** Usar o valor de `BOOKING_WEBHOOK_SECRET` (env var)

3. **Salvar e obter `property_id`**
   - Booking.com fornecerá um `property_id` (ex: `12345678`)
   - Este ID vai em `property_listings.external_property_id`

4. **Testar webhook** (Booking fornece test button)
   - Enviar payload de teste
   - Verificar se chegou ao seu servidor (logs)

**Checklist:**
- [ ] Webhook URL registado em Booking.com
- [ ] Secret key inserido em env var `BOOKING_WEBHOOK_SECRET`
- [ ] Events selecionados (created, updated, cancelled)
- [ ] `property_id` do Booking.com anotado
- [ ] Test webhook enviado com sucesso

---

### Fase 3️⃣: Deploy do Código para Produção

**Objetivo:** Deployar a implementação já completa

**Passo-a-passo:**

1. **Verify localmente**
   ```bash
   npm run build
   npm run lint
   npm test  # se quiser, mas tests já passaram
   ```

2. **Commit & Push** (se ainda não fez)
   ```bash
   git status  # verificar o que mudou
   git add .
   git commit -m "feat: Booking.com webhook integration complete [Story 9.4]

   - HMAC-SHA256 signature validation
   - Rate limiting (5 req/min per property)
   - Duplicate detection via external_id
   - Commission calculation
   - Organization isolation (RLS)
   - Exponential backoff retry logic
   - Sync prices and availability to Booking.com
   - 120/120 tests passing
   - QA PASS (9.3/10)

   Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"

   git push origin main
   ```

3. **Configurar Environment Variables em Produção**

   Via Vercel Dashboard (ou deployment tool):
   ```
   BOOKING_API_KEY=your-api-key
   BOOKING_WEBHOOK_SECRET=your-webhook-secret
   BOOKING_API_URL=https://api.booking.com/v1  (optional, defaults to prod)
   CRON_SECRET=<gera-um-uuid-com-openssl>
   ```

   Generate CRON_SECRET:
   ```bash
   openssl rand -hex 32
   # copia o output para CRON_SECRET
   ```

4. **Deploy automático**
   - Vercel detecta push em `main`
   - Inicia build automático
   - Deploy em ~2 min
   - Verificar logs em Vercel Dashboard

**Checklist:**
- [ ] `npm run build` passa sem erros
- [ ] `npm run lint` passa
- [ ] Code commitado e pushado
- [ ] Env vars configuradas em produção
- [ ] Deploy completado
- [ ] Vercel dashboard mostra green status

---

### Fase 4️⃣: Testar em Produção

**Objetivo:** Validar que webhooks chegam e são processados corretamente

#### Teste A: Webhook Manual (via cURL)

1. **Prepare um webhook payload de teste**
   ```json
   {
     "event": "reservation.created",
     "property_id": "your-booking-property-id",
     "external_reservation_id": "BK123456789",
     "guest_first_name": "João",
     "guest_last_name": "Silva",
     "guest_email": "joao@example.com",
     "guest_phone": "+351912345678",
     "check_in": "2026-05-01",
     "check_out": "2026-05-05",
     "total_price": 500.00,
     "currency": "EUR",
     "timestamp": "2026-03-31T10:00:00Z"
   }
   ```

2. **Gera HMAC-SHA256 signature**
   ```bash
   # Node.js
   const crypto = require('crypto');
   const secret = 'your-webhook-secret';
   const payload = JSON.stringify({...});
   const signature = crypto
     .createHmac('sha256', secret)
     .update(payload)
     .digest('hex');
   console.log(signature);
   ```

3. **Enviar webhook**
   ```bash
   curl -X POST https://seu-dominio.com/api/webhooks/booking/reservation \
     -H "Content-Type: application/json" \
     -H "X-Booking-Signature: <signature-aqui>" \
     -d '{
       "event": "reservation.created",
       "property_id": "...",
       ...
     }'
   ```

4. **Verificar resposta**
   - Status: `200 OK`
   - Body: `{ "success": true, "request_id": "..." }`
   - Logs: Ver `[Booking Webhook]` em logs do servidor

#### Teste B: Sincronização de Preços (Cron)

1. **Trigger sync manualmente**
   ```bash
   curl -X GET "https://seu-dominio.com/api/cron/sync-booking?days_ahead=30" \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

2. **Verificar resposta**
   ```json
   {
     "success": true,
     "result": {
       "totalSynced": 150,
       "successCount": 20,
       "failureCount": 0,
       "durationMs": 5432
     }
   }
   ```

3. **Verificar em Booking.com**
   - Ir a Partner Portal → Properties
   - Verificar se preços foram atualizados

#### Teste C: Sincronização Manual de Propriedade Específica

```bash
curl -X POST https://seu-dominio.com/api/cron/sync-booking \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": "prop_123",
    "start_date": "2026-05-01",
    "end_date": "2026-05-31"
  }'
```

**Checklist:**
- [ ] Webhook manual enviado com sucesso (status 200)
- [ ] Signature validation passou
- [ ] Reservation criada na base de dados
- [ ] GET `/api/cron/sync-booking` retorna dados
- [ ] POST `/api/cron/sync-booking` sincroniza propriedade específica
- [ ] Preços aparecem em Booking.com Partner Portal

---

### Fase 5️⃣: Monitorar Produção (Primeiras 24h)

**Objetivo:** Detectar issues cedo e validar funcionamento

#### Verificações a fazer:

1. **Logs do Servidor**
   - Vercel Logs: Dashboard → Logs
   - Procurar: `[Booking Webhook]`, `[Booking Sync]`, `[Cron Booking Sync]`
   - Verificar se não há errors

2. **Base de Dados**
   - Supabase Dashboard → SQL Editor
   - Query: `SELECT * FROM reservations WHERE created_at > NOW() - INTERVAL '24 hours' ORDER BY created_at DESC`
   - Verificar se reservas do Booking aparecem (external_id preenchido)

3. **Alerts & Monitoring**
   - Configurar alertas no Vercel para erros 5xx
   - Verificar rate limiting (não deve desativar webhooks)
   - Monitorar uso de recursos (CPU, memória)

4. **Testes Manuais**
   - Fazer uma reserva real em Booking.com
   - Verificar se aparece em `reservations` table
   - Verificar se guest foi criado em `guests`
   - Verificar se `commission_calculated_at` foi preenchido

5. **Checklist de Saúde**
   - [ ] Nenhum erro 5xx no Vercel
   - [ ] Webhooks chegando regularmente
   - [ ] Reservas aparecendo na base de dados
   - [ ] Preços sincronizando a cada 6 horas
   - [ ] Rate limiting funcionando (não bloqueando)
   - [ ] Signature validation passando
   - [ ] Commission calculation correta

#### Troubleshooting Comum:

| Problema | Solução |
|----------|---------|
| **Webhook retorna 401 Unauthorized** | Verificar `BOOKING_WEBHOOK_SECRET` em env vars |
| **Webhook retorna 400 Bad Request** | Verificar formato da payload, signature (HMAC validation) |
| **Rate limiting bloqueia webhooks** | Aumentar limite em `rate-limiter.ts` (atual: 5/min) |
| **Reservas não aparecem na BD** | Ver logs de erro, verificar `organization_id` propagation |
| **Preços não sincronizam** | Verificar se `property_listings` tem `external_property_id` |
| **Signature validation falha** | Usar `timing-safe` comparison, não `===` simples |

---

## 🔧 Configuração Final

### Environment Variables Necessárias

```bash
# Booking.com
BOOKING_API_KEY=<sua-chave-booking>
BOOKING_WEBHOOK_SECRET=<seu-secret>
BOOKING_API_URL=https://api.booking.com/v1  # optional, defaults to prod

# Cron Jobs
CRON_SECRET=<gera-um-uuid>

# Existentes (não alterar)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
```

### Cron Jobs a Configurar

**Sync automático a cada 6 horas:**

Via **GitHub Actions** (recomendado):
```yaml
name: Booking Sync
on:
  schedule:
    - cron: '0 */6 * * *'  # A cada 6 horas

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sync Prices & Availability
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/cron/sync-booking?days_ahead=30" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Ou via **Upstash Cron** (se usarem):
```
Schedule: 0 */6 * * * (UTC)
URL: https://seu-dominio.com/api/cron/sync-booking?days_ahead=30
Headers: Authorization: Bearer $CRON_SECRET
```

---

## 📚 Referências

### Ficheiros Principais
- `src/lib/integrations/booking/` — Core implementation
- `src/app/api/webhooks/booking/reservation/` — Webhook endpoint
- `src/app/api/cron/sync-booking/` — Sync endpoints
- `docs/BOOKING_API_INTEGRATION_COMPLETE.md` — Full technical docs

### Documentação Relacionada
- `docs/BOOKING_API_SECURITY_FIXES.md` — Security validation details
- `docs/BOOKING_API_INTEGRATION_TESTING.md` — Test coverage breakdown
- `docs/BOOKING_API_PHASE3.md` — Retry logic details
- `docs/qa/qa_report_booking_integration.md` — QA review (9.3/10 PASS)

### Recursos Externos
- Booking.com Partner Portal: https://admin.booking.com
- Booking.com API Docs: https://developer.booking.com/
- HMAC-SHA256: https://tools.ietf.org/html/rfc4868

---

## 📝 Notas Importantes

1. **Segurança:** HMAC-SHA256 signature validation é **timing-safe** (não vulnerável a timing attacks)
2. **Idempotência:** Duplicate detection via `external_id` garante que webhooks duplicados não criam reservas duplicadas
3. **Multi-tenancy:** Todas as reservas isoladas por `organization_id` (RLS)
4. **Rate Limiting:** 5 req/min per property. Se atingir limite, espera antes de reenviar
5. **Retry Logic:** Exponential backoff automático (1s→2s→4s→8s, capped em 30s)
6. **Logs:** Todos prefixados com `[Booking Webhook]` ou `[Booking Sync]` para fácil filtering

---

## ✅ Checklist Final de Deployment

- [ ] Fase 1: Acesso Booking.com Partner Portal obtido
- [ ] Fase 2: Webhook registado em Booking.com
- [ ] Fase 3: Código deployado para produção
- [ ] Fase 4: Testes manuais passaram
- [ ] Fase 5: Monitoramento 24h OK
- [ ] Cron job configurado (a cada 6h)
- [ ] Alertas configurados em caso de falha
- [ ] Documentação actualizada no Notion/Wiki
- [ ] Team informado do deployment

---

**Status:** 🟢 READY FOR PRODUCTION DEPLOYMENT
**Last Updated:** 2026-03-31
**Decision:** Webhook (Option C) ✅ | Skip iCal (Option A) | Skip Zapier (Option B)
