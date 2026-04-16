# Análise: Sincronização iCal Bidirecional (App → Plataformas)

**Data**: 13 de Abril de 2026  
**Status**: Análise Completa de Arquitetura  
**Escopo**: Documentação da implementação atual + plano para fluxo inverso (app → plataformas)

---

## 1. Arquitetura Atual (Plataformas → App)

### 1.1 Fluxo Unidirecional: Importação iCal

```
Plataforma (Booking, Airbnb, Flatio)
        ↓
   iCal Feed (URL)
        ↓
GET /api/sync/import (manual) ou
GET /api/cron/sync-ical (automático 03:00 UTC)
        ↓
importICalFromUrl() [icalService.ts]
        ↓
parseBookingDescription() [bookingParser.ts]
Extrai: booking_id, phone, country, num_guests
        ↓
syncListing() [sync/import/route.ts]
- Verifica sobreposição com reservas existentes
- Detecta duplicatas (mesma propriedade, datas sobrepostas)
- Cria guests com phone/country
- Cria reservations com source='booking'|'airbnb'|'ical_import'
        ↓
Database (reservations, guests com organization_id)
        ↓
Notificações ao proprietário (fire-and-forget)
```

### 1.2 Arquivos Principais da Importação

| Arquivo | Função |
|---------|--------|
| `src/lib/ical/icalService.ts` | Parsing iCal, geração iCal, bloqueio de eventos |
| `src/lib/ical/bookingParser.ts` | Extração de metadados (BOOKING ID, PHONE, COUNTRY, GUESTS) |
| `src/app/api/sync/import/route.ts` | Endpoint POST sincronização, syncListing() |
| `src/app/api/cron/sync-ical/route.ts` | Cron automático diário 03:00 UTC |
| `src/app/api/ical/[propertyId]/route.ts` | GET export com token (segurança) |

### 1.3 Fluxo de Exportação: Geração iCal para Plataformas

```
Plataforma (solicita URL iCal)
        ↓
GET /api/ical/[propertyId]?token=TOKEN_UNICO
        ↓
Validação de token:
- properties.ical_export_token vs query ?token
- 401 Unauthorized se mismatch
        ↓
Buscar:
- property_listings da propriedade
- reservations confirmadas/pendentes
        ↓
generateICalFromReservations() [icalService.ts]
- UID: reservation-{id}@homestay.com
- SUMMARY: "{guestName} - {propertyName}"
- DESCRIPTION: Reserva #{id}, Status, Hóspedes
- Datas como VALUE=DATE (sem hora)
        ↓
text/calendar response (.ics file)
        ↓
Plataforma importa calendário bloqueado
```

### 1.4 Modelo de Dados: Estrutura de Reservas

#### `reservations` table (bootstrap_core_tables.sql)
```sql
CREATE TABLE reservations (
  id UUID PRIMARY KEY,
  property_listing_id UUID,  -- ← Link para a plataforma específica
  guest_id UUID,             -- ← Link para guests
  external_id TEXT,          -- ← UID do iCal (e.g., "42387-XXXXX")
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  number_of_guests INTEGER,
  total_amount NUMERIC,
  currency VARCHAR,
  status VARCHAR,            -- 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'pending_payment'
  source VARCHAR,            -- 'booking' | 'airbnb' | 'ical_import' | 'manual' | 'unknown'
  booking_source VARCHAR,    -- 'ical_import' | 'ical_auto_sync' | 'manual' | 'stripe_booking'
  external_reservation_id VARCHAR,
  synced_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  organization_id UUID       -- ← Multi-tenancy: isolamento org
);
```

