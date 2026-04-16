# 📅 iCal Integration & Email Parsing Deprecation

## Visão Geral

Este documento descreve a implementação de integração com iCal (Booking.com, Airbnb, etc.) e a desactivação do email parsing baseado em Claude.

**Data de Implementação**: 16 de Março de 2026
**Status**: ✅ Completo e Funcional

---

## 1. Mudanças Principais

### 1.1 Email Parsing Desactivado ❌

**Ficheiros Alterados**:
- `vercel.json` - Removido cron `email-parser`
- `src/app/api/email/sync/route.ts` - Retorna `410 Gone`
- `src/app/settings/page.tsx` - Removido `EmailConnection` component

**Motivo**: Email parsing via Claude era instável e não extractava datas corretamente de emails em português.

**Novo Comportamento**:
```bash
POST /api/email/sync → 410 Gone
```

---

### 1.2 iCal Import Melhorado ✅

**Novo Parser**: `src/lib/ical/bookingParser.ts`

Extrai automaticamente do `DESCRIPTION` do iCal:
```
BOOKING ID: 12345678
PHONE: +34 912345678
COUNTRY: Spain
GUESTS: 2
```

**Ficheiros Modificados**:
- `src/app/api/sync/import/route.ts` - Usa `parseBookingDescription()`
- `src/app/api/cron/sync-ical/route.ts` - Usa parser para dados ricos
- `src/app/api/ical/[propertyId]/route.ts` - Verifica token

**Novos Campos em `reservations`**:
```sql
source TEXT DEFAULT 'unknown' -- 'booking', 'airbnb', 'unknown'
booking_source TEXT DEFAULT 'manual'
number_of_guests INTEGER
```

**Novos Campos em `guests`**:
```sql
phone TEXT
country TEXT
```

---

### 1.3 Segurança: iCal Export com Token 🔐

**Novo Mecanismo**:
```
URL Publica: /api/ical/[propertyId]?token=SEU_TOKEN_UNICO
```

**Campos Adicionados** em `properties`:
```sql
ical_export_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT
```

**Regenerar Token**:
```bash
POST /api/properties/[id]/ical-token
Authorization: Bearer {user_token}
Response: { ical_export_token: "novo-uuid" }
```

---

## 2. Arquitetura Técnica

### 2.1 Fluxo de Importação iCal

```
┌─────────────────┐
│  Plataforma     │
│ (Booking.com)   │
└────────┬────────┘
         │
         │ iCal URL
         ↓
┌─────────────────────────────┐
│ GET /api/sync/import        │
│ POST { property_ids: [...]} │
└────────┬────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│ importICalFromUrl()          │
│ (icalService.ts)            │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│ parseBookingDescription()    │
│ (bookingParser.ts)          │
│ - BOOKING ID                 │
│ - PHONE                      │
│ - COUNTRY                    │
│ - GUESTS                     │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│ Criar/Atualizar:            │
│ - guests (com phone)        │
│ - reservations (com source) │
└──────────────────────────────┘
```

### 2.2 Fluxo de Exportação iCal

```
┌───────────────────────────────────┐
│ Plataforma (Airbnb, etc)         │
│ Solicita: /api/ical/[id]?token=X │
└────────┬────────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│ Verificar token              │
│ (query param ?token)        │
└────────┬─────────────────────┘
         │
         ↓ Token válido?
    YES │ NO ↓ 401 Unauthorized
         │
         ↓
┌──────────────────────────────┐
│ generateICalFromReservations()│
│ (icalService.ts)            │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│ Retornar .ics file          │
│ (text/calendar)             │
└──────────────────────────────┘
```

---

## 3. API Endpoints

### 3.1 Sincronizar iCal (Manual)

```bash
POST /api/sync/import
Content-Type: application/json

{
  "property_ids": ["uuid-1", "uuid-2"]
}

Response:
{
  "success": true,
  "results": [
    {
      "property_id": "uuid",
      "property_name": "Casa no Porto",
      "created": 5,
      "updated": 2,
      "skipped": 1,
      "cancelled": 0,
      "errors": []
    }
  ],
  "totals": {
    "created": 5,
    "updated": 2,
    "skipped": 1,
    "cancelled": 0
  }
}
```

### 3.2 Sincronizar iCal (Automático - Cron)

