'use client'

import { useTranslations } from '@/lib/i18n/useTranslations'
import { LEGAL_CONTACT_EMAIL, LEGAL_DOCUMENTS, type LegalDocumentKind } from './legal-structure'

const range = (count = 0) => Array.from({ length: count }, (_, index) => index + 1)

export function LegalDocument({ kind }: { kind: LegalDocumentKind }) {
  const t = useTranslations('legal')
  const text = (key: string) => t(`${kind}.${key}`, { email: LEGAL_CONTACT_EMAIL })

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 mb-2">Lodgra</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{text('title')}</h1>
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <p className="text-sm text-gray-600">{text('lastUpdated')}</p>
          <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded font-medium">{text('version')}</span>
        </div>
        <p className="mb-10 text-gray-700 leading-relaxed">{text('intro')}</p>

        <section className="space-y-8 text-gray-700 leading-relaxed">
          {LEGAL_DOCUMENTS[kind].map((section, index) => {
            const base = `sections.${section.key}`
            return (
              <div
                key={section.key}
                id={section.key}
                className={section.highlight ? 'bg-brand-50 border border-brand-200 rounded-lg p-6' : undefined}
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {index + 1}. {text(`${base}.title`)}
                </h2>
                {range(section.p).map((n) => <p key={`p${n}`} className="mb-3">{text(`${base}.p${n}`)}</p>)}
                {section.i ? (
                  <ul className="list-disc pl-5 space-y-1.5 text-gray-600 mb-3">
                    {range(section.i).map((n) => <li key={`i${n}`}>{text(`${base}.i${n}`)}</li>)}
                  </ul>
                ) : null}
                {range(section.n).map((n) => <p key={`n${n}`} className="mb-3 text-sm text-gray-600">{text(`${base}.n${n}`)}</p>)}
                {section.showEmail ? (
                  <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="font-semibold text-brand-600 hover:underline">
                    {LEGAL_CONTACT_EMAIL}
                  </a>
                ) : null}
              </div>
            )
          })}
        </section>
      </div>
    </main>
  )
}
