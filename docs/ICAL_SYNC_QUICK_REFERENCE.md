# iCal Sync: Guia Rápido de Referência

## Visão Geral em 60 Segundos

### Hoje (Unidirecional)
```
Booking.com, Airbnb, Flatio
         ↓ (iCal Feed)
App importa reservas via /api/sync/import
         ↓
Database (reservations, guests)
         ↓
Calendário exibe reservas
         ↓
GET /api/ical/[propertyId]?token=... exporta bloqueio
         ↓
Plataformas re-sincronizam manualmente
```

### Futuro (Bidirecional)
```
Booking.com, Airbnb (e outras)
         ↓ ↑
       [iCal Feed] ← → [Polling Diário]
         ↓ ↑
App (criar reserva)
  1. POST /api/reservations/check-availability ← Validação
  2. INSERT reservations (manual)
  3. POST /api/reservations/sync-to-platforms ← Notificar
         ↓
Database + Sync Logs
         ↓
Plataformas veem nova reserva em iCal → Bloqueiam datas
```

---

## Arquivos Chave (Mapa Mental)

### Sincronização Importação (Plataformas → App)
```
src/lib/ical/
├── icalService.ts           [CORE] Parsing iCal, geração iCal
├── bookingParser.ts         Extração de metadados (BOOKING ID, etc)
└── __tests__/
    └── icalService.test.ts  69 testes ✅

src/app/api/
├── sync/import/route.ts     [ENDPOINT] POST sincronização manual
├── cron/sync-ical/route.ts  [CRON] Automático 03:00 UTC
├── ical/[propertyId]/route.ts [ENDPOINT] GET export com token
└── properties/[id]/ical-token/route.ts [ENDPOINT] Regenerar token

supabase/migrations/
├── 20260100000000_bootstrap_core_tables.sql      Tables base (reservations, property_listings, properties)
├── 20260315010000_ical_export_token.sql          ✅ ical_export_token adicionado
├── 20260330020000_fix_reservation_conflict_check.sql ✅ Trigger de conflito
```

### Sincronização Exportação (App → Plataformas) [TODO]
```
src/lib/reservations/
├── checkAvailability.ts              [NOVO] Verificar datas livres
└── syncToOutboundPlatforms.ts        [NOVO] Push para plataformas

src/app/api/reservations/
├── check-availability/route.ts       [NOVO] Endpoint validação
└── sync-to-platforms/route.ts        [NOVO] Endpoint sync out

src/app/[locale]/reservations/
├── new/page.tsx                      [MODIFICAÇÃO] Integrar check + sync
└── [id]/edit/page.tsx                [MODIFICAÇÃO] Integrar check em edição

supabase/migrations/
└── 20260413_XX_sync_to_platforms.sql [NOVO] Colunas: synced_to_platforms, last_platform_sync_at, platform_sync_errors

Frontend/
└── src/components/calendar/NewReservationModal.tsx [MODIFICAÇÃO] Feedback de validação
```

---

## Tabelas & Schema Relevante

### reservations (Core)
```sql
CREATE TABLE reservations (
  id UUID PRIMARY KEY,
  property_listing_id UUID,        -- Link para anúncio
  guest_id UUID,                   -- Link para hóspede
  external_id TEXT,                -- UID iCal (e.g., "42387-BOOKING-123")
  check_in DATE,                   -- Entrada
  check_out DATE,                  -- Saída
  number_of_guests INTEGER,
  status VARCHAR,                  -- 'pending' | 'confirmed' | 'cancelled' | 'pending_payment' | 'completed'
  source VARCHAR,                  -- 'booking' | 'airbnb' | 'ical_import' | 'manual' | 'unknown'
  booking_source VARCHAR,          -- 'ical_import' | 'ical_auto_sync' | 'manual' | 'stripe_booking'
  organization_id UUID,            -- Multi-tenancy
  
  -- [NOVO] Para sync bidirecional
  synced_to_platforms BOOLEAN DEFAULT false,
  last_platform_sync_at TIMESTAMP,
  platform_sync_errors TEXT,       -- JSON: [{"platform": "booking", "error": "..."}]
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
);
```

### property_listings (Plataformas)
```sql
CREATE TABLE property_listings (
  id UUID PRIMARY KEY,
  property_id UUID NOT NULL,
  platform_id UUID,                -- Referência platforms (booking, airbnb, etc)
  external_listing_id VARCHAR,     -- ID da plataforma
  ical_url TEXT,                   -- URL para importar (plataforma → app)
  sync_enabled BOOLEAN,            -- Sincronização ativa?
  last_synced_at TIMESTAMP,        -- Última importação
  is_active BOOLEAN,
);
```

