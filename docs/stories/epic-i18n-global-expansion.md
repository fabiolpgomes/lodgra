# Epic: i18n & Global Expansion (Phase 1: Q2 2026)

**Status:** Draft / Ready to Start  
**Priority:** P0 — CRÍTICO para roadmap estratégico  
**Timeline:** Q2 2026 (6-8 semanas)  
**Vision:** Enable Home Stay to serve 3 primary markets (PT, BR, US) with native language + currency support

---

## Overview

Transformar Home Stay de **português-only** para **global app** suportando:
- 🇵🇹 **Portugal** (PT) — existente
- 🇧🇷 **Brasil** (PT-BR) — novo, crescimento esperado 500K+ properties
- 🇺🇸 **USA** (EN-US) — novo, enterprise segment

**Meta:** Lançar suporte PT/BR/US simultaneamente Q2 2026, abrir porta para expansão futura (ES, FR, etc).

---

## Success Metrics

| Métrica | Baseline | Target (Q2) |
|---------|----------|-----------|
| Supported Locales | 2 (PT, PT-BR) | 3 (PT, PT-BR, EN-US) |
| Supported Currencies | 1 (EUR) | 3 (EUR, BRL, USD) |
| UI Translation | ~2 keys | 40+ keys |
| Mobile Responsiveness | 20% | 95%+ |
| User Signup (new markets) | 0 | 50+ (BR/US) |

---

## Stories (Sequência)

| # | Story | Title | Effort | Dependency |
|---|-------|-------|--------|------------|
| **i18n.1** | Infrastructure Setup | `next-intl` + routing + file structure | 8-9h | — |
| **i18n.2** | Core UI Translation | Traduzir dashboard, calendar, forms (3 langs) | 10-14h | i18n.1 |
| **i18n.3** | Multi-Currency | EUR/BRL/USD conversion + Stripe | 7-11h | i18n.1 |
| **i18n.4** | Locale Selector | Header dropdown + user preferences | 6-7h | i18n.1/2/3 |

**Total Effort:** 31-41 horas (4-5 dias de dev intenso)

---

## Architecture & Tech Decisions

### i18n Framework
- **next-intl** — Official Next.js i18n solution, native App Router support
- **Ficheiros JSON** — Escalável, compatível com Crowdin/translation services
- **Server/Client Components** — Hybrid approach (getTranslations + useTranslations)
- **Locale in URL** — `/pt/dashboard`, `/pt-BR/calendar`, `/en-US/reports` (SEO-friendly, persistent)

### Currency
- **Base currency EUR** — Armazenado em DB
- **Forex rates** — Cache com TTL 1h (free API: exchangerate-api.com)
- **Rounding** — Banker's rounding, 2 casas decimais
- **Stripe** — Payment in user's locale currency

### Backwards Compatibility
- Rotas antigas `/dashboard` redirecionam para `/pt/dashboard` (default)
- Sistema antigo (`src/lib/i18n/messages.ts`) coexiste durante transição
- Migrate depois (não bloqueia lançamento i18n.1)

---

## File Structure (Target)

```
src/
├── locales/                    # ← NEW
│   ├── pt/
│   │   ├── common.json         # app name, buttons, etc
│   │   ├── dashboard.json      # dashboard labels
│   │   ├── calendar.json       # calendar month/day names
│   │   ├── forms.json          # form labels/validation
│   │   ├── navigation.json     # menu items
│   │   └── errors.json         # error messages
│   ├── pt-BR/                  # BR dialect variants
│   ├── en-US/                  # English translations
│   └── es-ES/                  # Placeholder (Phase 2)
│
├── app/
│   └── [locale]/               # ← REFACTORED
│       ├── layout.tsx
│       ├── page.tsx
│       ├── dashboard/
│       ├── calendar/
│       └── ...
│
├── components/
│   └── header/
│       └── LocaleSelector.tsx  # ← NEW (i18n.4)
│
├── lib/
│   ├── i18n/
│   │   ├── config.ts           # ← NEW (mapping locales)
│   │   └── request.ts          # ← NEW (server helper)
│   ├── forex/                  # ← NEW (i18n.3)
│   │   ├── client.ts
│   │   └── rates.ts
│   └── currency/               # ← ENHANCED (formatting)
│
└── middleware.ts               # ← UPDATED (i18n routing)
```

---

## Integration Checklist

### Pre-Launch (i18n.1)
- [ ] next-intl installed & configured
- [ ] middleware routing working
- [ ] File structure in place
- [ ] Helper hooks functional
- [ ] Build/lint passing

### Mid-Launch (i18n.2 + i18n.3)
- [ ] 40+ translations keyed
- [ ] Native reviewer approved (PT, BR, EN)
- [ ] Forex rates cached
- [ ] Stripe multi-currency working
- [ ] UI formatting localized

### Final Launch (i18n.4)
- [ ] Locale selector in header
- [ ] User preference persistence
- [ ] Mobile-responsive
- [ ] Accessibility verified (WCAG AA)
- [ ] E2E testing across locales

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Routing complexity with existing auth | Test auth flow with new locale routes |
| Incomplete translations (typos, missing keys) | Native review + QA checklist |
| Forex API down | Local fallback rates + cache |
| Mobile selector UX | Design with @ux-design-expert |
| Performance regression | Monitor Lighthouse per locale |

---

## Future Phases (Not in Scope Q2)

### Q3 2026: i18n Phase 2
- [ ] Spanish (ES) support
- [ ] Email translations
- [ ] SEO hreflang tags
- [ ] Crowdin integration
- [ ] Analytics translations

### Q4 2026+: Compliance & Localization
- [ ] GDPR (EU)
- [ ] LGPD (Brazil)
- [ ] Local payment methods (PIX, iDEAL, etc)
- [ ] Tax reporting per country

---

## Go/No-Go Decision

**Ready to Start?** YES ✅

**Blockers:** None  
**Critical Path:** i18n.1 → i18n.2/3 (parallel) → i18n.4  
**Target Launch:** 2026-05-31 (6 weeks from now)

---

## Stories Index

- **[i18n.1.story.md](i18n.1.story.md)** — Infrastructure Setup
- **[i18n.2.story.md](i18n.2.story.md)** — Core UI Translation
- **[i18n.3.story.md](i18n.3.story.md)** — Multi-Currency Support
- **[i18n.4.story.md](i18n.4.story.md)** — Locale Selector

---

**Next Action:** Começar com **Story i18n.1** (@dev agent, 8-9h)

