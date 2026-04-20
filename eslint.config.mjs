import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Fix eslint-plugin-react incompatibility with ESLint 10 (bundled in eslint-config-next)
  // Explicitly set react version to avoid auto-detection that uses removed context.getFilename() API
  {
    settings: {
      react: {
        version: "19",
      },
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // AIOS framework files (não fazem parte do projeto Next.js)
    ".aios-core/**",
    // Playwright e2e tests (não são arquivos React)
    "e2e/**",
    // Relatórios gerados pelo Playwright (arquivos minificados, não código fonte)
    "playwright-report/**",
    // Pasta de backup (não é código de produção)
    "src/app_backup/**",
    // Relatórios de cobertura de testes (gerados automaticamente)
    "coverage/**",
    // Node.js utility scripts (não são código da aplicação)
    "scripts/**",
    // Scratch/utility scripts (one-off tools, not application code)
    "scratch/**",
  ]),
]);

export default eslintConfig;
