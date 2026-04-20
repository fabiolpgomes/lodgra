# Lodgra — Global Hospitality Management Platform

Plataforma completa de gestão de propriedades de curta duração. Rebranding e evolução global do sistema Home Stay, com suporte nativo a 3 mercados, 3 idiomas e 8 moedas.

🌍 **Mercados:** 🇧🇷 Brasil (PT-BR) | 🇵🇹 Portugal (PT-PT) | 🇺🇸 USA (EN-US)

---

## Estado Actual (2026-04-19)

**Fase:** Staging → Produção  
**Origem:** Rebranding do sistema Home Stay (produção activa)  
**Estratégia:** Lodgra substitui Home Stay com novo domínio, nova landing page e foco global

---

## Funcionalidades

### Core (produção-ready)
- Gestão de propriedades multi-moeda (EUR, BRL, USD + 5 outras)
- Sincronização iCal automática (Airbnb, Booking.com, VRBO)
- Gestão de reservas com detecção de overbooking
- Gestão de despesas por categoria e propriedade
- Calendário visual drag-drop multi-propriedade
- Dashboard financeiro com gráficos (receita, ocupação, lucro)
- Relatórios exportáveis (PDF, Excel)
- Gestão de equipe com permissões por propriedade (Admin/Gestor/Viewer)
- Relatórios por proprietário
- Compliance fiscal (PT IRS Categoria F)

### Billing & Subscriptions
- Planos Stripe: Starter (€19/R$29) · Professional (€49/R$99) · Business (€99/R$199)
- Upgrade/downgrade com proration automática
- Portal de faturação Stripe (invoices, cancelamento)
- Webhooks: checkout, subscription updated/deleted, payment failed
- Cache Upstash Redis para estado de subscrição

### Public Booking
- Listagem pública de propriedades com filtros
- Página de propriedade com galeria, mapa e booking widget
- Disponibilidade em tempo real
- Checkout Stripe integrado
- Suporte a min_nights por propriedade
- Moeda dinâmica por localização

### Landing Page
- Arquitectura modular (atoms/molecules/organisms)
- 3 locales: pt-BR, en-US, es
- Dark mode (ThemeProvider + ThemeToggle)
- Secções: Hero, ValueProposition, Features, SocialProof, Pricing, FAQ, FinalCTA, Footer
- Pricing alinhado com planos Stripe reais
- CTAs redirecionam para `/register`

### Infraestrutura
- Next.js 15 App Router + `proxy.ts` (migrado de middleware)
- Supabase (Auth, Database, Storage, RLS)
- Sentry (error tracking, instrumentation)
- PWA (service worker, manifest, install banner)
- Segurança: CSP, CSRF, rate limiting, nonce
- RGPD/LGPD: consent, data export, data deletion

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 15 (App Router) |
| Auth & DB | Supabase |
| Pagamentos | Stripe |
| Email | Resend |
| Cache | Upstash Redis |
| Monitoring | Sentry |
| Estilo | Tailwind CSS v4 |
| i18n | next-intl |
| Deploy | Vercel |

---

## Planos Stripe

| Plano | EUR | BRL | Limite |
|-------|-----|-----|--------|
| Starter | €19/mês | R$29/mês | 3 propriedades |
| Professional | €49/mês | R$99/mês | 10 propriedades |
| Business | €99/mês | R$199/mês | Ilimitado |

---

## Variáveis de Ambiente Necessárias

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_STARTER_EUR=
STRIPE_PRICE_ID_PROFESSIONAL_EUR=
STRIPE_PRICE_ID_BUSINESS_EUR=
STRIPE_PRICE_ID_STARTER_BRL=
STRIPE_PRICE_ID_PROFESSIONAL_BRL=
STRIPE_PRICE_ID_BUSINESS_BRL=

# App
NEXT_PUBLIC_APP_URL=

# Serviços opcionais
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
SENTRY_DSN=
CRON_SECRET=
```

---

## Desenvolvimento Local

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # verificar build
npm run lint       # linting
npm run typecheck  # type checking
```

---

## Estrutura de Pastas Relevante

```
src/
├── app/
│   ├── page.tsx                    # Root → LandingPageClient (pt-BR)
│   ├── landing/page.tsx            # /landing com suporte a ?locale=
│   ├── [locale]/                   # Rotas autenticadas (pt, en, es)
│   ├── p/[slug]/                   # Páginas públicas de propriedade
│   ├── properties/                 # Listagem pública
│   └── api/                        # API routes
├── components/
│   ├── landing/                    # Landing page modular
│   │   ├── organisms/              # Navbar, Hero, Features, SocialProof, Pricing, FAQ, Footer
│   │   ├── molecules/              # FAQItem, FeatureCard, PricingCard
│   │   └── atoms/                  # Badge, Button, Card, Container, Logo
│   ├── common/                     # Componentes partilhados
│   ├── features/                   # Componentes de funcionalidades
│   └── billing/                    # PlanManagement
├── lib/
│   ├── billing/plans.ts            # Definição de planos + helpers Stripe
│   ├── cache/subscriptionCache.ts  # Cache Upstash Redis
│   ├── currency/symbols.ts         # Mapeamento moeda → símbolo
│   └── middleware/                 # auth-guard, csrf, rate-limit, security-headers
├── proxy.ts                        # Proxy Next.js (auth + segurança)
└── types/                          # Tipos TypeScript partilhados

public/
└── locales/
    ├── pt-BR/landing.json
    ├── en-US/landing.json
    └── es/landing.json

supabase/
└── migrations/                     # Migrations SQL ordenadas
```

---

## Pendente para Produção

- [ ] Configurar webhook Stripe no dashboard → `https://DOMINIO/api/stripe/webhook`
  - Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- [ ] Configurar variáveis de ambiente no Vercel
- [ ] Apontar domínio Lodgra
- [ ] Executar migrations pendentes no Supabase produção (`20260417_01_fix_property_currency_by_country.sql`)
- [ ] Testar fluxo completo de checkout → webhook → onboarding
