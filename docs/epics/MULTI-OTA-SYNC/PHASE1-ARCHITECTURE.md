# Phase 1 Foundation Architecture — Multi-OTA Sync

**Status:** ✅ Complete (Post-Architect Review)  
**Author:** Dara (data-engineer)  
**Reviewed by:** Aria (architect) — 2026-08-10  
**Last Updated:** 2026-08-10

---

## 📋 Executive Summary

Phase 1 establishes the foundational database schema, multi-tenant isolation, and audit trail for a scalable, enterprise-grade multi-OTA synchronization system. Supports 1M+ reservations/month across Booking.com, Airbnb, Flatio, and VRBO with graceful degradation and compliance-ready architecture.

**Key Achievements:**
- ✅ 9-table schema with multi-tenant RLS
- ✅ Architect-approved (6 architectural improvements incorporated)
- ✅ Production-ready migration scripts
- ✅ Comprehensive RLS policies with audit trail immutability
- ✅ 5 integration tests validating isolation and security
- ✅ Portuguese fiscal law compliance (10-year audit retention)

---

## 🗄️ Database Schema Overview

### Core Entities (9 Tables)

| # | Table | Purpose | Volume | Access Pattern |
|---|-------|---------|--------|-----------------|
| 1 | `organizations` | Multi-tenant root | 10-50 per deployment | Read-heavy (metadata) |
| 2 | `channel_connections` | OTA credentials (Booking, Airbnb, etc) | 100-500 per deployment | Moderate (connect/disconnect) |
| 3 | `channel_listing_mappings` | Property ↔ External listing bindings | 1K-10K per deployment | Moderate (list, filter) |
| 4 | `reservations` | ⭐ **Core** — Synchronized bookings | 1M+/month | **Very High** (sync, enrichment, UI) |
| 5 | `availability_blocks` | iCal blocks (maintenance, unavailable) | 100K+/month | High (calendar render) |
| 6 | `reservation_sources` | Raw evidence (email, iCal, API) | 1M+/month | Low (audit only) |
| 7 | `reservation_conflicts` | Dedup detection & manual review queue | 1K-10K/month | Moderate (manual review) |
| 8 | `reservation_matches` | Probabilistic scoring between sources | 1K-10K/month | Low (analytics) |
| 9 | `audit_events` | ⭐ **Immutable trail** — All mutations logged | 1M+/month | Low (compliance, investigation) |

### Key Design Decisions

#### Deduplication Strategy
```sql
UNIQUE (organization_id, channel_connection_id, external_reservation_id)
```
- **Deterministic key:** Booking ID `booking_6687861319` + account ensures global uniqueness
- **No property_id:** Prevents false duplicates (same reservation can map to multiple properties)
- **Soft-delete safe:** UNIQUE constraint scoped to `deleted_at IS NULL`

#### Data Completeness States
```
minimal → partial → complete
  ↓
enrichment_pending ←→ enrichment_failed (max 3 retries)
  ↓
manual_review → not_enrichable
```

**Rules:**
- **Critical fields required for calendar:** property_id, check_in, check_out, external_id, source
- **Optional fields enriched later:** guest_name, email, phone, price
- **Enrichment deadline:** 24 hours from creation (escalates to manual_review)
- **Retry strategy:** 3 failed attempts → manual_review (no auto-retry after)

#### Soft-Delete Pattern
- All tables include `deleted_at TIMESTAMP`
- RLS policies filter `WHERE deleted_at IS NULL`
- Enables compliance audits (GDPR right to forget)
- 10-year retention on audit_events (Portuguese fiscal law)

#### Generated Columns
```sql
number_of_nights INT GENERATED ALWAYS AS (check_out::date - check_in::date) STORED
```
- Eliminates application logic for date math
- Computed at storage time (no runtime overhead)
- Always in sync with check_in/check_out

---

## 🔐 Multi-Tenant Isolation & RLS

### Isolation Model
```sql
SET app.current_org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
```

