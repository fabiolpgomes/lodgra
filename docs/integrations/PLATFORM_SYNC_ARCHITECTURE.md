# 🏗️ Arquitetura de Sincronização de Plataformas

Documentação sobre como adicionar novas plataformas de reservas (Booking, Airbnb, etc) ao Lodgra.

## 📊 Visão Geral

O Lodgra suporta duas estratégias de sincronização:

| Estratégia | Exemplo | Sincronização | Cron Job |
|-----------|---------|---------------|----------|
| **iCal (Push/Pull)** | Airbnb, Flatio, VRBO | URL de calendário | Compartilhado |
| **API Pull** | Booking | Credenciais API | Específico por plataforma |

---

## 1️⃣ Integração via iCal (Mais Simples)

**Plataformas que usam iCal:**
- ✅ Airbnb
- ✅ Flatio
- ✅ VRBO
- ✅ Google Calendar
- ✅ Outras que exportem iCal

### Como Funciona

```
Plataforma → gera URL iCal → Usuário cola em Lodgra
                              ↓
                    POST /api/onboarding/ical
                              ↓
                    Cria property_listing com:
                    - ical_url (URL da plataforma)
                    - sync_enabled: true
                    - platform_id: (se conhecido)
                              ↓
                    Cron job `/api/cron/sync-ical`
                    executa a cada 3 horas
                              ↓
                    Importa reservas automaticamente
```

### Implementação

**NENHUM código novo necessário!** 🎉

A URL iCal é automaticamente sincronizada pelo cron job existente:
- **Arquivo:** `/src/app/api/cron/sync-ical/route.ts`
- **Schedule:** `0 3 * * *` (diariamente às 3h UTC)
- **O que faz:** Busca todos os `property_listings` com `ical_url` definida

### Fluxo para o Usuário

1. Ir para a plataforma (ex: Airbnb)
2. Gerar URL de iCal de exportação (calendário)
3. No Lodgra: **Onboarding → Cole a URL iCal**
4. ✅ Pronto! Sincroniza automaticamente

---

## 2️⃣ Integração via API (Mais Robusta)

**Plataformas que usam API:**
- ✅ Booking.com (implementado)
- ⏳ Expedia (futuro)
- ⏳ Outras com API de reservas

### Como Funciona

```
Plataforma → API com credenciais → Usuário configura no Lodgra
                                         ↓
                          POST /api/channels/{platform}/connect
                                         ↓
                          Cria channel_credentials com:
                          - api_key (ou access_token)
                          - external_property_id
                          - is_active: true
                                         ↓
                          Cria channel_listings mapping
                                         ↓
                          Cron job `/api/cron/sync-{platform}-reservations`
                          executa a cada N horas
                                         ↓
                          Puxa e sincroniza reservas via API
```

### Implementação (Step-by-Step)

#### **Passo 1: Criar Cliente API**

Arquivo: `/src/lib/channels/{platform}-api-client.ts`

```typescript
// Exemplo: Expedia API Client
export interface ExpediaReservationItem {
  id: string
  property_id: string
  guest: { name: string; email?: string }
  check_in: string     // YYYY-MM-DD
  check_out: string    // YYYY-MM-DD
  number_of_guests: number
  status: 'CONFIRMED' | 'CANCELLED' | string
  total_price: { currency: string; amount: number }
}

export async function fetchExpediaReservations(
  externalPropertyId: string,
  apiKey: string,
  dateFrom: string,
  dateTo: string
): Promise<{ reservations: ExpediaReservationItem[]; error?: string }>
{
  // Implementar chamada à API de Expedia
}

export async function validateExpediaCredentials(
  externalPropertyId: string,
  apiKey: string
): Promise<string | null>
{
  // Testar credenciais
}
```

#### **Passo 2: Criar Processador de Reservas**

Arquivo: `/src/lib/channels/{platform}-reservation-processor.ts`

```typescript
export interface ProcessingResult {
  success: boolean
  created?: boolean
  error?: string
}

export async function processExpediaReservation(
  supabase: AdminClient,
  orgId: string,
  channelListingId: string,
  channelId: string,
  propertyListingId: string,
  reservation: {
    external_id: string
    guest_name: string
    guest_email?: string
    check_in: string
    check_out: string
    number_of_guests: number
    status: string
    total_amount: number
    currency: string
  }
): Promise<ProcessingResult>
{
  // Processar: criar/atualizar guest, criar/atualizar reservation
  // Ver exemplo: /src/lib/channels/booking-reservation-processor.ts
}
```

#### **Passo 3: Criar Rota de Conexão**

Arquivo: `/src/app/api/channels/{platform}/connect/route.ts`

```typescript
// Baseado em: /src/app/api/channels/booking/connect/route.ts
// Adaptar para:
// 1. Validar credenciais com validateExpediaCredentials()
// 2. Salvar em channel_credentials
// 3. Criar channel_listings mapping
```

#### **Passo 4: Criar Rota de Sincronização Manual**

Arquivo: `/src/app/api/channels/{platform}/sync/route.ts`

```typescript
// Baseado em: /src/app/api/channels/booking/sync/route.ts
// Adaptar para:
// 1. Buscar channel_credentials ativas
// 2. Chamar fetchExpediaReservations()
// 3. Processar com processExpediaReservation()
```

#### **Passo 5: Criar Cron Job**

Arquivo: `/src/app/api/cron/sync-{platform}-reservations/route.ts`

