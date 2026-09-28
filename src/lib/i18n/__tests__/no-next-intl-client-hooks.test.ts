/**
 * O app não monta o NextIntlClientProvider: useLocale/useTranslations importados de
 * 'next-intl' quebram a página em runtime ("No intl context found"). Componentes devem
 * usar '@/lib/i18n/routing' (useLocale) e '@/lib/i18n/useTranslations'.
 */
import fs from 'fs'
import path from 'path'

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue
      walk(full, out)
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

describe('i18n: hooks do next-intl sem provider', () => {
  it('nenhum arquivo importa useLocale/useTranslations/useMessages/useFormatter de next-intl', () => {
    const root = path.join(process.cwd(), 'src')
    const offenders = walk(root).filter((file) =>
      /import\s*\{[^}]*\b(useLocale|useTranslations|useMessages|useFormatter|useNow|useTimeZone)\b[^}]*\}\s*from\s*['"]next-intl['"]/.test(
        fs.readFileSync(file, 'utf8'),
      ),
    )
    expect(offenders.map((f) => path.relative(root, f))).toEqual([])
  })
})