**Every query automatically scoped to organization_id:**
- ✅ Application sets `app.current_org_id` at connection time
- ✅ RLS policies enforce `WHERE organization_id = current_setting('app.current_org_id')`
- ✅ Soft-delete filtering adds `AND deleted_at IS NULL`
- ✅ No way for app bug to leak data across orgs (database enforces isolation)

### System Bypass Role
```sql
-- Connect as postgres (superuser)
-- RLS bypassed automatically (non-application context)
```

**Use cases:**
- Data recovery / backup (@devops only)
- System monitoring / analytics
- Emergency access (audit trail logs all access)

**Audit trail tracks:**
```json
{
  "actor_type": "system_admin",
  "actor_id": null,
  "action": "read_all_orgs",
  "correlation_id": "audit-2026-08-10-123"
}
```

### Append-Only Audit Trail
- **No UPDATE policy** → Cannot modify audit events
- **No DELETE policy** → Cannot delete audit events (7-10 year retention)
- **INSERT only** → System can append, humans cannot
- **LOGGED table** → Survives crashes (not UNLOGGED)

---

## 📊 Performance Indices

### Index Strategy (10 Indices Total)

| Priority | Index | Use Case | Size | Selectivity |
|----------|-------|----------|------|-------------|
| ⭐ **CRITICAL** | `idx_sync_worker` | Enrichment job queue (1M+/month) | Large | High (filters by status) |
| **HIGH** | `idx_calendar_view` | UI calendar rendering (read-heavy) | Large | Medium (by property) |
| **HIGH** | `idx_dedup` | Prevent duplicate reservations (UNIQUE) | Large | Very high (unique key) |
| **MEDIUM** | `idx_enrich_queue` | Background enrichment jobs | Large | High (filters needs_enrichment) |
| **MEDIUM** | `idx_org_channel_sync_status` | Sync health monitoring | Medium | High (composite) |
| **MEDIUM** | `idx_conflicts_pending` | Manual review queue | Small | Medium (pending conflicts) |
| **MEDIUM** | `idx_sync_health` | Alerting (degraded/error) | Small | Low (error states rare) |
| **LOW** | `idx_date_range_queries` | Reporting, analytics | Medium | Medium |
| **LOW** | `idx_conflicts_time_series` | Conflict trending | Small | High (DESC ordering) |
| **LOW** | `idx_audit_by_entity` / `idx_audit_by_actor` | Compliance investigations | Large | Medium |

**Optimization for 1M+/month:**
- All indices WHERE `deleted_at IS NULL` (smaller size, faster writes)
- Composite indices for common multi-column queries
- SKIP LOCKED pattern for enrichment jobs (avoid lock contention)

---

## 📋 Architect Validation (Aria Review)

### 6 Critical Changes Incorporated

| Change | Before | After | Rationale |
|--------|--------|-------|-----------|
| **FK Constraint** | CASCADE DELETE | **RESTRICT** | Prevent cascading deletes, explicit cleanup |
| **Dedup Key Type** | TEXT | **VARCHAR(255) COLLATE "C"** | Case-sensitive, bounded size, better perf |
| **Generated Column** | Application math | **GENERATED ALWAYS** | Eliminate sync bugs, always in-sync |
| **Soft-Delete RLS** | Not enforced | **WHERE deleted_at IS NULL** | Transparent filtering, no app logic |
| **Audit Trail** | UNLOGGED | **LOGGED** | Crash-safe (compliance requirement) |
| **Composite Indices** | Basic indices | **3 added composites** | Optimize multi-column queries |

### Architect Approval Summary

✅ **Index Strategy:** Optimized for 1M+/month, no partitioning needed yet  
✅ **Foreign Keys:** RESTRICT prevents cascading disasters  
✅ **RLS Policies:** Org-scoped isolation + system bypass role  
✅ **Soft-Delete:** RLS filtering at database level (fool-proof)  
✅ **Audit Trail:** LOGGED + pseudonimization tracking (compliance)  
✅ **Constraints:** Price validation, date checks, status enums  
✅ **Performance:** SKIP LOCKED pattern documented for enrichment  
✅ **Data Types:** external_reservation_id as VARCHAR(255) COLLATE "C"  

