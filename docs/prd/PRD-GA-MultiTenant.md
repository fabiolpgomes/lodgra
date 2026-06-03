# PRD: Google Analytics Multi-Tenant Integration

**Data**: 2026-06-03  
**Owner**: PM (Morgan)  
**Status**: Proposal  
**Epic**: Platform Capabilities

---

## 1. Executive Summary

### Vision
Enable Lodgra enterprise clients to connect their own Google Analytics accounts to their branded property portals (`nomedaempresa.lodgra.io`), providing full ownership of analytics data and deepening product integration into their business workflows.

### Business Rationale
- **Competitive advantage**: Direct competitor analysis (Airbnb, Booking partners) show GA integration as table-stakes
- **Customer demand**: Enterprise customers request this in onboarding calls
- **Data ownership**: Clients want analytics data in their own GA accounts (not Lodgra's)
- **Stickiness**: GA integration increases switching costs and daily active usage

### Success Criteria
- **Adoption**: 40% of Premium+ tier customers enable GA by month 3
- **Time-to-value**: <5 minutes from first login to GA tracking active
- **Zero friction**: 0 support tickets related to GA configuration
- **Data quality**: 99%+ of page views correctly attributed to customer GA account

---

## 2. Problem Statement

### Current State
- Lodgra tracks all traffic via internal GA (G-QDK7Y80G8E)
- Customers cannot see their own analytics
- No distinction between traffic sources (organic, direct, partners)
- Customers duplicate analytics setup on their own domains

### Customer Pain Points
- "I don't know how many bookings come from my Lodgra property"
- "My team uses GA for all reporting — I need that data there"
- "Setting up another analytics tool is overhead we can't afford"
- "Lodgra data is siloed — we can't correlate with our other channels"

---

## 3. User Stories

### Story 1: Enterprise Admin Configures GA
**As a** property management company admin  
**I want** to connect my Google Analytics account to Lodgra  
**So that** all booking page traffic is tracked in my GA account

**Acceptance Criteria:**
- [ ] Admin can navigate to "Analytics Settings" in dashboard
- [ ] Can paste their GA Measurement ID (G-XXXXXXXXX format)
- [ ] System validates format and (optionally) verifies ownership
- [ ] Configuration saved with encryption in database
- [ ] Page displays "GA connected ✓" confirmation

**Effort**: 13pt

---

### Story 2: Tracking Fires with Customer GA Tag
**As a** system  
**I want** to fire customer GA tag on `/booking` page  
**So that** all traffic is tracked in their GA account (not Lodgra's)

**Acceptance Criteria:**
- [ ] If GA tag configured, customer GA fires instead of Lodgra GA
- [ ] If no GA configured, fallback to Lodgra GA
- [ ] Page source shows customer GA script (not Lodgra's)
- [ ] Google Analytics shows events within 24h
- [ ] Page views count correctly (no duplicates)

**Effort**: 21pt

---

### Story 3: Test GA Connection
**As a** property admin  
**I want** to verify my GA tag is working before going live  
**So that** I'm confident traffic will be tracked

**Acceptance Criteria:**
- [ ] "Test Connection" button in settings
- [ ] Generates test event: `lodgra_test_event` with timestamp
- [ ] Google Analytics Test Helper shows event within 10 seconds
- [ ] Display result: "✓ GA connected and receiving events" or error message
- [ ] Link to troubleshooting guide if test fails

**Effort**: 13pt

---

### Story 4: Remove / Rotate GA Tag
**As a** property admin  
**I want** to disconnect or change my GA tag  
**So that** I can switch accounts or stop tracking

**Acceptance Criteria:**
- [ ] Able to clear GA tag (reverts to Lodgra GA)
- [ ] Able to update tag (validates new format)
- [ ] Confirmation dialog: "This will stop tracking in your GA account"
- [ ] Audit log entry created

**Effort**: 5pt

---

### Story 5: Support View Customer GA Configuration
**As a** Lodgra support agent  
**I want** to see which customers have GA enabled  
**So that** I can help troubleshoot configuration issues

**Acceptance Criteria:**
- [ ] Internal admin dashboard shows GA status per customer
- [ ] Can see GA tag (masked except last 4 chars)
- [ ] Can disable/reset GA for customer (with audit log)
- [ ] Can resend setup instructions via email

**Effort**: 8pt

---

## 4. Requirements

### Functional Requirements

#### 4.1 Configuration UI
- [ ] Analytics settings page in customer dashboard
- [ ] Input field: GA Measurement ID
- [ ] Format validation: `G-[A-Z0-9]{10}`
- [ ] Optional: GA account verification via API
- [ ] Encryption at rest (not plaintext in DB)
- [ ] Test connection button
- [ ] Clear/disconnect button with confirmation

#### 4.2 Tag Injection
- [ ] Read GA ID from database per tenant
- [ ] Render customer GA script instead of Lodgra GA (if configured)
- [ ] Fallback to Lodgra GA if:
  - [ ] No GA ID configured
  - [ ] GA ID invalid/disabled
  - [ ] Decryption error
- [ ] Same Google Consent Mode logic (GDPR compliant)
- [ ] Same `beforeInteractive` strategy (detected by Google)

#### 4.3 Event Tracking
- [ ] Track same events in both GA (old) and customer GA (new):
  - Page view (already fires via gtag config)
  - Booking initiation (conversion event)
  - Booking completion (conversion event)
  - Form abandonment (behavioral event)
- [ ] Custom dimensions:
  - `property_id`: Lodgra internal ID
  - `platform`: "lodgra"
  - `booking_source`: organic, direct, partner, etc.

#### 4.4 Security
- [ ] Store GA ID encrypted (AES-256 or equivalent)
- [ ] Encryption key: environment variable or KMS
- [ ] Access control: only account owner can view/edit GA settings
- [ ] Audit log: all GA config changes (who, when, old/new values)
- [ ] No GA ID leakage in logs/error messages

#### 4.5 Testing & Validation
- [ ] GA ID format validation (client + server)
- [ ] Optional: Check GA tag exists in Google Analytics API
- [ ] Test event fire: `lodgra_config_test` with custom parameters
- [ ] Timeout: 10-second window to detect test event
- [ ] Error handling: clear messaging if test fails

---

### Non-Functional Requirements

#### 4.6 Performance
- [ ] GA configuration lookup: <50ms (cached)
- [ ] Script injection: no rendering delay
- [ ] Database query: 1 per page load (cacheable)

#### 4.7 Reliability
- [ ] If GA tag is malformed: fallback to Lodgra GA (no JS errors)
- [ ] If decryption fails: fallback to Lodgra GA (log error for ops)
- [ ] If customer GA ID deleted from GA: still renders (Google handles gracefully)

#### 4.8 Compliance
- [ ] GDPR: customer responsible for consent banner
- [ ] Data ownership: Lodgra does not store/access customer GA data
- [ ] Documentation: include GDPR/privacy implications
- [ ] Audit trail: log all GA configuration changes

#### 4.9 Scalability
- [ ] Support unlimited tenants (tested to 1M+)
- [ ] Cache tenant GA configs (TTL: 1 hour)
- [ ] No database bottleneck (query indexed on tenant_id)

---

## 5. Data Model

### Schema

```sql
CREATE TABLE tenant_analytics_config (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL UNIQUE,
  ga_measurement_id VARCHAR(20), -- Encrypted
  ga_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  INDEX (tenant_id)
);

CREATE TABLE analytics_config_audit_log (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  action VARCHAR(50), -- 'created', 'updated', 'deleted', 'tested'
  changed_fields JSONB, -- {old_ga_id: '...', new_ga_id: '...'}
  changed_by UUID NOT NULL, -- user_id
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX (tenant_id, created_at)
);
```

### Fields
- `ga_measurement_id`: Stored encrypted, decrypted only at render time
- `ga_enabled`: Soft switch (disable without deletion)
- `deleted_at`: Soft delete for audit trail
- Audit log: track all changes for compliance

---

## 6. User Journey

### Happy Path: Setup & Activation

```
1. Admin logs in → Dashboard
2. Navigates to "Settings" → "Analytics"
3. Sees: "Connect your Google Analytics" form
4. Pastes GA ID: G-XXXXXXXXX
5. Clicks "Connect"
   - Validation passes
   - Saved to DB (encrypted)
   - UI shows: "GA connected ✓"
6. Sees "Test Connection" button
7. Clicks "Test"
   - Test event fires to Google
   - Polls Google Analytics API
   - Shows result: "✓ Receiving events in your GA"
8. Next page visit: customer GA tag fires
9. Google Analytics shows traffic within 1 hour
```

### Error Path: Invalid GA ID

```
1. Admin pastes invalid ID: "google-12345"
2. Client validation fails
3. Error message: "GA ID must start with 'G-' followed by 10 characters"
4. No DB write
5. Admin corrects input, retries
```

### Error Path: GA Tag Not Found

```
1. Admin pastes valid format: G-XXXXXXXXX
2. System attempts API verification
3. Google API says: "This GA ID doesn't exist"
4. Warning displayed: "This GA ID doesn't exist in your account"
5. Admin option: 
   - "Use it anyway" (maybe in different account/organization)
   - "Enter different ID"
```

---

## 7. Technical Implementation

### Architecture

```
┌─────────────────────────────────────────┐
│     Customer Dashboard (React)           │
│  - Analytics Settings Page               │
│  - GA ID Input & Test Button             │
└────────────┬────────────────────────────┘
             │
      ┌──────▼─────────┐
      │  API Gateway   │
      │ /api/analytics │
      └────┬───────────┘
           │
    ┌──────▼────────────────────────┐
    │  Backend (Node/Next.js)        │
    │ - POST /api/analytics/config   │
    │ - GET  /api/analytics/config   │
    │ - POST /api/analytics/test     │
    │ - DELETE /api/analytics/config │
    └──────┬─────────────────────────┘
           │
    ┌──────▼──────────────────┐
    │  Database (Supabase)     │
    │ - tenant_analytics_config│
    │ - audit_log              │
    └──────────────────────────┘
           
┌─────────────────────────────────────────┐
│     /booking Page (SSR)                  │
│ 1. Get tenant_id from subdomain          │
│ 2. Query tenant GA config (cached)       │
│ 3. Render GA script:                     │
│    - If GA configured: use customer ID   │
│    - Else: use Lodgra ID (fallback)      │
└─────────────────────────────────────────┘
```

### Implementation Steps

**Phase 1: Data & Backend** (Sprint 1)
- [ ] Create schema & migrations
- [ ] Encryption setup (env var: ANALYTICS_ENCRYPTION_KEY)
- [ ] API endpoint: POST /api/analytics/config (create/update)
- [ ] API endpoint: GET /api/analytics/config (read, decrypt on demand)
- [ ] API endpoint: POST /api/analytics/test (fire test event)
- [ ] Audit logging

**Phase 2: Frontend & Settings UI** (Sprint 2)
- [ ] Analytics Settings page in customer dashboard
- [ ] GA ID input field + validation
- [ ] Test Connection button
- [ ] Success/error messaging
- [ ] Clear/disconnect UI

**Phase 3: Tag Injection & Rendering** (Sprint 2)
- [ ] Modify GoogleAnalytics.tsx component
- [ ] Add tenant lookup logic
- [ ] Conditional rendering: customer GA vs Lodgra GA
- [ ] Fallback handling
- [ ] Testing (unit + E2E)

**Phase 4: Validation & QA** (Sprint 3)
- [ ] Cross-browser testing
- [ ] GA verification (test events appear)
- [ ] Security audit (encryption, access control)
- [ ] GDPR/compliance review
- [ ] Performance testing (no page load regression)

**Phase 5: Rollout & Docs** (Sprint 3)
- [ ] Feature flag (gradual rollout)
- [ ] Customer documentation (setup guide)
- [ ] Support runbook (troubleshooting)
- [ ] Monitoring alerts (GA config errors)

---

## 8. Success Metrics

### Adoption
- [ ] Adoption rate: 40% of Premium+ customers within 3 months
- [ ] Time-to-activation: median 5 minutes from first login
- [ ] Recurring use: 80% of activated customers use GA settings page monthly

### Quality
- [ ] Zero JavaScript errors related to GA injection
- [ ] 99%+ of test events appear in customer GA within 10 seconds
- [ ] Support ticket volume: <5 per month

### Business
- [ ] NPS increase among GA users: +15 points
- [ ] Churn reduction: 10% lower churn for GA-enabled customers
- [ ] Feature request reduction: "GA integration" stops appearing in feedback

---

## 9. Open Questions for PM

### Business
1. **Pricing**: Is this included in all Premium tiers, or reserved for Enterprise?
2. **Phased rollout**: Beta with select customers first, or immediate GA?
3. **Marketing**: Will this be highlighted in sales/marketing materials?

### Product
4. **Multi-GA**: Can a customer use multiple GA accounts (A/B testing)?
5. **Other analytics**: Future support for Mixpanel, Amplitude, Segment?
6. **Admin GA**: Should Lodgra also track customer usage (separate Lodgra GA tag)?

### Support
7. **Troubleshooting**: Do we provide GA API verification, or customer's responsibility?
8. **Documentation**: Who owns customer-facing setup docs? (Product or Support?)

### Compliance
9. **Data retention**: How long do we keep audit logs?
10. **GDPR**: Is documentation sufficient, or need Data Processing Agreement?

---

## 10. Timeline & Scope

### MVP (Minimum Viable Product)
**Duration**: 3 sprints (6 weeks)  
**Stories**: 1-5 (60pt)  
**Includes**:
- ✅ Configuration UI
- ✅ Tag injection (customer GA)
- ✅ Test connection
- ✅ Fallback handling
- ✅ Audit logging

**Excludes** (Phase 2):
- ❌ Google API verification (format validation only)
- ❌ Multiple GA tags per customer
- ❌ Other analytics integrations

### Phase 2 (Enhancement)
- Google API verification
- Multi-GA support
- Advanced event tracking (custom dimensions)
- GA4 migration guidance

---

## 11. Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|-----------|
| Customer GA ID leaked in logs | Security breach | Medium | Audit code, mask in logs, encrypt at rest |
| Malformed GA ID breaks page | Page broken | High | Fallback to Lodgra GA, test thoroughly |
| GA verification API quota exceeded | Feature fails silently | Low | Cache results, rate-limit verification |
| Customer data in Lodgra GA forever | Privacy issue | Medium | Clear Lodgra GA when customer GA enabled |
| Slow DB lookup on every page load | Performance regression | Medium | Cache tenant config, 1h TTL, indexed query |

---

## 12. Dependencies

- **Database**: Supabase (existing)
- **Encryption**: Node.js crypto module (built-in)
- **Google Analytics API**: Optional (for verification, Phase 2)
- **Feature flags**: Existing feature flag system
- **Audit logging**: Existing audit log infrastructure

---

## 13. Success Definition (GoNo Decision)

### Go Criteria
- ✅ 95%+ of test events appear in Google Analytics
- ✅ Page load time regression: <50ms
- ✅ Zero security issues in audit
- ✅ Support team trained and confident
- ✅ >90% first-time setup success rate (no support tickets)

### No-Go Criteria
- ❌ Can't reliably encrypt/decrypt GA ID
- ❌ >100ms page load regression
- ❌ Security audit finds compliance gaps
- ❌ <50% adoption among target users (month 1)

---

## Appendix: Glossary

- **Tenant**: A single property management company using Lodgra
- **GA Measurement ID**: Format `G-XXXXXXXXX` (10 chars after G-)
- **Test event**: Synthetic event fired to verify GA connection
- **Fallback**: Default behavior when customer GA not available
- **Audit log**: Complete history of GA configuration changes

---

**Document Version**: 1.0  
**Last Updated**: 2026-06-03  
**Next Review**: After stakeholder feedback