#### `property_listings` table (bootstrap_core_tables.sql)
```sql
CREATE TABLE property_listings (
  id UUID PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id),
  platform_id UUID REFERENCES platforms(id),  -- 'booking', 'airbnb', etc
  external_listing_id VARCHAR,                 -- ID na plataforma
  ical_url TEXT,                               -- URL para importação
  sync_enabled BOOLEAN,                        -- Ativar/desativar sync
  last_synced_at TIMESTAMP,
  is_active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### `properties` table (bootstrap_core_tables.sql + 20260315010000_ical_export_token.sql)
```sql
ALTER TABLE properties ADD COLUMN ical_export_token TEXT UNIQUE;
-- Token único por propriedade (gerado aleatoriamente)
-- Usado para URL pública segura: /api/ical/{id}?token={token}
```

### 1.5 Lógica de Detecção de Bloqueios

Em `icalService.ts`, função `isBlockedEvent()`:
- Palavras-chave: "not available", "blocked", "unavailable", "indisponível", "closed", "maintenance", "owner block"
- TRANSP=TRANSPARENT → ignored
- Feed Airbnb: filtra por keyword
- Feed Booking/Flatio: **não filtra por keyword** (usam "CLOSED" para reservas reais)
- Duração > 180 dias → fechamento sazonal, ignored

### 1.6 Endpoints de Sincronização Atuais

#### POST /api/sync/import
**Autenticação**: admin, gestor  
**Body**:
```json
{
  "property_ids": ["uuid-1", "uuid-2"],
  "url": "...",  // Legacy
  "property_id": "...",  // Legacy
  "listing_id": "..."   // Legacy
}
```
**Response**:
```json
{
  "success": true,
  "results": [
    {
      "property_id": "...",
      "property_name": "Casa no Porto",
      "created": 5,
      "updated": 2,
      "skipped": 1,
      "cancelled": 0,
      "errors": []
    }
  ],
  "totals": { "created": 5, "updated": 2, "skipped": 1, "cancelled": 0 }
}
```

#### GET /api/cron/sync-ical
**Autenticação**: CRON_SECRET  
**Schedule**: `0 3 * * *` (03:00 UTC daily, vercel.json)  
**Behavior**: Sync todas as property_listings com ical_url configurada

#### POST /api/properties/[id]/ical-token
**Autenticação**: user token (Bearer)  
**Response**: `{ "ical_export_token": "novo-uuid" }`

#### GET /api/ical/[propertyId]?token=TOKEN
**Autenticação**: Token único por propriedade  
**Response**: `.ics file (text/calendar)`

---

## 2. Estado Atual: Criação de Reservas na App

### 2.1 Página de Criação: `/reservations/new`

**Arquivo**: `src/app/[locale]/reservations/new/page.tsx`

**Fluxo**:
1. Usuário seleciona propriedade (select)
2. Usuário seleciona listing/anúncio (select, carregado dinamicamente)
3. Usuário preenche datas (check_in, check_out)
4. Validação: noites mínimas (min_nights da propriedade)
   - Se < min_nights: aviso com confirm() — permite bypass
5. Usuário preenche dados de hóspede (first_name, last_name, email, phone)
6. Criar/buscar guest (insert ou select)
7. INSERT reservations com:
   - `property_listing_id`: UUID do anúncio
   - `guest_id`: UUID do hóspede
   - `status`: 'confirmed'
   - `booking_source`: 'manual'
   - `check_in`, `check_out`: dates
   - `number_of_guests`: integer
   - `organization_id`: multi-tenancy
8. Notificar proprietário (fire-and-forget)

**Validação de Disponibilidade**: ❌ **NÃO IMPLEMENTADA**
- Não verifica se as datas estão livres
- Confiana na trigger `check_reservation_conflict()` (validação em DB)

### 2.2 Trigger de Conflito (Migration 20260330020000)

```sql
CREATE OR REPLACE FUNCTION check_reservation_conflict()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM reservations r
    JOIN property_listings pl ON r.property_listing_id = pl.id
    WHERE pl.property_id = (
      SELECT property_id FROM property_listings WHERE id = NEW.property_listing_id
    )
    AND r.status IN ('confirmed', 'pending_payment')
    AND r.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (NEW.check_in >= r.check_in AND NEW.check_in < r.check_out)
      OR (NEW.check_out > r.check_in AND NEW.check_out <= r.check_out)
      OR (NEW.check_in <= r.check_in AND NEW.check_out >= r.check_out)
    )
  ) THEN
    RAISE EXCEPTION 'Conflito de reserva detectado para estas datas';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Limitações**:
- Validação acontece **após** o usuário submeter
- Erro retornaado ao frontend como 400/500
- UX ruim: usuário só descobre disponibilidade ao fim do form
- Não filtra por iCal sync (poderia aceitar draft reservations)