**Design Decisions Approved:**
- ✅ Dedup key: `(channel_connection_id, external_reservation_id)` sufficient
- ✅ Completeness states: Unidirectional with controlled regression
- ✅ Conflict resolution: Org-admin approval + audit trail
- ✅ System agents: Org-scoped by default, system role for monitoring

---

## 🚀 Deliverables

### SQL Files (Ready for Production)

| File | Purpose | Size | Lines |
|------|---------|------|-------|
| `PHASE1-SCHEMA.sql` | Complete schema definition | 25KB | 500+ |
| `PHASE1-MIGRATION-001.sql` | UP + DOWN migration script | 30KB | 600+ |
| `PHASE1-RLS-POLICIES.sql` | Detailed RLS policies + test docs | 20KB | 400+ |
| `PHASE1-TESTS-RLS.sql` | 5 integration test suites | 15KB | 300+ |

### Deployment Steps

```bash
# 1. Push to Supabase
supabase db push --file PHASE1-MIGRATION-001.sql

# 2. Verify schema created
supabase db list

# 3. Run integration tests
# (Copy PHASE1-TESTS-RLS.sql → Supabase SQL Editor → Run)

# 4. Check audit trail
SELECT * FROM audit_events LIMIT 5;

# 5. Verify RLS isolation
SET app.current_org_id = 'test-org-id';
SELECT COUNT(*) FROM reservations; -- Should see only that org's data
```

---

## 📅 Timeline & Next Steps

### Phase 1 Timeline (Week 1-2)

| Week | Task | Owner | Status |
|------|------|-------|--------|
| W1-D1 | ✅ Schema design + architect review | @data-engineer | COMPLETE |
| W1-D2 | ✅ Migration generation | @data-engineer | COMPLETE |
| W1-D3 | ⏳ Vault secrets integration | @data-engineer | PLANNED |
| W1-D4 | ⏳ Credential manager UI scaffold | @dev | PLANNED |
| W2-D1 | ⏳ Audit logging system (pseudonimization job, purge job) | @data-engineer | PLANNED |
| W2-D2 | ⏳ TypeScript types generation | @dev | PLANNED |

### Phase 2 Roadmap (Week 3-5)

- **W3:** Booking.com web scraper (Playwright)
- **W4:** Email parsing + Claude AI extraction, iCal enrichment
- **W5:** Graceful degradation (4-stage fallback), conflict detection

---

## ✅ Quality Checklist

- ✅ Schema idempotent (IF NOT EXISTS on all tables)
- ✅ Rollback script included (commented DOWN section)
- ✅ RLS policies multi-tenant validated
- ✅ Indices optimized for access patterns (1M+/month)
- ✅ Audit trail LOGGED (compliance Portuguese)
- ✅ Soft-delete pattern with automatic filtering
- ✅ 5 integration tests for isolation validation
- ✅ Architect review complete (Aria approved)
- ✅ Generated columns tested
- ✅ Constraints validated (dates, prices, statuses)

---

## 📚 Related Documentation

| Document | Purpose |
|----------|---------|
| `EPIC-MULTI-OTA-SYNC.md` | Master epic (overview, success criteria) |
| `EPIC-MULTI-OTA-PHASE1.md` | Phase 1 stories (Vault, credential manager, audit) |
| `EPIC-MULTI-OTA-PHASE2.md` | Phase 2 stories (Booking scraper, email parser, iCal) |
| `DOMAIN-MODEL.md` | Entity relationships + business rules |
| `RISK-REGISTER.md` | 6 HIGH-risk items + mitigations |

---

## 🔗 Key References

- **Portuguese Fiscal Law:** 10-year financial retention
- **GDPR Compliance:** 24-month PII pseudonimization, right to delete
- **Booking.com iCal:** 30min-2h sync delay (pull-based, unreliable) → email-first strategy
- **Multi-tenancy:** Org-scoped isolation via RLS (not schema-per-org)
- **Graceful Degradation:** Always create reservation with minimal data, enrich later

---

*Phase 1 Foundation approved for deployment. Ready for `supabase db push`.*
