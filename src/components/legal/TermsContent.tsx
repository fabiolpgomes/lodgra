'use client'

import { useTranslations } from 'next-intl'

export function TermsContent() {
  const t = useTranslations('legal')
  const contactEmail = 'suporte@lodgra.pt'

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Home Stay</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-1">{t('terms.title')}</h2>
        <div className="flex items-center gap-3 mb-10">
          <p className="text-sm text-gray-500">{t('terms.lastUpdated')}</p>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
            {t('terms.version')}
          </span>
        </div>

        <section className="space-y-8 text-gray-700 leading-relaxed">
          {/* 1. Acceptance */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('terms.acceptance.title')}</h3>
            <p>{t('terms.acceptance.text')}</p>
          </div>

          {/* 2. Description */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('terms.description.title')}</h3>
            <p>{t('terms.description.text')}</p>
          </div>

          {/* 3. Account */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('terms.account.title')}</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>{t('terms.account.item1')}</li>
              <li>{t('terms.account.item2')}</li>
              <li>{t('terms.account.item3')}</li>
              <li>{t('terms.account.item4')}</li>
            </ul>
          </div>

          {/* 4. Subscription */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('terms.subscription.title')}</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>{t('terms.subscription.item1')}</li>
              <li>{t('terms.subscription.item2')}</li>
              <li>{t('terms.subscription.item3')}</li>
              <li>{t('terms.subscription.item4')}</li>
              <li>{t('terms.subscription.item5')}</li>
            </ul>
          </div>

          {/* 5. Acceptable Use */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('terms.acceptable.title')}</h3>
            <p className="mb-2">{t('terms.acceptable.subtitle')}</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>{t('terms.acceptable.item1')}</li>
              <li>{t('terms.acceptable.item2')}</li>
              <li>{t('terms.acceptable.item3')}</li>
              <li>{t('terms.acceptable.item4')}</li>
            </ul>
          </div>

          {/* 6. Data Ownership */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('terms.dataOwnership.title')}</h3>
            <p>{t('terms.dataOwnership.text')}</p>
          </div>

          {/* 7. Availability */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('terms.availability.title')}</h3>
            <p>{t('terms.availability.text')}</p>
          </div>

          {/* 8. Liability */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('terms.liability.title')}</h3>
            <p>{t('terms.liability.text')}</p>
          </div>

          {/* 9. Changes */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('terms.changes.title')}</h3>
            <p>{t('terms.changes.text')}</p>
          </div>

          {/* 10. Termination */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('terms.termination.title')}</h3>
            <p>{t('terms.termination.text')}</p>
          </div>

          {/* 11. Governing Law */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('terms.law.title')}</h3>
            <p>{t('terms.law.text')}</p>
          </div>

          {/* 12. Contact */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('terms.contact.title')}</h3>
            <p>
              {t('terms.contact.text')}{' '}
              <a href={`mailto:${contactEmail}`} className="text-blue-600 hover:underline">
                {t('terms.contact.email')}
              </a>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
