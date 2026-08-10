# EPIC: Multi-OTA Real-Time Sync — Phase 1 Stories

**Phase:** Foundation (Weeks 1-2)  
**Stories:** 4  
**Effort:** 10 days  
**Owner:** @data-engineer (lead), @dev (support)  
**Status:** READY FOR DEVELOPMENT

---

## Story MULTI-OTA-1-1: Database Schema & RLS Policies

**Epic:** MULTI-OTA-SYNC  
**Phase:** 1 (Foundation)  
**Owner Agent:** @data-engineer (Dara)  
**Story Number:** 1  
**Complexity:** 8/10 (standard)  
**Effort:** 3 days  
**Status:** DRAFT

### Context
Lodgra's multi-OTA sync requires a robust data model to support:
- Multiple properties syncing from multiple OTAs simultaneously
- Conflict tracking (same guest, overlapping dates)
- Audit logging for compliance
- Per-property quota tracking (sync frequency limits)
- Credential storage pointers (Vault references)

### Acceptance Criteria

#### AC 1: Core Reservations Table
```sql
-- Table: ota_reservations (new)
CREATE TABLE ota_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- External reference (source of truth)
  external_id TEXT NOT NULL,  -- Booking ref, Airbnb confirmation #
  ota_source TEXT NOT NULL,   -- 'booking.com', 'airbnb', 'flatio'
  
  -- Reservation core data
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  guest_count INT,
  
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  
  -- Financial
  total_price NUMERIC(10, 2),
  currency TEXT DEFAULT 'EUR',
  
  -- Sync metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_source TEXT,  -- 'scraper', 'email', 'ical', 'manual'
  
  -- Conflict tracking
  conflict_flags JSONB DEFAULT '{}'::JSONB,  -- {duplicate: true, price_mismatch: true}
  manual_review_needed BOOLEAN DEFAULT FALSE,
  
  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(property_id, external_id, ota_source),
  CONSTRAINT check_dates CHECK (check_out_date > check_in_date)
);
```
✅ Table created  
✅ Indexes on (property_id, ota_source), (external_id, ota_source), (check_in_date, check_out_date)

#### AC 2: OTA Credentials Table
```sql
-- Table: ota_credentials (new, stores Vault references)
CREATE TABLE ota_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  ota_name TEXT NOT NULL,  -- 'booking.com', 'airbnb', 'flatio'
  vault_secret_path TEXT NOT NULL,  -- e.g., "secret/data/properties/{property_id}/booking-com"
  
  -- Quota tracking
  sync_frequency_minutes INT DEFAULT 30,  -- Configurable per tier
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status TEXT,  -- 'success', 'failed', 'rate_limited'
  sync_error_log JSONB DEFAULT '{}'::JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE,
  
  UNIQUE(property_id, ota_name)
);
```
✅ Table created  
✅ Indexes on (property_id, ota_name), (last_sync_at)

#### AC 3: Audit Logging Table
```sql
-- Table: ota_sync_audit (new, immutable log)
CREATE TABLE ota_sync_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES public.properties(id),
  user_id UUID REFERENCES auth.users(id),
  
  action TEXT NOT NULL,  -- 'scrape_start', 'scrape_success', 'scrape_failed', 'reservation_created', 'conflict_detected', 'manual_review_resolved'
  ota_source TEXT,  -- 'booking.com', 'airbnb', etc.
  
  reservation_id UUID REFERENCES ota_reservations(id),
  details JSONB,  -- {error, stack_trace, external_id, guest_name}
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT immutable_audit CHECK (id IS NOT NULL)  -- Cannot be updated
);
```
✅ Table created  
✅ Index on (property_id, created_at DESC)

#### AC 4: Row-Level Security Policies
- Users can only see ota_reservations for properties they own or co-own
- Users cannot modify audit logs (read-only)
- Credentials visible only to property owner + co-owners
- Soft-deleted reservations hidden from normal queries

