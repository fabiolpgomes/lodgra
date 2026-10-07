import ptBR from '@/locales/pt-BR/legal.json'
import enUS from '@/locales/en-US/legal.json'
import es from '@/locales/es/legal.json'
import { LEGAL_CONTACT_EMAIL, legalDocumentKeys, type LegalDocumentKind } from '../legal-structure'

const catalogs = { 'pt-BR': ptBR, 'en-US': enUS, es } as const
const kinds: LegalDocumentKind[] = ['terms', 'privacy']

function valueAt(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, part) =>
    current && typeof current === 'object' ? (current as Record<string, unknown>)[part] : undefined, source)
}

describe('legal documents', () => {
  it.each(Object.entries(catalogs))('%s has every key the layout renders', (_locale, catalog) => {
    for (const kind of kinds) {
      const missing = legalDocumentKeys(kind).filter((key) => {
        const value = valueAt(catalog, key)
        return typeof value !== 'string' || value.trim() === ''
      })
      expect(missing).toEqual([])
    }
  })

  it.each(Object.entries(catalogs))('%s carries no legacy brand or contact', (_locale, catalog) => {
    const text = JSON.stringify(catalog)
    expect(text).not.toMatch(/home ?stay/i)
    expect(text).not.toMatch(/@lodgra\.(pt|com)\b|support@lodgra\.io/)
  })

  it.each(Object.entries(catalogs))('%s privacy policy includes the Google Limited Use disclosure', (_locale, catalog) => {
    expect(valueAt(catalog, 'privacy.sections.gmail.n2')).toMatch(/Google API Services User Data Policy/)
  })

  it('uses a single support address on the lodgra.io domain', () => {
    expect(LEGAL_CONTACT_EMAIL).toBe('suporte@lodgra.io')
  })
})