```typescript
// Baseado em: /src/app/api/cron/sync-booking-reservations/route.ts
// Adaptar para:
// 1. Buscar todos os channel_listings ativos da plataforma
// 2. Para cada um: chamar fetchExpediaReservations()
// 3. Processar com processExpediaReservation()
// 4. Atualizar last_synced_at
```

**Exemplo simplificado:**

```typescript
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Buscar todas as channel_listings do Expedia
  const { data: listings } = await supabase
    .from('channel_listings')
    .select('id, external_id, organization_id, channel_id, property_listing_id')
    .eq('is_active', true)
    // Filter para Expedia channel_id

  let totalCreated = 0, totalUpdated = 0

  for (const listing of listings) {
    // Buscar credenciais
    const { data: cred } = await supabase
      .from('channel_credentials')
      .select('api_key')
      .eq('organization_id', listing.organization_id)
      .single()

    // Buscar reservas (últimos 90 dias)
    const dateTo = new Date().toISOString().slice(0, 10)
    const dateFrom = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)

    const { reservations } = await fetchExpediaReservations(
      listing.external_id,
      cred.api_key,
      dateFrom,
      dateTo
    )

    // Processar cada reserva
    for (const r of reservations) {
      const result = await processExpediaReservation(
        supabase, listing.organization_id, listing.id, listing.channel_id,
        listing.property_listing_id, {...}
      )
      if (result.created) totalCreated++
    }

    // Atualizar last_synced_at
    await supabase
      .from('channel_listings')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', listing.id)
  }

  return NextResponse.json({ success: true, created: totalCreated })
}
```

#### **Passo 6: Registrar o Cron Job**

Arquivo: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-expedia-reservations",
      "schedule": "0 */6 * * *"  // A cada 6 horas (ou o que fizer sentido)
    }
  ]
}
```

#### **Passo 7: Permitir Disparo Manual**

Arquivo: `/src/app/api/admin/run-cron/route.ts`

```typescript
const ALLOWED_CRON_PATHS = [
  // ... existentes
  '/api/cron/sync-expedia-reservations',
]
```

---

## ✅ Checklist para Adicionar Nova Plataforma

### iCal (Airbnb, Flatio, VRBO)
- [ ] Nenhum código necessário
- [ ] Usuário cola a URL iCal no onboarding
- [ ] Cron job `/api/cron/sync-ical` sincroniza automaticamente

### API (Booking, Expedia, etc)
- [ ] Criar `/lib/channels/{platform}-api-client.ts`
- [ ] Criar `/lib/channels/{platform}-reservation-processor.ts`
- [ ] Criar `/app/api/channels/{platform}/connect/route.ts`
- [ ] Criar `/app/api/channels/{platform}/sync/route.ts`
- [ ] Criar `/app/api/cron/sync-{platform}-reservations/route.ts`
- [ ] Adicionar cron schedule em `vercel.json`
- [ ] Adicionar path em `/app/api/admin/run-cron/route.ts`
- [ ] Criar testes unitários
- [ ] Documentar no README

---

## 📈 Plataformas Atuais

| Plataforma | Tipo | Status | Cron | Última Atualização |
|-----------|------|--------|------|-------------------|
| Airbnb | iCal | ✅ Ativo | `/api/cron/sync-ical` | 2026-06-01 |
| Flatio | iCal | ✅ Ativo | `/api/cron/sync-ical` | 2026-06-01 |
| VRBO | iCal | ✅ Ativo | `/api/cron/sync-ical` | 2026-06-01 |
| Booking | API | ✅ Ativo | `/api/cron/sync-booking-reservations` | 2026-07-06 |

---

## 🔧 Configuração de Feature Flags

Se a plataforma é nova, adicionar feature flag:

```typescript
// /src/app/api/channels/{platform}/connect/route.ts
if (process.env.{PLATFORM}_CHANNEL_ENABLED !== 'true') {
  return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 })
}
```

Em `vercel.json` (environment variables):
```json
"{PLATFORM}_CHANNEL_ENABLED": "true"
```

---

## 🧪 Testes

Para cada nova plataforma, criar testes:

```typescript
// /src/__tests__/api/channels/{platform}/sync.test.ts
// /src/__tests__/lib/channels/{platform}-api-client.test.ts
```

---

## 🚨 Limites & Considerações

- **iCal:** Sincroniza a cada 3h, delay até 3h
- **API:** Sincroniza a cada N horas (configurável), mais controlado
- **Histórico:** Sincroniza últimos 90 dias (padrão)
- **Duplicatas:** Sistema detecta UIDs duplicados, evita criar 2x
- **Errors:** Se API falhar, log é registrado, próxima tentativa em N horas

---

## 📞 Referência Rápida

**iCal URL Pattern:**
```
https://ical.{platform}.com/v1/export?t={TOKEN}
https://www.airbnb.pt/calendar/ical/{LISTING_ID}.ics?t={TOKEN}
```

**API Credentials Padrão:**
```javascript
{
  channel_id: "uuid",
  organization_id: "uuid",
  external_property_id: "booking_prop_123",
  api_key: "key_...",
  is_active: true
}
```

**Channel Listing Mapping:**
```javascript
{
  property_listing_id: "uuid",  // Anúncio no Lodgra
  channel_id: "uuid",            // ID do canal (Booking, Expedia, etc)
  external_id: "exp_prop_456",   // ID da propriedade na plataforma externa
  organization_id: "uuid",
  last_synced_at: "2026-07-06T10:30:00Z",
  sync_count: 5
}
```

---

**Última atualização:** 2026-07-06 | **Versão:** 1.0 | **Autor:** Dex (Dev Agent)
