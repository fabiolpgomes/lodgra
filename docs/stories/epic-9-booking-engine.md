# Epic 9: Booking Engine + Páginas Públicas de Propriedade

**Status:** ✅ Done
**Prioridade:** P0 — Estratégico (redução de dependência Airbnb/Booking)
**Objectivo:** ✅ Completo — Gerar reservas directas no homestay.pt, eliminando comissões a plataformas externas

---

## Visão

Transformar o homestay.pt de uma ferramenta de gestão interna num canal de reservas directas. Cada propriedade terá uma página pública, indexável pelo Google, com calendário de disponibilidade e motor de reserva com pagamento integrado.

**Proposta de valor ao cliente SaaS:**
> "Tenha reservas directas pelo Google sem pagar comissão ao Airbnb"

---

## Objectivos de Negócio

| Objectivo | Métrica de Sucesso |
|-----------|-------------------|
| Activar canal directo de reservas | ≥1 reserva directa nos primeiros 30 dias após lançamento |
| Reduzir dependência de OTAs | Reservas directas > 10% do total em 90 dias |
| Melhorar SEO | Propriedades indexadas no Google em 30 dias |
| Diferenciação SaaS | Funcionalidade de booking engine como argumento de venda |

---

## Stories do Epic (Sequência de Execução)

| Story | Título | Prioridade | Dependências | Estimativa |
|-------|--------|-----------|--------------|------------|
| **9.1** | Páginas Públicas (`/p/[slug]`) | P0 | — | 2-3 dias |
| **9.2** | Calendário de Disponibilidade Público | P0 | 9.1 | 1-2 dias |
| **9.3** | Motor de Preços (Pricing Rules) | P1 | 9.1 | 1-2 dias |
| **9.4** | Fluxo de Checkout (Booking Engine) | P0 | 9.1, 9.2, 9.3 | 3-4 dias |
| **9.5** | Confirmação + Webhook Stripe + Emails | P0 | 9.4 | 1-2 dias |

**Total estimado: 8-13 dias de desenvolvimento**

---

## Arquitectura de Alto Nível

```
[Hóspede]
    ↓ acede a
/p/[slug]                        ← página pública (9.1)
    ↓ vê calendário
GET /api/public/properties/[slug]/availability   ← (9.2)
    ↓ selecciona datas + vê preço
GET /api/public/properties/[slug]/pricing        ← (9.3)
    ↓ clica "Reservar"
/p/[slug]/checkout               ← form multi-step (9.4)
    ↓ preenche dados + clica "Pagar"
POST /api/public/bookings        ← cria reservation (pending_payment)
    ↓ redireciona para
[Stripe Checkout]                ← pagamento seguro
    ↓ callback
POST /api/stripe/booking-webhook ← confirma reserva (9.5)
    ↓ envia emails (Resend)
[Hóspede ← email de confirmação]
[Gestor ← email de nova reserva]
    ↓ reserva visível em
[Dashboard Admin] + [iCal Export]
```

---

## Novas Tabelas / Schema

| Tabela | Story | Descrição |
|--------|-------|-----------|
| `properties.slug` | 9.1 | URL slug único por propriedade |
| `properties.description` | 9.1 | Descrição pública |
| `properties.photos` | 9.1 | Array de URLs de fotos |
| `properties.amenities` | 9.1 | Array de comodidades |
| `properties.is_public` | 9.1 | Toggle visibilidade pública |
| `pricing_rules` | 9.3 | Regras de preço por época |
| `reservations.stripe_*` | 9.4 | Campos Stripe para reservas directas |
| `reservations.booking_source` | 9.4 | 'direct', 'airbnb', 'booking', 'ical' |
| `reservations.guest_*` | 9.4 | Dados do hóspede na reserva |

---

## Novas ENV Vars

```
STRIPE_BOOKING_WEBHOOK_SECRET=whsec_...   # webhook separado para reservas
```

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Double booking (race condition) | Média | Alto | Re-check de disponibilidade server-side antes de criar reserva |
| Reservas pending_payment abandonadas | Alta | Baixo | Cron cleanup após 30 min |
| Slug duplicado ao criar propriedade | Baixa | Médio | Constraint UNIQUE + fallback com número |
| Stripe webhook falhar | Baixa | Alto | Idempotency key + retry automático Stripe |

---

## Critérios de Conclusão do Epic

- [x] Todas as 5 stories com Status = Done ✅
- [x] End-to-end testado: visita página → selecciona datas → paga → recebe email ✅
- [x] iCal export inclui reservas directas (sem double-booking no Airbnb) ✅
- [x] SEO verificado: página indexável, meta tags correctas ✅
- [x] Mobile-first verificado em iOS e Android ✅

---

---

## Epic Completion Summary

**Status:** ✅ **CLOSED — 2026-03-30**

**Deliverables Completed:**
- ✅ Story 9.1 — Public property pages `/p/[slug]` with SEO meta tags
- ✅ Story 9.2 — Public availability calendar with real-time blocking logic
- ✅ Story 9.3 — Dynamic pricing rules engine (per-epoch rates + min nights)
- ✅ Story 9.4 — Checkout flow with Stripe integration (multi-step form)
- ✅ Story 9.5 — Webhook confirmation + email notifications (guest + manager)

**Additional Fixes (Post-QA):**
- ✅ Fixed reservation conflict check: only blocks `confirmed`, not `pending_payment`
- ✅ Ensured `direct` platform exists for direct booking tracking
- ✅ Added commission calculation in public booking API
- ✅ Resolved tech debt: code deduplication in pricing functions, ISR expiry reduction

**Business Impact:**
- 🎯 Direct booking channel live and operational
- 💰 Reduced platform dependency (Airbnb/Booking commissions avoided)
- 📊 Full commission tracking and reporting implemented
- 🔒 Double-booking prevention + conflict detection working

**Ready for Production:** Yes ✅

---

## Próximo Epic (pós-9)

**Epic 10 — Google Vacation Rentals Feed**
Pré-requisito: Epic 9 completo (páginas públicas + motor de reservas funcionais)
- Feed JSON de propriedades (ARI)
- Landing pages consistentes com feed
- Candidatura ao Google Connectivity Partner

— Morgan, planejando o futuro 📊
