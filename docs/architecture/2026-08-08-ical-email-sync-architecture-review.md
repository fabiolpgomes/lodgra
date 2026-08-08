# Architecture Review: iCal + Email Sync Integration
**Date:** 2026-08-08  
**Status:** BLOCKED - Architecture Decision Required  
**Severity:** HIGH - Core sync functionality broken  

---

## Executive Summary

The synchronization system has two competing approaches:
- **iCal Sync** (platform URLs: Airbnb, Booking, Flatio) 
- **Email Sync** (Airbnb/Booking confirmation emails via Gmail)

Previous refactor moved to email-only, leaving **33 orphaned listings** with incomplete data. Now attempting to restore iCal + Email hybrid approach, but **architectural decisions needed** before proceeding.

---

## Current State Analysis

### ✅ What Exists

**iCal Infrastructure:**
- `property_listings` table (33 records)
  - Status: Data incomplete (`name: NULL`, `platform: NULL`)
  - iCal URLs: ~20 configured, ~13 missing
  - sync_enabled: all TRUE
  - is_active: all TRUE

- Sync endpoints:
  - `/api/cron/sync-ical` - imports events from iCal URLs
  - `/api/admin/trigger-ical-sync` - manual trigger (NEW, created this session)

- UI Components:
  - `ICalSyncSettings.tsx` - exists but can't render (missing data)
  - Settings page integration - exists

**Email Infrastructure:**
- `/api/cron/email-parser` - parses Airbnb/Booking/Flatio emails
- `/api/admin/trigger-email-parser` - manual trigger
- Gmail OAuth integration - working
- Email extraction logic - complete

### ❌ What's Broken

1. **Data integrity:**
   - 33 listings have NULL `name` and `platform` fields
   - ICalSyncSettings component can't render without these
   - No recovery path for existing data

2. **Architecture clarity:**
   - Dual sync pathways (iCal + Email) not formally defined
   - Conflict resolution strategy undefined
   - Source-of-truth unclear

3. **UI consistency:**
   - Settings page has both "Importar Reservas" (iCal) + "Email Integration"
   - User doesn't know which to use
   - No unified sync control

---

## Historical Context

### Previous State (Before refactor)
- **Primary:** iCal URLs from property listings
- **Status:** Working but incomplete (missing platforms from emails)
- **Problem:** No reservation details (guest name, amounts, dates)

### Attempted Refactor
- **Goal:** Get guest details from email (not iCal)
- **Action:** Added email-parser cron job
- **Side effect:** iCal infrastructure abandoned, listings data degraded
- **Result:** Email-only works, but lost iCal URL management

### Current Session
- **Discovery:** 33 listings exist but orphaned
- **New endpoint:** `/api/admin/trigger-ical-sync` created
- **Issue:** Incomplete data blocks iCal UI
- **Status:** Awaiting architecture decision

---

## Technical Details

### Database Schema Issues

**Current `property_listings` structure:**
```sql
property_listings {
  id: uuid (PRIMARY)
  property_id: uuid (FOREIGN KEY)
  name: text (NULL in 33 records) ⚠️
  platform: text (NULL in 33 records) ⚠️
  ical_url: text (20 configured, 13 NULL)
  sync_enabled: boolean (all TRUE)
  is_active: boolean (all TRUE)
  last_synced_at: timestamp (NULL)
  created_at: timestamp
  updated_at: timestamp
}
```

**Problems:**
- `name` should come from property? Or be user-configured?
- `platform` should be ENUM (Airbnb, Booking, Flatio, Other)?
- Multiple listings per property possible? (Yes, observed in data)
- Should there be a 1:1 or 1:many relationship?

### Sync Data Flow (Current Confusion)

**Path 1 - iCal Sync:**
```
iCal URL → fetch events → detect RESERVATION vs BLOCK
  → create reservations (but missing: guest_name, amount)
  → stored as draft status
```

**Path 2 - Email Sync:**
```
Gmail → fetch emails → parse extraction
  → lookup property by iCal URL matching
  → create reservations with guest_name, amount, etc
  → stored as draft status
```

**Conflict:** Both create reservations, how do we avoid duplicates?

### 33 Listings Status Breakdown

| Config | Count | Notes |
|--------|-------|-------|
| iCal URL + Sync ON | ~20 | Ready to sync, but data incomplete |
| iCal URL NULL + Sync ON | ~13 | Can't sync without URL |
| Total | 33 | All need data repair + architecture decision |

---

## Decision Points

### 1. Source of Truth: iCal vs Email

