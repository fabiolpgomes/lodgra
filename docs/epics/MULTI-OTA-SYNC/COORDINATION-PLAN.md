# Multi-OTA Sync EPIC — Agent Coordination Plan

**Epic:** MULTI-OTA-SYNC  
**Duration:** 10 weeks (2026-08-10 to 2026-10-05)  
**Prepared by:** Morgan (@pm)  
**Status:** READY FOR EXECUTION

---

## Overview

This document defines the agent coordination strategy for the Multi-OTA Real-Time Sync EPIC. It details:
- Agent roles and responsibilities
- Sprint schedule (4 phases, 2-3 weeks each)
- Handoff protocol (using agent-handoff.md)
- Status checkpoints and go/no-go decisions
- Communication cadence

---

## Agent Roles & Responsibilities

### Lead Agent: @pm (Morgan)
**Role:** EPIC Orchestration, Product Management  
**Allocation:** 40% (5 hours/day)

| Task | Owner | Frequency |
|------|-------|-----------|
| Roadmap execution | @pm | Weekly sync |
| Phase progress tracking | @pm | Daily standup |
| Stakeholder communication | @pm | Weekly email |
| Risk assessment | @pm | Biweekly |
| Go/no-go decisions | @pm + @architect | Phase end |

**Responsibilities:**
- Activate stories at phase start
- Track velocity + velocity trends
- Manage scope (prevent creep)
- Coordinate agent handoffs
- Escalate blockers to @aiox-master

---

### Phase 1 Lead: @data-engineer (Dara)
**Role:** Database Schema Design  
**Allocation:** 20% (2.5 hours/day, Week 1-2 only)

| Story | Days | Dependencies |
|-------|------|--------------|
| MULTI-OTA-1-1: Schema Design | 3 | None (first story) |
| MULTI-OTA-1-2: Vault Integration | 3 | Schema complete |
| MULTI-OTA-1-3: Credential UI | 2 | Vault complete |
| MULTI-OTA-1-4: Audit Logging | 2 | Schema complete |

**Handoff to Phase 2:**
- After 2026-08-24 (Phase 1 complete)
- Artifacts: Schema migration file, RLS policies, audit functions
- Dependencies resolved: Vault, database, UI ready
- Next lead: @dev

---

### Phases 2-3 Lead: @dev (Dex)
**Role:** Core Implementation (Scrapers, Enrichment, Conflicts)  
**Allocation:** 70% (8.5 hours/day, Week 3-8)

#### Phase 2 (Weeks 3-5): Booking.com MVP
| Story | Days | Owner | Dependencies |
|-------|------|-------|--------------|
| MULTI-OTA-2-1: Booking Scraper | 4 | @dev | Phase 1 complete |
| MULTI-OTA-2-2: Email Parsing | 3 | @dev | Scraper working |
| MULTI-OTA-2-3: iCal Extraction | 2 | @dev | Scraper working |
| MULTI-OTA-2-4: AI Extraction | 3 | @dev | Claude API key |
| MULTI-OTA-2-5: Graceful Degradation | 2 | @dev | All stages ready |
| MULTI-OTA-2-6: Enrichment Jobs | 2 | @dev | Fallback chain ready |

#### Phase 3 (Weeks 6-8): Airbnb + Conflicts
| Story | Days | Owner | Dependencies |
|-------|------|-------|--------------|
| MULTI-OTA-3-1: Airbnb Scraper | 4 | @dev | Phase 2 complete |
| MULTI-OTA-3-2: Conflict Detection | 3 | @dev | Airbnb scraper ready |
| MULTI-OTA-3-3: Manual Review UI | 2 | @dev | Conflict detection ready |
| MULTI-OTA-3-4: Health Monitoring | 2 | @dev | All scrapers ready |

**@dev Handoff Schedule:**
1. **After Phase 2 (2026-09-07):** Phase 3 stories activated
2. **After Phase 3 (2026-09-21):** Transition to QA (hand off to @qa)

