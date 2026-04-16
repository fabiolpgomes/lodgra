# Story 3.1 QA Test Plan: Email Parsing Automático de Reservas

**Date Created:** 2026-03-23
**Story:** 3.1 — Email Parsing Automático de Reservas
**Status:** Awaiting QA Execution
**Epic:** 3 — Automação & Integrações

---

## Test Objectives

1. Verify OAuth2 Gmail connection flow works end-to-end
2. Validate email parsing extracts correct reservation data
3. Confirm deduplication prevents duplicate reservations
4. Test token refresh on expiry
5. Verify disconnect revokes access properly
6. Validate Resend notifications sent to proprietário
7. Confirm Settings UI displays sync status correctly

---

## Prerequisites

### Environment Setup

- [ ] Test environment deployed (staging or local dev)
- [ ] Supabase instance accessible with `email_connections` and `email_parse_log` tables
- [ ] Google OAuth2 credentials configured (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- [ ] Resend API configured (`RESEND_API_KEY`)
- [ ] Test Gmail account(s) set up with sample emails from Airbnb, Booking.com, Flatio
- [ ] Vercel Cron job simulator or local cron runner available (for testing 5-min sync intervals)

### Test Data Requirements

- [ ] 2–3 sample Airbnb confirmation emails (with guest name, dates, price, confirmation code)
- [ ] 2–3 sample Booking.com confirmation emails
- [ ] 2–3 sample Flatio confirmation emails
- [ ] Test Gmail account credentials
- [ ] Admin user account in app for Settings access

---

## Test Scenarios

### Scenario 1: OAuth2 Connection Flow (AC1)

**Objective:** Verify user can securely connect Gmail account via OAuth2.

**Steps:**

1. Log in as admin/manager user
2. Navigate to Settings → Integrações
3. Click "Conectar Gmail" button
4. Verify redirected to Google OAuth2 consent screen
5. Approve `gmail.readonly` scope
6. Verify redirected back to app

**Expected Results:**

- [ ] No errors during redirect flow
- [ ] Token stored encrypted in `email_connections` table
- [ ] `access_token` and `refresh_token` stored (verify in DB — should be encrypted, not plaintext)
- [ ] Settings UI shows "Conectado (user@gmail.com)" status

**Pass Criteria:** All checkboxes verified ✅

---

### Scenario 2: Token Persistence & Decryption (AC9)

**Objective:** Verify stored OAuth tokens are encrypted and decrypt correctly.

**Steps:**

1. After successful connection (from Scenario 1), verify token in DB
2. Query `email_connections` table directly
3. Confirm `access_token` and `refresh_token` are encrypted (not readable plaintext)
4. Trigger a cron sync or manual sync request
5. Monitor logs for successful token decryption and use

**Expected Results:**

- [ ] Tokens in DB are encrypted (hex/binary, not readable)
- [ ] Token decryption succeeds in cron/sync operation
- [ ] `gmail-client.ts` successfully retrieves emails using decrypted token
- [ ] No decryption errors in logs

**Pass Criteria:** All checkboxes verified ✅

---

### Scenario 3: Email Parsing — Airbnb (AC4)

**Objective:** Verify Claude Haiku correctly extracts data from Airbnb confirmation emails.

**Steps:**

1. Send a real Airbnb confirmation email to connected Gmail account
2. Trigger cron sync: `/api/cron/email-parser` or wait 5 minutes
3. Check `email_parse_log` table for entry
4. Verify parsed data in `email_parse_log.parsed_data` (JSON)

**Expected Results (from AC4):**

- [ ] `guest_name` — matches email content
- [ ] `checkin_date` — in YYYY-MM-DD format
- [ ] `checkout_date` — in YYYY-MM-DD format
- [ ] `amount` — numeric value
- [ ] `currency` — matches email (EUR, BRL, etc.)
- [ ] `platform` — set to "airbnb"
- [ ] `confirmation_code` — extracted from email

**Example parsed_data:**
```json
{
  "guest_name": "João Silva",
  "checkin_date": "2026-04-15",
  "checkout_date": "2026-04-20",
  "amount": 450,
  "currency": "EUR",
  "platform": "airbnb",
  "confirmation_code": "ABC123DEF456",
  "property_name": null,
  "num_guests": 2
}
```

**Pass Criteria:** All 7 fields extracted correctly ✅

---

### Scenario 4: Email Parsing — Booking.com

**Objective:** Verify parsing works for Booking.com emails.

**Steps:**

1. Send real Booking.com confirmation email
2. Trigger cron sync
3. Check `email_parse_log` table

**Expected Results:**

- [ ] `platform` — set to "booking"
- [ ] All other fields (guest_name, dates, amount, etc.) extracted correctly
- [ ] `parsed_data` valid JSON

**Pass Criteria:** Booking-specific platform field + data accuracy ✅

---

### Scenario 5: Email Parsing — Flatio

**Objective:** Verify parsing works for Flatio emails.

**Steps:**

1. Send real Flatio confirmation email
2. Trigger cron sync
3. Check `email_parse_log` table

**Expected Results:**

- [ ] `platform` — set to "flatio"
- [ ] All fields extracted
- [ ] `parsed_data` valid JSON

**Pass Criteria:** Flatio-specific platform field + data accuracy ✅

---

### Scenario 6: Deduplication (AC7)

**Objective:** Verify same email is not processed twice (UNIQUE constraint).

**Steps:**

1. Send Airbnb confirmation email to Gmail account
2. Trigger cron sync → email processed, entry created in `email_parse_log`
3. **Do NOT delete email from Gmail**
4. Wait 5 minutes and trigger cron again (or manually call `/api/cron/email-parser`)
5. Check `email_parse_log` table

**Expected Results:**

- [ ] First sync: 1 entry in `email_parse_log` with `status = 'parsed'`
- [ ] Second sync: **Still only 1 entry** (no duplicate)
- [ ] Log may show `status = 'skipped'` for second attempt (deduplication via `UNIQUE(message_id, organization_id)`)

**Pass Criteria:** Deduplication prevents duplicate entries ✅

---

### Scenario 7: Reservation Creation (AC5)

**Objective:** Verify reservation is created in `reservations` table after parsing.

**Steps:**

1. After email parsing (Scenario 3), check `reservations` table
2. Filter by organization and check recent reservations
3. Verify fields match parsed data

**Expected Results:**

- [ ] New reservation row created
- [ ] `status` = 'confirmed' (auto-confirmation)
- [ ] `check_in`, `check_out` match parsed dates
- [ ] `total_amount`, `currency` match parsed values
- [ ] `source` = 'airbnb' (or relevant platform)
- [ ] `organization_id` = correct org (isolation verified)

**Pass Criteria:** Reservation created with correct data ✅

---

### Scenario 8: Email Notification (AC6)

**Objective:** Verify Resend email sent to proprietário after parsing.

**Steps:**

1. After email parsing (Scenario 3), check Resend logs or email inbox
2. Verify email received by proprietário

**Expected Results:**

- [ ] Email sent to proprietário email address
- [ ] Subject mentions new reservation from parsed platform
- [ ] Email includes:
  - Guest name
  - Check-in/check-out dates
  - Amount & currency
  - Link to "Confirmar" or "Rejeitar" (if AC6 includes manual confirmation step)

**Pass Criteria:** Email received with correct content ✅

---

### Scenario 9: Token Refresh on Expiry

**Objective:** Verify automatic token refresh before expiry.

**Steps:**

1. Connect Gmail (Scenario 1)
2. Manually set `token_expiry` in `email_connections` to 5 minutes from now
3. Wait 5+ minutes
4. Trigger cron sync
5. Check `email_connections` for updated `token_expiry`

**Expected Results:**

- [ ] Cron detects token expiry approaching
- [ ] `refresh_token` used to obtain new `access_token`
- [ ] New `token_expiry` updated in DB (future timestamp)
- [ ] Sync completes successfully without re-authentication

**Pass Criteria:** Token auto-refresh succeeds ✅

---

### Scenario 10: Disconnect/Revoke (AC8)

**Objective:** Verify disconnecting Gmail revokes access properly.

**Steps:**

1. From Settings → Integrações, verify connected status
2. Click "Desconectar" button
3. Verify Google OAuth token revoked (check Google account security settings, if accessible)
4. Check `email_connections` table

**Expected Results:**

- [ ] No error message during disconnect
- [ ] Settings UI shows "○ Não conectado" status
- [ ] `email_connections` row deleted from DB
- [ ] Cron sync on next trigger: cannot authenticate (token revoked)
- [ ] Error logged gracefully (no crash)

**Pass Criteria:** Disconnect revokes access & cleans up ✅

---

### Scenario 11: Settings UI Timestamp (AC2)

**Objective:** Verify last sync timestamp displays correctly.

**Steps:**

1. Connect Gmail (Scenario 1)
2. Trigger cron sync
3. Go to Settings → Integrações
4. Observe "Última sincronização" timestamp

**Expected Results:**

- [ ] Timestamp shown in Portuguese relative format: "há 5 minutos", "há 2 horas", "há 1 dia"
- [ ] Updates correctly on next sync
- [ ] No errors in console

**Pass Criteria:** Timestamp displays correctly and updates ✅

---

### Scenario 12: Error Handling — Malformed Email (AC10)

**Objective:** Verify graceful handling of emails Claude cannot parse.

**Steps:**

1. Send email with incomplete/ambiguous reservation data (e.g., no guest name, no dates)
2. Trigger cron sync
3. Check `email_parse_log` entry

**Expected Results:**

- [ ] `status` = 'error' or `status` = 'parsed' with null fields
- [ ] `error_message` populated with description
- [ ] Proprietário notified of parse failure (if applicable)
- [ ] No crash in cron job

**Pass Criteria:** Error logged & handled gracefully ✅

---

### Scenario 13: Multi-Property Isolation

**Objective:** Verify email parsing respects organization boundaries (multi-tenancy).

**Steps:**

1. Set up 2 test organizations (Org A, Org B)
2. Connect Gmail for Org A only
3. Trigger cron sync
4. Check `email_connections` and `email_parse_log` for both orgs

**Expected Results:**

- [ ] Org A: `email_connections` row exists
- [ ] Org B: `email_connections` row does NOT exist
- [ ] Only Org A's reservations created from emails
- [ ] No cross-org data leakage

**Pass Criteria:** RLS policies & org isolation verified ✅

---

## Test Execution Checklist

- [ ] Scenario 1: OAuth2 Connection
- [ ] Scenario 2: Token Persistence
- [ ] Scenario 3: Email Parsing — Airbnb
- [ ] Scenario 4: Email Parsing — Booking.com
- [ ] Scenario 5: Email Parsing — Flatio
- [ ] Scenario 6: Deduplication
- [ ] Scenario 7: Reservation Creation
- [ ] Scenario 8: Email Notification
- [ ] Scenario 9: Token Refresh
- [ ] Scenario 10: Disconnect/Revoke
- [ ] Scenario 11: Settings UI Timestamp
- [ ] Scenario 12: Error Handling
- [ ] Scenario 13: Multi-Org Isolation

---

## Defect Reporting Template

If issues found, report with:

```
**Scenario:** [1–13]
**Step:** [step number]
**Expected:** [what should happen]
**Actual:** [what happened]
**Evidence:** [screenshot/log/DB query]
**Severity:** Critical | High | Medium | Low
**Reproducible:** Yes | No | Sometimes
```

---

## Sign-Off

| Role | Name | Date | Result |
|------|------|------|--------|
| QA Lead | — | — | ⏳ Pending |
| Dev Lead | — | — | ⏳ Pending |

---

**Notes:**
- This test plan assumes real email data from Airbnb, Booking.com, and Flatio
- For mock testing without real emails, consider creating fixture emails or using email-sending tools
- Cron sync can be triggered via direct API call or waited for (5-min interval)
- Google OAuth tokens may have rate limits — allow 1–2 minute delays between test runs if needed