**Option A: iCal Primary, Email as Enrichment**
- Fetch events from iCal URLs (dates, availability)
- Fetch emails to get guest details (name, amount)
- Conflict resolution: If both exist, email wins on guest data

**Option B: Email Primary, iCal as Fallback**
- Parse emails first (guest name, amount, confirmation ID)
- Use iCal only for unavailable dates (blocks)
- Better guest data from email

**Option C: Separate Sync Modes**
- User chooses iCal OR Email (not both)
- Clearer but less comprehensive

**Recommendation:** Option A (iCal primary, email enrichment)
- Reason: Handles all scenarios (properties without email access can still sync)
- Reason: iCal has definitive availability data

---

### 2. Data Model: property_listings Structure

**Option A: Keep as-is, fix data**
```
property_listings {
  id, property_id, platform, name,
  ical_url, sync_enabled, ...
}
```
- Pro: Already built, just needs data repair
- Con: `name` is redundant with property.name
- Con: Multiple listings per property unclear

**Option B: Simplify to listing-per-platform**
```
property_listings {
  id, property_id, platform (ENUM),
  ical_url, sync_enabled, last_synced_at
}
```
- Pro: One record per property per platform
- Pro: Clearer relationships
- Con: Migration needed for 33 records

**Option C: Separate into mapping table**
```
property_listings {
  id, property_id, name, platform,
  ical_url, sync_enabled, ...
}

property_platforms (new) {
  property_id, platform (ENUM), is_primary
}
```
- Pro: Flexible multi-platform support
- Con: Over-engineered for current needs

**Recommendation:** Option B (simplify, one per platform)
- Reason: Clearer semantics
- Reason: Easier to manage multiple platforms per property later

---

### 3. Sync UI: Where & How?

**Current Location:** Settings page
- Problem: Hidden among other settings
- Problem: Not task-focused (importing reservations)

**Option A: Keep in Settings, unify UI**
- Combine iCal + Email sections
- Show sync status per property
- "Syncronization Center" subsection

**Option B: Create Dedicated Sync Dashboard**
- `/sync` page for import/export
- Show iCal URLs + sync status
- Manual trigger + automation config
- Email integration management

**Option C: Embed in Calendar/Reservations**
- Add sync controls to calendar page
- Show last sync time
- Quick manual refresh

**Recommendation:** Option B (Dedicated Sync Dashboard)
- Reason: Currently `/sync` page exists but shows email metrics only
- Reason: Unifies all reservation import sources
- Reason: Clearer mental model for users

---

### 4. Conflict Resolution Strategy

**Scenario:** Same reservation found via both iCal + Email

**Option A: Email Wins (guest data priority)**
```
if (email_reservation exists) {
  use email data (guest_name, amount, confirmation_id)
  use ical dates (check_in, check_out)
} else if (ical_reservation exists) {
  use ical data (dates) + mark as draft (missing guest data)
}
```

**Option B: Merge and Update**
```
if (ical_reservation exists) {
  update from email: guest_name, amount, confirmation_id
}
```

**Option C: Duplicate Detection by external_id**
```
external_id = platform + confirmation_id
if (exists) skip, else create
```

**Recommendation:** Option C (Duplicate detection)
- Reason: Prevents creating duplicates
- Reason: Each platform's confirmation ID is unique
- Reason: Simplest logic

---

### 5. Data Repair Path

**Current State:** 33 listings with NULL name/platform

**Option A: Auto-repair + migrate**
- Create endpoint to populate missing data
- Use property.name as listing.name
- Assume platform from iCal URL (if possible)
- Mark repaired with timestamp

**Option B: Manual user action**
- Ask user to fill in platform + name in UI
- Clean before allowing sync

**Option C: Delete + Rebuild**
- Delete 33 broken records
- User adds listings manually
- Clean slate

**Recommendation:** Option A (Auto-repair)
- Reason: 33 records have valid iCal URLs
- Reason: User shouldn't lose existing configuration
- Reason: Fast path to restore functionality
- Step 2: Later, improve data collection UI

---

## Recommended Architecture

### 1. Data Model (Priority 1)

**Simplified property_listings:**
```sql
property_listings {
  id: uuid PRIMARY
  property_id: uuid FOREIGN KEY (properties)
  platform: text NOT NULL (Airbnb, Booking, Flatio, Custom)
  ical_url: text NOT NULL
  sync_enabled: boolean DEFAULT true
  last_synced_at: timestamp
  created_at: timestamp
  updated_at: timestamp
  
  CONSTRAINT unique_property_platform UNIQUE(property_id, platform)
}
```

### 2. Sync Strategy (Priority 1)