---

### Phase 4 Lead: @qa (Quinn) + @devops (Gage)
**Role:** QA, Security Audit, Deployment  
**Allocation:** 20% @qa (2.5h/day), 15% @devops (2h/day)

| Story | Days | Owner | Dependencies |
|-------|------|-------|--------------|
| MULTI-OTA-4-1: Load Testing | 3 | @qa | Phase 3 complete |
| MULTI-OTA-4-2: Security Audit | 3 | @qa | Load test complete |
| MULTI-OTA-4-3: Deployment | 2 | @devops | All audits passed |

**Phase 4 Handoff:**
- @qa runs load test + security audit
- @devops prepares deployment runbook
- Both sign off on go/no-go decision
- @devops executes deployment (2026-10-05)

---

### Supporting Agents

#### @architect (Aria)
**Role:** Design Review, Technical Decisions  
**Allocation:** 10% (1.25 hours/day)

| Task | When | Duration |
|------|------|----------|
| Architecture review (Phase starts) | Week 1, 3, 6, 9 | 1.5h |
| Technical decision meetings | As needed | 30 min |
| Code review (critical paths) | Ongoing | 15 min/story |
| Go/no-go approval | Phase end | 30 min |

**Key Decisions to Make:**
- Week 1: Vault provider choice (confirmed)
- Week 3: Claude API integration (cost optimization)
- Week 6: Conflict resolution algorithm
- Week 9: Scaling strategy (post-MVP)

#### @sm (River) — Scrum Master
**Role:** Process Management, Story Kickoff  
**Allocation:** 5% (0.6 hours/day)

| Task | Frequency | Owner |
|------|-----------|-------|
| Weekly standup | Monday 10am UTC | @sm |
| Story kickoff | Story start | @sm |
| Blocker resolution | As needed | @sm |
| Retrospective | Phase end | @sm |

#### @po (Pax) — Product Owner
**Role:** Story Validation (Phase 1 only)  
**Allocation:** 5% (0.6 hours/day, Week 1-2)

| Task | When |
|------|------|
| Story AC review | Before story start |
| Acceptance testing | Story complete |
| UAT sign-off | Phase 1 end |

---

## Sprint Schedule

### Week 1: Phase 1 Kickoff (2026-08-10)
```
Mon 08-10: Epic kickoff meeting (all agents)
  - Review roadmap + schedule
  - Confirm resource allocation
  - Discuss risks + mitigations
  
Tue 08-11: Phase 1 stories activated
  - MULTI-OTA-1-1 (schema design) → @data-engineer starts
  - MULTI-OTA-1-2 (vault) → @dev starts
  
Wed 08-12: Design review (@architect)
  - Vault provider choice + security review
  - Database schema audit
  
Fri 08-15: Phase 1 progress check
  - Schema migration drafted
  - Vault provider configured
  - Credential UI scaffolded
```

### Week 2: Phase 1 Completion (2026-08-17 to 08-24)
```
Mon 08-17: Mid-phase 1 standup
  - Schema migration testing
  - Vault integration progress
  - Blocker: RLS policy complexity
  
Tue 08-20: Pre-UAT review (@po)
  - Manual review queue acceptance criteria
  - RLS policy walkthrough
  
Fri 08-24: Phase 1 Go/No-Go Decision
  - Load all stories + verify acceptance
  - QA sign-off (zero critical issues)
  - **DECISION: GO** → Activate Phase 2 immediately
  
Mon 08-24 EOD: Phase 2 Stories Activated
  - MULTI-OTA-2-1 (Booking scraper) → @dev starts
  - MULTI-OTA-2-2 (Email parsing) → @dev starts
```