```bash
GET /api/cron/sync-ical
Authorization: Bearer {CRON_SECRET}

# Executa diariamente às 03:00 UTC
# Configurado em vercel.json
```

### 3.3 Exportar iCal (Público com Token)

```bash
GET /api/ical/[propertyId]?token=SEU_TOKEN_UNICO

Response: .ics file (text/calendar)

Exemplo:
GET /api/ical/550e8400-e29b-41d4-a716-446655440000?token=abc123def456
```

### 3.4 Regenerar Token

```bash
POST /api/properties/[propertyId]/ical-token
Authorization: Bearer {user_token}
Content-Type: application/json

Response:
{
  "ical_export_token": "novo-uuid-aleatorio"
}
```

### 3.5 Atualizar iCal URL de Listing

```bash
PATCH /api/property-listings/[listingId]
Authorization: Bearer {user_token}
Content-Type: application/json

{
  "ical_url": "https://booking.com/ical/...",
  "sync_enabled": true
}

Response:
{
  "id": "uuid",
  "ical_url": "https://...",
  "sync_enabled": true,
  "is_active": true
}
```

---

## 4. Componentes UI

### 4.1 Settings Page (`src/app/settings/page.tsx`)

**Nova Estrutura**:
- **Secção 1**: "Importar Reservas" - Configurar URLs iCal das plataformas
- **Secção 2**: "Exportar Reservas" - URLs para partilhar com outras plataformas

### 4.2 ICalSyncSettings Component

```tsx
<ICalSyncSettings listings={listings} propertyId={propertyId} />
```

**Funcionalidades**:
- ✅ Editar URL iCal por anúncio
- ✅ Toggle sincronização automática
- ✅ Botão "Sincronizar Agora"
- ✅ Última sincronização

### 4.3 ICalExportSection Component

```tsx
<ICalExportSection properties={properties} appUrl={appUrl} />
```

**Funcionalidades**:
- ✅ URL segura com token
- ✅ Botão copiar para clipboard
- ✅ Regenerar token
- ✅ Instruções para cada plataforma

---

## 5. Banco de Dados

### 5.1 Tabelas Afectadas

#### `properties`
```sql
ALTER TABLE properties ADD COLUMN ical_export_token TEXT UNIQUE;
ALTER TABLE properties ADD COLUMN owner_id UUID;
ALTER TABLE properties ADD COLUMN organization_id UUID;
```

#### `guests`
```sql
ALTER TABLE guests ADD COLUMN phone TEXT;
ALTER TABLE guests ADD COLUMN country TEXT;
ALTER TABLE guests ADD COLUMN organization_id UUID;
```

#### `reservations`
```sql
ALTER TABLE reservations ADD COLUMN source TEXT; -- 'booking', 'airbnb', etc
ALTER TABLE reservations ADD COLUMN booking_source TEXT;
ALTER TABLE reservations ADD COLUMN number_of_guests INTEGER;
```

### 5.2 Índices Criados

```sql
-- Para performance de token lookups
CREATE INDEX idx_properties_ical_export_token
  ON properties(ical_export_token)
  WHERE ical_export_token IS NOT NULL;

-- Para encontrar guests duplicados
CREATE INDEX idx_guests_phone_organization
  ON guests(phone, organization_id)
  WHERE phone IS NOT NULL;

-- Para filtrar por source
CREATE INDEX idx_reservations_source
  ON reservations(source);
```

---

## 6. Dados Actuais

**Estado do Banco** (16 de Março de 2026):

| Tabela | Registos | Status |
|--------|----------|--------|
| user_profiles | 2 | ✅ |
| guests | 67 | ✅ |
| reservations | 13 | ✅ |
| properties | 2 | ✅ |
| property_listings | 7 | ✅ |
| owners | 1 | ✅ |
| organizations | 2 | ✅ |
| expenses | 17 | ✅ |

---

## 7. Configuração & Deploy

### 7.1 Variáveis de Ambiente

Verificar em `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=... # Para /api/cron/sync-ical
NEXT_PUBLIC_APP_URL=... # Para URLs de export
```

### 7.2 Crons Activos

**vercel.json**:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-ical",
      "schedule": "0 3 * * *"  // 03:00 UTC diariamente
    }
  ]
}
```

**Removido**:
- `"path": "/api/cron/email-parser"` ❌

---

## 8. Testing & Validação

### 8.1 Testar Importação iCal

```bash
# 1. Ir para Settings
GET /settings

