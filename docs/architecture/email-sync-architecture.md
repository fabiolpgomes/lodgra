# Email Sync & iCal Architecture

**Technical Deep Dive: Story 44.2 Phase 2**

---

## 🏛️ System Architecture

### High-Level Flow

```
┌─────────────────┐
│  Airbnb iCal    │
│  Booking iCal   │
│  Flatio iCal    │
└────────┬────────┘
         │
         ▼
    ┌──────────┐
    │ pg_cron  │ Every 15 minutes
    └────┬─────┘
         │
         ▼
    ┌────────────────────────────┐
    │  Job 1: sync-ical          │
    │  /api/cron/sync-ical       │
    └─────────┬──────────────────┘
              │
              ├─→ [importICalFromUrl()]
              ├─→ [parseEvents()]
              ├─→ [detectSource()]
              ├─→ [CREATE/UPDATE reservations]
              └─→ [INSERT sync_logs]
              
              ▼
    ┌─────────────────────────────┐
    │  Reservation table          │
    │  (base data from iCal)      │
    │  - check_in ✓              │
    │  - check_out ✓             │
    │  - guest_name ✓ (from iCal)│
    │  - amount ✗ (NULL)         │
    │  - first_name ✗            │
    │  - last_name ✗             │
    └──────────────────────────────┘

         Parallel: Email Ingest
         
    ┌────────────────────────┐
    │ Email: reservations@   │
    │ booking.com, etc       │
    └─────────┬──────────────┘
              │
              ▼
    ┌────────────────────────────┐
    │  Webhook: /api/webhooks/   │
    │  resend/inbound            │
    │  [processEmail()]          │
    │  [parseReservationEmail()]  │
    │  [detectPropertyFromEmail()]│
    └─────────┬──────────────────┘
              │
              ▼
    ┌────────────────────────────────┐
    │  email_parse_log (PENDING)     │
    │  - platform ✓ (booking/airbnb) │
    │  - property_id ✓ (detected)    │
    │  - parsed_data ✓ (Claude AI)   │
    │  - reservation_id ✓ (matched)  │
    └────────┬───────────────────────┘
             │
             ▼
    ┌──────────┐
    │ pg_cron  │ Every 15 minutes
    └────┬─────┘
         │
         ▼
    ┌────────────────────────────┐
    │  Job 2: enrich-reservations│
    │  /api/cron/enrich-res      │
    └─────────┬──────────────────┘
              │
              ├─→ [fetchPendingEmails()]
              ├─→ [matchToReservation()]
              ├─→ [extractNameGuestCount()]
              ├─→ [UPDATE reservations]
              └─→ [UPDATE email_parse_log]
              
              ▼
    ┌─────────────────────────────┐
    │  Reservation table          │
    │  (enriched data from email) │
    │  - first_name ✓            │
    │  - last_name ✓             │
    │  - number_of_guests ✓      │
    │  - amount ✓                │
    │  - currency ✓              │
    │  - email_enriched_at ✓     │
    └──────────────────────────────┘

         ▼
    ┌──────────────────────────────┐
    │  ✅ COMPLETE RESERVATION    │
    └──────────────────────────────┘
```

---

## 📦 Component Breakdown

### Job 1: sync-ical

**File:** `src/app/api/cron/sync-ical/route.ts`

**Responsibilities:**
- Fetch active property listings with iCal URLs
- Import iCal events via HTTP/HTTPS
- Parse iCal events (RFC 5545 format)
- Classify events: Reservation vs Block Date
- Extract guest data from event fields
- Handle multi-platform formats (Airbnb, Booking, Flatio, VRBO)
- Calculate service fees
- Create or update reservations
- Handle calendar blocks (unavailable dates)
- Log sync results