### Weeks 3-5: Phase 2 (Booking MVP)
```
Mon 08-24: Booking scraper implementation begins
  - Bot detection strategies researched
  - Playwright environment setup
  
Wed 08-26: AI extraction design review (@architect)
  - Claude API cost optimization
  - Fallback strategy for LLM failures
  
Fri 08-29: Phase 2 mid-phase check
  - Booking scraper prototype working (test property)
  - Email parsing v1 ready for testing
  
Mon 09-01: Email parsing + AI extraction parallel work
  - Booking scraper > 95% accuracy on test data
  - Claude API integration for edge cases
  
Fri 09-07: Phase 2 Go/No-Go Decision
  - Load test passed (100K reservations/month)
  - Graceful degradation tested (all 4 stages)
  - **DECISION: GO** → Activate Phase 3 immediately
```

### Weeks 6-8: Phase 3 (Airbnb + Conflicts)
```
Mon 09-07: Phase 3 stories activated
  - MULTI-OTA-3-1 (Airbnb scraper) → @dev starts
  
Thu 09-10: Conflict detection design review (@architect)
  - SQL queries for duplicate detection
  - Auto-resolution rules validation
  
Mon 09-15: Mid-phase 3 check
  - Airbnb scraper prototype working
  - Conflict detection SQL queries written
  - Manual review UI designed
  
Fri 09-21: Phase 3 Go/No-Go Decision
  - Load test passed (500K reservations/month)
  - Conflict detection working (99% recall)
  - Manual review UI tested
  - **DECISION: GO** → Activate Phase 4 immediately
```

### Weeks 9-10: Phase 4 (QA & Launch)
```
Mon 09-21: Phase 4 stories activated
  - Load testing setup (@qa)
  - Security audit planning (@qa)
  - Deployment runbook review (@devops)
  
Wed 09-24: Load testing in progress
  - k6 test running (2-hour duration)
  - Infrastructure monitoring
  
Fri 09-28: Load test + Security audit complete
  - Load test report: all benchmarks passed
  - Security audit: zero critical issues
  
Mon 10-01: Pre-deployment planning
  - Runbook dry-run scheduled
  - Customer communication drafted
  - Support team training scheduled
  
Wed 10-03: Dry-run deployment (staging)
  - All procedures tested
  - Timing verified (45 min total)
  
Fri 10-05: Production Deployment Window
  - 2-4 AM UTC deployment
  - Monitoring active (24/7 for 7 days)
  - Customer announcement sent
```

---

## Agent Handoff Protocol

Use `.claude/rules/agent-handoff.md` to minimize context overhead during agent switches.

### Handoff 1: @data-engineer → @dev (2026-08-24, Phase 1→2)

**Handoff Artifact:**
```yaml
handoff:
  from_agent: data_engineer
  to_agent: dev
  story_context:
    story_id: MULTI-OTA-1-4
    story_path: docs/epics/MULTI-OTA-SYNC/EPIC-MULTI-OTA-PHASE1.md
    story_status: complete
    current_task: audit_logging_system
    branch: multi-ota/phase1-complete
  decisions:
    - Vault provider: HashiCorp (configured)
    - Schema finalized: 3 tables (ota_reservations, ota_credentials, ota_sync_audit)
    - RLS policies: tested with co-owner scenarios
    - Audit logging: immutable by design, 7-year retention
  files_modified:
    - supabase/migrations/20260810_ota_sync_phase1.sql
    - lib/audit.ts (audit middleware)
    - app/components/OTACredentialManager.tsx
  blockers: none
  next_action: Start MULTI-OTA-2-1 (Booking.com scraper). Foundation is stable.
```

**Transfer of Context:**
1. @data-engineer provides completed Phase 1 documentation
2. @dev reviews schema, RLS policies, audit functions
3. @dev begins Booking scraper development (MULTI-OTA-2-1)
4. No need to re-explain Phase 1 decisions; handoff artifact captures them

---

### Handoff 2: @dev → @qa + @devops (2026-09-21, Phase 3→4)