```sql
-- RLS: ota_reservations
ALTER TABLE ota_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their property's reservations"
  ON ota_reservations
  FOR SELECT
  USING (property_id IN (
    SELECT p.id FROM public.properties p
    WHERE p.user_id = auth.uid() OR p.id IN (
      SELECT property_id FROM public.co_owners WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can only modify their property's reservations"
  ON ota_reservations
  FOR UPDATE
  USING (property_id IN (
    SELECT p.id FROM public.properties p
    WHERE p.user_id = auth.uid()
  ));

-- RLS: ota_credentials (owner only)
ALTER TABLE ota_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only property owners can see credentials"
  ON ota_credentials
  FOR SELECT
  USING (property_id IN (
    SELECT id FROM public.properties WHERE user_id = auth.uid()
  ));
```
✅ All RLS policies tested with @qa

#### AC 5: Migrations & Indexes
```bash
# Migration file: supabase/migrations/20260810_ota_sync_phase1.sql
- Creates ota_reservations table
- Creates ota_credentials table
- Creates ota_sync_audit table
- Adds RLS policies
- Adds function: create_ota_reservation(property_id, external_id, ota_source, guest_name, check_in, check_out)
- Adds function: log_ota_action(property_id, action, details)
- Adds indexes for query performance
```
✅ Migration tested on staging (apply + rollback)  
✅ No data conflicts in production (new tables)

### Dev Notes
- Use `JSONB` for flexible conflict_flags (serialization-friendly)
- `external_id + ota_source` unique constraint prevents duplicate syncs from same OTA
- Audit table is append-only (immutable by design)
- RLS policies tested against co-owner scenarios (not just owner)
- Soft delete on ota_reservations (deleted_at field) allows recovery

### Technical Decisions (Architecture-Driven)
1. **external_id as source of truth:** If same booking appears in email + scraper, we use external_id to dedupe
2. **JSONB for conflict_flags:** Allows flexible conflict types (duplicate, price_mismatch, date_overlap) without schema changes
3. **Immutable audit table:** Ensures compliance audit trail cannot be tampered with
4. **Per-credential quota tracking:** Enables rate-limiting per OTA/property (cost control)

### Test Plan
- [ ] Migration applies cleanly to staging
- [ ] RLS policies block unauthorized users
- [ ] RLS policies allow co-owners to see reservations
- [ ] Unique constraints prevent duplicate external_ids
- [ ] Soft delete works (deleted_at set, queries use WHERE deleted_at IS NULL)
- [ ] Audit table has correct immutability (no UPDATE/DELETE on audit records)
- [ ] Indexes present and query plans use them

### Success Criteria
- ✅ All tables created with correct schemas
- ✅ RLS policies tested (3 scenarios: owner, co-owner, non-owner)
- ✅ Migration applies + rolls back cleanly
- ✅ No breaking changes to existing Lodgra tables

---

## Story MULTI-OTA-1-2: Vault Secrets Integration

**Epic:** MULTI-OTA-SYNC  
**Phase:** 1 (Foundation)  
**Owner Agent:** @dev (Dex)  
**Story Number:** 2  
**Complexity:** 7/10 (standard)  
**Effort:** 3 days  
**Status:** DRAFT

### Context
Storing OTA credentials (Booking.com passwords, Airbnb auth tokens) in plain text is a security disaster. Vault provides encrypted at-rest storage with role-based access, audit logging, and 90-day key rotation.

### Acceptance Criteria

#### AC 1: Vault Provider Implementation
Create a TypeScript module that wraps HashiCorp Vault API:

```typescript
// lib/vault/client.ts
export interface VaultClient {
  // Write secret (create or update)
  writeSecret(path: string, data: Record<string, any>): Promise<void>;
  
  // Read secret
  readSecret(path: string): Promise<Record<string, any>>;
  
  // Delete secret
  deleteSecret(path: string): Promise<void>;
  
  // List secrets in path
  listSecrets(path: string): Promise<string[]>;
  
  // Rotate encryption key
  rotateKey(): Promise<void>;
}

// Usage:
const vault = new VaultClient(VAULT_TOKEN, VAULT_ADDR);
await vault.writeSecret("secret/data/properties/prop-123/booking-com", {
  email: "owner@example.com",
  password: "<encrypted>",
  auth_token: "<encrypted>"
});

const creds = await vault.readSecret("secret/data/properties/prop-123/booking-com");
```
✅ Client implemented  
✅ Error handling for Vault connection failures  
✅ Timeout handling (10s max per request)

