# PRD — Home Stay: Comercialização SaaS
*Versão 1.0 — 2026-03-18*
*Tipo: Brownfield Enhancement — Major*

---

## 1. Visão Geral

### Produto
**Home Stay** — Plataforma SaaS web para gestão de alojamento local de curta-duração (short-term rentals). Destina-se a proprietários, gestores de propriedades e co-hosts nos mercados PT e BR.

### Objectivo deste PRD
Definir o trabalho necessário para transformar o MVP técnico (80% funcional) num produto comercializável — corrigindo gaps críticos, validando o MVP completo e estabelecendo o roadmap pós-lançamento.

### Modelo de Negócio
- **SaaS por subscrição mensal** via Stripe
- **Mercados alvo:** Portugal (EUR) e Brasil (BRL)
- **Pricing actual:** €9.90/mês (PT) | R$29.90/mês (BR) por propriedade *(a validar)*
- **Trial:** período de teste antes de pagamento
- **Canal:** self-serve (onboarding autónomo)

---

## 2. Utilizadores Alvo (Personas)

### Persona 1 — Gestor Independente (PT/BR)
- Gere 2-10 propriedades em Airbnb/Booking
- Passa horas a fazer copy-paste de reservas entre plataformas
- Precisa de ver P&L por propriedade em segundos
- **Dor:** Não sabe se está a ganhar ou perder em cada imóvel

### Persona 2 — Empresa de Property Management
- Gere 10-50 propriedades para múltiplos proprietários
- Tem equipa (admin, gestores, visualizadores)
- Precisa de relatórios para partilhar com proprietários
- **Dor:** Não tem sistema para calcular e comunicar a partilha de receita

### Persona 3 — Co-host / Airbnb Superhost
- Gere imóveis de outros proprietários com comissão
- Precisa de separar receita do proprietário vs. comissão de gestão
- **Dor:** Cálculo manual da comissão em Excel

---

## 3. Estado Actual do MVP

### Funcionalidades Completas ✅
- Autenticação OAuth + email/password
- Gestão de propriedades com múltiplos listings (Airbnb, Booking, Flatio)
- Sincronização iCal automática (cron 5 min)
- Gestão de reservas (CRUD + multi-moeda + notas internas)
- Gestão de despesas com filtros
- Calendário visual (view-only)
- Relatórios financeiros completos (P&L, receita, despesas, canal, cash flow)
- Dashboard com KPIs e gráficos
- Multi-tenancy com isolamento total por organização
- SaaS billing (Stripe) com subscription gate
- Gestão de utilizadores com 3 roles (admin, manager, viewer)
- Onboarding wizard (3 passos)
- Landing page
- Cron jobs automáticos (sync, notificações, cleanup)
- Rate limiting + CSRF + auditoria

### Gaps Críticos (Bloqueiam Lançamento) ⛔
1. **Proprietários não integrados nos cálculos financeiros**
2. **Console.logs debug em produção**
3. **Código legado (`app_backup/`) no repositório**
4. **Sem testes unitários** — risco de regressões
5. **Sem relatórios de compliance fiscal** (AT/DARF)

### Gaps Importantes (Roadmap) ⚠️
6. Calendário drag-drop (edição visual de reservas)
7. SMS/WhatsApp notificações
8. Upload de documentos (contratos, recibos)
9. 2FA (autenticação de dois factores)
10. Preços sazonais / dynamic pricing
11. API pública documentada (OpenAPI)

---

## 4. Épicos de Comercialização

---

### ÉPICO 1 — Limpeza e Qualidade (Pre-Launch)
**Prioridade:** P0 — Deve estar completo antes de qualquer lançamento público

#### Story 1.1 — Remover código debug e legado
- Remover todos `console.log` / `console.debug` de produção
- Apagar pasta `app_backup/`
- Verificar todos ficheiros em `src/` por debug statements

#### Story 1.2 — Testes unitários core
- Testes para `requireRole()` (auth guard crítico)
- Testes para iCal parser (lógica de deduplicação)
- Testes para cálculos financeiros (P&L, net amount)
- Coverage mínima: funções críticas de negócio

---

### ÉPICO 2 — Proprietários e Partilha de Receita
**Prioridade:** P0 — Core da proposta de valor para property managers

#### Story 2.1 — Vincular proprietários a propriedades
- Adicionar `owner_id` FK em `properties` (um proprietário principal por imóvel)
- Migração de base de dados
- UI para associar proprietário a cada propriedade

#### Story 2.2 — Cálculo automático de partilha de receita
- Usar `management_percentage` (já existe em `properties`) + `percentage_stake` de `owners`
- Calcular: receita bruta → deduzir comissão gestão → receita líquida proprietário
- Aplicar nos relatórios financeiros existentes

#### Story 2.3 — Relatório de proprietário
- Página `/owners/[id]/report` com P&L por período
- Mostrar: propriedades geridas, reservas, receita bruta, comissão gestão, receita líquida
- Exportar PDF ou Excel para enviar ao proprietário

---

### ÉPICO 3 — Relatórios de Compliance Fiscal
**Prioridade:** P1 — Diferenciador importante no mercado PT/BR