### 2.3 Componente Calendar

**Arquivo**: `src/components/calendar/CalendarPageClient.tsx`

**GET /api/calendar/reservations**:
- Busca reservations `status IN ('confirmed', 'pending')`
- Filtra por data range e property_id
- Retorna eventos FullCalendar com cores
- Pending = amber (0.65 opacity), Confirmed = property colour

**Modal**: `NewReservationModal.tsx`
- Click em data do calendário → abre modal
- Usuário escolhe propriedade (opcional)
- Redireciona para `/reservations/new?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&property_id=UUID`

---

## 3. Requisito Novo: Sincronização Bidirecional (App → Plataformas)

### 3.1 Fluxo Desejado

```
Usuário cria reserva na app
        ↓
POST /api/calendar/reservations ou POST /reservations/new
        ↓
VERIFICAÇÃO DE DISPONIBILIDADE:
  1. Buscar todas as reservations (confirmed + pending_payment)
       da mesma propriedade no período
  2. Buscar todas as reservations importadas via iCal (source='ical_import')
  3. Comparar datas: se nenhuma sobreposição, OK
  4. Se sobreposição: rejeitar com erro HTTP 409 Conflict
        ↓
INSERT reservation com:
  - booking_source: 'manual' ou 'direct'
  - source: 'manual'
  - status: 'confirmed' ou 'pending'
  - organization_id: isolamento multi-tenancy
        ↓
NOTIFICAR PLATAFORMAS:
  Para cada platform_listing da propriedade:
    1. Buscar external_property_id (Booking.com ID, etc)
    2. Gerar evento iCal com UID único
    3. POST para Booking.com / Airbnb / Flatio API
       (ou atualizar iCal de forma que plataforma re-synce)
        ↓
Log: sync_logs (direction='outbound', status='success'|'failure')
        ↓
Notificar proprietário (fire-and-forget)
```

### 3.2 Mudanças no Modelo de Dados

#### Novos campos em `reservations` (migration necessária)

```sql
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS synced_to_platforms BOOLEAN DEFAULT false;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS last_platform_sync_at TIMESTAMP;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS platform_sync_errors TEXT; -- JSON array de erros
```

**Justificativa**:
- `synced_to_platforms`: Sinaliza se a reserva foi replicada para plataformas
- `last_platform_sync_at`: Rastreamento de quando foi o último push
- `platform_sync_errors`: Armazena erros de retry (JSON array)

#### Novos campos em `sync_logs` (já existente)

Usar tabela existente com:
- `direction`: 'inbound' (plataforma → app) | 'outbound' (app → plataforma)
- `sync_type`: 'ical_import' | 'manual_push' | 'api_push'
- `status`: 'success' | 'failure' | 'partial'

---

## 4. Arquitetura de Sincronização Bidirecional

### 4.1 Estratégia Recomendada: Hybrid Push + Pull

Booking.com, Airbnb não possuem webhooks **que escutam atualizações de propriedades**. Portanto:

**Opção 1: Push via iCal Export** (Recomendado para MVP)
- App gera iCal com reserva nova
- Plataforma já tem URL iCal configurada em `/api/ical/[propertyId]?token=...`
- Plataforma faz polling (daily cron, ou manual sync)
- **Vantagem**: Sem mudança de infraestrutura, usa endpoint existente
- **Desvantagem**: Delay até plataforma fazer polling

**Opção 2: Push direto via API de Plataforma** (Futuro)
- POST para Booking.com API v2 ou Airbnb API
- Requer: autenticação API de cada plataforma
- Requer: transformação de reserva app → formato plataforma
- **Vantagem**: Real-time
- **Desvantagem**: Complexo, múltiplas integrações

**Recomendação para MVP**: **Opção 1** — usa iCal export existente, plataformas fazem polling diário

### 4.2 Novo Endpoint: Validação de Disponibilidade