#### AC 2: Encryption at Rest
- All secrets stored in Vault with AES-256 encryption
- Key material stored in AWS KMS (not in Vault itself)
- 90-day key rotation policy enforced
- Audit log entry for every read/write

```typescript
// Encryption config in .env
VAULT_ADDR=https://vault.lodgra.io
VAULT_TOKEN=<service-token>
VAULT_KMS_KEY_ID=<aws-kms-key-id>
VAULT_ENCRYPTION_CIPHER=aes-256-gcm
```
✅ Environment variables configured  
✅ KMS key created in AWS

#### AC 3: Integration with Credential Manager
When a user adds OTA credentials via UI (MULTI-OTA-1-3):
1. Secrets UI sends to `/api/ota/credentials/add`
2. Route handler stores in Vault
3. Database records `vault_secret_path`
4. Vault audit log records `action: store_booking_credentials`

```typescript
// app/api/ota/credentials/add/route.ts
export async function POST(req: Request) {
  const { propertyId, otaName, credentials } = await req.json();
  
  // Store in Vault
  const vaultPath = `secret/data/properties/${propertyId}/${otaName}`;
  await vault.writeSecret(vaultPath, {
    email: credentials.email,
    password: credentials.password,
    auth_token: credentials.authToken
  });
  
  // Record in database
  await supabase
    .from('ota_credentials')
    .insert({
      property_id: propertyId,
      ota_name: otaName,
      vault_secret_path: vaultPath,
      user_id: session.user.id
    });
  
  return { success: true, path: vaultPath };
}
```
✅ Route handler implemented  
✅ Error handling for Vault failures

#### AC 4: Access Control (RBAC)
- Only @dev scraper service can read secrets
- API routes require user authentication + property ownership
- Vault audit log tracks all access
- Breach notification: if Vault access fails 5+ times, alert @devops

```typescript
// Vault policy for scraper service
path "secret/data/properties/*" {
  capabilities = ["read", "list"]
}

path "secret/metadata/properties/*" {
  capabilities = ["read", "list"]
}
```
✅ Vault policy created  
✅ Service token generated for scraper

#### AC 5: Rotation & Cleanup
- 90-day rotation: New KMS key generated, old secrets re-encrypted
- Rotation trigger: CloudWatch event (first Monday of quarter)
- Cleanup: When property deleted, delete corresponding Vault secrets

```typescript
// lib/vault/rotation.ts
export async function rotateSecretsForProperty(propertyId: string) {
  // List all secrets for property
  const secrets = await vault.listSecrets(`secret/data/properties/${propertyId}`);
  
  // Re-encrypt with new key
  for (const secret of secrets) {
    const path = `secret/data/properties/${propertyId}/${secret}`;
    const data = await vault.readSecret(path);
    await vault.writeSecret(path, data);  // Vault handles re-encryption
  }
  
  // Log rotation
  await logAction({
    action: 'key_rotation',
    property_id: propertyId,
    status: 'success'
  });
}
```
✅ Rotation Lambda scheduled  
✅ Tested with manual key rotation

### Dev Notes
- Vault token stored in Vercel Secrets (not in repo)
- Scraper service uses different token than API (least privilege)
- Secrets expire after 1 hour of inactivity (refresh on use)
- Vault audit log retained for 7 years (compliance)

### Test Plan
- [ ] Vault client can write secrets without errors
- [ ] Vault client can read secrets back (correct values)
- [ ] Unauthorized tokens cannot read secrets (Vault denies)
- [ ] Encryption verified: secrets never appear in logs
- [ ] Audit log records every read/write
- [ ] Key rotation completes without losing data
- [ ] Deleted properties' secrets removed from Vault

### Success Criteria
- ✅ Vault client fully functional
- ✅ All OTA credentials encrypted at rest in Vault
- ✅ Zero credential leaks in logs or database
- ✅ Audit trail complete for compliance

---

## Story MULTI-OTA-1-3: Credential Manager UI

**Epic:** MULTI-OTA-SYNC  
**Phase:** 1 (Foundation)  
**Owner Agent:** @dev (Dex)  
**Story Number:** 3  
**Complexity:** 5/10 (simple)  
**Effort:** 2 days  
**Status:** DRAFT

### Context
Property owners need a minimal UI to add/remove OTA credentials. This is the gateway to multi-OTA sync—without credentials, no syncing happens.