**Processing:**
```
For each property listing:
  1. Skip if: is_active = false OR sync_enabled = false OR ical_url = NULL
  2. Fetch iCal feed → parse events
  3. For each event:
     a. Extract dates (check_in, check_out)
     b. Parse description → detect: booking reference, guest name, platform
     c. Classify: isBlockedEvent() → create calendar_block OR reservation
     d. Create/Update in database
  4. Log results to sync_logs table
```

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `importICalFromUrl(url)` | Fetch and parse iCal feed |
| `isBlockedEvent(event)` | Detect unavailable dates (duration > 180d) |
| `detectSource(summary, desc)` | Identify platform (Airbnb/Booking/etc) |
| `extractAirbnbGuestData(desc)` | Parse Airbnb format |
| `extractBookingDescription(desc)` | Parse Booking.com format |
| `syncOneListing(supabase, listing)` | Process one property |

### Job 2: enrich-reservations

**File:** `src/app/api/cron/enrich-reservations/route.ts`

**Responsibilities:**
- Fetch unparsed emails from email_parse_log
- Match emails to existing reservations
- Extract enrichment data (guest name, count, amount)
- Update reservation fields
- Mark emails as enriched
- Handle errors gracefully

**Processing:**
```
3-Phase Workflow:

Phase 1: Fetch Emails
  WHERE status != 'enriched'
  AND property_id IS NOT NULL
  AND parsed_data IS NOT NULL
  AND reservation_id IS NOT NULL
  LIMIT 100

Phase 2: Match Reservation
  Use pre-linked reservation_id (from email parser)
  No scoring needed (direct FK match)

Phase 3: Update & Mark Complete
  UPDATE reservations:
    - first_name, last_name (from parsed_data.guest_name)
    - number_of_guests (from parsed_data.num_guests)
    - amount, currency (from parsed_data.amount)
    - email_enriched_at = NOW()
  UPDATE email_parse_log:
    - status = 'enriched'
    - enriched_at = NOW()
```

**Results Tracking:**
```json
{
  "enriched": 5,      // Successfully updated
  "skipped": 1,       // Reservation not found
  "errors": 2,        // Update failed
  "errorDetails": [
    {
      "email": "booking.com",
      "guest_name": "John Doe",
      "type": "update_error",
      "message": "Column not found"
    }
  ]
}
```

### Email Parser

**File:** `src/lib/email-parser/parser.ts`

**Responsibilities:**
- Accept raw email body
- Call Claude AI (Haiku 4.5) with extraction prompt
- Parse JSON response
- Fallback: regex extraction for dates if Claude fails
- Return structured data

**Model Selection Rationale:**
- **Haiku 4.5:** Cost-optimized, sufficient for email extraction
- **Token budget:** 512 max tokens (price: ~$0.00001 per email)
- **Accuracy:** 90%+ extraction accuracy tested

**Prompt Structure:**
```
"Extract reservation data COMO JSON puro, sem markdown.

Rules:
- Datas em português → YYYY-MM-DD
- Use null para campos não encontrados
- Retorne APENAS JSON, uma única linha é OK

Mapeie para este JSON:
{
  "guest_name": string or null,
  "checkin_date": "YYYY-MM-DD" or null,
  "checkout_date": "YYYY-MM-DD" or null,
  "amount": number or null,
  "currency": "EUR"|"BRL"|"USD"|"GBP"|null,
  "platform": "airbnb"|"booking"|"flatio"|"unknown",
  ...
}

Email (primeiras 6000 caracteres):
[email body]"
```

---

## 🗄️ Database Tables

### sync_logs

**Purpose:** Audit trail of all sync operations

```sql
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_listing_id UUID REFERENCES property_listings(id) NULL,
  sync_type TEXT NOT NULL, -- 'ical' | 'email'
  direction TEXT NOT NULL, -- 'inbound' | 'outbound'
  status TEXT NOT NULL, -- 'success' | 'failed'
  error_message TEXT NULL,
  records_processed INTEGER NULL,
  records_created INTEGER NULL,
  records_updated INTEGER NULL,
  records_failed INTEGER NULL,
  synced_at TIMESTAMP NOT NULL DEFAULT now(),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_sync_logs_type ON sync_logs(sync_type);
CREATE INDEX idx_sync_logs_status ON sync_logs(status);
CREATE INDEX idx_sync_logs_synced_at ON sync_logs(synced_at DESC);
CREATE INDEX idx_sync_logs_property ON sync_logs(property_listing_id);
```

