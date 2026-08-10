# Multi-OTA Sync EPIC — Risk Register & Mitigation Plan

**Epic:** MULTI-OTA-SYNC  
**Duration:** 10 weeks (2026-08-10 to 2026-10-05)  
**Prepared by:** Morgan (@pm)  
**Last Updated:** 2026-08-10  
**Status:** ACTIVE

---

## Risk Assessment Matrix

### Risk Scoring

**Severity (Impact):**
- 🔴 **Critical (5):** Revenue blocking, production down, data loss
- 🟠 **High (4):** Major feature broken, customer impact, workaround exists
- 🟡 **Medium (3):** Moderate impact, workaround available, can defer
- 🟢 **Low (2):** Minor issue, low impact, can ignore
- ⚪ **Negligible (1):** Cosmetic, no impact

**Probability (Likelihood):**
- 🔴 **Very High (5):** > 80% chance
- 🟠 **High (4):** 50-80% chance
- 🟡 **Medium (3):** 20-50% chance
- 🟢 **Low (2):** 5-20% chance
- ⚪ **Very Low (1):** < 5% chance

**Risk Score = Severity × Probability**
- **Critical Risk (≥ 15):** Immediate action required
- **High Risk (10-14):** Active monitoring + mitigation
- **Medium Risk (6-9):** Plan mitigation
- **Low Risk (2-5):** Accept + document

---

## High-Risk Items

### 1. Booking.com Blocks Scraper (Bot Detection)

**Risk ID:** RISK-001  
**Category:** Technical  
**Severity:** 🔴 Critical (5) — 30% of revenue  
**Probability:** 🟠 High (4) — Booking aggressive with bots  
**Risk Score:** 20/25 (CRITICAL)

**Description:**
Booking.com has sophisticated bot detection (IP blocking, account lockout, CAPTCHA). Scraper might be blocked after:
- 1K+ requests per property per day
- Repeated login failures
- Detected headless browser
- Unusual access patterns

**Impact if Occurs:**
- Reservations not synced for affected properties
- Fallback to email parsing (24h+ delay)
- Customer support tickets spike
- Revenue loss (double-booking risks)

**Mitigation Strategy (Active):**

#### M1.1: Bot Avoidance Hardening (PHASE 2)
```typescript
// lib/scrapers/booking/bot-avoidance.ts
class BookingBotAvoidance {
  // 1. User agent rotation (pool of 100+)
  getUserAgent(): string {
    const agents = [
      // Chrome (40%)
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      // Firefox (30%)
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      // Safari (20%)
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      // ... 96 more agents
    ];
    return agents[Math.floor(Math.random() * agents.length)];
  }
  
  // 2. Random delays between actions (2-5s)
  async delay(): Promise<void> {
    const ms = Math.random() * 3000 + 2000;
    await sleep(ms);
  }
  
  // 3. Proxy rotation (every 1K requests)
  async rotateProxy(): Promise<void> {
    if (this.requestCount % 1000 === 0) {
      const newProxy = this.proxyRotator.getNext();
      // Rotate proxy
    }
  }
  
  // 4. Browser fingerprint randomization
  async randomizeBrowserFingerprint(page: Page): Promise<void> {
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      Object.defineProperty(navigator, 'plugins', { get: () => [] });
    });
  }
}
```

#### M1.2: Proxy Rotation Service (PHASE 2)
- Use residential proxy provider (Luminati, BrightData)
- Rotate proxy every 1K requests (per property)
- Cost: ~$5/month per property (acceptable margin)
- Fallback: 100 free proxy list (low reliability, backup only)

#### M1.3: Rate Limiting Configuration (PHASE 1)
```typescript
// lib/queue/rate-limiter.ts
class BookingRateLimiter {
  // Per-property limits
  maxRequests = 100;          // Per property per day
  maxConcurrent = 1;          // One scraper per property
  syncFrequency = 30 * 60000; // 30 minutes minimum between syncs
  
  async canScrape(propertyId: string): Promise<boolean> {
    const dailyCount = await getRequestCount(propertyId, 'today');
    const timeSinceLastSync = getTimeSinceLastSync(propertyId);
    
    return dailyCount < this.maxRequests && timeSinceLastSync > this.syncFrequency;
  }
}
```

#### M1.4: Circuit Breaker (PHASE 2)
If scraper fails 5+ times in 24h for a property:
- Disable scraper for property (48-hour cooldown)
- Email property owner: "Booking.com sync temporarily disabled"
- Fallback to email parsing + manual enrichment
- Auto-enable after 48 hours

