# EPIC: Multi-OTA Real-Time Sync Platform

**Epic ID:** MULTI-OTA-SYNC  
**Status:** PLANNING  
**Created:** 2026-08-10  
**Target Launch:** 2026-10-05 (10 weeks)  
**PM Lead:** Morgan (@pm)  
**Severity:** CRITICAL (Revenue-blocking)

---

## Executive Summary

Replace unreliable iCal-based synchronization (18h+ delays, 65% data incompleteness) with production-grade, multi-provider real-time sync platform supporting Booking.com, Airbnb, and Flatio. System architecture ensures graceful degradation: reservations ALWAYS created within seconds, enriched asynchronously. MVP target: 95% sync within 30 minutes, 90% full data within 1 hour.

---

## Problem Statement

### Current State (iCal-based)
- **Sync Delay:** 18-24 hours (iCal rate limits + webhook delays)
- **Data Loss:** 35% of reservations created without guest name/contact
- **OTA Coverage:** Only Booking.com (partial), Airbnb (manual sync)
- **Revenue Impact:** Double-bookings, missed cleanups, customer service escalations
- **Manual Overhead:** 15 hours/week of manual data entry + conflict resolution

### Why It Fails
1. iCal assumes guest adds property to calendar (doesn't always happen)
2. Email parsing creates duplicate work, no schema validation
3. No conflict detection (same guest booking same dates on multiple OTAs)
4. Fallback to manual entry is time-consuming and error-prone

---

## Vision & Goals

### Primary Goal
Enable seamless multi-OTA reservation orchestration with sub-30-minute sync latency, supporting 1M+ reservations/month without manual intervention.

### Success Criteria

| Metric | Target | Acceptance |
|--------|--------|-----------|
| Sync Latency (95th percentile) | 30 minutes | ✅ 95% of new reservations synced within 30 min of OTA creation |
| Data Completeness (1h) | 90% | ✅ 90% of reservations have guest name, check-in, check-out within 1 hour |
| System Uptime | 99.9% | ✅ Graceful degradation: always creates base reservation, enriches later |
| Cost per Reservation | < $0.01 | ✅ Including scraping, LLM extraction, storage |
| OTA Support | 3 platforms | ✅ Booking.com, Airbnb, Flatio at MVP launch |
| Multi-Property Scale | 10K properties | ✅ Verified via load testing (1M reservations/month scenario) |

### Strategic Outcomes
- Eliminate 95% of manual sync work
- Enable same-day cleanup & pricing adjustments
- Support dynamic pricing based on real-time occupancy
- Foundation for future OTA integrations (Vrbo, Airbnb Plus, etc.)

---

## Scope Definition

### In Scope (MVP)
- Web scraping for Booking.com, Airbnb, Flatio
- AI-powered data extraction (Claude API)
- Conflict detection & manual review queue
- Email-based enrichment (for missing data)
- Graceful degradation (4-stage fallback)
- Multi-tenant architecture (Vault secrets, per-property quotas)
- Audit logging for compliance
- Health monitoring & alerting
- Support for Lodgra's multi-user model (owner/co-owner sync permissions)

### Out of Scope (Post-MVP)
- Advanced conflict resolution (ML-based duplicate detection)
- Historical data backfill (prior to go-live)
- Mobile app push notifications
- Custom OTA API integrations (Vrbo, Airbnb Plus)
- Automated guest communication (guest.com auto-responses)
- Predictive no-show detection

---

## Technical Architecture (Reference)

### 7-Layer Architecture

```
Layer 1: Frontend (Credential Manager UI + Admin Dashboard)
   ↓ (over HTTPS with nonce auth)
Layer 2: Secrets Management (Vault - encrypted credential storage)
   ↓
Layer 3: Web Scrapers (Playwright - Booking, Airbnb, Flatio)
   ↓ (extracts HTML)
Layer 4: Message Queue (RabbitMQ - deduplication, retry)
   ↓
Layer 5: AI Extraction (Claude API - Booking emails, OCR)
   ↓ (enriches partial data)
Layer 6: Conflict Resolution (SQL + manual review queue)
   ↓ (detects duplicates, flags ambiguous)
Layer 7: Monitoring (Prometheus + Grafana + PagerDuty)
   ↓ (alerts on stale feeds, quota overages)
```

### Graceful Degradation (4-Stage Fallback)
1. **Stage 1 (Priority):** Booking.com web scraper + email parsing → Full reservation with guest details
2. **Stage 2 (Fallback):** Airbnb API + guest message scraping → Partial reservation (dates + guest name)
3. **Stage 3 (Fallback):** iCal + manual enrichment queue → Base reservation (dates only)
4. **Stage 4 (Final Fallback):** User manual entry → Always creates placeholder, enriched later

**Key Principle:** System NEVER blocks. Always creates reservation at Stage 1 within seconds; async enrichment fills gaps.

### Data Model Guarantees
- **external_id** = source of truth (Booking ref, Airbnb confirmation #, etc.)
- **created_at** = first sync time (to track latency)
- **updated_at** = last enrichment time (to track completeness)
- **sync_source** = which OTA/scraper created it (for audit)
- **conflict_flags** = any manual review items (same guest, overlapping dates, price mismatch)

---

## 10-Week Roadmap (4 Phases)

### Phase 1: Foundation (Weeks 1-2) — 10 days

**Goal:** Build infrastructure layer & credential manager UI

**Outcomes:**
- ✅ Database schema (reservations, credentials, audit logs, quotas)
- ✅ Vault integration for encrypted credential storage
- ✅ Credential manager UI (minimal: add/remove/test OTA credentials)
- ✅ RabbitMQ message queue setup
- ✅ Audit logging system (all scraper activity logged)
- ✅ Health check endpoint

**Deliverables:**
- Database migrations (Supabase)
- Vault provider implementation
- Credential UI component (React)
- RabbitMQ producer/consumer patterns
- Audit table + logging middleware

**Stories:**
- MULTI-OTA-1-1: Database schema design (@data-engineer, 3 days)
- MULTI-OTA-1-2: Vault secrets integration (@dev, 3 days)
- MULTI-OTA-1-3: Credential manager UI (@dev, 2 days)
- MULTI-OTA-1-4: Audit logging system (@dev, 2 days)

---

### Phase 2: Booking.com MVP (Weeks 3-5) — 15 days

**Goal:** Implement production-ready Booking.com sync

**Outcomes:**
- ✅ Booking.com web scraper (Playwright)
- ✅ Email parsing pipeline (Gmail API + Claude extraction)
- ✅ iCal fallback for check_out dates
- ✅ AI extraction service (Claude API calls)
- ✅ Graceful degradation (4-stage fallback working)
- ✅ Enrichment retry jobs (background queue)
- ✅ Load testing for 100K reservations/month

**Deliverables:**
- Booking.com scraper (Playwright)
- Email parsing engine
- Claude API integration wrapper
- Enrichment job processor
- Load test suite (k6)

**Stories:**
- MULTI-OTA-2-1: Booking.com scraper core (@dev, 4 days)
- MULTI-OTA-2-2: Email parsing + Claude integration (@dev, 3 days)
- MULTI-OTA-2-3: iCal check_out extraction (@dev, 2 days)
- MULTI-OTA-2-4: AI extraction service (@dev, 3 days)
- MULTI-OTA-2-5: Graceful degradation fallback chain (@dev, 2 days)
- MULTI-OTA-2-6: Enrichment retry jobs (@dev, 2 days)

---

### Phase 3: Airbnb + Conflict Resolution (Weeks 6-8) — 15 days

**Goal:** Multi-OTA support with conflict detection

**Outcomes:**
- ✅ Airbnb guest message scraper
- ✅ Conflict detection (same guest, overlapping dates, price mismatches)
- ✅ Manual review queue (admin dashboard)
- ✅ Health monitoring (feed staleness detection, quota tracking)
- ✅ Security audit (encryption, RLS policies)
- ✅ Load testing for 500K reservations/month

**Deliverables:**
- Airbnb scraper (email + message extraction)
- Conflict detection SQL queries
- Manual review UI (admin portal)
- Health monitoring dashboard
- Security audit report

**Stories:**
- MULTI-OTA-3-1: Airbnb scraper (@dev, 4 days)
- MULTI-OTA-3-2: Conflict detection & resolution (@dev, 3 days)
- MULTI-OTA-3-3: Manual review queue UI (@dev, 2 days)
- MULTI-OTA-3-4: Health monitoring & alerts (@dev, 2 days)

---

### Phase 4: QA & Production Launch (Weeks 9-10) — 10 days

**Goal:** Production-hardening & runbook preparation

**Outcomes:**
- ✅ Load testing passed (1M reservations/month, sub-30-min sync)
- ✅ Security audit approved (SOC2 readiness)
- ✅ Runbook + incident response procedures
- ✅ Deployment to production
- ✅ 24/7 monitoring active
- ✅ Customer communication plan

**Deliverables:**
- Load test results report
- Security audit report + remediation
- Runbook (deployment, scaling, incident response)
- Monitoring dashboard (Grafana)
- Customer communication (email, in-app announcement)

**Stories:**
- MULTI-OTA-4-1: Load testing (1M reservations) (@qa, 3 days)
- MULTI-OTA-4-2: Security audit & SOC2 prep (@qa, 3 days)
- MULTI-OTA-4-3: Deployment & runbooks (@devops, 2 days)

---

## Story Count & Effort

| Phase | Stories | Days | Est. Cost |
|-------|---------|------|-----------|
| Phase 1 | 4 | 10 | $8K (infrastructure) |
| Phase 2 | 6 | 15 | $18K (Booking MVP) |
| Phase 3 | 4 | 15 | $15K (Airbnb + conflicts) |
| Phase 4 | 3 | 10 | $8K (QA + deploy) |
| **Total** | **17** | **50 days** | **$49K** |

---

## Resource Allocation

| Agent | Role | % Allocation | Start | End |
|-------|------|--------------|-------|-----|
| @data-engineer (Dara) | Schema design + migrations | 20% | Week 1 | Week 2 |
| @dev (Dex) | Core implementation | 70% | Week 1 | Week 10 |
| @architect (Aria) | Design decisions + reviews | 10% | Week 1 | Week 10 |
| @qa (Quinn) | Testing + security audit | 20% | Week 1 | Week 10 |
| @devops (Gage) | Deployment + monitoring | 15% | Week 1 | Week 10 |
| @pm (Morgan) | Orchestration + roadmap | 40% | Week 1 | Week 10 |

**Total Effort:** ~400 person-days (assuming 8-hour days with parallel work)

---

## Success Criteria per Phase

### Phase 1: Foundation
- [ ] Vault integration tested (credentials encrypted at rest)
- [ ] Database schema reviewed + approved by @data-engineer
- [ ] Credential UI functional (add, test, remove OTA creds)
- [ ] Audit logs recorded for all operations
- [ ] RabbitMQ topic created + test message routed

### Phase 2: Booking MVP
- [ ] Booking.com scraper creates 95% of test reservations within 30 min
- [ ] Email parsing + AI extraction achieves 90% accuracy on test dataset
- [ ] All 4 fallback stages tested (scraper → email → iCal → manual)
- [ ] Load test passed: 100K reservations/month, sub-5-min sync
- [ ] Zero data loss or corruption

### Phase 3: Airbnb + Conflicts
- [ ] Airbnb scraper creates 95% of test reservations within 45 min
- [ ] Conflict detection flags all duplicates + ambiguous bookings
- [ ] Manual review queue tested with support team
- [ ] Health monitoring alerts on stale feeds (> 90 min without update)
- [ ] Load test passed: 500K reservations/month, sub-30-min sync

### Phase 4: Production
- [ ] Load test passed: 1M reservations/month, 95th percentile < 30 min
- [ ] Security audit approved (encryption, RLS, audit logs)
- [ ] Runbook tested (deployment, scaling, incident response)
- [ ] Monitoring live (Grafana + PagerDuty)
- [ ] Go/no-go decision approved by @pm + @architect

---

## Risk & Mitigation Summary

| Risk | Severity | Owner | Mitigation |
|------|----------|-------|-----------|
| Booking.com blocks scraper (bot detection) | HIGH | @dev | User agent rotation, random delays (2-5s), proxy rotation every 1K requests |
| LLM extraction fails on edge cases | MEDIUM | @dev | Regex fallback patterns, manual review queue, human-in-loop approval |
| Database schema mistakes | HIGH | @data-engineer | Schema review before Phase 1 complete, migration tests on staging |
| Credential leaks (OTA passwords) | CRITICAL | @devops | Vault encryption, 90-day key rotation, audit logs, breach notification plan |
| Rate limiting (OTA/LLM quotas) | MEDIUM | @pm | Configurable sync frequency per tier, cost monitoring per property |
| Performance degradation under load | MEDIUM | @qa | Load testing at 1M reservations/month, async processing, queue monitoring |

---

## Go/No-Go Checkpoints

### End of Phase 1 (2026-08-24)
- [ ] Vault + database + RabbitMQ functional
- [ ] Credential manager UI shipped
- [ ] All infrastructure tests passing
- **Decision:** Proceed to Phase 2 (Booking MVP)

### End of Phase 2 (2026-09-07)
- [ ] Booking scraper 95% reliable
- [ ] Email parsing + AI extraction working
- [ ] Load test: 100K reservations/month passed
- **Decision:** Proceed to Phase 3 (Airbnb)

### End of Phase 3 (2026-09-21)
- [ ] Airbnb scraper working
- [ ] Conflict resolution functional
- [ ] Load test: 500K reservations/month passed
- [ ] Security pre-audit approved
- **Decision:** Proceed to Phase 4 (Production)

### End of Phase 4 (2026-10-05)
- [ ] Load test: 1M reservations/month passed
- [ ] Security audit approved
- [ ] Runbook tested
- [ ] Monitoring live
- **Decision:** GO LIVE (production deployment)

---

## Launch Communication Plan

### Week of 2026-10-05
- [ ] In-app announcement: "New multi-OTA sync (beta)"
- [ ] Email to all properties: "Booking.com + Airbnb sync now live"
- [ ] Support team training: conflict resolution + manual review queue
- [ ] Monitor for 24 hours (99.9% uptime target)

### Week of 2026-10-12
- [ ] Disable manual sync feature (users no longer need it)
- [ ] Announce "sync delays reduced from 18h to 30min"
- [ ] Blog post: "Multi-OTA Integration"

---

## Appendix: Story Templates

All stories follow AIOX story format with:
- **Epic ID:** MULTI-OTA-SYNC
- **Story:** MULTI-OTA-{phase}-{num}
- **Complexity:** Assessed per AIOX story lifecycle
- **Dev Notes:** Pre-filled with architecture decisions
- **AC:** Specific, measurable acceptance criteria
- **Owner Agent:** @dev, @data-engineer, @qa, @devops

See phase-specific documents for full story details:
- `EPIC-MULTI-OTA-PHASE1.md`
- `EPIC-MULTI-OTA-PHASE2.md`
- `EPIC-MULTI-OTA-PHASE3.md`
- `EPIC-MULTI-OTA-PHASE4.md`

---

## Next Steps

1. **Immediate (Today):** @pm approves epic roadmap + timeline
2. **Week 1:** @data-engineer starts MULTI-OTA-1-1 (database schema)
3. **Week 1:** @dev starts MULTI-OTA-1-2 (Vault integration)
4. **Week 3:** Phase 2 stories begin (Booking scraper)
5. **Week 6:** Phase 3 stories begin (Airbnb + conflicts)
6. **Week 9:** Phase 4 stories begin (QA + deployment)

---

**EPIC Status:** READY FOR PHASE 1 ACTIVATION  
**Last Updated:** 2026-08-10  
**Next Review:** 2026-08-24 (End of Phase 1)
