# Story 41 — recuperação da leitura inicial do cron iCal

## Diagnóstico

O cron de 14/09 às 04:45 UTC retornou HTTP 500 antes de carregar anúncios. O log Vercel contém `Erro ao buscar anúncios: { message: 'Gateway Timeout' }`; a consulta inicial é idêntica à baseline anterior ao hotfix 38.1. O status HTTP upstream não era preservado no log: não se pode concluir retrospectivamente se foi 502/503/504. Leituras subsequentes do mesmo caminho voltaram a HTTP 200.

O cliente instalado e o lock da produção usam `@supabase/postgrest-js` 2.110.8. Seu retry interno cobre 503/520 e erros de transporte para métodos idempotentes, mas não 502/504. Adicionar um loop externo sem desabilitar esse retry multiplicaria tentativas.

## Alteração delimitada

- Somente a consulta inicial de anúncios pode repetir: até três tentativas para 502, 503, 504 ou 520, com intervalos de 500 e 1000 ms.
- Cada consulta tem deadline de 10 segundos e timer limpo no `finally`. Abortos/HTTP 0 e erros não transitórios não repetem.
- `retry(false)` nessa consulta estabelece um único orçamento; outras consultas e clientes conservam a configuração anterior.
- Importação de feeds e escritas não são repetidas por esse mecanismo. Falha final mantém HTTP 500 e agora registra status upstream.
- Story 38.1 AC12: atualizações de reservas existentes não sobrescrevem identidade, ocupação ou valores manuais. Inserções preservadas nesta etapa.

## Verificação

- 25 testes do cron PASS: recuperação dos quatro status transitórios, exaustão de três tentativas, seis status não repetidos, aborto aos dez segundos sem timers restantes e preservação dos campos manuais.
- ESLint com configuração oficial Next/TypeScript temporária: zero erros e warnings nos dois arquivos alterados. O lint padrão anterior ignora TS/TSX e não comprova este gate.
- `git diff --check` dos arquivos: PASS.
- `npm run typecheck` global: PASS (exit 0).
- Nenhuma publicação ou alteração de banco realizada nesta etapa.

## CI do hotfix anterior

PR 18 / merge `969a703d5ea5879a0bc4376202591a85f4ce6ade`: CI, build, lint, unitários, CodeRabbit e Vercel PASS. Os dois workflows E2E terminaram por limite de 20/30 minutos. Os logs do atual e da baseline `44bb4d2168de2fce82a48f0f7ede1a728fa2aae2` mostram o diálogo de cookies interceptando o botão Login em `commission-flow.spec.ts`. Esta dívida de E2E permanece fora do patch de retry; não representa comprovação de E2E aprovado.

## Arquivos

- `src/app/api/cron/sync-ical/route.ts`
- `src/app/api/cron/sync-ical/__tests__/route.test.ts`
- `docs/qa/41-cron-initial-read-recovery-20260914.md`