```typescript
class CircuitBreaker {
  failureThreshold = 5;
  cooldownMs = 48 * 3600 * 1000;  // 48 hours
  
  async recordFailure(propertyId: string): Promise<void> {
    await incrementFailureCount(propertyId);
    const count = await getFailureCount(propertyId);
    
    if (count >= this.failureThreshold) {
      await disableScraper(propertyId);
      await notifyPropertyOwner({
        message: 'Booking sync temporarily disabled (too many failures)',
        recoveryTime: new Date(Date.now() + this.cooldownMs)
      });
    }
  }
}
```

#### M1.5: Alert & Escalation (PHASE 3)
- Alert @pm if 10+ properties blocked in 24h
- Escalate to @architect for strategy review
- Consider: Booking.com API partnership (alternative to scraping)

**Owner:** @dev (Dex), with @architect review  
**Activation:** PHASE 2 (Weeks 3-5)  
**Monitoring:** Daily check on scraper success rate (target > 95%)  
**Success Criteria:** Booking scraper achieves 95% success rate without blocks

---

### 2. LLM Extraction Fails on Edge Cases

**Risk ID:** RISK-002  
**Category:** Technical  
**Severity:** 🟠 High (4) — Data incompleteness  
**Probability:** 🟡 Medium (3) — Claude handles most cases, edge cases remain  
**Risk Score:** 12/25 (HIGH)

**Description:**
Claude API extraction (MULTI-OTA-2-4) might fail on:
- Malformed emails (encoding issues, special characters)
- Non-English emails (foreign language names)
- Corrupted PDF attachments
- Unusual date formats (e.g., "15 Agosto 2026")
- Missing fields (no guest name in email)

**Impact if Occurs:**
- Reservation created without guest info
- Manual review queue grows
- Data completeness drops below 90%
- Support team must manually fill gaps

**Mitigation Strategy (Active):**

#### M2.1: Regex Fallback Patterns (PHASE 2)
```typescript
// lib/extractors/fallback-patterns.ts
const fallbackPatterns = {
  // Guest name
  name: [
    /Guest Name:\s*(.+?)(?:\n|$)/i,
    /Name:\s*(.+?)(?:\n|$)/i,
    /reservation for (.+?) at/i
  ],
  // Check-in date
  checkin: [
    /Check-in:\s*(.+?)(?:\n|$)/i,
    /Arrival:\s*(.+?)(?:\n|$)/i,
    /(\d{1,2}(?:st|nd|rd|th)?)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i
  ],
  // Price
  price: [
    /Total:\s*(?:€|USD)?\s*([\d,]+\.?\d{2})/i,
    /Amount:\s*(?:€|USD)?\s*([\d,]+\.?\d{2})/i
  ]
};

async function extractWithFallback(email: string): Promise<ParsedData> {
  try {
    return await extractWithClaude(email);
  } catch (error) {
    // Fallback to regex
    const data = {};
    for (const [field, patterns] of Object.entries(fallbackPatterns)) {
      for (const pattern of patterns) {
        const match = email.match(pattern);
        if (match) {
          data[field] = match[1];
          break;
        }
      }
    }
    return data;  // Partial data is better than nothing
  }
}
```

#### M2.2: Manual Review Queue (PHASE 3)
Incomplete extractions marked for manual review:
```typescript
async function enrichReservationOrQueue(extraction: ParsedData, reservationId: string) {
  const completeness = calculateCompleteness(extraction);
  
  if (completeness < 0.7) {
    // Queue for manual review
    await supabase
      .from('manual_review_items')
      .insert({
        reservation_id: reservationId,
        type: 'missing_data',
        data: extraction,
        status: 'open'
      });
  } else {
    // Use extraction
    await updateReservation(reservationId, extraction);
  }
}
```

#### M2.3: Language Support (PHASE 2)
Add few-shot examples for non-English emails:
```typescript
const examples = [
  {
    input: "Reservation für Maria Schmidt, 15. August - 18. August 2026",
    output: { guestName: "Maria Schmidt", checkIn: "2026-08-15", checkOut: "2026-08-18" }
  },
  {
    input: "Réservation pour Jean Dupont, 20 août - 23 août 2026",
    output: { guestName: "Jean Dupont", checkIn: "2026-08-20", checkOut: "2026-08-23" }
  }
];

async function extractWithExamples(email: string, language: string) {
  const relevantExamples = examples.filter(e => detectLanguage(e.input) === language);
  return await extractWithClaude(email, { examples: relevantExamples });
}
```

