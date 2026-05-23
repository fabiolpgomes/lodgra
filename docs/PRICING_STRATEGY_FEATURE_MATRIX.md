# Lodgra Pricing Strategy & Feature Matrix

**Status:** Product strategy draft for validation  
**Last updated:** 2026-05-23  
**Scope:** Brazil go-to-market, self-serve SaaS, fixed packages + extra property add-on  
**Decision needed:** approve feature packaging, implement gates, update landing/pricing copy

---

## 1. Executive Summary

Lodgra already has the three subscription prices defined, but the product value needs to be packaged in a way that a host understands in less than 30 seconds.

The recommended strategy is not to sell "more features". It is to sell a maturity ladder:

| Plano | Quem compra | Promessa comercial | Modelo |
|---|---|---|---|
| **Essencial** | Proprietario com 1 unidade | "Saia da planilha e controle uma unidade com lucro claro." | R$59/mes, 1 unidade |
| **Expansao** | Gestor crescendo com ate 3 unidades | "Coordene reservas, limpeza e financeiro por unidade sem aumentar o caos." | R$149/mes, ate 3 unidades |
| **Premium** | Operador profissional com ate 10 unidades | "Automatize operacao, proprietarios e receita com inteligencia de portfolio." | R$397/mes, ate 10 unidades + R$49/imovel extra |

### Core positioning

Lodgra deve ser vendido no Brasil como:

> Sistema de controle de lucro e operacao para aluguel por temporada.

Esse posicionamento e mais forte do que "PMS", porque ataca a dor real: o operador nao sabe exatamente quanto lucra por imovel, perde tempo conciliando reservas e cresce com operacao manual.

### Important technical finding

Hoje o arquivo [src/lib/billing/plans.ts](/Users/fabiogomes/Projetos/lodgra/src/lib/billing/plans.ts) ainda define `maxProperties: null` para todos os planos. Isso contradiz a regra comercial de Essencial = 1 unidade e precisa virar P0 antes da venda em escala.

### Agent review summary

Este documento foi revisado com dois olhares:

- **PM/comercial:** simplificar a oferta, manter Expansao como plano recomendado e vender a escada "controle -> coordenacao -> inteligencia".
- **Arquitetura:** separar features disponiveis de roadmap, implementar gates server-side e manter cobranca metered como roadmap, nao como dependencia do MVP Brasil.

---

## 2. Pricing Rules

### Confirmed Brazil pricing

| Plano | Base | Variavel | Unidade de cobranca | Melhor para |
|---|---:|---:|---|---|
| **Essencial** | R$59/mes | Sem variavel | 1 unidade | Dono-operador |
| **Expansao** | R$149/mes | Sem variavel no MVP | Ate 3 unidades | Gestor em crescimento |
| **Premium** | R$397/mes | R$49/mes por imovel extra | Ate 10 unidades + extras | Operacao profissional |

### Billing interpretation

- **Essencial:** assinatura fixa mensal, limite real de 1 unidade.
- **Expansao:** assinatura fixa mensal com ate 3 unidades ativas incluidas.
- **Premium:** assinatura fixa mensal com ate 10 unidades ativas incluidas.
- **Imovel extra Premium:** cobrar R$49/mes por unidade ativa acima da 10a unidade.
- **Sem taxa por reserva no MVP Brasil:** reduz calculo mental, aumenta previsibilidade e facilita adesao.
- **Sem 1% da receita no MVP Brasil:** manter como opcao futura de plano Enterprise/Revenue Share, depois que houver prova de ROI e maturidade operacional.

### Billing guardrails

Antes de ativar venda automatica em volume, o Lodgra precisa de:

- Controle confiavel de unidades ativas por organizacao.
- Sincronizacao do `quantity` no Stripe apenas para imoveis extras do Premium, ou um add-on separado de R$49 por unidade extra.
- Regra clara de downgrade: nao permitir descer de plano se a conta excede o limite de unidades do destino.
- Tela administrativa de previsao de fatura: plano, unidades incluidas, unidades extras e total estimado.
- Manter ledger de usage/metered como roadmap caso o Lodgra volte a cobrar por reserva ou receita no futuro.

### Recommendation on friction

