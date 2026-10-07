/** Single source for the public legal contact and document layout (text lives in src/locales/<locale>/legal.json). */
export const LEGAL_CONTACT_EMAIL = 'suporte@lodgra.io'

export type LegalSectionSpec = {
  key: string
  /** Paragraph count before the list: keys p1..pN */
  p?: number
  /** List item count: keys i1..iN */
  i?: number
  /** Paragraph count after the list: keys n1..nN */
  n?: number
  highlight?: boolean
  showEmail?: boolean
}

export type LegalDocumentKind = 'terms' | 'privacy'

export const LEGAL_DOCUMENTS: Record<LegalDocumentKind, LegalSectionSpec[]> = {
  terms: [
    { key: 'provider', p: 2 },
    { key: 'acceptance', p: 1 },
    { key: 'service', p: 1, i: 6, n: 1 },
    { key: 'account', i: 5 },
    { key: 'subscription', i: 6 },
    { key: 'directPayments', p: 3 },
    { key: 'integrations', p: 3 },
    { key: 'ai', p: 1 },
    { key: 'acceptableUse', p: 1, i: 6 },
    { key: 'data', p: 3 },
    { key: 'availability', p: 1 },
    { key: 'liability', p: 2 },
    { key: 'termination', p: 2 },
    { key: 'changes', p: 1 },
    { key: 'law', p: 2 },
    { key: 'contact', p: 1, showEmail: true },
  ],
  privacy: [
    { key: 'controller', p: 2 },
    { key: 'roles', i: 2, n: 1 },
    { key: 'dataCollected', p: 1, i: 6 },
    { key: 'gmail', p: 1, i: 5, n: 2, highlight: true },
    { key: 'purposes', p: 1, i: 6 },
    { key: 'sharing', p: 1, i: 9, n: 1 },
    { key: 'transfers', p: 1 },
    { key: 'security', i: 6 },
    { key: 'retention', p: 1, i: 4 },
    { key: 'rights', p: 1, i: 7, n: 1 },
    { key: 'authorities', p: 1, i: 2 },
    { key: 'cookies', p: 1 },
    { key: 'minors', p: 1 },
    { key: 'changes', p: 1 },
    { key: 'contact', p: 1, showEmail: true },
  ],
}

/** Every translation key a legal document needs, used by tests to keep all locales complete. */
export function legalDocumentKeys(kind: LegalDocumentKind): string[] {
  const keys = [`${kind}.title`, `${kind}.lastUpdated`, `${kind}.version`, `${kind}.intro`]
  for (const s of LEGAL_DOCUMENTS[kind]) {
    const base = `${kind}.sections.${s.key}`
    keys.push(`${base}.title`)
    for (let n = 1; n <= (s.p ?? 0); n++) keys.push(`${base}.p${n}`)
    for (let n = 1; n <= (s.i ?? 0); n++) keys.push(`${base}.i${n}`)
    for (let n = 1; n <= (s.n ?? 0); n++) keys.push(`${base}.n${n}`)
  }
  return keys
}