### properties (Casa/Imóvel)
```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY,
  name VARCHAR,
  organization_id UUID,
  ical_export_token TEXT UNIQUE,   -- Token para /api/ical/{id}?token=...
  min_nights INTEGER DEFAULT 1,    -- Estadia mínima (validação)
  max_guests INTEGER,
  currency VARCHAR DEFAULT 'EUR',
);
```

### sync_logs (Histórico)
```sql
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY,
  property_listing_id UUID,
  sync_type VARCHAR,               -- 'ical_import' | 'manual_push' | 'api_push'
  direction VARCHAR,               -- 'inbound' (plataforma → app) | 'outbound' (app → plataforma)
  status VARCHAR,                  -- 'success' | 'failure' | 'partial'
  error_message TEXT,
  records_processed INTEGER,
  records_created INTEGER,
  records_updated INTEGER,
  records_failed INTEGER,
  synced_at TIMESTAMP,
);
```

---

## Endpoints: Before & After

### Importação (Existente ✅)

```bash
# 1. Sincronização manual
POST /api/sync/import
Authorization: Bearer {user}
Content-Type: application/json

{
  "property_ids": ["uuid-1", "uuid-2"]
}

Response: { success: true, results: [...], totals: {...} }
```

```bash
# 2. Sincronização automática (cron)
GET /api/cron/sync-ical
Authorization: Bearer {CRON_SECRET}
# Executado diariamente às 03:00 UTC (vercel.json)
```

```bash
# 3. Export iCal para plataformas
GET /api/ical/[propertyId]?token={TOKEN_UNICO}
# Retorna: .ics file (text/calendar)
# Segurança: token verificado contra properties.ical_export_token
```

### Exportação (Novo — TODO)

```bash
# 1. [NOVO] Validar disponibilidade
POST /api/reservations/check-availability
Authorization: Bearer {user}
Content-Type: application/json

{
  "property_id": "uuid",
  "check_in": "2026-04-20",
  "check_out": "2026-04-25",
  "exclude_reservation_id": "uuid" // Para edição
}

Response:
{
  "available": true,
  "conflicting_reservations": []
}

ou (409 Conflict)

{
  "available": false,
  "conflicting_reservations": [
    { "id": "...", "guest_name": "João", "check_in": "2026-04-22", "check_out": "2026-04-24" }
  ]
}
```

```bash
# 2. [NOVO] Sincronizar reserva para plataformas (fire-and-forget)
POST /api/reservations/sync-to-platforms
Authorization: Bearer {user}
Content-Type: application/json

{
  "reservation_id": "uuid"
}

Response:
{
  "success": true,
  "synced_platforms": ["booking.com", "airbnb"],
  "errors": []
}
```

---

## Fluxo: Criar Reserva (App → Plataformas)

```
Usuário clica calendário → Modal "Nova Reserva" (datas pré-preenchidas)
         ↓
Seleciona propriedade, preenche dados hóspede
         ↓
Clica "Criar Reserva" → handleSubmit()
         ↓
┌─ VALIDAÇÃO (NEW)
│  POST /api/reservations/check-availability
│  Respostas possíveis:
│  ├─ { "available": true }                → continuar
│  └─ { "available": false, conflicting_reservations: [...] } → erro, parar
│
├─ OK? Continuar
│
└─ INSERT reservations
   {
     property_listing_id: "...",
     guest_id: "...",
     check_in: "2026-04-20",
     check_out: "2026-04-25",
     status: 'confirmed',
     booking_source: 'manual',
     source: 'manual',
     organization_id: "..."
   }
         ↓
DB Trigger: check_reservation_conflict()
├─ Valida novamente (redundância)
└─ Rejeita se overlap
         ↓
INSERT sucesso → reserva criada
         ↓
┌─ NOTIFICAÇÃO DE PLATAFORMAS (NEW, fire-and-forget)
│  POST /api/reservations/sync-to-platforms
│  {
│    "reservation_id": "xyz789"
│  }
│       ↓
│  Backend busca: property → listings → platforms
│  Para cada platform_listing:
│    ├─ Registra em sync_logs (direction='outbound', status='success')
│    └─ UPDATE reservations: synced_to_platforms=true, last_platform_sync_at=now()
│
├─ Próximo dia: Plataforma faz polling de /api/ical/[propertyId]?token=...
│  ├─ Encontra nova reserva no iCal
│  └─ Importa como bloqueio no seu calendário
│
└─ Resultado: Datas bloqueadas em Booking.com, Airbnb, etc
         ↓
Toast: "Reserva criada com sucesso!"
Redirect: /reservations
```

---

## Verificação de Disponibilidade: Detalhes Técnicos

### Algoritmo: checkAvailability()