**Handoff Artifact:**
```yaml
handoff:
  from_agent: dev
  to_agent: qa
  story_context:
    story_id: MULTI-OTA-3-4
    story_path: docs/epics/MULTI-OTA-SYNC/EPIC-MULTI-OTA-PHASE3.md
    story_status: complete
    current_task: health_monitoring_alerts
    branch: multi-ota/phase3-complete
  decisions:
    - Booking.com scraper: 95% accuracy, 30-min sync target met
    - Airbnb scraper: 95% accuracy, 60-min sync target met
    - Conflict detection: SQL queries (99% recall)
    - Auto-resolution: 70% of simple conflicts handled
    - Manual review queue: UI tested, support team trained
    - Health monitoring: Prometheus + Grafana dashboard ready
  files_modified:
    - lib/scrapers/booking/scraper.ts (400+ lines)
    - lib/scrapers/airbnb/scraper.ts (400+ lines)
    - lib/conflicts/detector.ts (200+ lines)
    - app/dashboard/manual-review/ (UI components)
    - lib/monitoring/health-metrics.ts
  blockers: none
  next_action: Start MULTI-OTA-4-1 (load testing). All scrapers ready for stress testing. Security audit to follow.
```

**Transfer of Context:**
1. @dev provides Phase 2-3 testing results + performance data
2. @qa understands scraper architecture + known limitations
3. @qa begins load testing (MULTI-OTA-4-1)
4. @devops reviews runbook + deployment procedures

---

## Status Reporting

### Daily Standup
**Time:** 10:00 AM UTC (Monday-Friday)  
**Duration:** 15 minutes  
**Owner:** @sm  
**Attendees:** @dev, @data-engineer (Phase 1), @qa (Phase 4), @devops (Phase 4)

**Format:**
- What did you complete yesterday? (1 min per person)
- What are you working on today? (1 min per person)
- Any blockers? (5 min for discussion)

### Weekly Status Email
**Sent:** Friday EOD  
**To:** @pm, @architect, @stakeholders  
**Content:**
```
Subject: Multi-OTA Sync EPIC — Week X Status Report

Phase: [Current Phase]
Week: [Start Date - End Date]
Velocity: [Stories Completed / Total Stories]

Progress:
- ✅ Story X: Complete (merged, QA passed)
- 🔄 Story Y: In Progress (70% complete)
- 📋 Story Z: Queued (starting Monday)

Blockers: [None / List items]

Metrics:
- Phase Completion: X% (stories complete / total)
- On Schedule: [Yes / No - explain deviation]
- Quality: [No issues / Minor issues / Critical issues]

Next Week:
- Stories to activate: [List]
- Key decisions needed: [List]
- Risk Watch Items: [List]
```

### Phase Go/No-Go Checkpoint
**When:** Phase end (every 2 weeks)  
**Owner:** @pm + @architect  
**Decision Criteria:**

✅ **GO:** All stories complete + QA approved + no critical issues  
❌ **NO-GO:** Blockers preventing launch (require 1-week extension)

| Phase End | Date | Criteria | Status |
|-----------|------|----------|--------|
| Phase 1 | 2026-08-24 | Schema stable, Vault working, Credential UI functional | ? |
| Phase 2 | 2026-09-07 | Booking scraper 95%, email parsing 90%, fallback tested | ? |
| Phase 3 | 2026-09-21 | Airbnb scraper ready, conflicts detected, manual queue UI | ? |
| Phase 4 | 2026-10-05 | Load test passed, security audit passed, runbook ready | ? |

---

## Communication Cadence

### Meetings Schedule

| Meeting | Frequency | Duration | Attendees | Owner |
|---------|-----------|----------|-----------|-------|
| Epic Kickoff | Once (Week 1) | 1.5h | All agents | @pm |
| Daily Standup | Daily (M-F) | 15 min | Core team | @sm |
| Design Review | Phase start | 1.5h | @architect, @dev | @architect |
| Mid-Phase Check | Mid-phase | 30 min | Phase lead + @pm | @pm |
| Go/No-Go Decision | Phase end | 1h | @pm, @architect, Phase leads | @pm |
| Retrospective | Phase end | 1h | All agents | @sm |