```typescript
// POST /api/reservations/check-availability
// Request
{
  "property_id": "uuid",
  "check_in": "2026-04-20",
  "check_out": "2026-04-25",
  "exclude_reservation_id": "uuid" // Para edição de reserva existente
}

// Response (200 OK)
{
  "available": true,
  "conflicting_reservations": []
}

// Response (409 Conflict)
{
  "available": false,
  "conflicting_reservations": [
    {
      "id": "uuid",
      "guest_name": "João Silva",
      "check_in": "2026-04-22",
      "check_out": "2026-04-24",
      "source": "ical_import",
      "booking_source": "booking",
      "status": "confirmed"
    }
  ]
}
```

**Implementação**:
```typescript
// src/lib/reservations/checkAvailability.ts
export async function checkAvailability(
  propertyId: string,
  checkIn: string,
  checkOut: string,
  organizationId: string,
  excludeReservationId?: string
): Promise<{
  available: boolean
  conflicts: Array<{id: string, guest_name: string, check_in: string, check_out: string}>
}> {
  const supabase = createAdminClient()
  
  const { data: conflicts } = await supabase
    .from('reservations')
    .select(`
      id,
      check_in,
      check_out,
      guests(first_name, last_name),
      property_listing_id,
      property_listings!inner(property_id),
      source,
      booking_source,
      status
    `)
    .eq('property_listings.property_id', propertyId)
    .eq('organization_id', organizationId)
    .in('status', ['confirmed', 'pending_payment'])
    .not('id', 'eq', excludeReservationId || 'null')
    .lt('check_in', checkOut)
    .gt('check_out', checkIn)
  
  return {
    available: !conflicts || conflicts.length === 0,
    conflicts: (conflicts || []).map(c => ({...}))
  }
}
```

### 4.3 Lógica de Outbound Sync

```typescript
// src/lib/reservations/syncToOutboundPlatforms.ts

export async function syncReservationToOutboundPlatforms(
  reservationId: string,
  organizationId: string
): Promise<{
  success: boolean
  synced_platforms: string[]
  errors: Array<{ platform: string, error: string }>
}> {
  const supabase = createAdminClient()
  
  // 1. Buscar reserva
  const { data: reservation } = await supabase
    .from('reservations')
    .select(`
      id, check_in, check_out, guests(first_name, last_name),
      property_listing_id, property_listings!inner(
        property_id,
        platform_id,
        properties!inner(id, name, ical_export_token)
      )
    `)
    .eq('id', reservationId)
    .eq('organization_id', organizationId)
    .single()
  
  if (!reservation) throw new Error('Reserva não encontrada')
  
  // 2. Buscar listings da propriedade (para determinar plataformas)
  const propertyId = (reservation.property_listing_id as any).property_id
  const { data: allListings } = await supabase
    .from('property_listings')
    .select('id, platform_id, external_listing_id, platforms(name, code)')
    .eq('property_id', propertyId)
    .eq('is_active', true)
  
  // 3. Para cada plataforma, enviar atualização
  const results = { synced_platforms: [], errors: [] as any[] }
  
  for (const listing of allListings || []) {
    try {
      const platform = (listing.platforms as any)?.code
      
      // A. iCal Export — plataforma já tem URL configurada
      // B. API direto — chamar Booking.com / Airbnb API (futuro)
      
      // MVP: confiar que plataforma faz polling de /api/ical/{property}?token=...
      // e ela verá a nova reserva no iCal gerado
      
      results.synced_platforms.push(platform || 'unknown')
      
      // Registrar sucesso em sync_logs
      await supabase.from('sync_logs').insert({
        property_listing_id: listing.id,
        sync_type: 'manual_push',
        direction: 'outbound',
        status: 'success',
        records_processed: 1
      })
    } catch (err) {
      results.errors.push({
        platform: (listing.platforms as any)?.name,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    }
  }
  
  // 4. Atualizar flag na reserva
  await supabase
    .from('reservations')
    .update({
      synced_to_platforms: true,
      last_platform_sync_at: new Date().toISOString()
    })
    .eq('id', reservationId)
  
  return {
    success: results.errors.length === 0,
    synced_platforms: results.synced_platforms,
    errors: results.errors
  }
}
```

### 4.4 Modificação do Fluxo de Criação

**Arquivo**: `src/app/[locale]/reservations/new/page.tsx`

