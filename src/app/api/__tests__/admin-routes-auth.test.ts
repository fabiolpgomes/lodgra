/**
 * Guarda de regressão: /api/ é público no proxy, então CADA rota de /api/admin e
 * /api/platform tem de se proteger sozinha. Este teste falha se aparecer uma rota
 * nova sem nenhum mecanismo de autenticação reconhecido (foi assim que quatro
 * rotas ficaram abertas sem ninguém reparar).
 */
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

const API_ROOT = join(process.cwd(), 'src/app/api')

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return entry === '__tests__' ? [] : routeFiles(full)
    return entry === 'route.ts' ? [full] : []
  })
}

const AUTH_PATTERNS = [
  /requireRole\(/,
  /requirePlatformAdmin\(/,
  /auth\.getUser\(/,
  // segredo partilhado em cabeçalho (cron / scripts internos)
  /headers\.get\(['"]authorization['"]\)/i,
  /Bearer \$\{/,
]

// Rotas abertas de propósito, com a justificação. Nova entrada = decisão consciente em code review.
const TOKEN_CAPABILITY_ROUTES: Record<string, string> = {
  'admin/review/[id]/route.ts': 'link de email com review_token aleatório e expiração',
  'admin/review/[id]/decision/route.ts': 'link de email com review_token aleatório e expiração',
}

describe('autenticação das rotas privilegiadas', () => {
  const files = [...routeFiles(join(API_ROOT, 'admin')), ...routeFiles(join(API_ROOT, 'platform'))]

  it('encontra as rotas', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  it.each(files.map(file => [relative(API_ROOT, file), file]))('%s tem autenticação', (rel, file) => {
    if (TOKEN_CAPABILITY_ROUTES[rel as string]) return
    const source = readFileSync(file as string, 'utf8')
    expect(AUTH_PATTERNS.some(pattern => pattern.test(source))).toBe(true)
  })

  it('nenhuma rota compara o segredo do corpo com a variável de ambiente (passa quando a variável não existe)', () => {
    // `secret !== process.env.X` deixa entrar um corpo vazio se X estiver indefinida (undefined !== undefined é falso).
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      expect(`${relative(API_ROOT, file)}: ${/secret\s*!==\s*process\.env/.test(source)}`).toMatch(/: false$/)
    }
  })

  it('rotas de /api/platform exigem requirePlatformAdmin', () => {
    for (const file of routeFiles(join(API_ROOT, 'platform'))) {
      const source = readFileSync(file, 'utf8')
      expect(source).toMatch(/requirePlatformAdmin\(|resolvePlatformAdmin\(/)
    }
  })
})
