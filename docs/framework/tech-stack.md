# Tech Stack

Stack efetivamente declarada no repositório em 2026-07-19.

| Camada | Tecnologia |
|---|---|
| Runtime/aplicação | Node.js, TypeScript 5, Next.js 15 App Router |
| UI | React 19, Tailwind CSS 4, Radix/shadcn, next-intl |
| Dados/autenticação | Supabase/PostgreSQL com RLS; Clerk também instalado para autenticação da aplicação |
| Validação/testes | Zod 4, Jest 29, Testing Library, Playwright |
| E-mail | Resend; Gmail OAuth é integração legada do parser |
| Pagamentos | Stripe |
| Observabilidade | Sentry e logger da aplicação |
| Deploy/armazenamento | Vercel e Vercel Blob |
| Integrações da Story 38.1 | Resend Inbound, iCal (`ical.js`), Anthropic SDK no parser legado |

O `package.json` e lockfile são a fonte de verdade para versões. Não adicionar provedor ou framework alternativo sem decisão arquitetural rastreável. O banco canônico continua PostgreSQL/Supabase; `organization_id` é a fronteira de tenancy.

Fontes: `package.json`, `docs/architecture/brownfield-architecture.md`, `docs/architecture/email-parsing.md`, `docs/architecture/adr-0381-email-ical-phase-0.md`.