Para vender no automatico, a pagina de precos deve mostrar:

- "Comece com 1 unidade" no Essencial.
- Expansao como plano recomendado: "ate 3 imoveis".
- Premium com preco previsivel: "ate 10 imoveis; extras por R$49".
- CTA de upgrade contextual dentro do app quando o usuario bater limite.
- Sem tabela gigante no primeiro viewport; tabela detalhada abaixo.

---

## 3. Feature Packaging Strategy

### Product ladder

| Nivel | Nome interno | Resultado que o cliente compra |
|---|---|---|
| 1 | Controle | Propriedade, reservas, calendario, financeiro basico |
| 2 | Coordenacao | Multiplas unidades, equipe, limpeza, relatorios por proprietario |
| 3 | Inteligencia | Automacao, canais, API, BI avancado, suporte prioritario |

### Packaging principles

- **Essencial nao pode parecer "capado".** Ele precisa resolver 100% da dor de uma unidade.
- **Expansao deve ser o plano recomendado.** Ele captura o cliente que esta crescendo e tem maior chance de ativar valor.
- **Premium deve ser vendido por ROI, nao por preco.** O cliente paga mais porque tem operacao maior, relatorios, automacoes e suporte prioritario.
- **Feature gate deve estar ligado a momento de valor.** Exemplo: quando o usuario tenta cadastrar a segunda unidade, oferecer Expansao.

---

## 4. Detailed Feature Matrix

Legend:

- **Included:** liberado no plano.
- **Limited:** liberado com limite.
- **Upgrade:** bloqueado com CTA contextual.
- **Roadmap:** ainda precisa implementacao ou acabamento antes de prometer publicamente.

### 4.1 Core property and calendar

| Feature | Essencial | Expansao | Premium | Status |
|---|---|---|---|---|
| Cadastro de unidades | 1 unidade | Ate 3 unidades | Ate 10 unidades + R$49/extra | Needs gate |
| Calendario unificado | Included | Included | Included | Existing |
| CRUD de reservas | Included | Included | Included | Existing |
| Validacao de disponibilidade | Included | Included | Included | Existing |
| iCal import/export | 1 unidade | Todas as unidades | Todas as unidades | Existing/needs limits |
| Sincronizacao automatica iCal | Daily/basic | Mais frequente | Mais frequente + prioridade | Existing/needs tier policy |
| Deteccao de conflito/overbooking | Basic | Included | Included + alertas | Existing/partial |
| Regras de preco/minimo de noites | Basic | Sazonal/manual | Avancado + recomendacoes | Existing/roadmap |
| Pagina publica da propriedade | Included | Included | Included | Existing |
| Motor de reserva direta | Included | Included | Included | Existing |

### 4.2 Financial management

| Feature | Essencial | Expansao | Premium | Status |
|---|---|---|---|---|
| Dashboard de receita, ocupacao, ADR | Basic | Advanced | Portfolio BI | Existing |
| P&L por unidade | Basic mensal | Advanced por periodo | Advanced + portfolio | Existing |
| Controle de despesas | Included | Included | Included | Existing |
| Categorias de despesas | Basic | Advanced | Advanced | Existing |
| Receita por canal | Included | Included | Included | Existing |
| Export CSV | Limited | Included | Included | Existing |
| Export PDF | Limited | Included | Scheduled | Existing/roadmap |
| Relatorio de proprietario | Upgrade | Included | Included + envio recorrente | Existing/needs gate |
| Split/comissao de gestao | Upgrade | Included | Included | Existing/needs gate |
| Compliance fiscal PT/BR | Upgrade | Included | Included + consolidado | Existing/partial |
| Forecast de caixa | Upgrade | Included | Included + cenarios | Existing/roadmap |
| Ranking de lucro por unidade | Upgrade | Included | Included | Roadmap/BI |

### 4.3 Operations and cleaning

