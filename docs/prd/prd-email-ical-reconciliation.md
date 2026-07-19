# PRD Brownfield — Reconciliação Automática E-mail ↔ iCal

**Versão:** 1.0  
**Data:** 2026-07-19  
**Epic:** 38  
**Status:** Aprovado para decomposição e validação de stories

## 1. Visão do produto

Enriquecer os bloqueios iCal com os dados presentes nos e-mails de confirmação das OTAs, consolidando reservas sem duplicação e reduzindo digitação manual. Como existem dinheiro, datas e imóveis reais envolvidos, a automação deve combinar extração probabilística com validação determinística e revisão humana para resultados incertos.

## 2. Usuário e problema

**Usuário primário:** anfitrião/gestor que recebe reservas via Airbnb, Booking ou Vrbo e usa iCal para disponibilidade.

**Problema:** o iCal bloqueia datas, mas não fornece consistentemente hóspede, valor ou ocupação. O e-mail possui esses dados, porém o fluxo legado cria rascunhos sem reconciliação segura e pode escolher um imóvel incorreto.

## 3. Objetivos e métricas

- Consolidar e-mail e iCal nos dois sentidos, independentemente da ordem de chegada.
- Auto-match em pelo menos 70% das novas reservas do piloto.
- Zero reserva duplicada.
- Zero reserva associada ao imóvel errado.
- Pelo menos 90% de acerto em `guest_name`, `check_in` e `check_out` no corpus de aceitação da extração.
- Preservar revisão humana para scores intermediários, ambiguidades e anomalias determinísticas.

## 4. Requisitos funcionais

- **FR-01:** persistir VEVENTs candidatos em staging idempotente por organização.
- **FR-02:** receber e-mails em endereço dedicado e persistir o corpo bruto antes de parsing.
- **FR-03:** filtrar remetentes/plataformas autorizados antes de consumir LLM.
- **FR-04:** extrair dados para contrato estruturado versionado, validar a saída e tratar falhas explicitamente.
- **FR-05:** aplicar validação determinística de datas, valor e nome antes de qualquer auto-match.
- **FR-06:** pontuar candidatos pelos pesos e thresholds da especificação normativa.
- **FR-07:** executar matching quando chega e-mail ou evento iCal.
- **FR-08:** impedir duplicidade por evento ou extração já vinculados.
- **FR-09:** permitir confirmação/revisão com até três candidatos e um clique.
- **FR-10:** oferecer criação manual pré-preenchida após 48 horas sem match.
- **FR-11:** registrar correções por campo e plataforma.
- **FR-12:** controlar rollout por organização e medir os três resultados do matching.

## 5. Requisitos não funcionais

- **NFR-01 — Integridade:** nenhuma saída de LLM pode produzir auto-match antes da Fase 3.
- **NFR-02 — Multi-tenancy:** toda leitura/mutação usa `organization_id`, RLS e integridade referencial coerente.
- **NFR-03 — Idempotência:** reentregas de webhook, polling e reexecução de jobs não duplicam e-mails, eventos ou reservas.
- **NFR-04 — Auditabilidade:** cada gate e correção manual possui evidência persistida.
- **NFR-05 — Segurança:** webhook autenticado, dados brutos protegidos e allowlist versionada antes do LLM.
- **NFR-06 — Compatibilidade:** organizações fora da flag mantêm o fluxo atual durante o rollout.
- **NFR-07 — Qualidade:** lint, typecheck, testes, build e CodeRabbit sem CRITICAL.

## 6. Restrições

- **CON-01:** Fases 0–7 são sequenciais e bloqueadas pelo gate anterior.
- **CON-02:** Fase 3 é obrigatória mesmo se a Fase 2 atingir boa qualidade manual.
- **CON-03:** `organization_id` é a chave canônica; não criar `tenant_id` paralelo.
- **CON-04:** Resend Inbound é a entrada canônica do pipeline novo.
- **CON-05:** `calendar_events` é staging; `reservations` é o agregado final.
- **CON-06:** piloto inicial somente Airbnb e Booking; Vrbo entra apenas após o gate de rollout.

## 7. Escopo

### Incluído

Schema/staging, inbound, extração, validação determinística, matching bidirecional, revisão humana, correções, feature flag e métricas do piloto.

### Excluído

Integrações OTA além de Airbnb, Booking e Vrbo; substituição geral do sistema de reservas; expansão antes das duas semanas do piloto; auto-match de casos realmente ambíguos.

## 8. Fases e gates

| Fase | Entrega | Gate |
|---:|---|---|
| 0 | Schema e segurança de dados | migration staging, RLS/constraints e quatro EXPLAIN aprovados |
| 1 | Inbound bruto | e-mail real persiste na organização correta |
| 2 | Extração estruturada | 10–15 e-mails; ≥90% nos campos obrigatórios |
| 3 | Validação determinística | testes das três regras aprovados; bloqueia Fase 4 |
| 4 | Matching | suite de score, ambiguidade e idempotência aprovada |
| 5 | Confirmação | fluxo E2E de um clique aprovado |
| 6 | Correções | edição gera audit log |
| 7 | Piloto | duas semanas, ≥70%, zero duplicidade/imóvel errado |

## 9. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Alucinação do LLM | contrato validado + Fase 3 bloqueante + revisão humana |
| Reserva duplicada | constraints, idempotência e processamento transacional |
| Imóvel errado | filtro por organização, score do imóvel e ambiguidade sem auto-match |
| Reentrega de webhook | deduplicação por identificador imutável |
| Regressão brownfield | feature flag por organização e rollout gradual |
| Exposição de PII | RLS, acesso mínimo, fixtures anonimizadas e logs sem corpo bruto |

## 10. Rastreabilidade

- Fonte normativa: `docs/specs/lodgra-email-ical-reconciliation-spec.md`
- Epic: `docs/stories/epic-38-email-ical-reconciliation.md`
- Story: `docs/stories/38.1.email-ical-reconciliation.md`
- ADR: `docs/architecture/adr-0381-email-ical-phase-0.md`
- Data design: `docs/architecture/data-0381-email-ical-phase-0.md`

