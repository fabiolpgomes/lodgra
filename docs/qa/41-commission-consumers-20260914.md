# Comissões: pendências iCal e divergência do resumo — 2026-09-14

Contrato: Story 38.1 AC14; uma ocupação iCal pendente de revisão não entra nos indicadores de comissão mesmo quando o anfitrião já preencheu valores.

## Evidência de banco (somente leitura pelo connector Supabase)

- Produção `brjumbfpvijrkhrherpt`: `pg_class` não contém `commission_summary`, nem relação com nome correspondente em outro schema.
- Staging `wrqjpyyopwgyqluqkcga`: `public.commission_summary` é uma materialized view (`relkind=m`), owner `postgres`, sem reloptions; ACL observada concede privilégios a `anon`, `authenticated` e `service_role`.
- Definição em staging agrega `reservations` por tenant/propriedade/data, usando `status <> 'cancelled' AND commission_amount IS NOT NULL`. Assim, uma pendência com comissão preenchida é elegível.
- O dashboard dependia de quatro consultas nessa relação e não verificava seus erros; a tentativa de iterar `byProperty=null` levava ao HTTP 500 na ausência da view.

Não foi criado, alterado ou concedido acesso a qualquer objeto de banco. A divergência e a ACL da view de staging permanecem no inventário de dívida global; removê-la ou alterar sua ACL exige inventário separado de dependências e consumidores. Esta correção da aplicação elimina sua dependência dessa view.

O contrato anterior também agrega comissões de moedas diferentes sem separação ou conversão. Esse comportamento foi preservado neste bugfix e permanece como dívida financeira explícita; os totais não são evidência de conversão cambial.

## Correção delimitada

- Histórico, contagem de paginação e CSV excluem `pending`, `pending_payment` e `cancelled`, preservando os demais estados aceitos historicamente, inclusive `confirmed`, `completed` e `checked_in`.
- Dashboard lê reservas pelo cliente de sessão (RLS), com organização da sessão explicitamente filtrada em cada página. Paginação de 500 linhas evita resumir apenas o primeiro limite do PostgREST.
- Mesmos campos de resposta, limites de data com `startOfMonth`/`startOfYear` e taxas dos planos. Datas de comissão nulas entram somente no total histórico, como no filtro anterior.
- Falhas de leitura da organização ou de qualquer página retornam HTTP 500, sem apresentar total parcial como completo.

## Validação

- Jest: 2 suites, 8 testes PASS. Fixture com 503 reservas elegíveis em duas páginas, estados pendentes com valores reais, tenant diferente, limites de período, data nula, contagem da paginação, CSV e falhas na primeira/segunda página.
- `git diff --check`: PASS no slice.
- ESLint TS efetivo com `/private/tmp/lodgra-lint-baseline.cjs` (Next core + TypeScript): seis arquivos TS passaram, zero erros/avisos. A configuração local padrão ignora TS; ela não foi usada como evidência. Gates globais do candidato isolado continuam necessários.
- Não houve publicação nesta subtarefa.

## Arquivos

- `src/app/api/commissions/dashboard/route.ts`
- `src/app/api/commissions/export/route.ts`
- `src/app/api/commissions/history/route.ts`
- `src/lib/commission/dashboard.ts`
- `src/__tests__/api/commissions-dashboard.test.ts`
- `src/__tests__/api/commissions-review-state.test.ts`
- `docs/qa/41-commission-consumers-20260914.md`
