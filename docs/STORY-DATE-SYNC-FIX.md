# Story: Fix Date Synchronization - Available Dates Marked as Reserved

**Status:** Ready for Review  
**Priority:** 🔴 CRITICAL  
**Complexity:** High  
**Created:** 2026-07-30  
**Discoverer:** Fabio Gomes (Production Testing)

---

## 📋 Problem Statement

### Current Behavior
When syncing calendar data from Booking.com & Airbnb:
- ❌ Available dates are received as "reservations"
- ❌ Dates that are FREE on Booking/Airbnb appear as BLOCKED in Lodgra
- ❌ Lodgra shows 0% availability when Booking shows dates open
- ❌ Users lose booking opportunities due to false blocking

### Expected Behavior
- ✅ Only actual reservations sync as booked dates
- ✅ Available dates remain available
- ✅ Blocking dates sync correctly (if explicitly blocked)
- ✅ Lodgra and Booking/Airbnb calendars stay in sync
- ✅ No false unavailability blocks

### Business Impact
- 🔴 **Lost revenue from blocked available dates**
- 🔴 **Discrepancy between platforms confuses operations**
- 🔴 **Calendar shows wrong availability to guests**
- 🔴 **Manual intervention needed to unblock dates**

---

## 🔍 Evidence

### Production Testing Discovery (30/07/2026)
```
Tester observed:
- Date 15/08: Shows as RESERVED in Lodgra
- Same date 15/08: Shows as AVAILABLE on Booking.com
- Date 19/12: Shows as RESERVED in Lodgra  
- Same date 19/12: Shows as AVAILABLE on Airbnb

Conclusion: Sync is pulling non-reservation data as reservations
```

### Dashboard Indicators
```
"Ocupação de 0% nos próximos 30 dias" 
→ When dates are actually available on other platforms
```

---

## 🔗 Root Cause Hypothesis

**Likely causes:**

1. **iCal Format Misinterpretation**
   - iCal contains blocked dates (property unavailable blocks)
   - Parser incorrectly interprets as reservations
   - Solution: Distinguish between VEVENT types

2. **Channel Listing Sync**
   - Syncing channel's full date range (not just bookings)
   - Each channel day treated as "reservation"
   - Solution: Filter for actual reservations only

3. **Data Format Confusion**
   - Different format from Booking vs Airbnb
   - Missing field to distinguish reservation vs block
   - Solution: Add explicit type field

4. **iCal BUSYTIME Interpretation**
   - TRANSP:OPAQUE (busy) confused with VEVENT (reserved)
   - Solution: Parse VEVENT properties correctly

---

## 🎯 Acceptance Criteria

### Data Sync Logic
- [ ] Only actual RESERVATIONS sync as booked
- [ ] Owner-created blocks do NOT sync as reservations
- [ ] Available dates remain unbooked
- [ ] Sync distinguishes: Reservation vs Owner Block

### Channel Integration
- [ ] Booking.com sync: Only actual bookings imported
- [ ] Airbnb sync: Only actual bookings imported
- [ ] Date format parsed correctly (check-in/check-out dates)
- [ ] No extra dates added beyond reservation window

### iCal Parsing
- [ ] iCal VEVENT parsed correctly
- [ ] DTSTART/DTEND respected
- [ ] TRANSP property handled correctly
- [ ] Event TYPE distinguished (booking vs block vs unavailable)

### Data Validation
- [ ] Check-in date < Check-out date
- [ ] No zero-length bookings
- [ ] No bookings in past dates
- [ ] Reject invalid date ranges

### Calendar Accuracy
- [ ] Lodgra dates match Booking.com dates
- [ ] Lodgra dates match Airbnb dates
- [ ] Available dates are truly available
- [ ] No false blocks

### Testing
- [ ] Sync a known Booking reservation → verify only those dates blocked
- [ ] Sync a known Airbnb reservation → verify only those dates blocked
- [ ] Verify dates before & after reservation are available
- [ ] Cross-check with source platform (Booking/Airbnb)

---