| Feature | Essencial | Expansao | Premium | Status |
|---|---|---|---|---|
| Checklist de limpeza | Template simples | Templates customizados | Automacao por reserva | Existing/partial |
| Atribuicao de tarefas | Upgrade | Included | Included | Existing/needs gate |
| Portal de limpeza | Upgrade | Included | Included | Existing |
| Acesso por WhatsApp | Upgrade | Included | Included | Existing/phase 29 |
| Dashboard do gestor de limpeza | Upgrade | Included | Included | Existing |
| Notificacoes de limpeza | Upgrade | Included | Included + automacoes | Roadmap |
| Evidencia por foto | Upgrade | Included | Included | Existing/partial |
| Manutencao/tickets | Upgrade | Limited | Included | Roadmap |

### 4.4 Guest communication and payments

| Feature | Essencial | Expansao | Premium | Status |
|---|---|---|---|---|
| Email de confirmacao | Included | Included | Included | Existing |
| Templates de mensagem | Basic | Included | Included + IA | Existing/roadmap |
| WhatsApp para hospede | Upgrade | Limited | Included | Roadmap Epic 30 |
| Chat do hospede | Upgrade | Upgrade/add-on | Included | Roadmap |
| Assistente IA para respostas | Upgrade | Upgrade/add-on | Included | Roadmap |
| Traducao automatica | Upgrade | Upgrade/add-on | Included | Roadmap |
| Stripe checkout para reservas diretas | Included | Included | Included | Existing |
| PIX/Boleto via Asaas | Included BR | Included BR | Included BR | Existing |
| Lembrete automatico check-in/out | Upgrade | Limited | Included | Roadmap |

### 4.5 Distribution and integrations

| Feature | Essencial | Expansao | Premium | Status |
|---|---|---|---|---|
| Booking.com via iCal | 1 unidade | Included | Included | Existing |
| Booking.com API/webhook | Upgrade | Limited/read | Included | Existing/needs policy |
| Google Vacation Rentals feed | Upgrade | Included | Included + prioridade | Existing |
| Airbnb sync | Upgrade | Roadmap/read-only | Included when available | Roadmap |
| Vrbo/HomeAway | Upgrade | Roadmap | Included when available | Roadmap |
| Webhooks outbound | Upgrade | Limited | Included | Roadmap |
| REST API | Upgrade | Upgrade/add-on | Included | Roadmap |
| Zapier/Make | Upgrade | Upgrade/add-on | Included | Roadmap |

### 4.6 Team, security, support

| Feature | Essencial | Expansao | Premium | Status |
|---|---|---|---|---|
| Usuarios internos | 2 usuarios | 5 usuarios | Ilimitado | Needs gate |
| Roles admin/gestor/viewer/cleaner | Basic | Included | Included | Existing |
| Permissoes por propriedade | Upgrade | Included | Included | Existing |
| Audit logs | Basic | Included | Included | Existing |
| Data export LGPD/GDPR | Included | Included | Included | Existing |
| 2FA | Upgrade | Upgrade/add-on | Included | Roadmap |
| Suporte | Email 48h | Email 24h | Prioritario 4h | Process |
| Onboarding guiado | Self-serve | Self-serve + templates | Call de setup opcional | Process |

---

## 5. Plan Narratives

### 5.1 Essencial - R$59/mes

**Promise:** "Controle uma unidade com clareza de lucro, reservas e despesas."

**For:** anfitriao solo, proprietario de uma casa/apartamento, primeiro negocio de aluguel por temporada.

**Includes:**

- 1 unidade ativa.
- Calendario, reservas, disponibilidade e pagina publica.
- iCal basico para uma unidade.
- Dashboard financeiro basico.
- Despesas e receitas por periodo.
- Reserva direta com Stripe/PIX quando configurado.
- Exportacoes limitadas.
- 2 usuarios.

**Does not include:**

- Segunda unidade.
- Relatorio de proprietario.
- Portal completo de limpeza.
- Automacoes WhatsApp.
- API, webhooks, IA, BI avancado.

**Upgrade trigger:** tentativa de adicionar segunda unidade, necessidade de dividir relatorio com proprietario, ou uso recorrente de limpeza/equipe.

### 5.2 Expansao - R$149/mes, ate 3 unidades

**Promise:** "Cresca para varias unidades sem perder controle operacional."

**For:** co-host, pequeno gestor, administradora local, operador com 2-3 unidades.

**Includes everything from Essencial, plus:**

