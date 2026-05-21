# Deployment Readiness: Cleaner Operations Portal (Epic 29)

**Status:** MVP Ready (Stories 29.1 + 29.2 Complete)  
**Last Updated:** 2026-05-21  
**Target Deployment:** MVP → Production (Phase 1 → Phase 2)

---

## Phase 1: MVP Deployment ✅ APPROVED

### Completed Stories
- ✅ **29.1** — Database Foundation (Schema)
- ✅ **29.2** — Cleaner Authentication (Token-based access)

### MVP Scope
- Token generation for cleaners (no password)
- Token verification and rate limiting
- Organization isolation via RLS
- Audit logging (IP, user agent)

### Release Readiness
- ✅ All acceptance criteria met
- ✅ Security assessment: PASS
- ✅ No CRITICAL/HIGH blocking issues
- ✅ Ready to deploy to staging → MVP production

**Action:** Deploy MVP with current implementation

---

## Phase 2: Production Hardening (Pre-Release)

**Timeline:** Before moving to full production (after MVP validation)  
**Owner:** @dev (Dex)  
**Estimated Effort:** 9-12 hours total

### CRITICAL: Must Complete Before Production

#### Tech Debt #2: Rate Limit Circuit Breaker ⚠️ **BLOCKING**

**Priority:** 🔴 **CRITICAL FOR PRODUCTION**  
**Dependency:** Upstash Redis availability  
**Risk:** Brute force vulnerability if Redis unavailable  
**Timeline:** Before full production deployment  

**Current State:**
```typescript
try {
  const { success } = await ratelimit.limit(`verify-token:${clientIp}`);
  // ...
} catch (ratelimitError) {
  console.warn('Rate limit check failed:', ratelimitError);
  // CONTINUES WITHOUT RATE LIMITING ⚠️
}
```

**Required Implementation:**
1. Add circuit breaker for Redis failures
2. Implement in-memory fallback rate limiting
3. Add incident alerting (Sentry)
4. Monitor Redis health continuously
5. Test failover scenario

**Status:** 📋 Backlog → Must complete before production  
**Effort:** 3-4 hours

---

### RECOMMENDED: Schedule for Production Release

#### Tech Debt #1: Token Hash Index Optimization

**Priority:** 🟡 **MEDIUM (Scale Optimization)**  
**Timeline:** Can be post-MVP, before high-volume production  
**Risk Level:** Low (current implementation safe, just inefficient)

**Current:** O(n) lookup + linear search  
**Target:** O(1) indexed lookup

**Implementation:**
```sql
CREATE UNIQUE INDEX idx_cleaner_tokens_hash 
ON cleaner_access_tokens(token_hash);
```

**Status:** 📋 Backlog  
**Effort:** 2-3 hours  
**Trigger:** When token verification latency becomes issue (monitor metrics)

---

#### Tech Debt #3: Suspicious Pattern Detection

**Priority:** 🟢 **LOW (Security Enhancements)**  
**Timeline:** Sprint 2-3 after production  
**Risk Level:** None (audit data already collected)

**Features:**
- Detect multiple IPs per token
- Rapid geographic distance changes
- Suspicious country detection (GeoIP)
- Sentry alerts for security team

**Status:** 📋 Backlog  
**Effort:** 4-5 hours  
**Trigger:** Post-production security hardening phase

---

## Deployment Checklist

### MVP Release (Now)
- [ ] Deploy Story 29.1 schema to production DB
- [ ] Deploy Story 29.2 auth endpoints to production
- [ ] Test token generation in production
- [ ] Test token verification in production
- [ ] Monitor for errors (Sentry)
- [ ] Validate RLS policies in production

### Production Release (Phase 2)
- [ ] **MUST COMPLETE:** Implement rate limit circuit breaker (#2)
- [ ] Monitor Upstash Redis availability
- [ ] Set up alerts for Redis failures
- [ ] Test failover scenario in staging
- [ ] Load test token verification (5K+ req/min)
- [ ] Document fallback behavior for ops team

### Post-Production (Optimization)
- [ ] Add token hash index when queries slow down
- [ ] Implement pattern detection for fraud
- [ ] Review and optimize query performance
- [ ] Gather metrics on rate limit effectiveness

---

## Risk Assessment

| Risk | Severity | Mitigation | Timeline |
|------|----------|-----------|----------|
| Rate limiting unavailable | 🔴 HIGH | Circuit breaker + fallback | **BEFORE PROD** |
| Token lookup performance | 🟡 MEDIUM | Add index when needed | Post-MVP |
| Fraud detection gaps | 🟢 LOW | Pattern detection feature | Post-production |
| Redis dependency failure | 🔴 HIGH | In-memory fallback | **BEFORE PROD** |

---

## Sign-Off

| Role | Status | Notes |
|------|--------|-------|
| **@dev (Dex)** | 📋 Pending | Implement rate limit circuit breaker before production |
| **@qa (Quinn)** | ✅ Approved | MVP ready, tech debt tracked |
| **@devops (Gage)** | ⏳ Ready | Can deploy MVP now, hold on production until #2 complete |
| **@pm (Morgan)** | ⏳ Pending | Confirm production timeline |

---

## Next Actions

1. **Deploy MVP** (Next 24 hours)
   - Current implementation is production-safe for MVP scope
   - Rate limiting works with Upstash Redis

2. **Before Production Release** (After MVP validation)
   - Implement circuit breaker for rate limiting
   - Load test and stress test token verification
   - Validate Redis failover scenario

3. **Remaining Stories** (Parallel with 29.3+)
   - Continue development of 29.3-29.8
   - Tech debt items tracked for backlog grooming

---

**Document Owner:** QA (@qa)  
**Last Review:** 2026-05-21  
**Next Review:** When moving from MVP to production release
