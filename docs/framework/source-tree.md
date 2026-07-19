# Source Tree

Mapa conciso do código de produto. Diretórios gerados e frameworks internos AIOX não são código runtime da aplicação.

```text
src/
  app/                 Next.js App Router, páginas e API routes
  components/          componentes de UI por domínio
  hooks/               hooks React compartilhados
  lib/                 serviços, integrações e regras de domínio
    email-parser/      parser Gmail legado
    email/             envio por Resend
    ical/              parsing/sync iCal
    supabase/          clientes e queries Supabase
  types/               tipos compartilhados e tipos de banco
  __tests__/           testes transversais
supabase/
  migrations/          migrations PostgreSQL versionadas
  rollback/            rollback explícito quando aplicável
e2e/                   testes Playwright, fixtures e page objects
docs/
  stories/             unidade de planejamento e evidência
  architecture/        ADRs, contratos e desenhos técnicos
  framework/           padrões obrigatórios de desenvolvimento
packages/              pacotes compartilhados, incluindo design tokens
scripts/               automação CLI e utilitários operacionais
public/                assets estáticos
```

Para features novas, manter handlers finos em `src/app/api` e colocar lógica pura/testável em `src/lib/<feature>`. Migrations nunca ficam embutidas em código TypeScript. UI só sucede o caminho CLI/backend e observabilidade, conforme a Constitution.

Fontes: árvore atual do repositório, `AGENTS.md`, `.aiox-core/constitution.md`, `tsconfig.json` e `jest.config.js`.