- Ate 3 unidades ativas incluidas.
- Relatorios financeiros por unidade e por proprietario.
- Split/comissao de gestao.
- Compliance fiscal PT/BR.
- Limpeza: tarefas, checklist, portal, WhatsApp operacional.
- Google Vacation Rentals feed.
- Booking/iCal multi-unidade.
- 5 usuarios.
- Suporte 24h.

**Variable fee logic:**

- Sem taxa por reserva no MVP Brasil.
- O valor fixo melhora previsibilidade e facilita compra self-serve.
- Se o cliente passar de 3 unidades, o upgrade natural e Premium.

**Upgrade trigger:** tentativa de cadastrar 4a unidade, equipe maior, necessidade de automacao/IA/API, ou portfolio mais profissional.

### 5.3 Premium - R$397/mes, ate 10 unidades + R$49/imovel extra

**Promise:** "Transforme a operacao em portfolio profissional, com automacao e inteligencia."

**For:** property manager, empresa de gestao, operador com donos externos, equipe e 4+ unidades.

**Includes everything from Expansao, plus:**

- BI de portfolio.
- Automacoes avancadas.
- Relatorios recorrentes.
- API/webhooks quando disponiveis.
- Guest messaging avancado e IA quando disponivel.
- Suporte prioritario.
- Usuarios ilimitados.
- Preparado para canais avancados e integrações futuras.

**Variable fee logic:**

- Ate 10 unidades incluidas no preco base.
- Unidade extra acima da 10a: R$49/mes por imovel ativo.
- Sem taxa por receita no MVP Brasil; revenue share pode virar Enterprise depois.

**Upgrade trigger:** operador quer reduzir custo operacional, consolidar dados para proprietarios, automatizar comunicacao e escalar portfolio.

---

## 6. Real Use Cases

### Maria - proprietaria com 1 apartamento

Maria tem um apartamento em Florianopolis. Ela recebe reservas pelo Airbnb, Booking e indicacoes. Hoje controla datas em agenda, despesas em planilha e so descobre o lucro real no fim do mes.

**Plano recomendado:** Essencial.

**Why she buys:**

- Quer parar de errar data e esquecer despesa.
- Precisa saber lucro mensal de uma unidade.
- Nao tem equipe, nao precisa de automacao pesada.

**Monthly bill:** R$59.

**Aha moment:** em ate 5 minutos, Maria cadastra a unidade, ve o calendario e adiciona uma despesa. O dashboard mostra lucro estimado do mes.

**Likely upgrade:** quando cadastrar segunda unidade ou comecar a terceirizar limpeza.

### Joao - co-host com 3 unidades

Joao administra tres apartamentos de terceiros em duas cidades. Ele recebe reservas, aciona diaristas por WhatsApp, calcula comissao manualmente e envia relatorio para proprietarios no fim do mes.

**Plano recomendado:** Expansao.

**Why he buys:**

- Precisa de relatorio por proprietario.
- Precisa organizar limpeza por reserva.
- Precisa ver lucro por unidade, nao apenas receita total.

**Example bill:**

- Expansao com ate 3 unidades incluidas.
- Sem taxa por reserva no MVP.
- **Total:** R$149/mes.

**ROI story:** se Joao economiza 8 horas/mes em relatorios e evita 1 erro operacional, o sistema ja se paga.

**Likely upgrade:** quando receita mensal passar de R$50k ou quando precisar de automacoes e BI de portfolio.

### Helena - empresa com 12 unidades

Helena gere 12 unidades, tem equipe de limpeza, donos diferentes e canais variados. O problema dela nao e cadastrar reserva; e manter margem, padronizar operacao e provar resultado aos proprietarios.

**Plano recomendado:** Premium.

**Why she buys:**

- Precisa de visao consolidada de portfolio.
- Quer reduzir trabalho manual de equipe.
- Precisa de relatorios recorrentes e controle de comissao.
- Quer suporte prioritario e roadmap de integracoes.

**Example bill:**

- Premium ate 10 unidades = R$397.
- 2 imoveis extras x R$49 = R$98.
- **Total:** R$495/mes.

**ROI story:** se Premium evita uma falha de limpeza, reduz retrabalho de relatorio e economiza algumas horas de equipe, o plano ja se paga. Com 12 unidades, R$495/mes e uma compra previsivel e facil de aprovar.