```typescript
// Adicionar step de verificação

async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault()
  setLoading(true)
  setError(null)

  const checkIn = formData.get('check_in') as string
  const checkOut = formData.get('check_out') as string
  const selectedProperty = formData.get('property_id') as string

  // 1. NOVA: Verificar disponibilidade
  try {
    const availabilityCheck = await fetch('/api/reservations/check-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property_id: selectedProperty,
        check_in: checkIn,
        check_out: checkOut
      })
    }).then(r => r.json())

    if (!availabilityCheck.available) {
      setError(`Datas indisponíveis. Conflito com: ${availabilityCheck.conflicting_reservations
        .map(r => `${r.guest_name} (${r.check_in} a ${r.check_out})`)
        .join(', ')}`)
      setLoading(false)
      return
    }
  } catch (err) {
    console.error('Erro ao verificar disponibilidade:', err)
    // Continuar mesmo se verificação falhar (fail-open)
  }

  // 2. Criar reserva (resto do código existente)
  const { data, error: insertError } = await supabase
    .from('reservations')
    .insert({...})
    .select()
    .single()

  // 3. NOVA: Sincronizar para plataformas (fire-and-forget)
  if (data?.id) {
    fetch('/api/reservations/sync-to-platforms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservation_id: data.id })
    }).catch(err => console.error('Erro ao sincronizar para plataformas:', err))
  }
}
```

### 4.5 Novo Endpoint: POST /api/reservations/check-availability

**Arquivo**: `src/app/api/reservations/check-availability/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { checkAvailability } from '@/lib/reservations/checkAvailability'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor', 'viewer'])
    if (!auth.authorized) return auth.response!

    const { property_id, check_in, check_out, exclude_reservation_id } = await request.json()

    if (!property_id || !check_in || !check_out) {
      return NextResponse.json(
        { error: 'property_id, check_in, check_out são obrigatórios' },
        { status: 400 }
      )
    }

    const result = await checkAvailability(
      property_id,
      check_in,
      check_out,
      auth.organizationId,
      exclude_reservation_id
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao verificar disponibilidade:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar disponibilidade' },
      { status: 500 }
    )
  }
}
```

### 4.6 Novo Endpoint: POST /api/reservations/sync-to-platforms

**Arquivo**: `src/app/api/reservations/sync-to-platforms/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { syncReservationToOutboundPlatforms } from '@/lib/reservations/syncToOutboundPlatforms'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const { reservation_id } = await request.json()

    if (!reservation_id) {
      return NextResponse.json(
        { error: 'reservation_id é obrigatório' },
        { status: 400 }
      )
    }

    const result = await syncReservationToOutboundPlatforms(
      reservation_id,
      auth.organizationId
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao sincronizar para plataformas:', error)
    return NextResponse.json(
      { error: 'Erro ao sincronizar' },
      { status: 500 }
    )
  }
}
```

---

## 5. Fluxo de Edição de Reservas

### 5.1 Cenário: Usuário edita datas

**Arquivo**: `src/app/[locale]/reservations/[id]/edit/page.tsx`

```typescript
// Antes de salvar, verificar disponibilidade novamente

const { data: currentReservation } = await supabase
  .from('reservations')
  .select('property_listing_id, check_in, check_out')
  .eq('id', reservationId)
  .single()

// Se datas mudaram
if (currentReservation.check_in !== newCheckIn || currentReservation.check_out !== newCheckOut) {
  const availability = await checkAvailability(
    propertyId,
    newCheckIn,
    newCheckOut,
    organizationId,
    reservationId // exclude current reservation
  )

  if (!availability.available) {
    setError('Novas datas conflitam com reservas existentes')
    return
  }
}

// Update
await supabase.from('reservations').update({...}).eq('id', reservationId)

// Re-sync para plataformas (opcionalmente, só se datas mudaram)
fetch('/api/reservations/sync-to-platforms', {
  method: 'POST',
  body: JSON.stringify({ reservation_id: reservationId })
}).catch(...)
```

---

## 6. Resumo de Mudanças Necessárias

### 6.1 Banco de Dados