**Dual-source, conflict-aware:**
1. iCal provides: dates (check_in, check_out), availability blocks
2. Email provides: guest_name, amount, confirmation_id
3. Merge by external_id (platform + confirmation)
4. Email data enriches iCal records

### 3. Sync Flow (Priority 2)

```
Manual Trigger → Sync Dashboard
  ├─ Step 1: Fetch iCal URLs (async, per property)
  │   └─ Create/update reservations with dates only
  │
  └─ Step 2: Fetch Gmail inbox (async, global)
      └─ Parse emails → match to iCal records
      └─ Enrich with guest_name, amount
      └─ Create new if no iCal match
```

### 4. UI Reorganization (Priority 2)

**Replace email-scattered Settings with unified Sync Dashboard:**
- `/[locale]/sync` - already exists, currently email-only
- Show: Property list + Platform + iCal URL + Last Sync + Actions
- Consolidate email integration here too

### 5. Data Repair (Priority 1 - Blocker)

**Execute immediately:**
1. Run endpoint: `POST /api/admin/fix-listings`
2. Populates NULL name from property.name
3. Infers platform from iCal URL domain (airbnb.com → Airbnb, etc)
4. Validates iCal URLs still work

---

## Implementation Roadmap

### Phase 1: Unblock Current (1-2 hours)
- [ ] Run data repair endpoint
- [ ] Verify ICalSyncSettings renders
- [ ] Test manual sync trigger
- [ ] Document current state

### Phase 2: Architecture Alignment (4-6 hours)
- [ ] Review this document with @architect
- [ ] Decide on conflict resolution strategy
- [ ] Finalize data model
- [ ] Update sync logic if needed

### Phase 3: UI Consolidation (4-6 hours)
- [ ] Move iCal controls to `/sync` dashboard
- [ ] Unify email + iCal on same page
- [ ] Add sync status indicators
- [ ] Improve error messages

### Phase 4: Robustness (2-4 hours)
- [ ] Handle duplicate detection
- [ ] Add retry logic for failed syncs
- [ ] Monitor both sync paths
- [ ] Document flow for users

---

## Open Questions for Architect Review

1. **Primary sync source?** iCal or Email? Or equally weighted?
2. **One listing per property or multiple platforms?**
3. **Should platform be ENUM or free text?**
4. **How to handle users with no email + no iCal?**
5. **Sync frequency?** Manual only or cron scheduled?
6. **Backwards compatibility** with 33 existing records?
7. **Should email parser auto-detect properties** by email sender domain?
8. **Error handling:** What happens if iCal URL breaks or email access revoked?

---

## Risks if Not Addressed

| Risk | Impact | Likelihood |
|------|--------|-----------|
| Data stays corrupted | Users can't manage iCal | HIGH |
| Duplicate reservations | User confusion, data mess | HIGH |
| No conflict strategy | Overwrites lose data | MEDIUM |
| Unclear primary source | Unpredictable behavior | MEDIUM |
| Scattered UI | Users don't know to configure | MEDIUM |

---

## Success Criteria

- [ ] All 33 listings have valid name + platform
- [ ] iCal URLs working and syncing
- [ ] Email integration coexists without conflicts
- [ ] Users can see/manage both sync sources
- [ ] No duplicate reservations
- [ ] Clear documentation of how sync works
- [ ] QA tested both iCal + email paths

---

## Next Steps

1. **Share this document with @architect**
2. **Review decisions section together**
3. **Get alignment on recommended architecture**
4. **Execute Phase 1 (data repair)**
5. **Proceed with remaining phases**

**Owner:** @architect  
**Reviewers:** @dev, @pm, @qa  
**Due:** 2026-08-09

---

## Appendix A: Related Files

**Code:**
- `/src/components/features/settings/ICalSyncSettings.tsx` - UI component (broken)
- `/src/app/api/cron/sync-ical/route.ts` - iCal sync logic
- `/src/app/api/cron/email-parser/route.ts` - Email sync logic
- `/src/app/[locale]/settings/page.tsx` - Settings integration
- `/src/app/[locale]/sync/page.tsx` - Sync dashboard (email-only)

**Database:**
- `property_listings` table (33 orphaned records)
- `properties` table (5 properties)
- `reservations` table (synced reservations)

**URLs:**
- Settings: `https://www.lodgra.io/pt-BR/settings` → "Importar Reservas"
- Sync Dashboard: `https://www.lodgra.io/pt-BR/sync` → Current email metrics

---

**Document Version:** 1.0  
**Last Updated:** 2026-08-08  
**Status:** Awaiting Architect Review