---

## 7. Upgrade And Expansion Mechanics

### In-app upgrade triggers

| Trigger | Message | Target plan |
|---|---|---|
| Usuario tenta cadastrar 2a unidade no Essencial | "Sua proxima unidade pede Expansao." | Expansao |
| Usuario tenta gerar relatorio de proprietario | "Relatorios de proprietario estao no Expansao." | Expansao |
| Usuario cria tarefa de limpeza recorrente | "Automatize limpeza por reserva no Expansao." | Expansao |
| Usuario tenta cadastrar 4a unidade no Expansao | "Seu portfolio ja pede Premium." | Premium |
| Mais de 5 usuarios | "Equipe maior pede controle Premium." | Premium |
| Uso alto de relatorios/API | "Automatize o fluxo com Premium." | Premium |
| Usuario Premium tenta cadastrar 11o imovel | "Adicione este imovel extra por R$49/mes." | Premium add-on |

### Sales objections

| Objection | Response |
|---|---|
| "R$149 e muito para 2-3 imoveis." | "O plano custa menos do que uma diaria perdida ou uma falha de limpeza. Ele organiza reservas, relatorios, despesas e proprietarios em uma rotina unica." |
| "R$397 e muito para Premium." | "Para ate 10 imoveis, isso da menos de R$40 por imovel. O ganho vem de relatorio, controle operacional e reducao de retrabalho." |
| "Uso planilha gratis." | "Planilha nao sincroniza reserva, nao previne conflito, nao gera relatorio automatico e nao cria rotina operacional." |
| "Concorrente tem mais integracoes." | "Lodgra entra primeiro onde o dinheiro aparece: lucro por unidade, reservas diretas e operacao limpa." |

---

## 8. Implementation Roadmap

### Phase 0 - Product decision and copy freeze

**Timeline:** 1-2 days  
**Owner:** PM/PO

- [ ] Approve feature packaging in this document.
- [ ] Approve fixed package pricing for Brazil MVP.
- [ ] Define whether Premium extra unit is implemented as Stripe quantity or add-on price.
- [ ] Freeze public pricing copy for landing and checkout.

### Phase 1 - Billing and feature gates

**Timeline:** 3-5 days  
**Owner:** Architect/Dev

- [ ] Replace simple `PlanLimits` with `PlanEntitlements` in [src/lib/billing/plans.ts](/Users/fabiogomes/Projetos/lodgra/src/lib/billing/plans.ts):
  - `features`: owner reports, fiscal compliance, cleaning ops, WhatsApp, API, AI.
  - `quotas`: properties, team members, iCal feeds, photos, documents.
  - `addOns`: premium extra property at R$49/month.
  - `support`: response time and onboarding policy.
- [ ] Apply real limits:
  - Essencial: `maxProperties = 1`
  - Expansao: `maxProperties = 3`
  - Premium: `includedProperties = 10`, `extraPropertyPrice = R$49`
  - Users: 2/5/unlimited
  - iCal feeds: 1/all/all.
- [ ] Replace [src/lib/billing/requirePlanFeature.ts](/Users/fabiogomes/Projetos/lodgra/src/lib/billing/requirePlanFeature.ts) with generic `requireFeature(featureKey)` and `requireQuota(quotaKey, currentCount)`.
- [ ] Fix stale upgrade response from `plan: 'professional'` to the actual target plan: `expansao` or `premium`.
- [ ] Gate property creation server-side when Essencial already has 1 unit.
- [ ] Sync Stripe subscription quantity after property add/remove.
- [ ] Add downgrade rules: block downgrade if current usage exceeds target plan quota.
- [ ] Add tests for plan limits, feature gates, quotas and downgrade blocks.

### Phase 2 - Extra unit billing reliability

**Timeline:** 3-5 days  
**Owner:** Dev/QA

- [ ] Confirm Premium extra unit is billed only when active units > 10.
- [ ] Decide implementation: subscription item quantity vs add-on line item.
- [ ] Add idempotent update when property is created, archived, restored or deleted.
- [ ] Add reconciliation report for active units and billed extra units.
- [ ] Add admin visibility: plan, units included, units extra, estimated invoice.
- [ ] Keep usage billing ledger as roadmap for future revenue-share or per-booking plans.

