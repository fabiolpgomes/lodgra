# Cleaner Operations Portal PRD — Validation Request

**To:** @po (Pax — Product Owner)  
**From:** @pm (Morgan — Product Manager)  
**Date:** 2026-05-21  
**Status:** Ready for 10-Point Validation Checklist  

---

## Executive Summary

**Product:** Cleaner Operations Portal — novo módulo dentro de Lodgra  
**Scope:** Portal dedicado para cleaners gerenciar tarefas de limpeza + dashboard para managers coordenar  
**Timeline:** 3-4 semanas (Epic 29 — MVP)  
**Markets:** 🇧🇷 Brasil, 🇪🇺 Europa, 🇺🇸 USA  

---

## Key Facts

- ✅ 8 Stories estruturadas (Epic 29)
- ✅ 13 Functional Requirements (FR1-FR13)
- ✅ 11 Non-Functional Requirements (NFR1-NFR11)
- ✅ 6 Compatibility Requirements (CR1-CR6)
- ✅ 7 Screens detalhadas (UI/UX)
- ✅ Risk assessment completo
- ✅ Tech stack confirmado (Next.js + Supabase + Tailwind)

---

## Documento de Referência

**Arquivo:** `/docs/cleanerprd.md`

Contém seções completas:
1. Análise do projeto existente (stack, padrões, estado atual)
2. Requirements (FR, NFR, CR)
3. UI Enhancement Goals (7 screens)
4. Technical Constraints & Integration
5. Epic Structure (single Epic 29 + optional Epic 30)
6. Epic 29 — 8 Stories com AC detalhados

---

## Validation Checklist (10-Point)

**@po: Por favor valide os seguintes pontos:**

1. **[ ] Clear and Objective Title**
   - ✅ "Cleaner Operations Portal" — claro e específico

2. **[ ] Complete Description**
   - ✅ Contexto: automação de workflow de limpeza pós-checkout
   - ✅ Audiência: managers (coordenação) + cleaners (execução)
   - ✅ Problema resolvido: rastreamento de qualidade, accountability

3. **[ ] Testable Acceptance Criteria**
   - ✅ 8 stories com AC detalhados (verificáveis)
   - ✅ Formato GIVEN/WHEN/THEN na implementação
   - ✅ Métricas: dashboard loads < 2s, upload auto-compress, RLS < 100ms

4. **[ ] Well-Defined Scope (IN/OUT)**
   - ✅ **IN:** Schema, auth tokens, portal UI, checklist, fotos, templates, reports
   - ✅ **OUT:** WhatsApp (Epic 30), push notifications (futura), offline mode (futura)

5. **[ ] Dependencies Mapped**
   - ✅ Story 29.1 (schema) é foundation — bloqueante para todas
   - ✅ Story 29.2 (auth) bloqueante para portal UI
   - ✅ Sem dependências externas (já existem: Supabase, Stripe, etc.)

6. **[ ] Complexity Estimate**
   - ✅ Epic 29: 36 story points total (8 stories × ~3-5 points each)
   - ✅ Duração: 3-4 semanas (team de 2-3 devs)
   - ✅ Complexity class: STANDARD (13-15 em 1-20 scale)

7. **[ ] Business Value Clear**
   - ✅ Reduz time-to-clean (checklist standardizado)
   - ✅ Melhora qualidade (fotos como prova)
   - ✅ Aumenta accountability (rastreamento digital)
   - ✅ Permite scaling (cleaners removos, sem presença física)

8. **[ ] Risks Documented**
   - ✅ CRITICAL: RLS misconfiguration → testes RLS + code review
   - ✅ HIGH: Storage quota exceeded → auto-compression + monitoring
   - ✅ HIGH: Token expiration edge cases → unit tests
   - ✅ MEDIUM: Performance → database indexes + pagination

9. **[ ] Criteria of Done Clear**
   - ✅ All 8 stories completed and PASS QA gate
   - ✅ E2E tests: cleaner workflow + manager workflow
   - ✅ RLS policies tested (organization isolation)
   - ✅ Existing features still work (properties, reservas, etc.)
   - ✅ i18n works (pt-BR, es-ES, en-US)
   - ✅ Deployed to staging

10. **[ ] Alignment with PRD/Epic**
    - ✅ Alinhado com Lodgra roadmap (gestão de operações)
    - ✅ Reutiliza padrões existentes (RLS, design-system)
    - ✅ Não quebra features existentes (compatibility CR1-CR6 mapeado)
    - ✅ Suporta 3 mercados e 3 idiomas (i18n integrado)

---

## Key Questions for @po

**Se alguma resposta for NÃO, por favor indique qual ponto e o feedback:**

- [ ] Escopo está correto? (IN/OUT alinhado?)
- [ ] Timeline 3-4 semanas é realista para seu team?
- [ ] Prioridade vs. outros work? (qual é o ranking?)
- [ ] Dependências internas que faltaram? (ex: novo plano Stripe?)
- [ ] Feedback dos cleaners beta validado? (ou precisamos fazer?)

---

## Feedback Path

**@po Please:**
1. Revise o PRD completo (`/docs/cleanerprd.md`)
2. Responda o 10-Point checklist acima
3. Se algum ponto falhar (< 7/10 total):
   - Indique qual(is) falhou
   - Qual(is) fix(es) são necessárias
   - Retorne para revisão
4. Se GO (≥ 7/10):
   - Update status: Draft → Ready
   - Notifique @sm para começar refinamento de stories

---

## Next Steps (Pending @po GO)

1. ✅ @sm refina stories em mais detalhe (story template)
2. ✅ @architect revisa constraints técnicas
3. ✅ @dev estima effort e timeline
4. ✅ Implementação começa (Epic 29.1)

---

**Status:** ⏳ Awaiting @po Validation  
**Target:** Validation completa até 2026-05-22

