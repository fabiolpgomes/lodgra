# EUR Fallback Cleanup - Handoff

**Date:** 2026-08-23  
**Status:** Ready for next session  
**Purpose:** registrar o fechamento da dívida técnica desta frente e preservar o ponto exato de retomada

## 1. Resultado Final

A frente de limpeza de `EUR` hardcoded foi encerrada com sucesso.

O foco desta sessão foi eliminar fallbacks runtime que inventavam `EUR` quando a moeda vinha ausente, sem mexer no uso legítimo de `EUR` como moeda de negócio, suporte de mercado ou conteúdo documental.

## 2. Commits Relevantes

- `e39aca30` - `refactor: skip booking prices without currency`
- `bc637bbb` - `refactor: remove eur fallback from owners pages`
- `f7560c36` - `refactor: remove remaining eur fallbacks`

## 3. O Que Foi Fechado

- removidos os últimos fallbacks runtime que forçavam `EUR`
- ajustados consumidores para lidar com moeda ausente sem quebrar
- mantido o comportamento explícito de `EUR` onde ele é regra de negócio
- validado o fluxo com `lint`, `typecheck` e `test`

## 4. Arquivos-Chave Tocadas Nesta Etapa

- `src/lib/reservations/syncToBeds24.ts`
- `src/lib/seo/jsonld.ts`
- `src/lib/seo/lodgingBusinessSchema.ts`
- `src/lib/property-intelligence/intake.ts`
- `src/lib/property-intelligence/report.ts`

## 5. Validação

As seguintes checks passaram nesta sessão:

- `npm run lint`
- `npm run typecheck`
- `npm test`

## 6. Estado Atual

- o commit final desta frente já está salvo localmente
- não houve push
- o worktree continua com outras alterações paralelas do usuário, que não fazem parte desta frente

## 7. Próximo Passo Recomendado

Parar aqui para evitar misturar a limpeza de dívida técnica com o restante das mudanças abertas.

Se houver nova retomada, o ideal é:
1. definir um novo recorte pequeno
2. separar arquivos por commit
3. não reabrir esta frente sem uma nova necessidade clara

## 8. Resume Amanhã

Começar por este handoff, confirmar o commit `f7560c36` e seguir apenas com um novo recorte se existir uma nova necessidade clara de moeda ou formatação.
