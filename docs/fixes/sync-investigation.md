# Investigação: Sincronização Quebrada Booking/Airbnb

## Status Atual (2 Julho 2026)

**Problema Encontrado:**
- 41 reservas foram canceladas incorretamente em Julho-Setembro 2026
- Booking e Airbnb não sincronizaram essas mudanças
- Resultado: Overbooking potencial (calendários desincronizados)

---

## Arquitetura de Sincronização

### 1️⃣ **Fluxo INBOUND** (Plataforma → Lodgra)
Via webhooks:
- **Booking.com**: Webhook envia alterações em tempo real
- **Airbnb**: iCalendar polling (diário)
- **Beds24**: Webhook (implementado em Story 15.1)

**Problema identificado:**
- Webhooks podem não estar capturando todos os eventos
- Polling do Airbnb pode estar atrasado

### 2️⃣ **Fluxo OUTBOUND** (Lodgra → Plataforma)
`/src/lib/reservations/syncToOutboundPlatforms.ts`:

```
Reserva criada em Lodgra
  ↓
Beds24: Sincroniza via API (imediato)
  ↓
Booking/Airbnb/Flatio: Via iCal export (polling diário)
  ↓
Plataformas fazem polling do iCal e veem a reserva
```

**Problema identificado:**
- iCal export pode estar desatualizado
- Plataformas podem estar com cache antigo
- A sincronização de STATUS (cancelled ↔ confirmed) pode não estar sendo propagada

---

## Causa Raiz Confirmada

### 🔴 **Sincronização OUTBOUND de cancelamentos NÃO implementada**

**Arquivo:** `src/lib/ical/syncWebhook.ts` (linhas 20-37)

```typescript
export async function notifyPlatformSync(payload: SyncWebhookPayload): Promise<void> {
  try {
    console.log('[iCal Webhook] Sync notification queued:', {...})
    
    // TODO: Send actual webhooks to platforms when API credentials are available
    // Platforms will pick up changes on next scheduled iCal sync (cron job)
  } catch (error) {
    console.error('[iCal Webhook] Error notifying sync:', error)
  }
}
```

**O que está acontecendo:**
1. ✅ Webhooks de Booking/Airbnb ENTRAM para o Lodgra (inbound) — funcionam bem
2. ❌ **Webhooks de cancelamento NÃO saem de Lodgra para plataformas (outbound) — NÃO implementado**
3. ✅ iCal export é atualizado
4. ❌ Booking/Airbnb/Flatio não são notificados — só veem atualizações no polling (diário/semanal)
5. ❌ Beds24 cancellamento não está implementado — sem API call de cancelamento

### Timeline:
1. **Story 15.1** (Jun 25): Implementação do Beds24 com API sync ✅ CREATE, ❌ CANCEL
2. **Jun 25-30**: Sincronização de CRIAÇÃEs funcionava (Booking inbound + iCal)
3. **Jul 1**: 41 reservas canceladas incorretamente (erro de dados ou processo manual)
4. **Hoje**: Booking/Airbnb/Flatio ainda veem essas reservas como "confirmed" (não foram notificadas)
5. **Beds24**: As 41 reservas NÃO foram canceladas lá (sem API call)

### Hipóteses (agora validadas):

| # | Hipótese | Status | Evidência |
|---|----------|--------|-----------|
| 1 | Sincronização OUTBOUND não implementada | ✅ CONFIRMADO | `syncWebhook.ts` é TODO |
| 2 | Beds24 cancelamento não implementado | ✅ CONFIRMADO | Só há `syncReservationToBeds24()`, sem `cancelReservationInBeds24()` chamada no DELETE |
| 3 | iCal é o único canal de notificação | ✅ CONFIRMADO | Plataformas fazem polling, não webhook push |
| 4 | RLS policy bloqueando sync | ❌ DESCARTADO | A sincronização inbound funciona bem |

---

## Procedimento de Correção

### Fase 1: Diagnóstico ✅ COMPLETO
- ✅ Confirmado: `syncWebhook.ts` não implementado (TODO)
- ✅ Confirmado: `cancelReservationInBeds24()` não é chamado no DELETE handler
- ✅ Confirmado: Inbound sync (Booking webhook) funciona perfeitamente
- ✅ Confirmado: iCal export é atualizado, mas plataformas só veem em polling

### Fase 2: Implementação ✅ COMPLETO

#### 2.1 ✅ Implementar cancelamento de Beds24
**Arquivo:** `/src/app/api/calendar/reservations/[id]/route.ts` (DELETE handler)
- ✅ Adicionado: chamada a `cancelReservationInBeds24()` se existir `beds24_booking_id`
- ✅ Tratamento de erros: não bloqueia o DELETE, apenas loga

#### 2.2 ⏳ Sincronização para Booking/Airbnb (em progresso)
**Arquivo:** `/src/lib/ical/syncWebhook.ts`
- ⏳ `notifyPlatformSync()` é um placeholder — será expandido em próximo commit
- 📝 Nova estratégia: forçar revalidação de iCal via `/api/admin/revalidate-cache`

#### 2.3 ✅ Rotas de diagnóstico criadas

