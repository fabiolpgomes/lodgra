# 🚀 iCal Integration - Quick Start Guide

## Para Utilizadores

### 1. Importar Reservas de Booking.com/Airbnb

1. Ir para **Settings** (`/settings`)
2. Secção **"Importar Reservas"**
3. Encontrar o seu anúncio
4. Clicar **"Editar"**
5. Colar o URL iCal (fornecido pela plataforma)
6. Activar **"Ativar sincronização automática"**
7. Clicar **"Guardar"**
8. Clicar **"Sincronizar Agora"** para testar

✅ As reservas serão importadas automaticamente à **03:00 UTC diariamente**

---

### 2. Exportar Reservas para Outras Plataformas

1. Ir para **Settings** (`/settings`)
2. Secção **"Exportar Reservas"**
3. Copiar a URL (botão **"Copiar"**)
4. Colar em:
   - **Airbnb**: Settings → Calendar Sync
   - **Flatio**: Integration → iCal
   - **Outras**: Procurar "Calendar Integration" ou "iCal"

ℹ️ **O URL é único e seguro** (contém um token)

---

## Para Desenvolvedores

### API Endpoints

#### Sincronizar iCal (Manual)
```bash
POST /api/sync/import
Content-Type: application/json

{
  "property_ids": ["uuid-property-id"]
}
```

#### Sincronizar iCal (Automático)
```bash
GET /api/cron/sync-ical
# Executa diariamente às 03:00 UTC
# Segredo em: CRON_SECRET (env var)
```

#### Exportar iCal (Público)
```bash
GET /api/ical/[propertyId]?token=TOKEN_UNICO
# Retorna .ics file (text/calendar)
```

#### Regenerar Token
```bash
POST /api/properties/[propertyId]/ical-token
Authorization: Bearer {user_token}
# Retorna novo token UUID
```

#### Atualizar iCal URL
```bash
PATCH /api/property-listings/[listingId]
Authorization: Bearer {user_token}

{
  "ical_url": "https://...",
  "sync_enabled": true
}
```

---

### Ficheiros Principais

| Ficheiro | Função |
|----------|--------|
| `src/lib/ical/bookingParser.ts` | Parse BOOKING ID, PHONE, COUNTRY, GUESTS |
| `src/lib/ical/icalService.ts` | Import/Export iCal files |
| `src/app/api/sync/import/route.ts` | Manual sync endpoint |
| `src/app/api/cron/sync-ical/route.ts` | Automatic daily sync |
| `src/app/api/ical/[propertyId]/route.ts` | Export iCal with token |
| `src/app/settings/page.tsx` | Settings UI |
| `src/components/settings/ICalSyncSettings.tsx` | Import UI component |
| `src/components/settings/ICalExportSection.tsx` | Export UI component |

---

### Testar Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Criar .env.local com variáveis Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=sua_senha_aqui
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 3. Iniciar dev server
npm run dev

# 4. Ir para http://localhost:3000/settings

# 5. Testar:
# - Editar iCal URL
# - Clicar "Sincronizar Agora"
# - Verificar console para logs
# - Verificar Supabase: reservations, guests

# 6. Testar export
# GET http://localhost:3000/api/ical/[propertyId]?token=[token]
```

---

### Debug

#### Ver logs de sincronização
```sql
-- Supabase SQL Editor
SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 10;
```

#### Ver logs de parsing de email
```sql
SELECT * FROM email_parse_log ORDER BY received_at DESC LIMIT 5;
```

#### Ver tokens de export
```sql
SELECT id, name, ical_export_token FROM properties;
```

#### Regenerar um token (SQL)
```sql
UPDATE properties
SET ical_export_token = gen_random_uuid()::TEXT
WHERE id = 'uuid-aqui';
```

---

### Verificar Saúde do Sistema

```bash
# 1. Verificar build
npm run build
# Deve passar sem erros

# 2. Verificar linting
npm run lint
# Deve passar sem erros

# 3. Verificar logs de cron (Vercel)
# Ir para: Vercel Dashboard → Cron Jobs
# Ver última execução de /api/cron/sync-ical

# 4. Verificar RLS policies
# Supabase Dashboard → SQL Editor
SELECT * FROM pg_policies WHERE tablename IN ('reservations', 'guests', 'properties');
```

---

### Estrutura de Dados Actual

```
organizations (2)
├── Default
└── Outra

user_profiles (2)
├── fabiolpgomes@gmail.com
└── rosangelacordeiro_adv@hotmail.com

properties (2)
├── Casa 1 (ical_export_token: uuid)
└── Casa 2 (ical_export_token: uuid)

property_listings (7)
├── Booking.com
├── Airbnb
└── Outros

reservations (13)
├── source: 'booking', 'airbnb', ou 'unknown'
├── number_of_guests: extraído do iCal
└── booking_source: 'ical_import', 'ical_auto_sync'

guests (67)
├── phone: extraído de DESCRIPTION
├── country: extraído de DESCRIPTION
└── organization_id: isolamento por tenant
```

---

## Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| iCal URL retorna erro 404 | Copiar URL correcta da plataforma |
| 0 eventos importados | Verificar se URL é válida em navegador |
| Token inválido no export | Regenerar token em Settings |
| Guests sem phone/country | Verificar se iCal tem DESCRIPTION com PHONE/COUNTRY |
| Sync não executa (cron) | Verificar CRON_SECRET em Vercel |
| Erro 42P01 "table not found" | Executar `supabase migration up` |

---

## Comparação: Antes vs Depois

### ❌ Antes (Email Parsing)
```
Email → Claude API → Parse → Reserva
Problemas:
- Instável
- Custo de API
- Datas em português falhavam
- Taxa de erro alta
```

### ✅ Depois (iCal)
```
iCal URL → Parse DESCRIPTION → Reserva (com phone, country, guests)
Vantagens:
- Estável
- Sem custo de API
- Suporta múltiplas plataformas
- Dados ricos extraídos
```

---

## Recursos Úteis

- 📖 Documentação Completa: `ICAL_INTEGRATION.md`
- 🔧 Instruções de Desenvolvimento: `CLAUDE.md`
- 🗂️ Schema Banco: Supabase Dashboard
- 📊 Logs: Vercel Dashboard (Cron Jobs)

---

**Última Actualização**: 16 de Março de 2026
**Status**: ✅ Production Ready
