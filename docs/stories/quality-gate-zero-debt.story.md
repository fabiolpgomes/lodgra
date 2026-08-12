# Story: Quality Gate Zero Debt

**Status:** Done
**Prioridade:** P0
**Tipo:** Qualidade, Segurança e CI
**Origem:** Requisito explícito do proprietário em 2026-08-12: “débito técnico deve ser zero”.

## Executor Assignment

executor: "@dev"
quality_gate: "@devops"
quality_gate_tools: [lint, typecheck, jest, next-build, npm-audit, coderabbit]

## Story

**Como** mantenedor do Lodgra,
**Quero** eliminar todos os bloqueios detectados pelo pre-push,
**Para que** o repositório passe integralmente os gates de qualidade e segurança sem exceções ou dívida documentada.

## Acceptance Criteria

1. `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` terminam com código zero.
2. As 6 falhas atuais nas suítes `checkAvailability`, `sync-ical` e `design-system` são corrigidas na causa raiz, sem silenciar ou remover testes.
3. `npm audit --audit-level=moderate` não reporta vulnerabilidades críticas, altas ou moderadas.
4. O diff não contém segredos, conflitos, whitespace errors ou alterações fora do escopo sem justificativa.
5. CodeRabbit executa com sucesso e não reporta issues CRITICAL ou HIGH; indisponibilidade de autenticação/organização é bloqueio externo, não bypass.
6. A correção do filtro de reservas da Story 4.2 permanece funcional e compilável.

## Tasks / Subtasks

- [x] Corrigir mocks/contratos dos testes de disponibilidade e sincronização iCal.
- [x] Alinhar o teste do design system aos tokens canônicos atuais.
- [x] Atualizar dependências transitivas/diretas vulneráveis com mudanças compatíveis.
- [x] Executar e corrigir todos os gates locais até resultado integralmente verde.
- [x] Executar CodeRabbit e registrar o resultado.
- [x] Atualizar este registro e a lista de arquivos.

## Dev Notes

- Preservar as alterações locais do filtro de reservas.
- Não usar `npm audit fix --force`; upgrades major exigem análise explícita.
- Fontes obrigatórias: `.aiox-core/constitution.md`, `docs/framework/coding-standards.md`, `docs/framework/tech-stack.md` e `docs/framework/source-tree.md`.
- ClickUp não sincronizado: conector não disponível nesta sessão.

## Testing

- Jest para as três regressões identificadas e suíte completa.
- Gates: lint, typecheck, test, build, audit e CodeRabbit.

## 🤖 CodeRabbit Integration

**Primary Type:** Security / Quality
**Complexity:** Alta
**Primary Agents:** @dev, @devops
**Quality Gates:** pre-commit, pre-PR e pre-deployment
**Self-Healing:** @dev light (2 iterações, CRITICAL); @devops report-only
**Focus Areas:** segurança de dependências, integridade dos testes, compatibilidade e ausência de segredos.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---:|---|---|
| 2026-08-12 | 1.0 | Story corretiva criada a partir do pre-push bloqueado | @sm |

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Pre-push 2026-08-12: 6 testes falhando; 36 vulnerabilidades (11 high, 20 moderate, 5 low); CodeRabbit sem membership.

### Completion Notes List

- Corrigidas as 6 regressões de Jest na causa raiz; suíte final: 200/200 suites, 2741 passados e 1 skipped.
- Removido `--forceExit` após execução integral com `--detectOpenHandles`; Jest encerra normalmente sem handles pendentes.
- Auditoria reduzida de 36 vulnerabilidades para zero, sem `npm audit fix --force`.
- Next atualizado para 16.3.0; build usa `tsconfig.build.json` e continua validando TypeScript de produção sem `ignoreBuildErrors`.
- Artillery vulnerável substituído por k6 no teste de carga e Storybook migrou para o framework React/Vite seguro; build do Storybook aprovado.
- Gates locais aprovados: lint, typecheck, test, build, audit e `git diff --check`.
- CodeRabbit autenticado e aprovado após self-healing dos dois achados minor; revisão final sem findings.

### File List

- [x] `.storybook/main.ts`
- [x] `AGENTS.md` (bloco gerado pelo Next 16.3)
- [x] `docs/stories/quality-gate-zero-debt.story.md`
- [x] `eslint.config.js`
- [x] `next.config.js`
- [x] `package.json`
- [x] `package-lock.json`
- [x] `scripts/next-build.js`
- [x] `src/app/api/cron/sync-ical/__tests__/route.test.ts`
- [x] `src/design-system/__tests__/components.test.tsx`
- [x] `src/lib/reservations/__tests__/checkAvailability.test.ts`
- [x] `tests/load/google-feed-load.js`
- [x] `tests/load/google-feed-load.yml` (removido)
- [x] `tsconfig.build.json`