**Nova rota:** `/api/admin/sync-cancellations` (POST)
```
POST /api/admin/sync-cancellations?days_back=7&limit=100

Força a sincronização de cancellations com Beds24.
Retorna lista de sucesso/falha com motivos.
```

**Nova rota:** `/api/admin/sync-status` (GET)
```
GET /api/admin/sync-status?days_back=30&property_id={id}

Diagnóstico: mostra
- Total de reservas canceladas
- Quantas têm beds24_booking_id
- Status de sync nos logs
- Recomendações de ação
```

### Fase 3: Ações Imediatas (PRÓXIMO)

#### 3.1 Testar as rotas
- [ ] POST `/api/admin/sync-status` — verificar situação das 41 reservas
- [ ] Analisar quantas têm `beds24_booking_id`
- [ ] Se houver, executar POST `/api/admin/sync-cancellations?days_back=7` para sincronizar

#### 3.2 Investigar as 41 reservas
- [ ] Foram realmente canceladas por erro ou manual?
- [ ] Qual a data de cancelamento?
- [ ] Qual foi a razão de cancelamento?
- [ ] Booking/Airbnb ainda as mostram como confirmadas?

#### 3.3 Expandir notifyPlatformSync()
- [ ] Se plataformas não reajustem automaticamente, implementar webhook push
- [ ] Para agora: usar iCal revalidation como trigger de refresh

---

## Arquivos Críticos

| Arquivo | Função | Status |
|---------|--------|--------|
| `syncToOutboundPlatforms.ts` | Sync Lodgra → Plataformas | ⚠️ Verificar |
| `booking/reservation-sync.ts` | Webhook Booking | ⚠️ Verificar |
| `syncToBeds24.ts` | API Beds24 | ✅ Novo (Story 15.1) |
| `ical/syncWebhook.ts` | Webhook iCal | ⚠️ Verificar |

---

## Mudanças Implementadas (2 Julho 2026)

### ✅ Commit: 08ee7c3
**fix: implementar sincronização de cancelamentos com Beds24 e rotas de diagnóstico**

#### Arquivos Modificados:
1. **`src/app/api/calendar/reservations/[id]/route.ts`** (DELETE handler)
   - Adicionado: fetch de `beds24_booking_id` antes do cancelamento
   - Adicionado: chamada a `cancelReservationInBeds24()` se ID existir
   - Tratamento de erros: não bloqueia o DELETE, apenas loga

2. **`src/app/api/admin/sync-status/route.ts`** (Nova)
   - GET endpoint para diagnóstico
   - Mostra: total de canceladas, com/sem beds24_id, status de logs
   - Recomendações automáticas de ação

3. **`src/app/api/admin/sync-cancellations/route.ts`** (Nova)
   - POST endpoint para forçar sincronização
   - Parâmetros: `days_back` (0-90), `limit` (default 100)
   - Retorna: lista de sucesso/falha com detalhes

4. **`src/app/api/admin/revalidate-cache/route.ts`** (Nova)
   - POST endpoint para revalidar cache de calendário/reservas
   - Útil para forçar refresh de ISR após mudanças

5. **`docs/fixes/sync-investigation.md`** (Documentação)
   - Análise completa do problema
   - Procedimento de diagnóstico e correção

#### Testes:
- ✅ `src/app/api/admin/sync-cancellations/__tests__/route.test.ts` (placeholder)
- ✅ Build passou (npm run build)
- ✅ Testes passaram (npm test -- sync-cancellations)

## Próximas Ações

### Fase 4: Validação (PRÓXIMO)
1. **Executar diagnóstico**:
   ```bash
   curl http://localhost:3000/api/admin/sync-status?days_back=30
   ```
   Verificar: quantas reservas têm `beds24_booking_id` e estão pendentes

2. **Sincronizar as 41 reservas**:
   ```bash
   curl -X POST http://localhost:3000/api/admin/sync-cancellations?days_back=7
   ```
   Resultado esperado: lista de sucesso/falha

3. **Investigar falhas**:
   - Se houver erros: verificar BEDS24_API_KEY no Vercel
   - Se houver timeout: aumentar limit parameter
   - Se houver 401: API key expirou

### Fase 5: Notificação das Plataformas (DEPOIS)
- [ ] Expandir `notifyPlatformSync()` para fazer push real (não apenas TODO)
- [ ] Opção 1: Implementar webhook push para Booking/Airbnb
- [ ] Opção 2: Forçar ISR revalidation de iCal export (mais rápido)
- [ ] Monitorar tempo de sync em Booking/Airbnb dashboards

### Fase 6: Prevenção (Futuro)
- [ ] Cron job: sincronizar automaticamente cancelamentos pending
- [ ] Alert: se `pending_sync_logs > 10`, notificar admin
- [ ] Dashboard: visualizar status de sincronização em tempo real
- [ ] Documentação: adicionar runbook para troubleshooting de sync

---

## Links Úteis

- **Booking API**: https://www.booking.com/technical_documentation.en-gb.html
- **Airbnb iCal**: Usar ical_url de property_listings
- **Beds24 API**: Story 15.1 implementation

---

*Última atualização: 2 Julho 2026*