### Async Communication

**Slack Channels:**
- `#multi-ota-sync-epic` — All updates, decisions, blockers
- `#multi-ota-dev` — Developer discussion (implementation details)
- `#multi-ota-qa` — QA testing, issues, results

**Documentation:**
- Epic roadmap: `docs/epics/MULTI-OTA-SYNC/EPIC-MULTI-OTA-SYNC.md` (source of truth)
- Phase stories: `EPIC-MULTI-OTA-PHASE[1-4].md`
- Blockers + decisions logged in story comments

---

## Risk Management

### Risk Monitoring

**High-Risk Items (monitored weekly):**
1. Booking.com blocks scraper (bot detection) → Escalate to @architect
2. Claude API extraction fails (edge cases) → Test fallback patterns
3. Database schema mistakes → Review before Phase 1 complete
4. Credential leaks (Vault security) → Security audit in Phase 4

**Mitigation Review Schedule:**
- Week 1: Risk review + mitigation planning
- Week 3: Booking scraper bot detection stress test
- Week 6: Database performance under 500K reservation load
- Week 9: Security audit (Phase 4)

See `RISK-REGISTER.md` for detailed risk matrix + mitigation plans.

---

## Success Criteria

### EPIC-Level Success
- ✅ 17 stories complete (all phases)
- ✅ 10-week timeline met (2026-08-10 to 2026-10-05)
- ✅ Load test passed (1M reservations/month)
- ✅ Security audit passed (zero critical issues)
- ✅ Production launch successful
- ✅ Zero post-launch incidents (first 7 days)

### Agent Coordination Success
- ✅ All handoffs executed smoothly (no context loss)
- ✅ No blocked stories (clear dependencies)
- ✅ Daily standup attendance > 90%
- ✅ Status reports accurate + on-time
- ✅ Go/no-go decisions made on schedule

### Team Health
- ✅ No agent burnout (allocation ≤ 70%)
- ✅ Clear decision authority (no bottlenecks)
- ✅ High-quality communication (async first)
- ✅ Knowledge shared + documented

---

## Escalation Path

If blocker arises that cannot be resolved by current agent:

```
Story Blocker (Agent)
         ↓
    @pm (resolve or escalate)
         ↓
    @architect (technical decision needed?)
         ↓
    @aiox-master (framework/EPIC issue)
         ↓
    User (scope change or timeline adjustment)
```

**Examples:**
- Booking.com blocks scraper (24+ hours) → Escalate to @architect for alternative strategy
- Database performance issue → @data-engineer consultation + @architect decision
- Customer request to add OTA (scope change) → @pm + user decision (out of MVP)
- Timeline overrun (Phase > 2 weeks) → @pm assessment + 1-week extension approval

---

## Post-Launch Support

### Launch Week (2026-10-05 to 2026-10-11)
- **@devops:** 24/7 on-call (monitoring, alerts)
- **@dev:** Standby for hotfixes
- **@pm:** Daily check-ins + incident communication
- **@qa:** Smoke testing + bug verification

### Post-Launch (2026-10-12+)
- **Handoff to Support:** Support team owns manual review queue
- **@dev:** On-call 1 week/month (rotating)
- **Performance Tuning:** Ongoing optimization (post-MVP)
- **Phase 5 Planning:** Airbnb+, Flatio, Vrbo integrations

---

## Appendix: Agent Authority Matrix

For detailed agent responsibilities and exclusive operations, see `.claude/rules/agent-authority.md`

Key Points:
- @devops (Gage): Exclusive authority for git push, PR creation, CI/CD
- @dev (Dex): All implementation work (git add/commit/branch)
- @qa (Quinn): All testing + security audit
- @pm (Morgan): EPIC orchestration + requirements
- @architect (Aria): Design decisions + technology selection

---

**Coordination Plan Status:** READY FOR EXECUTION  
**Last Updated:** 2026-08-10  
**Next Review:** 2026-08-24 (Phase 1 go/no-go)