**Sample Data:**
```
id: d1234567-89ab-cdef-0123-456789abcdef
property_listing_id: cc576a14-...
sync_type: 'ical'
status: 'success'
records_created: 1
records_updated: 0
records_failed: 0
synced_at: 2026-08-09 12:00:00+00:00
```

### email_parse_log

**Purpose:** Track email parsing and enrichment workflow

```sql
CREATE TABLE email_parse_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id TEXT UNIQUE NOT NULL,
  platform TEXT NOT NULL, -- 'booking' | 'airbnb' | 'flatio' | 'unknown'
  property_id UUID REFERENCES properties(id) NULL,
  parsed_data JSONB NOT NULL,
  reservation_id UUID REFERENCES reservations(id) NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'enriched' | 'error'
  error_message TEXT NULL,
  matched_reservation_id UUID NULL,
  enriched_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_email_parse_status ON email_parse_log(status);
CREATE INDEX idx_email_parse_property ON email_parse_log(property_id);
CREATE INDEX idx_email_parse_reservation ON email_parse_log(reservation_id);
```

**Sample Data:**
```
id: e9876543-21fe-dcba-9876-543210fedcba
email_id: booking-confirmation-12345@booking.com
platform: 'booking'
property_id: cc576a14-...
parsed_data: {
  "guest_name": "John Doe",
  "checkin_date": "2026-08-20",
  "checkout_date": "2026-08-25",
  "amount": 450,
  "currency": "EUR",
  "confirmation_code": "456123"
}
reservation_id: res-abc123
status: 'enriched'
enriched_at: 2026-08-09 12:15:00+00:00
```

---

## 🔌 API Endpoints

### POST /api/webhooks/resend/inbound

**Purpose:** Receive and process incoming emails

**Trigger:** Resend webhook (when email arrives at reservations@booking.com, etc)

**Flow:**
```
1. Receive email from Resend
2. Extract: from, subject, body
3. Call parseReservationEmail() → Claude AI
4. Call detectPropertyFromEmailDomain() → match property
5. INSERT into email_parse_log with status='pending'
6. Return 200 OK
```

**Response:**
```json
{
  "success": true,
  "email_id": "email-12345",
  "property_detected": true,
  "status": "pending_enrichment"
}
```

### GET /api/cron/sync-ical

**Purpose:** Job 1 - Sync iCal reservations

**Auth:** `?secret={CRON_SECRET}`

**Called by:** pg_cron every 15 minutes

**Response:**
```json
{
  "message": "Sincronizados 5 anúncios",
  "synced": 5,
  "results": {
    "prop-uuid-1": {
      "created": 2,
      "updated": 0,
      "skipped": 1,
      "cancelled": 0
    },
    "prop-uuid-2": {
      "created": 1,
      "updated": 3,
      "skipped": 0,
      "cancelled": 0
    }
  }
}
```

### GET /api/cron/enrich-reservations

**Purpose:** Job 2 - Enrich reservations with email data

**Auth:** `?secret={CRON_SECRET}`

**Called by:** pg_cron every 15 minutes

**Response:**
```json
{
  "success": true,
  "enriched": 3,
  "skipped": 1,
  "errors": 0,
  "errorDetails": []
}
```

### GET /api/admin/sync-logs

**Purpose:** Fetch sync logs for dashboard

**Parameters:** `?limit=50`

