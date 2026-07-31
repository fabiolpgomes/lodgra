# Epic 41 Phase 2 — Production Test Checklist

**Status:** Ready for Production Testing  
**Deploy Date:** 2026-07-30  
**Test Environment:** Production  
**Tester:** Fabio Gomes

---

## 📋 Implementation Summary

### Files Modified
- `src/app/api/webhooks/__tests__/booking.test.ts` - HMAC signature validation
- `src/lib/integrations/booking/__tests__/integration-simplified.test.ts` - Unit test rewrite
- `src/lib/integrations/booking/__tests__/integration.test.ts` - Mock-based unit tests
- `src/__tests__/e2e/story-41-5-price-preview.test.tsx` - E2E price preview tests

### Test Coverage Achieved
- **Total Tests:** 2752/2753 (99.96%)
- **Skipped:** 1 (expected)
- **Passing:** 2752

---

## 🧪 Feature Test Checklist

### 1. PRICE PREVIEW BREAKDOWN (Story 41.5)

**Feature:** Price breakdown tooltip in reservation flow

#### Setup Tests
- [ ] **Load Property Page** - No errors on load = OK
  - [ x] Property details visible
  - [x ] Reservation card renders
  - [ x] Price visible in booking card

#### Tooltip Behavior
- [ ] **Toggle Button Visible** - "Show price breakdown" button exists
  - [ ] Button has correct aria-label
  - [ ] Button has aria-expanded attribute
  - [ ] Button has aria-haspopup="dialog"

- [ ] **Open Tooltip** - Click button opens tooltip
  - [ ] Dialog appears
  - [ ] Loading state shows while calculating
  - [ ] Price data loads correctly

- [ ] **Close Tooltip** - Multiple close methods work
  - [ ] Click button again closes
  - [ ] Press ESC closes
  - [ ] Click outside closes

#### Price Calculations
- [ ] **Base Price Display** - Shows correct base price
  - [ ] Currency symbol correct (€)
  - [ ] Amount matches property base_price

- [ ] **Loyalty Discount** - Applied if guest is loyal
  - [ ] Discount amount calculated
  - [ ] Discount percentage shown
  - [ ] Final price reduced correctly

- [ ] **Extended Stay Discount** - Applied for 7+ days
  - [ ] Discount % calculated correctly
  - [ ] Shows in breakdown
  - [ ] Subtracted from total

- [ ] **Early Bird Discount** - Applied if booked 30+ days ahead
  - [ ] Discount % calculated
  - [ ] Shows in breakdown
  - [ ] Included in final price

- [ ] **Seasonal Adjustment** - Applied if configured
  - [ ] Seasonal % applied
  - [ ] Shows in breakdown if applicable
  - [ ] Final price adjusted

- [ ] **Last Minute Discount** - Applied if booking within 7 days
  - [ ] Discount calculated
  - [ ] Shows only when applicable
  - [ ] Price reduced

#### Edge Cases
- [ ] **Invalid Date Range** - Shows error if checkout before checkin
  - [ ] Error message displays
  - [ ] "Please select valid dates" shown

- [ ] **No Discounts Scenario** - Base price only
  - [ ] Shows base price
  - [ ] "Preço Base" label visible
  - [ ] No discount rows shown

- [ ] **API Failure** - Handles network errors gracefully
  - [ ] Error message displays: "Unable to calculate price breakdown"
  - [ ] Tooltip still closes properly

#### Performance
- [ ] **Debounce Works** - No excessive API calls
  - [ ] Only 1 calculate-price call per open
  - [ ] No race conditions

- [ ] **Guest Tier Fetch** - If guest_id provided
  - [ ] Fetches guest tier
  - [ ] Applies base_discount_percent
  - [ ] Merges with other discounts

---

### 2. BOOKING.COM WEBHOOK SYNC (Story 41.3)

**Feature:** Booking.com webhook integration for automatic reservation sync

#### Webhook Reception
- [ ] **Webhook Endpoint Available** - POST `/api/webhooks/booking` exists
  - [ ] Returns 200 on valid webhook
  - [ ] Returns 401 on missing auth

- [ ] **Signature Validation** - HMAC-SHA256 validation
  - [ ] Correct signature accepted
  - [ ] Invalid signature rejected
  - [ ] Missing secret returns error

#### Reservation Creation
- [ ] **Create New Reservation** - Webhook creates reservation
  - [ ] Reservation ID generated
  - [ ] Guest record created
  - [ ] Check-in/check-out dates stored
  - [ ] Status set to "confirmed"

- [ ] **Guest Name Splitting** - Full name → first_name + last_name
  - [ ] "João Silva" → first_name: "João", last_name: "Silva"
  - [ ] Single name handled correctly
  - [ ] Special characters preserved

- [ ] **Commission Calculation** - Based on org plan
  - [ ] Starter plan: 15% commission
  - [ ] Pro plan: 12% commission
  - [ ] Commission amount stored

#### Duplicate Detection
- [ ] **Idempotency** - Same webhook twice
  - [ ] First call creates reservation
  - [ ] Second call detected as duplicate
  - [ ] isDuplicate=true returned
  - [ ] No duplicate guest created

#### Organization Isolation (RLS)
- [ ] **Org Isolation** - Reservations isolated by organization_id
  - [ ] Reservation has organization_id
  - [ ] Query respects RLS
  - [ ] Cross-org access blocked

- [ ] **Org Not Found** - Error if organization missing
  - [ ] Returns error: "Organization not found"
  - [ ] Reservation not created