## 🔧 Technical Investigation Points

**For @dev to investigate:**

1. **Sync Service Entry Point**
   - Where is sync triggered? (`src/lib/integrations/booking/sync.ts`?)
   - What data is received from Booking/Airbnb?
   - What fields come with each "item"?

2. **Data Transformation**
   - How is received data mapped to reservations?
   - Is there filtering for reservation type?
   - Are there any date range checks?
   - File: `src/lib/integrations/booking/transform.ts`?

3. **iCal Parsing**
   - If using iCal: How are events parsed?
   - Are event types distinguished?
   - File: `src/lib/integrations/ical/parser.ts`?

4. **Database Storage**
   - How are dates stored? (check_in, check_out)
   - Is there a "type" field (reservation vs block)?
   - Can query distinguish reservation from block?

5. **Query Logic**
   - When showing calendar: How is availability determined?
   - Does it query all reservations or filtered?
   - File: `src/lib/calendar/get-availability.ts`?

---

## 📊 Sync Data Flow to Investigate

```
Booking.com API / Airbnb API / iCal Feed
         ↓
    Receive Data
         ↓
  Parse/Transform  ← PROBLEM HERE?
         ↓
  Map to Reservations ← OR HERE?
         ↓
  Database Insert
         ↓
  Calendar Query  ← OR HERE?
         ↓
  Display to User
```

---

## 📝 Manual Investigation Checklist

**For @dev to debug:**

- [ ] Pull actual reservation from Booking API → what fields?
- [ ] Pull actual iCal entry → what event type?
- [ ] Create test case: 1 reservation from Booking
- [ ] Sync it → check database for what was inserted
- [ ] Cross-check: DB dates vs Booking dates
- [ ] Check: Is a 7-night stay becoming 7 separate reservations?
- [ ] Check: Are non-reservation events being imported?

---

## 🧪 Test Cases

### Test Case 1: Single Booking Reservation
```gherkin
Given: Property with no reservations
When: Sync Booking reservation (15/08 check-in, 20/08 check-out)
Then:
  - Only 15-20 Aug marked as reserved
  - 14/08 remains available
  - 21/08 remains available
  - Exactly 5 nights blocked (not 6, not 7)
```

### Test Case 2: Multiple Reservations
```gherkin
Given: Property with multiple bookings
When: Sync 3 separate reservations
Then:
  - Only booked dates blocked
  - Gaps between bookings remain available
  - No adjacent dates incorrectly blocked
```

### Test Case 3: Cross-Platform Sync
```gherkin
Given: Reservation on Booking, different on Airbnb
When: Sync both
Then:
  - Both sync correctly
  - No overlap/confusion
  - Each platform's dates respected
```

### Test Case 4: Owner Blocks
```gherkin
Given: Owner blocked 5-10 Aug (maintenance)
When: Sync calendar
Then:
  - Owner block does NOT appear as reservation
  - Dates show as unavailable (but not "reserved")
  - Different from actual booking
```

---

## 🔄 Related Issues & Stories

- **Issue #9:** Email Extraction Fails (separate story)
- **Issue #10:** This story (Date Sync Desyncronization)
- **Impact of #9:** Without guest data, can't correlate which sync is wrong
- **Priority:** Fix #10 before fixing #9 might be better (core sync issue)

---

## 📋 Investigation Output Needed

**@dev should provide:**

1. Sample data received from Booking API
2. Sample iCal from Airbnb
3. What's currently in database for test property
4. Query logic used to check availability
5. Logs showing what's being transformed

---

## ⚠️ Notes

- **Urgency:** CRITICAL - Active revenue loss
- **Testing Environment:** Production (multiple failed examples)
- **Timeline:** Found 30/07/2026 during calendar testing
- **Affected Properties:** Multiple (AHS T1, AHS Premium Apart, Casa do Moinho)
- **Workaround:** None (requires manual calendar management)

---

**Prepared by:** Fabio Gomes  
**Date:** 2026-07-30  
**Status:** Ready for @dev investigation & fix