```typescript
Input:
  propertyId: "uuid"
  checkIn: "2026-04-20"
  checkOut: "2026-04-25"
  organizationId: "uuid"
  excludeReservationId?: "uuid" // Para edição

Query SQL:
  SELECT * FROM reservations
  WHERE property_listing_id IN (
    SELECT id FROM property_listings
    WHERE property_id = propertyId
  )
  AND status IN ('confirmed', 'pending_payment')
  AND id != excludeReservationId
  AND check_in < checkOut      -- Sobreposição: seu check_in < seu check_out?
  AND check_out > checkIn       -- Sobreposição: seu check_out > seu check_in?
  AND organization_id = organizationId

Output:
  available: false (se encontrou conflitos)
  conflicts: [
    {
      id: "...",
      guest_name: "João Silva",
      check_in: "2026-04-22",
      check_out: "2026-04-24",
      source: "ical_import",
      booking_source: "booking",
      status: "confirmed"
    }
  ]
```

### Sobreposição: Matemática

```
Sua reserva:    |-------|
                2026-04-20 a 2026-04-25

Conflito 1:     |---|
                2026-04-18 a 2026-04-22  ✅ Conflita (overlap no check-in)

Conflito 2:        |---|
                2026-04-23 a 2026-04-27  ✅ Conflita (overlap no check-out)

Conflito 3:      |----------|
                2026-04-15 a 2026-04-28  ✅ Conflita (contém sua reserva)

OK 1:        |---|
             2026-04-15 a 2026-04-20  ✅ OK (check-out = seu check-in, saída/entrada mesmo dia)

OK 2:                    |---|
                     2026-04-25 a 2026-04-28  ✅ OK (seu check-out = check-in dele)

Lógica:
  check_in < check_out (seu) AND check_out > check_in (dele) → CONFLITA
```

---

## Estrutura de Sync Bidirecional: Fluxo Simplificado

```
┌─────────────────────────────────┐
│  1. APP CRIA RESERVA             │
│     POST /reservations/new       │
└──────────────┬──────────────────┘
               │
        ┌──────▼──────┐
        │   VALIDA?   │
        └──────┬──────┘
               │
        ┌──────▼──────────────────────┐
        │ check-availability() query  │
        │ - sobreposição?             │
        │ - retorna conflicts[]       │
        └──────┬──────────────────────┘
               │
        ┌──────▼────────┐
        │   Disponível? │
        │   ✅ Sim      │
        │   ❌ Não      │
        └──────┬────┬───┘
               │    │
            SIM    NÃO
               │    └──> Erro 409 (Conflict)
               │        Mostrar datas ocupadas
               │        Stop
               │
        ┌──────▼──────────────────────┐
        │ 2. INSERT reservations       │
        │    - booking_source='manual' │
        │    - source='manual'         │
        │    - status='confirmed'      │
        └──────┬───────────────────────┘
               │
        ┌──────▼──────────────────────┐
        │ DB Trigger:                  │
        │ check_reservation_conflict() │
        │ (redundância)                │
        └──────┬───────────────────────┘
               │
        ┌──────▼──────────────────────┐
        │ 3. SINCRONIZAR PLATAFORMAS  │
        │    (Fire-and-forget)        │
        │    POST /api/reservations/  │
        │    sync-to-platforms        │
        └──────┬───────────────────────┘
               │
        ┌──────▼──────────────────────────┐
        │ syncToOutboundPlatforms():       │
        │ - Buscar property → listings     │
        │ - Para cada platform_listing:    │
        │   ├─ Registra sync_logs         │
        │   └─ UPDATE synced_to_platforms │
        └──────┬───────────────────────────┘
               │
        ┌──────▼──────────────────────┐
        │ 4. PLATAFORMAS SINCRONIZAM  │
        │    (Polling diário)         │
        │    GET /api/ical/[id]?token │
        │                              │
        │ Encontram nova reserva:      │
        │ UID: reservation-xyz@...    │
        │                              │
        │ Bloqueiam datas no seu       │
        │ calendário                   │
        └──────────────────────────────┘
```

---

## Casos de Uso & Comportamento

### Caso 1: Criar reserva com datas livres
```
Input:  property_id="A", check_in="2026-04-20", check_out="2026-04-25"
Query:  SELECT * FROM reservations WHERE property_listing_id IN (...) AND check_in < '2026-04-25' AND check_out > '2026-04-20'
Result: 0 rows
Output: available=true ✅
Action: INSERT reservation, sync to platforms
```

### Caso 2: Criar reserva com conflito
```
Input:  property_id="A", check_in="2026-04-20", check_out="2026-04-25"
Query:  ... (mesmo)
Result: 1 row (reserva existente 2026-04-22 a 2026-04-24)
Output: available=false, conflicting_reservations=[{id: "...", guest_name: "João", check_in: "2026-04-22", check_out: "2026-04-24"}]
Action: Mostrar erro, não criar reserva ❌
```

