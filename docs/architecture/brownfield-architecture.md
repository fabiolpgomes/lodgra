# Home Stay — Arquitectura do Sistema (Brownfield)
*Gerado automaticamente — 2026-03-18*

---

## Stack Técnica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js App Router | 16.1.6 |
| Linguagem | TypeScript | 5.x |
| UI | React + Tailwind CSS | 19.2 / 4.x |
| Base de Dados | Supabase (PostgreSQL) | 2.90.1 |
| Auth | Supabase Auth (OAuth + email) | — |
| Pagamentos | Stripe | 20.4.0 |
| Email | Resend | 6.9.2 |
| Cache / Rate Limit | Upstash Redis | 1.36.3 |
| Queue | Upstash QStash | 2.9.0 |
| AI (email parser) | Anthropic Claude Haiku | claude-haiku-4-5 |
| Gráficos | Recharts + Chart.js | 3.6.0 |
| Deployment | Vercel | — |

---

## Arquitectura Geral

```
Browser (Next.js SSR/CSR)
    │
    ├── Middleware (CSRF, Rate Limit, Session, Subscription Gate)
    │
    ├── App Router Pages (/app)
    │       ├── Public: /, /login, /register, /subscribe, /privacy, /terms
    │       ├── Onboarding: /onboarding (3 steps)
    │       └── Privadas: /dashboard, /properties, /reservations,
    │                      /expenses, /calendar, /reports, /financial,
    │                      /owners, /settings, /account, /admin, /sync
    │
    ├── API Routes (/api)
    │       ├── Auth: /auth/callback
    │       ├── Resources: properties, reservations, expenses, owners, users
    │       ├── iCal: /ical/[propertyId] (export), /sync/import
    │       ├── Stripe: /stripe/checkout, /stripe/webhook
    │       ├── Email: /email/connect, /email/callback (OAuth Gmail)
    │       ├── Notifications: /notifications/owner-reservation
    │       └── Cron: /cron/sync-ical, /cron/daily-checkins, /cron/cleanup
    │
    └── Supabase (PostgreSQL + Auth + RLS)
            ├── 13 tabelas core
            ├── RLS policies por organization_id
            └── get_user_organization_id() + user_has_property_access()
```

---

## Modelo de Dados

### Tabelas Core

```
organizations (1)
    └── user_profiles (n) [roles: admin, manager, viewer]
    └── properties (n)
            └── property_listings (n) [platform + ical_url]
                    └── reservations (n) [iCal sync, manual]
                            └── guests (1)
    └── owners (n) [percentagem propriedade]
    └── expenses (n) [por propriedade]
    └── email_connections (n) [Gmail OAuth, deprecated]
    └── audit_logs (n)

user_properties (n:n) [user ↔ property acesso granular]
email_parse_log [auditoria parsing]
```

### Multi-tenancy
- `organization_id` em todas as tabelas
- RLS via `get_user_organization_id()` — isolamento total por org
- Admin bypassa RLS com `createAdminClient()` (service role)

---

## Sistema de Autorização

```
requireRole(['admin', 'manager', 'viewer'])
    ├── Cache L1: Upstash Redis (5 min TTL, ~1ms)
    ├── Cache L2: RPC get_my_profile() Postgres (~15ms)
    └── Fallback: supabase.auth.getUser() (~50ms)

Roles:
  admin   → tudo (criar users, editar org, acesso all properties)
  manager → criar/editar properties, reservas, despesas
  viewer  → read-only, acesso filtered properties
```

---

## Integrações Externas

### Stripe (SaaS Billing)
- Checkout session → webhook → cria/actualiza organization
- Subscription states: `trial` → `active` → `cancelled` / `past_due`
- Middleware bloqueia acesso se não `active`

### iCal (Core Feature)
- Import: user fornece URL → cron `sync-ical` (5 min) → parse → upsert reservations
- Export: token-based URL `/api/ical/[propertyId]?token=xxx`
- Suporte: Airbnb, Booking.com, Flatio, outros
- Deduplicação: `external_id` (UID evento iCal)

### Resend (Email)
- Notificações check-in (cron `daily-checkins`)
- Queue FIFO (Upstash QStash)

### Anthropic Claude (AI)
- Parse emails confirmação reserva (feature deprecated)
- Modelo: claude-haiku-4-5

---

## Segurança

| Mecanismo | Implementação |
|-----------|--------------|
| CSRF | Origin header check (middleware) |
| Rate Limiting | Upstash Redis sliding-window (15 min) |
| Session | JWT cookie, refresh automático |
| RLS | PostgreSQL row-level security |
| Token Encryption | pgp_sym_encrypt (Gmail tokens) |
| Headers | HSTS, X-Frame-Options, CSP |
| Audit | audit_logs table (todas acções) |

---

## Cron Jobs

| Job | Frequência | Descrição |
|-----|-----------|-----------|
| sync-ical | 5 min | Sincroniza todos os listings com sync_enabled |
| daily-checkins | Diário | Notifica check-ins próximos 7 dias |
| cleanup | Semanal | Remove reservas muito antigas |
| email-parser | — | DEPRECATED |

---

## Estado do MVP — Funcionalidades

### ✅ Implementado e Funcional
- Gestão de propriedades (CRUD + listings por plataforma)
- Reservas (CRUD + iCal sync + deduplicação + multi-moeda)
- Despesas (CRUD + filtros persistentes)
- Hóspedes (auto-criados via iCal, CRUD)
- Proprietários (CRUD, mas não vinculados a cálculos)
- Autenticação OAuth + email/password + 3 roles
- Multi-tenancy (org isolation, RLS)
- SaaS billing (Stripe checkout + webhook + subscription gate)
- Calendário visual (view-only)
- Relatórios financeiros (P&L, receita, despesas, canal, cash flow)
- Dashboard com gráficos e KPIs
- Gestão de utilizadores (admin: criar/editar/apagar + password reset)
- Settings iCal (add/remove URLs, export)
- Cron jobs automáticos
- Landing page + onboarding wizard
- Rate limiting, CSRF, auditoria

### ⚠️ Gaps Identificados

#### Críticos para Comercialização
1. **Proprietários não vinculados** — `owners` table existe mas `owner_id` não está em `reservations`; cálculos de partilha de receita não implementados
2. **Compliance fiscal ausente** — sem relatórios IRS/AT (PT) ou DARF (BR)
3. **Sem testes unitários** — apenas e2e Playwright; sem coverage garantida
4. **Console.logs debug** — em `properties/page.tsx` e outros
5. **pasta `app_backup/`** — código legado no repositório

#### Importantes (Roadmap pós-MVP)
6. **Calendário drag-drop** — view-only, sem edição visual
7. **SMS/WhatsApp** — apenas email via Resend
8. **Upload documentos** — sem contratos/recibos
9. **CSP permissiva** — `unsafe-inline` scripts
10. **Sem 2FA** — apenas password + OAuth
11. **API Documentation** — sem OpenAPI/Swagger
12. **Preços sazonais** — sem dynamic pricing

---

*Documento gerado pelo workflow brownfield-fullstack — @architect*