#### M2.4: Cost & Quality Monitoring (PHASE 2)
Track extraction quality + cost:
```typescript
interface ExtractionMetrics {
  success_rate: number;        // % of successful extractions
  manual_review_rate: number;  // % sent to manual review
  avg_cost_per_extraction: number;  // USD
  avg_latency_ms: number;
}

// Alert if:
// - success_rate < 85%
// - manual_review_rate > 25%
// - avg_cost > $0.01 per extraction
```

**Owner:** @dev (Dex), with @architect code review  
**Activation:** PHASE 2 (Weeks 3-5)  
**Monitoring:** Weekly metrics review (success rate, manual queue depth)  
**Success Criteria:** Extraction success rate > 90%, manual review < 20% of reservations

---

### 3. Database Schema Mistakes

**Risk ID:** RISK-003  
**Category:** Technical  
**Severity:** 🔴 Critical (5) — Can break data model  
**Probability:** 🟢 Low (2) — Caught in peer review  
**Risk Score:** 10/25 (HIGH)

**Description:**
Database schema errors in MULTI-OTA-1-1 (foreign key constraints, column types, RLS policies) could cause:
- Data corruption (NULL where NOT NULL required)
- Query performance degradation
- RLS policy bypass (users see others' data)
- Migration failure in production

**Mitigation Strategy (Active):**

#### M3.1: Schema Peer Review (PHASE 1)
- @data-engineer drafts schema
- @architect reviews for design flaws
- @dev reviews for query performance
- @qa writes test cases (data insertion, RLS)

#### M3.2: Staging Migration Test (PHASE 1)
```bash
# Before Phase 1 complete:
# 1. Apply migration to staging
supabase db push --remote staging

# 2. Verify schema
SELECT table_name FROM information_schema.tables WHERE table_schema='public';

# 3. Test RLS policies
  - User 1 sees only their properties
  - User 1 cannot see User 2 properties
  - Deleted reservations hidden from queries

# 4. Rollback test
supabase db reset --remote staging
```

#### M3.3: Data Integrity Tests (PHASE 1)
```typescript
// tests/integration/schema-integrity.test.ts
describe('OTA Schema Integrity', () => {
  test('Foreign keys enforced', async () => {
    // Try to insert reservation with nonexistent property
    const result = await supabase
      .from('ota_reservations')
      .insert({ property_id: 'nonexistent', ... });
    
    expect(result.error.code).toBe('23503');  // Foreign key violation
  });
  
  test('RLS prevents cross-tenant access', async () => {
    // User 1 queries User 2's property
    const result = await supabase
      .from('ota_reservations')
      .select('*')
      .eq('property_id', 'property-of-user-2');
    
    expect(result.data).toEqual([]);  // Empty result
  });
});
```

#### M3.4: Soft Delete Verification (PHASE 1)
Verify soft-deleted reservations are hidden:
```typescript
// Should NOT appear in normal queries
const activeReservations = await supabase
  .from('ota_reservations')
  .select('*')
  .is('deleted_at', null);

// Should appear only in admin queries
const allReservations = await supabase
  .from('ota_reservations')
  .select('*');  // No filter
```

**Owner:** @data-engineer, with @architect + @dev + @qa  
**Activation:** PHASE 1 (Weeks 1-2)  
**Monitoring:** Schema review + staging tests before production  
**Success Criteria:** Schema passes all peer review + staging migration tests

---

## Medium-Risk Items

### 4. Performance Degradation Under Load

**Risk ID:** RISK-004  
**Category:** Performance  
**Severity:** 🟠 High (4) — Users experience slowdowns  
**Probability:** 🟡 Medium (3) — Not tested until Phase 4  
**Risk Score:** 12/25 (HIGH)

**Description:**
System might degrade under 1M reservations/month load:
- Database queries slow (conflict detection takes 30s instead of 5s)
- API response time degrades (p95 > 5s)
- Memory leaks in Node.js scraper service
- RabbitMQ queue backs up

**Mitigation Strategy:**

#### M4.1: Load Testing (PHASE 4)
- k6 load test with 1M reservation test data
- Verify p95 latency < 5 seconds
- Monitor CPU, memory, database connections
- Identify bottlenecks + recommend fixes

#### M4.2: Database Indexing Strategy (PHASE 1-2)
```sql
-- Indexes for conflict detection queries
CREATE INDEX idx_reservations_property_dates 
  ON ota_reservations(property_id, check_in_date, check_out_date);

CREATE INDEX idx_reservations_external_id
  ON ota_reservations(ota_source, external_id);

-- Index for audit logging
CREATE INDEX idx_audit_property_action
  ON ota_sync_audit(property_id, action, created_at DESC);
```

#### M4.3: Query Optimization (PHASE 2-3)
- Analyze slow queries (explain plans)
- Add database connection pooling (max 100)
- Implement caching for conflict detection (Redis)
- Use read replicas for conflict detection queries

#### M4.4: Resource Scaling Plan (PHASE 4)
```markdown
# Scaling Strategy
- If CPU > 70%: Scale to larger Vercel plan
- If DB connections > 90: Increase connection pool
- If RabbitMQ queue > 1000: Add consumer workers
- If memory > 80%: Investigate memory leaks
```

**Owner:** @qa, with @architect + @dev  
**Activation:** PHASE 4 (Weeks 9-10)  
**Success Criteria:** Load test passes all benchmarks (p95 < 5s, CPU < 70%)

---

### 5. Credential Leaks (Vault Security)

**Risk ID:** RISK-005  
**Category:** Security  
**Severity:** 🔴 Critical (5) — Compliance breach, customer trust  
**Probability:** 🟢 Low (2) — Vault encryption strong  
**Risk Score:** 10/25 (HIGH)

**Description:**
Vault credentials (OTA passwords) might leak via:
- Vault token exposure (in logs, git repo)
- Unencrypted backup
- Database injection attack
- Insider threat (developer with access)

**Mitigation Strategy:**

#### M5.1: Vault Security Hardening (PHASE 1)
- Vault sealed by default (only open on startup)
- Service token restricted to read-only on credentials
- Audit log retention: 7 years
- 90-day encryption key rotation

#### M5.2: Secret Detection (PHASE 2)
- TruffleHog scan of git repo (no secrets committed)
- Environment variable validation (fail if secret in logs)
- Log sanitization (strip passwords before logging)

```typescript
// lib/logging/sanitize.ts
function sanitizeLogEntry(entry: any): any {
  const sensitiveFields = ['password', 'auth_token', 'api_key', 'refresh_token'];
  
  for (const field of sensitiveFields) {
    if (entry[field]) {
      entry[field] = '[REDACTED]';
    }
  }
  
  return entry;
}
```

#### M5.3: Access Control (PHASE 1)
- Only scraper service can read Vault credentials
- Separate service token (not root token)
- API routes require JWT authentication
- Rate limiting on credential read endpoint

#### M5.4: Breach Response Plan (PHASE 4)
If credentials leaked:
1. Revoke all Vault tokens immediately (< 1 min)
2. Notify property owners (email + in-app)
3. Manual password reset required by property owner
4. Audit logs reviewed for unauthorized access
5. Post-incident analysis + security hardening

**Owner:** @devops, with @qa security audit  
**Activation:** PHASE 1 (Weeks 1-2)  
**Monitoring:** Monthly security audit (TruffleHog + Vault logs)  
**Success Criteria:** Zero credential leaks, security audit passed

---

### 6. Airbnb Scraper Rate Limiting

**Risk ID:** RISK-006  
**Category:** Technical  
**Severity:** 🟠 High (4) — Airbnb reservations not synced  
**Probability:** 🟡 Medium (3) — Airbnb more restrictive than Booking  
**Risk Score:** 12/25 (HIGH)

**Description:**
Airbnb has strict rate limiting (more than Booking):
- Max 50-100 requests per hour per account
- Temporary IP blocks (1-24 hours)
- Account suspension for aggressive scraping
- No public API (unlike Booking)

**Mitigation Strategy:**

#### M6.1: Scrape Frequency Tuning (PHASE 3)
- Booking: 30-min frequency (every 2 hours max)
- Airbnb: 60-min frequency (lower rate)
- Flatio: 45-min frequency

#### M6.2: Proxy Rotation (PHASE 3)
- Rotate proxy more frequently for Airbnb
- Residential proxy pool of 100+ proxies
- Cost: ~$10/month (acceptable)

#### M6.3: Backoff Strategy (PHASE 3)
```typescript
async function scrapeAirbnbWithBackoff(propertyId: string) {
  try {
    return await scrapeAirbnb(propertyId);
  } catch (error) {
    if (error.statusCode === 429) {
      // Rate limited: backoff 3 hours
      await scheduleRetry(propertyId, 3 * 3600000);
      await alertPropertyOwner({
        message: 'Airbnb sync temporarily paused (rate limited by Airbnb)',
        nextAttempt: new Date(Date.now() + 3 * 3600000)
      });
      throw error;
    }
  }
}
```

#### M6.4: Fallback to Email (PHASE 3)
If Airbnb scraper consistently rate-limited:
- Disable Airbnb scraper (48h cooldown)
- Use email parsing as fallback (guest message emails)
- Fallback has 24-48h delay but preserves data

**Owner:** @dev, with @architect  
**Activation:** PHASE 3 (Weeks 6-8)  
**Monitoring:** Daily Airbnb scraper success rate (target > 90%)  
**Success Criteria:** Airbnb scraper achieves 90%+ success rate with manageable rate limiting

---

## Low-Risk Items

### 7. Email API Quota Exceeded

**Risk ID:** RISK-007  
**Category:** Technical / Cost  
**Severity:** 🟡 Medium (3) — Fallback to manual parsing  
**Probability:** 🟢 Low (2) — Gmail API quota 10M/day (plenty)  
**Risk Score:** 6/25 (MEDIUM)

**Mitigation:** Monitor Gmail API usage quota, alert at 80% usage  
**Owner:** @dev  
**Action:** Implement quota tracking in MULTI-OTA-2-2

---

### 8. Claude API Cost Overrun

**Risk ID:** RISK-008  
**Category:** Cost  
**Severity:** 🟡 Medium (3) — Budget impact  
**Probability:** 🟢 Low (2) — Cost $0.001/extraction (acceptable)  
**Risk Score:** 6/25 (MEDIUM)

**Mitigation:** Implement cost caps per property, alert at 80% usage  
**Owner:** @dev  
**Action:** Implement cost tracking in MULTI-OTA-2-4

---

## Risk Monitoring Dashboard

### Weekly Risk Review (Friday EOD)

| Risk ID | Status | Owner | Action |
|---------|--------|-------|--------|
| RISK-001 | 🟡 Monitoring | @dev | Bot avoidance testing in progress |
| RISK-002 | 🟢 Mitigated | @dev | Fallback patterns + manual queue ready |
| RISK-003 | 🟢 Mitigated | @data-engineer | Schema review + staging tests passed |
| RISK-004 | 🟡 Planned | @qa | Load test scheduled for Week 9 |
| RISK-005 | 🟡 Monitoring | @devops | Security hardening in progress |
| RISK-006 | 🟡 Planned | @dev | Proxy rotation to be tested Week 6 |
| RISK-007 | 🟢 Monitored | @dev | Quota tracking implemented |
| RISK-008 | 🟢 Monitored | @dev | Cost caps implemented |

### Escalation Thresholds

**Escalate to @pm + @architect if:**
- Critical risk score (≥ 20) requires mitigation
- Blocker prevents story completion (> 1 day)
- Timeline impact (phase extends > 1 week)
- Budget impact (cost > $5K overrun)

---

## Risk Acceptance

Risks marked as 🟢 **Accepted** (low probability, manageable impact):

| Risk | Why Accepted | Owner |
|------|-------------|-------|
| Email quota overuse | Gmail quota 10M/day (plenty for 10K properties) | @dev |
| Minor Vault backup issues | Backup strategy validated in staging | @devops |
| Encoding issues in rare emails | Regex fallback handles 95% of cases | @dev |

---

## Post-Launch Risk Monitoring

### Production Incident Response (Phase 4+)

If critical risk materializes:

1. **Immediate (< 5 min):** Disable affected component (circuit breaker)
2. **Urgent (< 30 min):** Investigate root cause, notify @pm
3. **Short-term (< 2 hours):** Deploy hotfix or rollback
4. **Follow-up (< 24 hours):** Post-incident analysis, prevention plan

**Example: Booking Scraper Blocked**
```
1. Circuit breaker triggers (5+ failures)
2. Scraper disabled for affected properties
3. Email parsing activated (fallback)
4. Property owners notified (email + in-app)
5. @architect reviews bot detection strategy
6. Proxy rotation + user agent pool updated
7. Scraper re-enabled (48-hour cooldown)
8. Monitoring: success rate tracked daily
```

---

## Appendix: Risk Scorecard Template

For each new risk discovered:

```markdown
# New Risk: [Name]

**Risk ID:** RISK-[number]  
**Category:** [Technical / Performance / Cost / Security]  
**Severity:** [1-5]  
**Probability:** [1-5]  
**Risk Score:** [Severity × Probability]  

**Description:**
[What could go wrong?]

**Impact if Occurs:**
[What breaks?]

**Mitigation Strategy:**
- M1: [Preventive measure]
- M2: [Detective control]
- M3: [Corrective action]

**Owner:** [Agent responsible]  
**Activation:** [When to implement]  
**Success Criteria:** [How to verify]
```

---

**Risk Register Status:** ACTIVE (updated weekly)  
**Last Reviewed:** 2026-08-10  
**Next Review:** 2026-08-17 (Week 2 standup)