**Response:**
```json
[
  {
    "id": "uuid",
    "property_listing_id": "uuid",
    "property_name": "AHS Premium Apartament...",
    "sync_type": "ical",
    "status": "success",
    "records_created": 1,
    "records_updated": 0,
    "records_failed": 0,
    "synced_at": "2026-08-09T12:00:00Z"
  }
]
```

---

## ⚙️ Configuration & Deployment

### Environment Variables

```bash
# Sync jobs authentication
CRON_SECRET=6b832bb7e23891ef8dcbda376bf3d264

# Claude AI
ANTHROPIC_API_KEY=sk-ant-...

# Supabase
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# Email parsing
RESEND_API_KEY=re_...
```

### pg_cron Configuration

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Job 1: sync-ical (every 15 min)
SELECT cron.schedule('sync-ical-job', '*/15 * * * *', 
  'SELECT http_post(
    ''https://lodgra.io/pt-BR/api/cron/sync-ical?secret='' || 
    current_setting(''app.cron_secret''),
    ''{}''
  )'
);

-- Job 2: enrich-reservations (every 15 min)
SELECT cron.schedule('enrich-reservations-job', '*/15 * * * *',
  'SELECT http_post(
    ''https://lodgra.io/pt-BR/api/cron/enrich-reservations?secret='' ||
    current_setting(''app.cron_secret''),
    ''{}''
  )'
);
```

---

## 🔍 Error Handling Strategy

### Job 1 Errors
```
Scenario: iCal feed returns 404
├─ Catch: importICalFromUrl() throws error
├─ Log: INSERT sync_logs { status: 'failed', error_message: '404 Not Found' }
├─ Notify: Dashboard shows 'Erro' with ⓘ hover details
└─ Action: Admin checks property's iCal URL
```

### Job 2 Errors
```
Scenario: Reservation doesn't exist
├─ Catch: reservations.select().single() returns no row
├─ Log: Mark email_parse_log { status: 'error', error_message: 'Reservation not found' }
├─ Skip: Continue to next email
└─ Action: Email remains 'pending' for manual review
```

### API Errors
```
All 5xx errors:
├─ Catch in try/catch
├─ Return: 200 OK with { error: true, message: "..." }
├─ Log: console.error() for debugging
└─ Result: Dashboard shows error, not silent fail
```

---

## 📈 Scalability Considerations

### Current Limits
- **Properties:** ~18 active, 100+ total (supports 1000+)
- **Executions/day:** 96 (4/hour × 24h)
- **Emails/day:** ~50-100
- **Database rows/week:** ~1000

### Horizontal Scaling
- pg_cron runs on Supabase (managed)
- Jobs are stateless (can run in parallel from different regions)
- Webhook ingestion is async (no blocking)

### Performance Optimization
- **Job 1:** Parallel processing by property (serial within property)
- **Job 2:** Batch processing (LIMIT 100 emails per run)
- **Indexes:** On (sync_type, status, synced_at) for dashboard queries
- **Caching:** Dashboard fetches every 30 seconds

---

## 🧪 Testing Strategy

### Unit Tests
- Email parser accuracy (90%+ extraction)
- Date parsing (edge cases: leap years, timezones)
- Property detection (domain-to-property mapping)

### Integration Tests
- Full flow: iCal → parse → create → email → enrich
- Error handling (missing fields, malformed data)
- Conflict detection (overlapping reservations)

### Load Testing
- Job 1 with 100 properties (~30 sec response time acceptable)
- Job 2 with 1000 pending emails (~60 sec response time acceptable)

---

## 🚀 Deployment Checklist

- [x] Jobs tested locally
- [x] pg_cron extension enabled in Supabase
- [x] CRON_SECRET in environment variables
- [x] sync_logs table created with indexes
- [x] Dashboard deployed to production
- [x] Webhook receiving emails correctly
- [x] Email parser API key active
- [x] pg_cron jobs scheduled
- [x] Monitoring dashboard accessible

---

**Architecture Version:** 1.0  
**Last Updated:** 2026-08-09  
**Maintainer:** Story 44.2 Team