### Phase 3 - UX for no-friction selling

**Timeline:** 5-8 days  
**Owner:** UX/Dev

- [ ] Update pricing page with simple plan cards and calculator.
- [ ] Add "recommended" badge to Expansao.
- [ ] Add upgrade prompts at feature gates.
- [ ] Add onboarding path by plan:
  - Essencial: cadastrar 1 unidade.
  - Expansao: cadastrar unidades + proprietarios + limpeza.
  - Premium: portfolio + equipe + relatorios.
- [ ] Add trial activation checklist.

### Phase 4 - Analytics and success loops

**Timeline:** 3-5 days  
**Owner:** PM/Data

- [ ] Track pricing page view, plan selected, checkout started, checkout completed.
- [ ] Track feature gate viewed, upgrade CTA clicked, upgrade completed.
- [ ] Track activation milestones: first unit, first reservation, first expense, first report, first cleaning task.
- [ ] Track active units, included units and extra units per organization.
- [ ] Add analytics events:
  - `feature_gate_viewed`
  - `feature_gate_upgrade_clicked`
  - `quota_limit_reached`
  - `quota_near_limit`
  - `plan_selected`
  - `checkout_started`
  - `subscription_activated`
  - `plan_upgraded`
  - `plan_downgraded`
  - `extra_unit_added`
  - `extra_unit_removed`
  - `extra_unit_billing_failed`
- [ ] Build weekly SaaS dashboard: MRR, ARPA, churn, activation, expansion.

### Phase 5 - Sales assets

**Timeline:** 2-4 days  
**Owner:** PM/Marketing

- [ ] Create comparison page: planilha vs Lodgra.
- [ ] Create lead magnet: planilha de lucro por imovel.
- [ ] Create email sequence for trial.
- [ ] Create 3 one-page cases: Maria, Joao, Helena.
- [ ] Create partner/referral offer: 20% recurring commission.

---

## 9. Metrics Of Success

### Funnel metrics

| Metric | Target first 90 days |
|---|---:|
| Visitor -> lead | 8-15% |
| Lead -> trial | 20-30% |
| Trial -> activated | 50-60% |
| Activated -> paid | 25-40% |
| Pricing page -> checkout start | 5-10% |
| Checkout start -> paid | 60-80% |

### Activation metrics

| Metric | Target |
|---|---:|
| Time to first unit | < 5 min |
| Time to first reservation/import | < 15 min |
| Time to first financial insight | < 10 min |
| First-week activation | > 55% |
| First report generated | > 35% of Expansao/Premium |

### Revenue metrics

| Metric | Target first 90 days |
|---|---:|
| MRR | R$10k-R$25k |
| ARPA | R$180-R$450 |
| Gross churn | < 6%/month |
| Net revenue retention | > 105% |
| Expansion MRR share | > 25% |

### Product metrics

| Metric | Target |
|---|---:|
| Feature gate -> upgrade CTA click | > 12% |
| Upgrade CTA click -> checkout | > 25% |
| Expansao/Premium share of new MRR | > 65% |
| Support tickets in onboarding | < 20% of trials |

---

## 10. MRR Projection

### Assumptions

- Early Brazil launch, self-serve plus founder-led sales.
- Expansao is the default paid plan for serious operators.
- Premium conversion starts lower but drives expansion once portfolio operators arrive.
- Extra unit revenue begins after the 10th active unit.
- This model prioritizes adoption and pricing clarity over maximum short-term revenue extraction.

### Plan economics used

| Plano | Assumption |
|---|---|
| Essencial | 1 unit x R$59 = R$59 ARPA |
| Expansao | Up to 3 units included = R$149 ARPA |
| Premium | Up to 10 units included + avg 2 extra units = R$397 + R$98 = R$495 ARPA |

### 100-customer scenario

| Mix | Customers | ARPA | MRR |
|---|---:|---:|---:|
| Essencial 45% | 45 | R$59 | R$2.655 |
| Expansao 45% | 45 | R$149 | R$6.705 |
| Premium 10% | 10 | R$495 | R$4.950 |
| **Total** | **100** | **R$143 avg** | **R$14.310** |