### Acceptance Criteria

#### AC 1: Credential Manager Component
Location: `app/components/OTACredentialManager.tsx`

Features:
- [ ] List active credentials per property (Booking, Airbnb, Flatio)
- [ ] "Add Credential" button → Modal with OTA selection
- [ ] Form fields for each OTA:
  - **Booking.com:** Email, Password
  - **Airbnb:** Email, Password (or API token)
  - **Flatio:** API key
- [ ] "Test Connection" button (calls `/api/ota/credentials/test`)
- [ ] "Remove Credential" button (soft delete + Vault cleanup)
- [ ] Visual indicator: ✅ Connected, ⏳ Testing, ❌ Failed, ⚠️ Stale (last sync > 2 hours)

#### AC 2: Add Credential Modal
```tsx
<OTACredentialModal
  otaOptions={['booking.com', 'airbnb', 'flatio']}
  onSubmit={async (otaName, credentials) => {
    const res = await fetch('/api/ota/credentials/add', {
      method: 'POST',
      body: JSON.stringify({
        propertyId,
        otaName,
        credentials
      })
    });
    if (res.ok) {
      toast.success('Credential added. Testing connection...');
      // Trigger test immediately
      await testConnection(otaName);
    }
  }}
/>
```
✅ Component rendered  
✅ Form validates empty fields

