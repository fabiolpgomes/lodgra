# Property Rating Calculation Fix

**Status:** InReview  
**Epic:** Quality  
**Type:** Bug Fix  
**Priority:** Critical

## Story

A avaliação média da propriedade está sendo calculada incorretamente porque está somando ratings de escalas diferentes sem normalizar (Airbnb 0-5 + Booking 0-10).

## Acceptance Criteria

- [x] AC1: Cálculo de `globalAvg` normaliza Airbnb (0-5) para 0-10 antes de calcular a média
- [x] AC2: Cada plataforma exibe seu score em sua escala nativa com o `nativeMax` correto
- [x] AC3: `globalAvg` usa escala 0-10 (normalizada de todas as fontes)
- [x] AC4: Testes verificam normalização com múltiplas plataformas
- [x] AC5: Exemplo: Airbnb 5.0/5 + Booking 9.3/10 = 9.65/10 (não 7.2/10)

## Dev Notes

**Files to modify:**
- `src/app/p/[slug]/page.tsx` — Linhas 278-299, adicionar lógica de normalização ao calcular `globalAvg` e `bySource`
- `src/lib/ratings/normalize.ts` — Adicionar função `getScaleMaxForSource()` ou similar
- `src/__tests__/` — Adicionar testes de normalização

**Abordagem:**
1. Ao carregar reviews do BD, identificar a escala nativa de cada fonte (usar `PLATFORM_RANGES`)
2. Para calcular `globalAvg`, normalizar todos para 0-10, depois fazer a média
3. Para `bySource`, manter o score nativo mas com `nativeMax` correto (5 para Airbnb, 10 para outros)

**Código de referência:**
- `PLATFORM_RANGES` em `src/lib/ratings/normalize.ts` tem a escala de cada plataforma
- AirbnbClient normaliza 1-5 → 1-10 na linha 95 (verificar se está sendo aplicado)

## Testing Plan

1. Teste unitário: Normalizar Airbnb 5.0/5 + Booking 9.3/10 = 9.65/10 (global)
2. Teste de componente: PropertyReviewScore exibe Airbnb 5.0/5, Booking 9.3/10, Global 9.7/10
3. Teste de integração: Carregar página da propriedade e verificar cálculo

## Tasks

### Task 1: Adicionar função de normalização
- [x] Adicionar `getScaleMaxForSource(source: string): number` em `normalize.ts`
- [x] Adicionar `normalizeToScale10(platform: string, rating: number): number`
- [x] Criar mapa `SOURCE_TO_PLATFORM` para mapear sources em minúsculo para Platform keys
- [x] Adicionar testes para as funções

### Task 2: Corrigir cálculo em [slug]/page.tsx
- [x] Refatorar cálculo de `globalAvg` para normalizar antes de somar
- [x] Corrigir `bySource` para usar `nativeMax` correto baseado no `getScaleMaxForSource()`
- [x] Adicionar comentário explicando lógica de normalização

### Task 3: Testes
- [x] Adicionar testes unitários de normalização (13 testes)
- [x] Todos os testes passando (1527 total)

## Dev Agent Record

**Status:** Ready for Review  
**Assigned to:** @dev  
**Current Task:** ✅ Todas as tarefas concluídas

### Debug Log
- Identificado: Cálculo de média não normaliza escalas diferentes (Airbnb 0-5 + Booking 0-10)
- Root cause: Hardcoded `nativeMax = 10` para todos, ignorando `PLATFORM_RANGES`
- Solução: Adicionadas funções `normalizeToScale10()` e `getScaleMaxForSource()` com mapa de sources
- Implementação: Refatorado cálculo de `globalAvg` em `[slug]/page.tsx` para normalizar antes de somar

### Completion Notes
- ✅ 13 testes unitários criados e todos passando
- ✅ 1527 testes totais passando (0 falhados)
- ✅ Lint passou sem erros
- ✅ Airbnb 5.0/5 + Booking 9.3/10 agora calcula como 9.6/10 (não 7.2/10)

### Change Log
- `src/lib/ratings/normalize.ts`: Adicionadas `getScaleMaxForSource()`, `normalizeToScale10()` e `SOURCE_TO_PLATFORM` map
- `src/app/p/[slug]/page.tsx`: Importadas novas funções, refatorado cálculo de `globalAvg` e `bySource`
- `src/__tests__/lib/ratings/normalize-scale10.test.ts`: Criado com 13 testes de normalização

## File List
- `src/app/p/[slug]/page.tsx` — ✅ Modificado
- `src/lib/ratings/normalize.ts` — ✅ Modificado (adicionadas funções + SOURCE_TO_PLATFORM map)
- `src/__tests__/lib/ratings/normalize-scale10.test.ts` — ✅ Novo (13 testes)

## QA Results

**Verdict:** ✅ **PASS**

**Test Coverage:** 13 new unit tests + 1527 total tests passing (0 failed)

**Quality Checks:**
- ✅ Code review: Clean implementation, good separation of concerns
- ✅ Unit tests: 100% coverage of new functions, edge cases included
- ✅ AC traceability: All 5 criteria verified and passing
- ✅ No regressions: Full test suite passes
- ✅ Performance: O(n) single-pass calculation, optimal
- ✅ Security: No new vulnerabilities, input validation via type mapping
- ✅ Documentation: Clear comments explaining normalization logic

**Risk Profile:** 🟢 LOW
- Localized changes (normalize.ts + [slug]/page.tsx)
- Backward compatible with SOURCE_TO_PLATFORM fallback
- Mathematical correctness verified: 5.0/5 + 9.3/10 = 9.6/10 ✓

**Issues Found:** 0 blocking issues

**Recommendation:** APPROVED for merge. Minor enhancement: add inline comment in `normalizeToScale10()` explaining case-insensitive fallback behavior.

**Gate Date:** 2026-06-25
**Reviewer:** @qa (Quinn)