### 100-customer upside scenario

This scenario assumes stronger Expansao/Premium adoption from founder-led sales and more Premium customers with extra units.

| Mix | Customers | ARPA | MRR |
|---|---:|---:|---:|
| Essencial 40% | 40 | R$59 | R$2.360 |
| Expansao 45% | 45 | R$149 | R$6.705 |
| Premium 15% | 15 | R$593 | R$8.895 |
| **Total** | **100** | **R$180 avg** | **R$17.960** |

### 250-customer scenario

| Mix | Customers | ARPA | MRR |
|---|---:|---:|---:|
| Essencial 40% | 100 | R$59 | R$5.900 |
| Expansao 45% | 113 | R$149 | R$16.837 |
| Premium 15% | 37 | R$593 | R$21.941 |
| **Total** | **250** | **R$179 avg** | **R$44.678** |

### 500-customer scenario

| Mix | Customers | ARPA | MRR |
|---|---:|---:|---:|
| Essencial 35% | 175 | R$59 | R$10.325 |
| Expansao 45% | 225 | R$149 | R$33.525 |
| Premium 20% | 100 | R$642 | R$64.200 |
| **Total** | **500** | **R$216 avg** | **R$108.050** |

### Conservative 90-day launch target

| Month | New paid customers | End customers | MRR target |
|---|---:|---:|---:|
| Month 1 | 10 | 10 | R$1k-R$2k |
| Month 2 | 20 | 30 | R$4k-R$7k |
| Month 3 | 35 | 65 | R$9k-R$14k |

---

## 11. Risks And Decisions

### Product risks

| Risk | Impact | Mitigation |
|---|---|---|
| Essencial too strong, weak upgrades | Medium | Keep 1-unit limit strict and gate owner/cleaning features |
| Expansao too cheap for 3 units | Medium | Gate advanced automation/API to Premium and monitor support load |
| Premium flat price under-monetizes large portfolios | Medium | Charge R$49 per extra property after 10 units |
| Promising roadmap features too early | High | Public page must distinguish available vs coming soon |
| Extra unit billing mismatch | High | Reconcile active properties and billed quantities monthly |
| Server-side gates missing | High | Apply plan checks in API/actions, not only UI |
| Downgrade with over-quota account | Medium | Block or require cleanup before downgrade |
| Currency mismatch for add-ons | Medium | Keep BRL-only for Brazil MVP pricing page and checkout |

### Open decisions

- Should Premium extra unit be billed automatically or require explicit confirmation before activating the 11th unit?
- Should AI guest assistant be Premium-only or paid add-on for Expansao?
- Should API be Premium-only or sold as add-on?
- Should there be a launch offer for first 50 customers?

### Recommended answers

- Require explicit confirmation before charging the first extra unit.
- AI assistant: Premium included, Expansao add-on later.
- API: Premium included, Expansao add-on later.
- Yes: first 50 customers can get 20-30% founder discount for 12 months, not lifetime, to protect long-term ARPA.

---

## 12. Immediate Next Actions

1. Approve this plan matrix as commercial source of truth.
2. Create implementation story for billing gates and property limits.
3. Update `PLAN_LIMITS` and feature gate types.
4. Update pricing page copy and checkout plan labels.
5. Add analytics events for upgrade prompts and activation.
6. Create simple pricing calculator for landing page.
7. Build onboarding checklist around first unit, first reservation, first financial insight.

---

## 13. Suggested Public Copy

### Section headline

Escolha o plano pelo tamanho da sua operacao.

### Supporting copy

Comece controlando uma unidade. Quando crescer, o Lodgra acompanha suas reservas, sua equipe, seus proprietarios e seu lucro.

### Plan subtitles

- **Essencial:** para controlar uma unidade sem planilha.
- **Expansao:** para crescer com varias unidades, relatorios e limpeza organizada.
- **Premium:** para operar como empresa, com automacao, inteligencia e suporte prioritario.

### Guarantee strip

Sem contrato. Cancele quando quiser. Suporte em portugues. Comece com uma unidade e evolua quando fizer sentido.
