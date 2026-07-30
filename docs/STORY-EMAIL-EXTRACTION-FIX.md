# Story: Fix Email Extraction from Booking.com & Airbnb

**Status:** Ready for Review  
**Priority:** 🔴 CRITICAL  
**Complexity:** Medium  
**Created:** 2026-07-30  
**Discoverer:** Fabio Gomes (Production Testing)

---

## 📋 Problem Statement

### Current Behavior
When a reservation is created via webhook from Booking.com or Airbnb:
- ✅ Webhook received successfully
- ✅ Reservation created in database
- ❌ Guest name extraction FAILS
- ❌ Reservation value extraction FAILS
- ❌ Phone number extraction FAILS
- ❌ Reservation appears as "Reserved" (placeholder)

### Expected Behavior
After webhook + email reception:
- ✅ Webhook received
- ✅ Reservation created
- ✅ Email from Booking/Airbnb received and parsed
- ✅ Guest name extracted and saved
- ✅ Reservation value extracted and saved
- ✅ Phone number extracted and saved
- ✅ Reservation fully populated with guest data

### Business Impact
- 🔴 **Manual data entry required for EVERY reservation**
- 🔴 **Operational overhead increased**
- 🔴 **Error-prone (typos in guest data)**
- 🔴 **System appears broken to users**

---

## 🔍 Evidence

### Dashboard Notifications (30/07/2026)
```
"Reserva sem nome de hóspede identificado — AHS T1 Armação de Pêra 
| Piscina + Garagem + Quadra de tênis + Jardim | 6 min a pé da praia 
(check-in 01/05)"

"Reserva sem nome de hóspede identificado — AHS Premium Apart 2 Pools 
| PS4 | 5 min Beach Algarve (check-in 19/12)"

"Reserva sem nome de hóspede identificado — AHS - Casa do Moinho Refúgio 
na Natureza em Loulé com Piscina + Jardim + Estacionamento (check-in 23/07)"

"Falha na sincronização às 30/07 14:07"
```

### Production Testing Results
- Multiple reservations with `guest_name = "Reserved"`
- No values populated from email extraction
- Manual correction required for all fields

---

## 🎯 Acceptance Criteria

### Extraction Service
- [ ] Email reading service connected to Booking.com account
- [ ] Email reading service connected to Airbnb account
- [ ] Service receives confirmation emails successfully
- [ ] Service logs show email reception timestamps
- [ ] Error handling for failed email reads

### Data Parsing
- [ ] Parser extracts guest full name from email body
- [ ] Parser extracts reservation total value
- [ ] Parser extracts guest phone number
- [ ] Parser handles multiple email formats (Booking vs Airbnb)
- [ ] Parser validates extracted data (non-empty, correct format)

### Database Update
- [ ] Extracted data updates reservation record
- [ ] Update only happens if extraction successful
- [ ] Reservation no longer shows "Reserved" placeholder
- [ ] Fields updated: first_name, last_name, total_price, phone

### Monitoring & Logging
- [ ] Success: Email processed, guest data populated
- [ ] Failure: Error logged with email ID and reason
- [ ] Dashboard notifications show success/failure
- [ ] Logs accessible for debugging

### Testing
- [ ] Simulated email test (send test email to extraction service)
- [ ] Real Booking email triggers extraction
- [ ] Real Airbnb email triggers extraction
- [ ] Duplicate email doesn't create duplicate extraction
- [ ] Failed extraction doesn't break reservation creation

---

## 🔧 Technical Investigation Points

**For @dev to investigate:**

1. **Email Service Status**
   - Is email reading service running?
   - Are credentials for Booking/Airbnb inbox valid?
   - Can service connect to mailbox?
   - File: `src/lib/integrations/email-extraction/service.ts`

2. **Parser Implementation**
   - Where is the parser code? (`email-parser.ts`?)
   - Is regex/extraction logic correct?
   - Does it handle both Booking & Airbnb formats?
   - Test with actual email samples

3. **API Integration**
   - Where is the update reservation endpoint?
   - Is it being called with extracted data?
   - Are field mappings correct?
   - Check for silent failures

4. **Error Handling**
   - Look for try/catch blocks catching silently
   - Check error logs for extraction failures
   - Verify failure doesn't block other operations

---

## 📊 Testing Strategy

### Manual Test Case 1: Booking Email
```gherkin
Given: Reservation created via Booking webhook
When: Booking confirmation email arrives
Then:
  - Email is received by extraction service
  - Guest name is extracted
  - Reservation value is extracted
  - Reservation record updated with real data
  - Guest name no longer shows "Reserved"
```

### Manual Test Case 2: Airbnb Email
```gherkin
Given: Reservation created via Airbnb webhook
When: Airbnb confirmation email arrives
Then:
  - Email is received by extraction service
  - Guest name is extracted
  - Reservation value is extracted
  - Reservation record updated with real data
```

### Manual Test Case 3: Failed Email
```gherkin
Given: Reservation created
When: Email processing fails
Then:
  - Error is logged (timestamp, reason)
  - Reservation remains in database (not deleted)
  - Dashboard shows failure notification
  - User can see what went wrong
```

---

## 📝 Notes

- **Related Issue:** #9 (Email Extraction Not Working)
- **Testing Environment:** Production (already has failed examples)
- **Timeline:** Found during 30/07/2026 production testing
- **Workaround:** Manual data entry (current state)

---

## 🔗 Related Issues

- Issue #9: Email Extraction from Booking/Airbnb NOT WORKING
- Issue #10: Date sync desincronization (separate story)

---

**Prepared by:** Fabio Gomes  
**Date:** 2026-07-30  
**Status:** Ready for @dev to implement