#### Data Integrity
- [ ] **Webhook Payload Processing**
  - [ ] All required fields extracted
  - [ ] Optional fields handled
  - [ ] No data loss

- [ ] **Webhook Logging** - Audit trail
  - [ ] Webhook logged in audit_logs
  - [ ] Timestamp recorded
  - [ ] Status recorded

---

### 3. DATA EXPORT API (Story 11.3)

**Feature:** User data export in JSON format (GDPR compliance)

#### Authentication
- [ ] **Unauthenticated Access** - Blocked
  - [ ] Returns 401 Unauthorized
  - [ ] No data returned

#### Export Functionality
- [ ] **Authenticated Export** - Download all user data
  - [ ] Returns 200 OK
  - [ ] Content-Type: application/json
  - [ ] Content-Disposition: attachment

- [ ] **Export Contents** - All tables included
  - [ ] export_date present
  - [ ] export_version: "1.0"
  - [ ] user (profile data)
  - [ ] properties
  - [ ] reservations
  - [ ] expenses
  - [ ] owners
  - [ ] consent_records
  - [ ] audit_logs

#### Rate Limiting
- [ ] **24-Hour Cooldown** - Only 1 export per day
  - [ ] First export: returns 200
  - [ ] Second export within 24h: returns 429 Too Many Requests
  - [ ] Error message clear

#### Audit Trail
- [ ] **Logging** - Export logged in audit_logs
  - [ ] user_id recorded
  - [ ] action: "data_export_requested"
  - [ ] timestamp recorded

#### File Format
- [ ] **JSON Validity** - Valid JSON structure
  - [ ] Can be parsed
  - [ ] No syntax errors
  - [ ] Proper escaping

---

### 4. ICAL ROUTES (Story 41.2)

**Feature:** iCalendar format export for calendar integration

#### iCal Generation
- [ ] **Valid iCal Format** - Generates RFC 5545 compliant iCal
  - [ ] BEGIN:VCALENDAR present
  - [ ] VERSION:2.0
  - [ ] PRODID correct
  - [ ] END:VCALENDAR present

- [ ] **Calendar Properties**
  - [ ] CALSCALE:GREGORIAN
  - [ ] METHOD:PUBLISH
  - [ ] X-WR-CALNAME: Property name
  - [ ] X-WR-TIMEZONE correct

#### Event Creation
- [ ] **Reservation Events** - Each reservation is VEVENT
  - [ ] UID generated (unique)
  - [ ] DTSTART with check-in date
  - [ ] DTEND with check-out date
  - [ ] SUMMARY: Guest name
  - [ ] DESCRIPTION: Reservation details

#### Timezone Handling
- [ ] **UTC Dates** - No timezone offset bugs
  - [ ] Check-in date correct
  - [ ] Check-out date correct
  - [ ] No +1 day offset
  - [ ] No -3 day offset (old bug fixed)

#### Parsing
- [ ] **Can Import to Calendar Apps**
  - [ ] Apple Calendar imports correctly
  - [ ] Google Calendar imports
  - [ ] Outlook imports
  - [ ] Dates visible correctly

---

### 5. BOOKING INTEGRATION TESTS (Unit Tests)

**Feature:** Booking.com sync logic verified via unit tests

#### Test Quality
- [ ] **No Database Dependencies** - Pure mock-based tests
  - [ ] Tests run in milliseconds
  - [ ] No flaky database setup
  - [ ] Deterministic results

- [ ] **Mock Data Store** - Simple data structure
  - [ ] Mock organization data
  - [ ] Mock channel_listings data
  - [ ] Mock reservations data

#### Test Scenarios
- [ ] **Full Webhook Flow** - Complete sync process
  - [ ] Payload validated
  - [ ] Organization found
  - [ ] Reservation created
  - [ ] Commission calculated

- [ ] **Duplicate Detection** - Idempotency verified
  - [ ] First sync succeeds
  - [ ] Second sync detected
  - [ ] isDuplicate=true

- [ ] **Organization Isolation** - RLS rules followed
  - [ ] Org ID propagated
  - [ ] No cross-org access
  - [ ] Org validation required

---

## 📊 Test Results Template

### Test Execution Log

**Date:** [YYYY-MM-DD]  
**Time:** [HH:MM]  
**Environment:** Production  
**Tester:** Fabio

---

### Results by Feature

#### Price Preview
- Status: [ ] PASS / [ ] FAIL / [ ] PARTIAL
- Issues Found: 
- Notes:

#### Booking Webhook
- Status: [ ] PASS / [ ] FAIL / [ ] PARTIAL
- Issues Found:
- Notes:

#### Data Export
- Status: [ ] PASS / [ ] FAIL / [ ] PARTIAL
- Issues Found:
- Notes:

#### iCal Routes
- Status: [ ] PASS / [ ] FAIL / [ ] PARTIAL
- Issues Found:
- Notes:

#### Unit Tests
- Status: [ ] PASS / [ ] FAIL / [ ] PARTIAL
- Issues Found:
- Notes:

---

### Overall Result

- [ ] **ALL GREEN** — 100% features working
- [ ] **MINOR ISSUES** — Small bugs found, documented
- [ ] **BLOCKING ISSUES** — Critical bugs found, escalate to @dev

---

## 🚀 Next Steps

1. **All Pass:** Create v4.1.1 release
2. **Minor Issues:** Document, create stories for fixes
3. **Blocking Issues:** Rollback or hotfix immediately

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-30  
**Status:** Ready for Testing