#### Story 3.1 — Relatório anual PT (AT/Alojamento Local)
- Resumo anual por propriedade: total reservas, receita bruta, despesas dedutíveis
- Formato compatível com declaração IRS (Categoria F / AL)
- Export PDF

#### Story 3.2 — Relatório anual BR (CARNÊ-LEÃO / DARF)
- Resumo mensal receita para apuramento IRPF
- Separação por CNPJ/CPF se aplicável
- Export PDF

---

### ÉPICO 4 — Melhorias UX Prioritárias
**Prioridade:** P1 — Reduzem churn e aumentam NPS

#### Story 4.1 — Calendário drag-drop
- Arrastar reservas para mover datas
- Criar reserva clicando em período livre
- Conflito visual (overlap detection)

#### Story 4.2 — Notificações WhatsApp/SMS
- Integração Twilio ou Z-API (BR) / Vonage (PT)
- Notificações check-in/check-out
- Opt-in por propriedade

#### Story 4.3 — Upload de documentos
- Contrato de arrendamento por reserva
- Recibos de despesas
- Storage: Supabase Storage (S3-compatible)

---

### ÉPICO 5 — Segurança e Compliance
**Prioridade:** P1 — Necessário para clientes empresariais

#### Story 5.1 — Autenticação 2 Factores (2FA)
- TOTP (Google Authenticator / Authy)
- Obrigatório para admins, opcional para outros roles
- Via Supabase MFA (já suportado)

#### Story 5.2 — Melhorar Content Security Policy
- Remover `unsafe-inline` do CSP
- Mover scripts inline para ficheiros externos
- Adicionar nonces para scripts necessários

---

### ÉPICO 6 — Crescimento e Monetização
**Prioridade:** P2 — Pós-lançamento inicial

#### Story 6.1 — Pricing por tiers
- **Starter:** até 3 propriedades
- **Professional:** até 10 propriedades + relatórios proprietários
- **Business:** ilimitado + 2FA + compliance fiscal
- Configurar Stripe Products/Prices múltiplos

#### Story 6.2 — Programa de referidos
- Código de referência por utilizador
- Desconto 1 mês para referidor e referido
- Dashboard tracking de referidos

#### Story 6.3 — API pública
- OpenAPI/Swagger documentation
- API keys por organização
- Rate limiting específico para API externa
- Webhook outbound para integrações

---

## 5. Roadmap de Lançamento

### Sprint 0 — Pre-Launch (1-2 semanas)
| Épico | Story | Descrição |
|-------|-------|-----------|
| 1 | 1.1 | Remover debug + legado |
| 1 | 1.2 | Testes unitários core |
| 2 | 2.1 | Vincular proprietários a propriedades |
| 2 | 2.2 | Cálculo partilha receita |

**Critério de saída:** Zero console.logs, proprietários integrados, testes passam.

### Sprint 1 — Launch v1.0 (2-3 semanas)
| Épico | Story | Descrição |
|-------|-------|-----------|
| 2 | 2.3 | Relatório de proprietário (PDF/Excel) |
| 3 | 3.1 | Compliance fiscal PT |
| 4 | 4.1 | Calendário drag-drop |

**Critério de saída:** Demo possível para primeiros clientes PT.

### Sprint 2 — v1.1 (3-4 semanas)
| Épico | Story | Descrição |
|-------|-------|-----------|
| 3 | 3.2 | Compliance fiscal BR |
| 4 | 4.2 | Notificações WhatsApp |
| 4 | 4.3 | Upload documentos |
| 5 | 5.1 | 2FA |

**Critério de saída:** Produto completo para mercado PT + BR.

### Sprint 3 — v1.2 (4-6 semanas)
| Épico | Story | Descrição |
|-------|-------|-----------|
| 6 | 6.1 | Pricing por tiers |
| 5 | 5.2 | CSP melhorada |
| 6 | 6.3 | API pública |

---

## 6. Métricas de Sucesso (KPIs)

| Métrica | Meta 3 meses | Meta 6 meses |
|---------|-------------|-------------|
| MRR | €500 | €2.000 |
| Clientes activos | 20 | 80 |
| Churn mensal | < 5% | < 3% |
| NPS | > 40 | > 60 |
| Propriedades geridas | 100 | 400 |
| Trial → Paid conversion | > 15% | > 25% |

---

## 7. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| iCal sync falha plataformas | Médio | Alto | Monitoring + alertas por email |
| Stripe webhook falha | Baixo | Alto | Retry logic + dead letter queue |
| Concorrência (Hostaway, Lodgify) | Alto | Médio | Foco nicho PT/BR, pricing agressivo |
| RGPD compliance | Médio | Alto | Privacy policy + cookie consent |
| Supabase downtime | Baixo | Alto | Read replica + fallback cache |

---

## 8. Fora de Âmbito (este PRD)

- App mobile nativa (iOS/Android)
- Integração API nativa Booking.com / Airbnb (apenas iCal)
- Sistema de mensagens com hóspedes
- Dynamic pricing / channel manager
- Gestão de housekeeping

---

*PRD criado pelo workflow brownfield-fullstack — @pm*
*Referência arquitectura: docs/architecture/brownfield-architecture.md*