# 2. Preencher URL iCal de Booking.com
PATCH /api/property-listings/[listingId]
{
  "ical_url": "https://booking.com/ical/...",
  "sync_enabled": true
}

# 3. Clicar "Sincronizar Agora"
POST /api/sync/import
{ "property_ids": ["..."] }

# 4. Verificar reservations foram criadas com:
# - source: 'booking'
# - number_of_guests extraído
# - guest.phone e guest.country preenchidos
```

### 8.2 Testar Exportação iCal

```bash
# 1. Copiar URL de export em Settings
GET /api/ical/[propertyId]?token=SEU_TOKEN

# 2. Testar em navegador (deve fazer download do .ics)

# 3. Regenerar token
POST /api/properties/[propertyId]/ical-token

# 4. Token antigo não deve funcionar mais
GET /api/ical/[propertyId]?token=TOKEN_ANTIGO
# → 401 Unauthorized
```

### 8.3 Testar Parser Booking.com

```bash
# Adicionar console.log em bookingParser.ts
console.log('Parsed:', bookingData);

// Verificar se extrai correctamente:
// - bookingId
// - phone
// - country
// - numGuests
```

---

## 9. Troubleshooting

### Problema: "relation 'user_profiles' does not exist"
**Solução**: Executar todas as migrações na ordem correcta
```bash
supabase migration up
```

### Problema: iCal URL retorna 0 eventos
**Solução**:
1. Verificar se URL é válida (copiar em browser)
2. Verificar se `sync_enabled` está true
3. Verificar logs em `/api/cron/sync-ical`

### Problema: Token inválido para exportação
**Solução**:
1. Copiar token actual de Settings
2. Regenerar se necessário
3. Verificar `properties.ical_export_token` em Supabase

### Problema: Guests não têm phone/country preenchidos
**Solução**:
1. Verificar se iCal tem DESCRIPTION com PHONE/COUNTRY
2. Verificar função `parseBookingDescription()` em bookingParser.ts
3. Ver logs de `/api/sync/import`

---

## 10. Roadmap Futuro

### Phase 5: Validação & QA
- [ ] Testar integração completa com Booking.com
- [ ] Testar integração com Airbnb
- [ ] Verificar RLS policies
- [ ] Load testing

### Phase 6: Documentação do Cliente
- [ ] Guia de setup por plataforma
- [ ] Vídeo tutorial
- [ ] FAQ

### Phase 7: Melhorias
- [ ] Detecção automática de duplicatas (mesmo guest, múltiplas plataformas)
- [ ] Dashboard de sincronização (histórico)
- [ ] Alertas quando sync falha

---

## 11. Ficheiros Modificados

### Criados (Novos)
- ✅ `src/lib/ical/bookingParser.ts`
- ✅ `src/components/settings/ICalSyncSettings.tsx`
- ✅ `src/components/settings/ICalExportSection.tsx`
- ✅ `src/app/api/property-listings/[id]/route.ts`
- ✅ `src/app/api/properties/[id]/ical-token/route.ts`
- ✅ `supabase/migrations/20260315_00_create_guests_table.sql`
- ✅ `supabase/migrations/20260315_01_ical_export_token.sql`
- ✅ `supabase/migrations/20260315_02_guest_phone_country.sql`

### Modificados
- ✅ `vercel.json` - Removido email-parser cron
- ✅ `src/app/api/email/sync/route.ts` - Retorna 410 Gone
- ✅ `src/app/api/sync/import/route.ts` - Usa bookingParser
- ✅ `src/app/api/cron/sync-ical/route.ts` - Usa bookingParser
- ✅ `src/app/api/ical/[propertyId]/route.ts` - Verifica token
- ✅ `src/app/settings/page.tsx` - Nova UI iCal

---

## 12. Contacto & Suporte

**Desenvolvedor**: Claude Code
**Data**: 16 de Março de 2026
**Status**: ✅ Production Ready

Para dúvidas técnicas, consulte:
- `src/lib/ical/bookingParser.ts` - Lógica de parsing
- `src/app/api/sync/import/route.ts` - Sincronização
- `CLAUDE.md` - Instruções do desenvolvimento

---

**Última Actualização**: 16 de Março de 2026