| Tipo | Item | Arquivo Migration |
|------|------|-------------------|
| Nova coluna | `reservations.synced_to_platforms` BOOLEAN | `20260413_XX_sync_to_platforms.sql` |
| Nova coluna | `reservations.last_platform_sync_at` TIMESTAMP | `20260413_XX_sync_to_platforms.sql` |
| Nova coluna | `reservations.platform_sync_errors` TEXT (JSON) | `20260413_XX_sync_to_platforms.sql` |
| Índice | `idx_reservations_property_listing_status` para queries rápidas | `20260413_XX_sync_to_platforms.sql` |

### 6.2 Backend (Node.js/TypeScript)

| Arquivo | Função | Tipo |
|---------|--------|------|
| `src/lib/reservations/checkAvailability.ts` | Verificar datas livres | **Novo** |
| `src/lib/reservations/syncToOutboundPlatforms.ts` | Push para plataformas | **Novo** |
| `src/app/api/reservations/check-availability/route.ts` | Endpoint validação | **Novo** |
| `src/app/api/reservations/sync-to-platforms/route.ts` | Endpoint sync out | **Novo** |
| `src/app/[locale]/reservations/new/page.tsx` | Integrar check + sync | **Modificação** |
| `src/app/[locale]/reservations/[id]/edit/page.tsx` | Integrar check + sync | **Modificação** |

### 6.3 Frontend (React)

| Arquivo | Mudança |
|---------|---------|
| `src/components/calendar/NewReservationModal.tsx` | Mostrar feedback de verificação (loading, erro de conflito) |
| `/reservations/new` page | Integrar validação antes de submit |
| `/reservations/[id]/edit` page | Integrar validação em edição |

---

## 7. Fluxo Completo: Exemplo Prático

### Cenário: Criar reserva manual em 20-25 de Abril de 2026

```
1. Usuário clica em data no calendário (20 de Abril)
   ↓
2. Modal: "Nova Reserva" com check-in=2026-04-20, check-out=2026-04-21 (padrão)
   ↓
3. Usuário ajusta: check-in=2026-04-20, check-out=2026-04-25, seleciona propriedade, preenche hóspede
   ↓
4. Clica "Criar Reserva"
   ↓
5. Frontend: POST /api/reservations/check-availability
   {
     "property_id": "abc123",
     "check_in": "2026-04-20",
     "check_out": "2026-04-25"
   }
   ↓
6. Backend: Consultar DB
   - Buscar todas as reservations da propriedade com status IN ('confirmed', 'pending_payment')
   - Verificar sobreposição: check_in < 2026-04-25 AND check_out > 2026-04-20
   - Resultado: Nenhuma sobreposição encontrada
   ↓
7. Backend responde: { "available": true }
   ↓
8. Frontend: POST /reservations/new (submit form)
   - INSERT em reservations com booking_source='manual', source='manual'
   ↓
9. Backend: INSERT sucesso, retorna reservation ID
   ↓
10. Frontend (fire-and-forget): POST /api/reservations/sync-to-platforms
    { "reservation_id": "xyz789" }
    ↓
11. Backend: 
    - Buscar listings da propriedade (Booking.com, Airbnb, etc)
    - Registrar em sync_logs: direction='outbound', status='success'
    - UPDATE reservations: synced_to_platforms=true
    ↓
12. Próximo dia: Plataforma faz polling de /api/ical/abc123?token=...
    - Encontra nova reserva (UID: reservation-xyz789@homestay.com)
    - Importa como bloqueio no calendário deles
    ↓
13. Resultado: Datas 20-25 de Abril bloqueadas em Booking.com, Airbnb, etc
```

---

## 8. Considerações de Segurança

### 8.1 RLS (Row Level Security)

Existing RLS via `organization_id`:
```sql
-- Reservations: usuários veem só reservations da sua org
CREATE POLICY "Users can view reservations in their org"
  ON reservations FOR SELECT
  USING (organization_id = get_user_organization_id());
```

**Mudança necessária**: Nenhuma (multi-tenancy já protege)

### 8.2 Token de Export iCal

Existing token verificação:
```typescript
if (!token || token !== property.ical_export_token) {
  return NextResponse.json({ error: 'Invalid or missing token' }, { status: 401 })
}
```

**Ação**: Regenerar token periodicamente (admin endpoint já existe)

