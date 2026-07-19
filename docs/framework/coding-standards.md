# Coding Standards

Padrões obrigatórios derivados da Constitution e da configuração ativa do repositório.

- TypeScript em modo `strict`; não introduzir `any` sem justificativa local e estreita.
- Preferir imports absolutos `@/`; relativos são aceitáveis dentro do mesmo módulo/feature.
- Next.js App Router: handlers HTTP em `src/app/api/**/route.ts`; lógica de domínio testável em `src/lib/**`.
- Validar toda entrada externa e saída de LLM com Zod; não usar coerção implícita em dados financeiros, datas ou tenancy.
- Toda consulta/mutação multi-tenant preserva `organization_id`; backend com `service_role` também deve filtrar explicitamente a organização.
- Separar funções puras de regras/score dos efeitos de banco, e-mail e rede. Efeitos financeiros ou de reserva exigem idempotência no serviço e constraint no banco.
- Não registrar secrets nem corpos/PII de e-mail. Erros devem ser sanitizados e observáveis.
- Testes Jest ficam junto ao domínio em `__tests__`; fluxos de navegador ficam em `e2e/`.
- Antes de concluir: `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`; CodeRabbit sem CRITICAL.
- Desenvolvimento é story-driven: manter checkboxes, evidências, Change Log e File List da story atualizados.

Fontes: `.aiox-core/constitution.md`, `tsconfig.json`, `eslint.config.mjs`, `jest.config.js`, `AGENTS.md`.
