# Decision Log — Story 29.2 Implementation

**Story ID:** 29.2  
**Story Title:** Cleaner Access: Autenticação via WhatsApp Link  
**Execution Mode:** YOLO (Autonomous)  
**Date:** 2026-05-22  
**Agent:** @dev (Dex)  
**Status:** COMPLETED

---

## Decisions Made

### 1. WhatsApp Integration Strategy
**Decision:** Implement mock WhatsApp service in send-access-link endpoint  
**Reason:** Story 30.1 (WhatsApp Cloud API) is a blocker but can be mocked to unblock parallel development  
**Alternatives Considered:**
- Wait for Story 30.1 (slower)
- Implement stubbed endpoint (chose this with mock logging)
- Use third-party API like Twilio (overkill for mock phase)

**Status:** ✅ Approved — enables Story 29.3/29.4/29.5 unblocking

---

### 2. Token Generation & Security
**Decision:** 32-byte hex tokens (256-bit entropy) with 24h TTL  
**Reason:** AC2 specifies "gera token (TTL: 24h)"; 256 bits provides cryptographic strength against brute-force (5 attempts/min rate limit)  
**Alternatives Considered:**
- 16-byte (128-bit) — less entropy
- Random UUID v4 — only 122 bits effective

**Status:** ✅ Exceeds requirements

---

### 3. Session Management
**Decision:** JWT with 8-hour expiry, httpOnly cookie, SameSite=strict  
**Reason:** AC6 specifies "Sessão do cleaner dura 8h"; httpOnly/SameSite prevent CSRF and XSS token theft  
**Payload:** `{ sub, org, role: 'guest', guest_type: 'cleaner', name }`

**Status:** ✅ Security-first approach

---

### 4. Middleware Architecture
**Decision:** Separate cleaner-auth.ts middleware, allows /cleaner/auth to work without active session  
**Reason:** AC4 requires auth page to validate token; other routes protected by same middleware  
**Alternatives Considered:**
- Inline middleware in route handlers (less reusable)
- API-only validation (requires additional integration)

**Status:** ✅ Reusable, testable

---

### 5. Error Handling Pages
**Decision:** Dedicated /cleaner/auth/error page with specific error reasons  
**Reason:** AC5 specifies "Token inválido/expirado mostra página de erro"; DX improvement with contact support link  
**Error Codes Implemented:** no_session, invalid_session, session_expired, token_expired, invalid_token, token_revoked

**Status:** ✅ Comprehensive

---

### 6. Admin UI Component
**Decision:** Separate CleanerForm component with email + phone validation  
**Reason:** AC1 requires UI in admin panel; reusable component pattern  
**Validation:** Zod schema for runtime validation (matches TaskForm pattern)

**Status:** ✅ Consistent with codebase

---

### 7. Testing Strategy
**Decision:** 13 unit tests covering all AC and edge cases  
**Tests:** Token generation, validation, expiry, revocation, JWT session, RLS isolation  
**Reason:** AC9 requires "6+ testes"; 13 exceeds requirement with comprehensive coverage

**Status:** ✅ All 13 passing

---

## Files Modified/Created

| File | Type | Decision |
|------|------|----------|
| src/app/api/cleaners/send-access-link/route.ts | NEW | Mock WhatsApp, 32-byte token, 24h TTL |
| src/app/api/cleaners/auth/route.ts | NEW | JWT session creation, 8h expiry |
| src/app/api/admin/cleaners/route.ts | NEW | Create cleaner profile endpoint |
| src/middleware/cleaner-auth.ts | NEW | Reusable middleware for /cleaner/* protection |
| src/app/cleaner/auth/page.tsx | NEW | Token validation page with loading state |
| src/app/cleaner/auth/error/page.tsx | NEW | 6 error scenarios with contact link |
| src/components/admin/CleanerForm.tsx | NEW | Zod-validated form for cleaner creation |
| src/__tests__/api/cleaners.test.ts | NEW | 13 comprehensive unit tests |
| docs/stories/29.2.story.md | MODIFIED | Updated AC checkboxes, dev record, changelog |

---

## Quality Metrics

- **Build:** ✅ PASSED (TypeScript strict, Next.js optimization)
- **Linting:** ✅ PASSED (ESLint, no violations)
- **Tests:** ✅ 13/13 PASSED
- **Type Safety:** ✅ Full TypeScript coverage
- **Code Review Readiness:** ✅ Ready for @qa gate

---

## Rollback Information

If needed, rollback to pre-implementation state:
```bash
git reset --soft 29d7ece^
```

Commit hash: `29d7ece`  
Files affected: 9 (1 modified, 8 new)

---

## Integration Notes for Story 30.1

When Story 30.1 (WhatsApp Cloud API) is ready:

1. Replace mock function in `src/app/api/cleaners/send-access-link/route.ts:17-25`
2. Implement real `sendWhatsAppMessage()` with WhatsAppService
3. Update environment variables (WHATSAPP_API_KEY, WHATSAPP_BUSINESS_ACCOUNT_ID)
4. Run full integration tests

No code changes required in auth flow; all other components remain compatible.

---

## Next Steps

1. **QA Gate:** @qa reviews for AC compliance and quality
2. **Code Review:** CodeRabbit pre-commit review
3. **Production:** @devops pushes to main after QA approval
4. **Unblock:** Story 29.3, 29.4, 29.5 can now start (auth foundation ready)

---

**Execution Summary:**  
YOLO mode enabled autonomous decision-making on 7 key decisions, all aligned with AC and security requirements. No blockers or ambiguities encountered. Implementation ready for QA gate.

**Decision Confidence:** HIGH (technical decisions well-grounded in AC and security principles)
