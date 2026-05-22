# Epic 31: Multi-Tenant Infrastructure — Branded Direct Booking (nomeempresa.lodgra.io)

**Status:** Ready for Development  
**Priority:** High (Q2 2026)  
**Type:** Infrastructure + Frontend  
**Target Completion:** W6-W7 (6 weeks)

---

## Vision

Enable each Lodgra partner company to have their **own branded booking domain** (`nomeempresa.lodgra.io`) instead of sharing the generic `lodgra.io/booking`. This increases brand recognition, improves SEO, and positions Lodgra as a **white-label platform** for property management companies.

---

## Business Goals

1. **Differentiation:** Each company appears as premium partner with branded domain
2. **SEO:** Individual domains = individual search presence (each company can rank for their own brand)
3. **Shareability:** `pousada.lodgra.io/booking` is short, memorable, and branded
4. **Revenue:** Position for white-label licensing model (Phase 2+)
5. **User Confidence:** Companies see their branding → higher conversion

---

## Phases

### Phase 1: Infrastructure (1-2 weeks)
- Story 31.1: Configure wildcard DNS + Vercel for subdomains
- Deliverable: `*.lodgra.io` routing works end-to-end

### Phase 2: Customization (2-3 weeks)
- Story 31.2: Dynamic company branding (logos, colors, favicons)
- Story 31.3: Personalized booking page templates
- Story 31.4: Branded email confirmations
- Deliverable: Each company's booking page looks unique

### Phase 3: Marketing & Launch (1 week)
- Story 31.5: Onboarding documentation for companies
- Story 31.6: Analytics dashboard (traffic by company)
- Deliverable: Companies equipped to share their booking links

---

## Technical Architecture

**Already Implemented:**
- ✅ Middleware detects subdomains automatically (`middleware.ts` lines 29-36)
- ✅ Database supports `organization_id` isolation
- ✅ APIs filter by organization
- ✅ Booking page accepts `x-org-slug` header

**To Implement:**
- DNS wildcard configuration
- Vercel domain settings
- Company branding system
- Dynamic email templates

---

## Scope

### IN SCOPE
- Wildcard DNS setup (`*.lodgra.io`)
- Vercel configuration for subdomains
- Company branding table (logo, colors, favicon)
- Dynamic booking page per company
- Branded email templates
- Analytics by company

### OUT OF SCOPE
- Payment customization per company (handled in Epic 12)
- Custom TLDs per company (e.g., `mycompany.com`)
- API key management for white-label (Phase 2+)
- Custom CSS/HTML editor for companies

---

## Success Criteria

- [ ] DNS wildcard resolves `*.lodgra.io` to Vercel
- [ ] Booking page customizes per company (logo, headline, colors)
- [ ] Email confirmations include company branding
- [ ] Each company can share their branded booking link
- [ ] Analytics dashboard shows traffic by company domain
- [ ] No regression in existing `lodgra.io/booking` functionality

---

## Dependencies

- Epic 12: Stripe Payments (must complete first)
- Epic 8: SEO Foundation (for sitemap generation per domain)

---

## File List

```
docs/
├── architecture/MULTI-TENANT-ARCHITECTURE.md       [✓ Completed]
├── stories/
│   ├── epic-31-multi-tenant-infrastructure.md      [← You are here]
│   ├── 31.1.story.md                               [Ready for Dev]
│   ├── 31.2.story.md
│   ├── 31.3.story.md
│   ├── 31.4.story.md
│   ├── 31.5.story.md
│   └── 31.6.story.md

supabase/migrations/
└── 202605XX_organization_branding.sql              [Pending Phase 2]

src/
├── middleware.ts                                   [Already prepared]
├── app/booking/page.tsx                            [Ready for branding]
├── app/api/properties/route.ts                     [Ready for org filter]
└── lib/tenant/                                     [New — Phase 2]
    ├── branding.ts
    └── email-templates.ts
```

---

## Change Log

| Date | Change | Agent |
|------|--------|-------|
| 2026-05-22 | Epic created + Phase 1 story drafted | @architect |