#### AC 3: Test Connection Endpoint
```typescript
// POST /api/ota/credentials/test
// Body: { propertyId, otaName }
// Response: { status: 'success' | 'failed', error?: string }

// Test logic:
// 1. Fetch credential from Vault
// 2. Try login (Booking) or API call (Airbnb, Flatio)
// 3. Return status
```
✅ Endpoint implemented  
✅ 10-second timeout (avoid hanging)  
✅ Error messages user-friendly (don't leak Vault paths)

#### AC 4: Styling & Responsive
- Matches Lodgra design system (brand colors, spacing)
- Mobile-responsive (tested on iPhone 12)
- Accessibility: ARIA labels, tab navigation
- Dark mode support (verify in theme toggle)

#### AC 5: Error Handling
- Invalid password → "Incorrect credentials" (no details)
- Network timeout → "Connection timed out, please retry"
- Vault connection failed → Alert @devops, show "Service unavailable"
- Duplicate credential → "Credential for this OTA already exists"

### Dev Notes
- Use React Query for credential list caching
- Debounce test connection (prevent spam)
- Credential form does NOT store passwords in state (clear after submit)
- Toast notifications for all status changes

### Test Plan
- [ ] Component renders without errors
- [ ] Add credential form submits with correct payload
- [ ] Test connection calls correct endpoint
- [ ] Error messages display correctly
- [ ] Credential list updates after add/remove
- [ ] Mobile layout responsive (< 768px)
- [ ] Dark mode works

### Success Criteria
- ✅ Users can add Booking, Airbnb, Flatio credentials
- ✅ Connection test works for all 3 OTAs
- ✅ UI is intuitive (no training needed)
- ✅ No credential leaks in browser console

---

## Story MULTI-OTA-1-4: Audit Logging System

**Epic:** MULTI-OTA-SYNC  
**Phase:** 1 (Foundation)  
**Owner Agent:** @dev (Dex)  
**Story Number:** 4  
**Complexity:** 4/10 (simple)  
**Effort:** 2 days  
**Status:** DRAFT

### Context
Every scraper action, credential access, and conflict resolution must be audited for compliance (GDPR, SOC2). Audit logs are immutable and retained for 7 years.

### Acceptance Criteria

#### AC 1: Audit Log Middleware
```typescript
// lib/audit.ts
export interface AuditLogEntry {
  property_id: UUID;
  user_id?: UUID;  // NULL for system actions (scrapers)
  action: string;  // 'scrape_start', 'reservation_created', 'conflict_detected'
  ota_source: string;
  reservation_id?: UUID;
  details: Record<string, any>;
  created_at: Date;
}

export async function logAction(entry: AuditLogEntry) {
  await supabase
    .from('ota_sync_audit')
    .insert(entry);
}
```
✅ Middleware implemented  
✅ Async logging (doesn't block scraper)

#### AC 2: Scraper Action Logging
Every scraper action logs to audit table:
- `scrape_start`: Booking.com scraper starts for property X
- `scrape_success`: Found 5 new reservations
- `scrape_failed`: Error code 429 (rate limited)
- `reservation_created`: external_id=Booking-12345, guest=Jane Doe
- `conflict_detected`: Duplicate found in manual review queue
- `key_rotation`: Encryption key rotated for property X

```typescript
// Example from scraper
await logAction({
  property_id: propertyId,
  action: 'scrape_start',
  ota_source: 'booking.com',
  details: {
    timestamp: new Date(),
    scraper_version: '1.0.0'
  }
});
```
✅ Logged for all scraper events

#### AC 3: Audit Dashboard (Admin)
Location: `app/admin/audit-logs`

Features:
- [ ] Filter by: date range, property, action type, OTA
- [ ] Display: Timestamp, Action, Details, Affected Reservation
- [ ] Export to CSV (for compliance audit)
- [ ] Search by reservation external_id
- [ ] Read-only interface (cannot modify logs)

#### AC 4: Retention & Archival
- Logs retained in Supabase for 90 days (hot)
- Logs archived to S3 (cold) after 90 days
- Archive retained for 7 years (compliance)
- Lifecycle policy enforced by AWS S3

```bash
# S3 lifecycle rule
- Transition to GLACIER after 90 days
- Delete after 7 years
```
✅ S3 lifecycle rule created

#### AC 5: Compliance Features
- **No PII in logs:** Passwords, auth tokens, credit cards NEVER logged
- **Immutable:** Audit logs cannot be modified or deleted (database constraint)
- **Tamper detection:** Hash each log entry, detect unauthorized changes
- **Access control:** Only admins can view audit logs

```typescript
// Hash log entry for tamper detection
import crypto from 'crypto';

function hashLogEntry(entry: AuditLogEntry): string {
  const str = JSON.stringify(entry);
  return crypto.createHash('sha256').update(str).digest('hex');
}
```
✅ Hashing implemented

### Dev Notes
- Use async logging to avoid blocking scraper performance
- PII filtering function: strip passwords, tokens, email addresses
- Audit table uses `INSERT` only (no UPDATE/DELETE permissions)
- Compliance: GDPR article 32 (data protection), SOC2 CC6 (access control)

### Test Plan
- [ ] Audit log entry created for each scraper action
- [ ] PII filtering removes sensitive data before logging
- [ ] Audit logs immutable (no UPDATE/DELETE possible)
- [ ] Admin dashboard displays logs correctly
- [ ] Export to CSV works
- [ ] S3 archival happens automatically
- [ ] Hash verification detects tampering

### Success Criteria
- ✅ All scraper actions logged
- ✅ Zero credential leaks in audit tables
- ✅ Audit trail immutable
- ✅ Admin can review audit logs
- ✅ Compliant with GDPR + SOC2

---

## Phase 1 Summary

| Story | Title | Owner | Days | Status |
|-------|-------|-------|------|--------|
| MULTI-OTA-1-1 | Database Schema & RLS | @data-engineer | 3 | DRAFT |
| MULTI-OTA-1-2 | Vault Secrets Integration | @dev | 3 | DRAFT |
| MULTI-OTA-1-3 | Credential Manager UI | @dev | 2 | DRAFT |
| MULTI-OTA-1-4 | Audit Logging System | @dev | 2 | DRAFT |
| **TOTAL** | **Foundation** | **Mixed** | **10 days** | **READY** |

### Phase 1 Success Criteria
- [ ] All 4 stories completed and QA-approved
- [ ] Database schema tested on staging
- [ ] Vault integration working (0 connection errors)
- [ ] Credential UI deployed and functional
- [ ] Audit logs flowing to database
- [ ] All RLS policies tested with co-owners
- [ ] Zero security issues in pre-audit review

### Phase 1 Blockers
- None (foundation stories are independent)

### Handoff to Phase 2
Once Phase 1 is complete, Phase 2 stories (Booking.com scraper) can begin immediately. Schema is stable, Vault is ready, audit logging is working.

---

**Phase 1 Status:** READY FOR @data-engineer  
**Activation Date:** 2026-08-10  
**Target Completion:** 2026-08-24