### Caso 3: Editar reserva mudando datas
```
Input:  reservationId="R123", property_id="A", check_in="2026-04-20", check_out="2026-04-25"
Query:  ... AND id != 'R123' (exclude current)
Result: 0 rows (nenhum conflito com outras)
Output: available=true ✅
Action: UPDATE reservation, re-sync to platforms
```

### Caso 4: Sincronizar para múltiplas plataformas
```
property_id="A" tem 3 listings:
  - Booking.com (listing_id="L1")
  - Airbnb (listing_id="L2")
  - Flatio (listing_id="L3")

syncToOutboundPlatforms(reservation_id="R123"):
  for each listing in property_listings:
    ├─ INSERT sync_logs { property_listing_id: "L1", direction: 'outbound', status: 'success' }
    ├─ INSERT sync_logs { property_listing_id: "L2", direction: 'outbound', status: 'success' }
    └─ INSERT sync_logs { property_listing_id: "L3", direction: 'outbound', status: 'success' }

UPDATE reservations
  SET synced_to_platforms=true, last_platform_sync_at=now()
  WHERE id='R123'

Result:
  synced_platforms: ["booking.com", "airbnb", "flatio"]
  errors: []
```

---

## Performance & Índices

### Índices Recomendados

```sql
-- Buscar reservations por propriedade + status
CREATE INDEX idx_reservations_property_status
  ON reservations(property_listing_id, status)
  WHERE status IN ('confirmed', 'pending_payment');

-- Buscar por período
CREATE INDEX idx_reservations_check_dates
  ON reservations(check_in, check_out);

-- Buscar por org (multi-tenancy)
CREATE INDEX idx_reservations_organization
  ON reservations(organization_id);

-- Buscar por external_id (deduplicação iCal)
CREATE INDEX idx_reservations_external_id
  ON reservations(external_id)
  WHERE external_id IS NOT NULL;
```

### Complexidade de Query

```
checkAvailability(property_id, check_in, check_out):
  - SELECT property_listings.id WHERE property_id = ? → O(log n) com índice
  - SELECT reservations WHERE property_listing_id IN (...) AND status IN (...) AND dates → O(log n + k) onde k = conflitos

Típico: <50ms em 1000 reservations
Pior caso: ~200ms em 100k reservations
```

---

## Debugging & Troubleshooting

### Problema: Reserva não aparece em iCal da plataforma

**Checklist**:
1. ✅ Reserva foi criada? `SELECT * FROM reservations WHERE id='...'`
2. ✅ synced_to_platforms=true? `SELECT synced_to_platforms FROM reservations WHERE id='...'`
3. ✅ Logs de sync registrados? `SELECT * FROM sync_logs WHERE direction='outbound' ORDER BY synced_at DESC LIMIT 5`
4. ✅ Token de export ainda válido? `SELECT ical_export_token FROM properties WHERE id='...'`
5. ✅ Plataforma fez polling? (Booking.com: diário, Airbnb: a cada 24h)

### Problema: checkAvailability retorna conflito falso

**Causa provável**: Reserva com `status != 'confirmed'` ou `status != 'pending_payment'` incluída

**Solução**:
```sql
-- Verificar quais statuses estão sendo considerados
SELECT DISTINCT status FROM reservations
WHERE property_listing_id IN (SELECT id FROM property_listings WHERE property_id='...')
ORDER BY status;

-- Se houver 'draft', 'cancelled', etc → não devem estar em check
-- Verificar função checkAvailability.ts, linha de .in('status', [...])
```

---

## Roadmap: 3 Fases

### Fase 1: MVP (Atual + Próxima Sprint)
- [x] Importação iCal unidirecional
- [x] Export iCal para plataformas
- [ ] Validação de disponibilidade (NEW)
- [ ] Logging bidirecional (NEW)

### Fase 2: Melhoria (Q2-Q3 2026)
- [ ] Detecção automática de duplicatas
- [ ] Dashboard de sync (histórico)
- [ ] Alertas de falhas
- [ ] Manual retry UI

### Fase 3: API Direto (Q3-Q4 2026)
- [ ] Booking.com API v2
- [ ] Airbnb API
- [ ] Webhooks bi-direcionais
- [ ] Sync real-time <1h

---

## Links & Referências

| Documento | Descrição |
|-----------|-----------|
| `ICAL_INTEGRATION.md` | Implementação original (importação iCal) |
| `ICAL_BIDIRECTIONAL_SYNC_ANALYSIS.md` | **Análise técnica completa** (este documento é resumo) |
| `booking_native_integration.md` | Plano de integração Booking.com API |
| `user_property_assignment.md` | Multi-tenancy & org isolation |
| `semana_1_roles.md` | Roles & RLS policies |

---

**Última Atualização**: 13 de Abril de 2026  
**Status**: ✅ Pronto para Implementação  
**Complexidade**: Média (validação + logging)  
**Risco**: Baixo (adiciona validação, não quebra existente)
