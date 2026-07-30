# Guest Data Sync Fix — 2026-07-30

## Problem Statement

Guest data (names, phones, totals) extracted from Booking.com/Airbnb confirmation emails were not syncing to the reservations table. Guests appeared as "Reserved" placeholder, requiring manual correction for every incoming reservation. With 8 properties and overlapping date ranges, there was a critical risk of silent data corruption — guest data from one guest could be synced to a different reservation.

## Root Cause Analysis

The original implementation (`scoreReservationMatch`) tried matching by:
1. **reservation_code** — extracted from email (e.g., "BK123ABC")
2. **Date proximity** — within ±1 day tolerance

**Critical Issue:** Reservations in Lodgra are created by `sync-ical` (polling the iCal feed), which extracts only a numeric platform ID from the calendar. The human-readable confirmation codes like "BK123ABC" from Booking.com emails are **never stored anywhere** in the database. So the match would silently fail and fall back to arbitrary date matching.

**The vulnerability:** When multiple properties had overlapping dates (common with 8 properties), `.eq('organization_id').gte('check_in').lte('check_out').limit(1)` would pick an arbitrary reservation—possibly the wrong one. Data would sync silently to the wrong guest.

## Solution

**Match strategy: Date + Property Name (Fuzzy)**

1. **Exact date matching** — Find all reservations with exact check_in/check_out within organization
2. **Single match** — If only one reservation on those dates, sync directly
3. **Multiple matches** — Disambiguate using property_name extracted from the email:
   - Calculate fuzzy similarity (Levenshtein distance) between extracted property name and stored property name
   - Only sync if match score ≥ 0.6 AND gap between best/second-best is ≥ 0.15
   - Otherwise mark `needs_review` (safe fallback, prevents wrong-reservation corruption)

**Why this works:**
- `sync-ical` already enforces: no two overlapping reservations per property
- Exact dates + property name = reliable key across multi-property organization
- Fuzzy matching handles variations ("Villa Azul" vs "villa azul", "Apt. Centro" vs "Apartamento Centro")
- `needs_review` flag allows manual queue instead of silent errors

## Files Modified

### 1. `matching-engine.ts`
- **Change:** Export `calculateFuzzySimilarity()` (was private)
- **Reason:** Reuse existing, tested similarity logic instead of reinventing

### 2. `sync-to-reservations.ts` (REWRITTEN)
- **Old logic:** Score by reservation_code + date range, pick highest score
- **New logic:**
  - Query by exact dates + organization
  - If 1 candidate: sync directly
  - If 2+ candidates: disambiguate by property name with fuzzy matching
  - If no confident match: mark `match_status: 'needs_review'`
- **Safety thresholds:**
  - `PROPERTY_MATCH_THRESHOLD = 0.6`
  - `MIN_WINNER_MARGIN = 0.15` (tie-break margin)

### 3. `extract-service.ts` (PROMPT REINFORCED)
- **Change:** Expanded prompt examples to emphasize `property_name` extraction
- **Added:** Example 2 with property name ("Unidade: Apartamento Vista Mar T2")
- **Added:** Example 4 showing omission when property name absent
- **Added:** RULE section explaining property_name is critical for disambiguation
- **Reason:** Downstream logic now depends on property_name—model must prioritize it

### 4. `sync-to-reservations.test.ts` (8 TESTS)
- **Test 1:** Single reservation → syncs directly ✅
- **Test 2:** Two reservations, property name matches one → targets correct ✅
- **Test 3:** Two reservations, no property name → marks needs_review ✅
- **Test 4:** Two reservations, property name matches none → marks needs_review ✅
- **Test 5:** Extraction not found → returns error ✅
- **Test 6:** Already synced → idempotent ✅
- **Test 7:** No reservation yet → success (awaits next sync) ✅
- **Test 8:** Guest name split correctly → first_name + last_name ✅

### Deleted: `sync-to-reservations-bug.test.ts`
- **Reason:** Tested the old bug (arbitrary reservation pick). Bug is now fixed by design.

## Migration Note

**For existing data:** Emails already in `email_extractions` with `sync_status: 'pending'` will retry on next scheduled sync. If property names were not extracted (old prompt), they will mark `needs_review`. This is safe but creates a manual review queue.

**Recommendation:** Run backfill task to extract property_name for pending extractions using updated OpenAI prompt.

## Verification Steps

```bash
# Run tests
npm test -- --testPathPattern="sync-to-reservations" --no-coverage

# Verify type safety
npm run typecheck

# Verify lint
npm run lint

# Verify build
npm run build
```

## Open Questions

**Property name availability:** The new matching strategy assumes property names appear reliably in email bodies. Recommendation: Verify with 2-3 real Booking.com/Airbnb emails to confirm name appears in subject/body. If names are consistently absent:
- Expand prompts to extract more context clues
- Consider webhook metadata (if available from channel APIs)
- Accept higher `needs_review` rate (safe, not corrupt)

## Deployment Checklist

- [ ] Merge changes to main
- [ ] Deploy to production
- [ ] Monitor `email_extractions.match_status = 'needs_review'` count
- [ ] If high count: investigate property name extraction coverage
- [ ] Run backfill task on pending extractions (if needed)

---

**Status:** ✅ Complete  
**Commits:** 4 files changed, 8 tests passing, 0 regressions  
**Risk Level:** LOW (fuzzy matching + needs_review fallback prevents corruption)
