# 🎯 Pricing Strategy — Agent Review & Sign-off

**Scheduled:** 2026-05-23 (now)  
**Go-live target:** 2026-06-15  
**Documents:**
- Strategy: `docs/PRICING_STRATEGY_FEATURE_MATRIX.md`
- Implementation: `docs/PRICING_IMPLEMENTATION_ROADMAP.md`

---

## Summary for Agents

### New Pricing Model (Approved)

| Plano | Preço | Imóveis | Billing Type |
|-------|-------|---------|--------------|
| **Essencial** | R$59/mês | 1 | Fixed |
| **Expansão** | R$149/mês | 3 | Fixed |
| **Premium** | R$397/mês | 10 | Fixed + R$49/imóvel extra |

**Key Changes from Initial Draft:**
- ✅ Removed per-booking fee (R$5)
- ✅ Removed 1% revenue fee (save for Enterprise)
- ✅ Switched to fixed pricing by property count (simpler, more predictable)
- ✅ Extra property add-on for Premium (scalable, Stripe-native)

---

## Questions for Each Agent

### @pm (Morgan) — Product/GTM Lead

**Decision:** Approve messaging & positioning?

1. **Positioning:** "Operational maturity ladder" (Controle → Coordenação → Inteligência)
   - Does this resonate with target customer?
   - Better than "PMS", "channel manager", or "accounting tool"?

2. **Pricing Clarity:** Is the feature matrix clear enough?
   - Essencial = solo operator, 1 property
   - Expansão = growing team, 3 properties (most popular)
   - Premium = pro operations, 10+ properties
   - Can you explain to a customer in 30 seconds?

3. **Sales Collateral Needed:**
   - Pricing page copy (I drafted, needs your polish)
   - Onboarding flow (which plan to recommend first? Expansão?)
   - Email sequence (trial → upgrade → upsell)
   - Sales one-pager (for partners, sales conversations)

4. **Launch Timeline:**
   - Can you update landing page + pricing by June 9?
   - Can you train support/sales on new tiers by June 10?

**Your Action:**
- [ ] Approve positioning
- [ ] Refine pricing copy
- [ ] Commit to launch date

---

### @architect (Aria) — Technical Design Lead

**Decision:** Approve architecture & validate feasibility?

1. **Property Limits:** Enforce in code + DB?
   - Update `plans.ts` with `maxProperties: [1, 3, 10]`
   - Add RLS rule: `properties.organization_id` count ≤ limit
   - Add `/api/properties/check-limit` endpoint
   - Risk: Race conditions? (handled with DB constraint)

2. **Feature Gating System:** Server-side gates?
   - Create `hasFeature(orgId, featureName)` utility
   - Lock: `/cleaning` route, `/api/forecast`, `/api/reports/owner-split`
   - Show upgrade modal when feature blocked
   - Implementation: ~6 hours estimated

3. **Extra Property Billing:** Stripe line items?
   - Create new Stripe product (R$49/month)
   - Allow Premium customers to add via UI
   - Auto-update subscription quantity
   - Webhook handler for updates
   - Implementation: ~3 hours estimated

4. **Monitoring & Rollback:**
   - If feature gate breaks, can we roll back without blocking?
   - Monitoring: track how many users hit "upgrade modal"
   - Can we A/B test feature gate messaging?

5. **No Blockers?**
   - All assumptions based on existing tech stack (Supabase RLS, Stripe API)
   - Anything we're missing?

**Your Action:**
- [ ] Approve technical approach
- [ ] Identify any blockers
- [ ] Commit to 36-hour estimate

---

### @dev (Dex) — Implementation Lead

**Decision:** Can you deliver by June 15?

**4-Phase Timeline:**

**Phase 1 (May 26-Jun 1):** Property limits + feature gates
- [ ] Update `plans.ts` (1h)
- [ ] Property limit validation (2h)
- [ ] Feature gate utility (2h)
- [ ] Upgrade modal (2h)
- [ ] Unit tests (2h)
- **Subtotal: 9h**

**Phase 2 (Jun 2-8):** Billing infrastructure
- [ ] Extra property add-on (Stripe) (2h)
- [ ] Billing preview dashboard (2h)
- [ ] Webhook handlers (1h)
- **Subtotal: 5h**

**Phase 3 (Jun 9-15):** GTM + UX
- [ ] Pricing page updates (1h)
- [ ] Onboarding flow redesign (3h)
- [ ] Copy refinement (1h)
- **Subtotal: 5h**

**Phase 4 (Jun 13-15):** Testing + monitoring
- [ ] QA sign-off (8h)
- [ ] Monitoring dashboard (2h)
- **Subtotal: 10h**

**Total: 29h (not 36h with QA overlap)**

**Questions:**
- Can you start May 26 (Monday)?
- Do you need @qa help with testing phase?
- Any technical unknowns?

**Your Action:**
- [ ] Confirm capacity for 29 hours (1 week at 50%)
- [ ] Flag any blockers early
- [ ] Commit to daily standups May 26-Jun 15

---

## Critical Dates

| Date | Milestone | Owner |
|------|-----------|-------|
| **2026-05-23 (NOW)** | Agent review & sign-off | All |
| **2026-05-26** | Phase 1 kickoff (property limits) | @dev |
| **2026-06-01** | Phase 1 QA | @qa |
| **2026-06-09** | Phase 3 kickoff (GTM) | @pm, @dev |
| **2026-06-13** | Phase 4 QA begins | @qa |
| **2026-06-15** | Launch! 🎉 | All |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Stripe integration delays | Use sandbox first, then production |
| Property count race condition | DB `unique` constraint + app-level check |
| Feature gate breaks existing features | Feature flag off by default, gradual rollout |
| Pricing page goes live with old copy | @pm review + staging preview before prod |
| Customers hit upgrade wall unexpectedly | In-app notification 48h before limit |

---

## Success Criteria

✅ Launch is successful if:
1. Property limits enforced correctly (no bypasses)
2. Feature gates prevent unauthorized access
3. Stripe billing works (no double charges, invoices accurate)
4. Pricing page clear & conversion rate ≥ 5%
5. No critical bugs reported in first week
6. Support team confident explaining pricing

---

## Next Steps (Right Now)

1. **All agents:** Review documents (15 min)
   - `docs/PRICING_STRATEGY_FEATURE_MATRIX.md` (strategy)
   - `docs/PRICING_IMPLEMENTATION_ROADMAP.md` (tech)

2. **Async feedback:** Reply with questions by EOD 2026-05-24

3. **Sync meeting:** 2026-05-24 10am (30 min)
   - Confirm all sign-offs
   - Clarify blockers
   - Assign ownership

4. **Kick-off:** 2026-05-26 10am (Daily standup cadence starts)

---

## Questions?

Tag `@pm`, `@architect`, `@dev` below with questions/concerns.

**@pm:** Please review positioning + GTM plan  
**@architect:** Please review technical design  
**@dev:** Please confirm capacity + blockers

Let's build something amazing! 🚀

---

**Document Status:** Awaiting sign-off  
**Next Review:** 2026-05-24 10am