### 8.3 Rate Limiting

Endpoints novos devem ter rate limiting:
```typescript
// POST /api/reservations/check-availability: 100 req/min por user
// POST /api/reservations/sync-to-platforms: 50 req/min (background)
```

---

## 9. Roadmap de Implementação

### Phase 1: MVP (Atual)
- [x] Importação unidirecional via iCal (plataformas → app)
- [x] Geração iCal para export (app → plataformas, via polling)
- [ ] **Validação de disponibilidade em criação** (NEW)
- [ ] **Novo endpoint check-availability** (NEW)
- [ ] **Flag synced_to_platforms + logging** (NEW)

### Phase 2: Melhorias (Q2 2026)
- [ ] Detecção automática de duplicatas (mesmo guest, múltiplas plataformas)
- [ ] Dashboard de sincronização (histórico detalhado)
- [ ] Alertas quando sync falha
- [ ] Manual retry de failed syncs

### Phase 3: API Direto (Q3 2026)
- [ ] Integração Booking.com API v2 (push direto)
- [ ] Integração Airbnb API (push direto)
- [ ] Webhooks de plataformas (escutar atualizações)
- [ ] Sync bidirecional real-time

### Phase 4: Compliance (Q4 2026)
- [ ] Audit trail completo (quem criou, quando, sincronizou)
- [ ] Conformidade LGPD/GDPR
- [ ] Criptografia de dados sensíveis

---

## 10. Ficheiros Afectados

### Criados (Novos)
```
src/lib/reservations/checkAvailability.ts
src/lib/reservations/syncToOutboundPlatforms.ts
src/app/api/reservations/check-availability/route.ts
src/app/api/reservations/sync-to-platforms/route.ts
supabase/migrations/20260413_XX_sync_to_platforms.sql
```

### Modificados
```
src/app/[locale]/reservations/new/page.tsx
src/app/[locale]/reservations/[id]/edit/page.tsx
src/components/calendar/NewReservationModal.tsx
vercel.json (potencial novo cron para retry de syncs)
```

### Documentação Atualizada
```
ICAL_INTEGRATION.md (atualizar com fluxo bidirecional)
docs/STRATEGIC_ROADMAP.md (atualizar Phase 2+3)
```

---

## 11. Testes Recomendados

### 11.1 Unit Tests
- `checkAvailability()`: sobreposição em vários cenários
- `syncToOutboundPlatforms()`: múltiplas plataformas, falhas parciais

### 11.2 Integration Tests
- POST /api/reservations/check-availability com dados reais
- POST /api/reservations/check-availability quando existe conflito
- POST /reservations/new → check → sync fluxo completo

### 11.3 E2E Tests (Playwright)
1. Criar reserva via UI → verificar se aparece no calendário
2. Criar reserva com datas conflitantes → erro 409
3. Editar datas → refaz validação
4. Verificar iCal export contém nova reserva

---

## 12. Métricas de Sucesso

| Métrica | Target | Como Medir |
|---------|--------|-----------|
| Validação de disponibilidade | 100% das criações | POST check antes de INSERT |
| Tempo de resposta check-availability | <200ms | CloudWatch/APM |
| Taxa de sucesso de sync | >95% | sync_logs.status='success' / total |
| Atraso entre criação app e plataforma | <24h | last_platform_sync_at timestamp |
| Conflitos detectados | 0 overbookings | Validação em criação e DB trigger |

---

## 13. Referências

- **ICAL_INTEGRATION.md** — Documentação original (importação)
- **booking_native_integration.md** — Plano de API direto Booking.com
- **user_property_assignment.md** — Multi-tenancy, org isolation
- **semana_1_roles.md** — Estrutura de roles (admin, gestor, viewer)

---

**Próximos Passos**:
1. Revise este documento com o @architect
2. Crie migration para novas colunas (20260413_XX_sync_to_platforms.sql)
3. Implemente checkAvailability.ts
4. Implemente novo endpoint check-availability
5. Integre validação em /reservations/new page
6. Testes end-to-end

---

**Última Atualização**: 13 de Abril de 2026  
**Documentação por**: Claude Code  
**Status**: ✅ Análise Completa - Pronto para Implementação
