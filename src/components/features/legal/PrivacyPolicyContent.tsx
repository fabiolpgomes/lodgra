'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useLocale } from '@/lib/i18n/routing'

export function PrivacyPolicyContent() {
  const t = useTranslations('legal')
  const locale = useLocale()

  const contactEmail = 'suporte@lodgra.pt'

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Lodgra</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-1">{t('privacy.title')}</h2>
        <div className="flex items-center gap-3 mb-10">
          <p className="text-sm text-gray-500">{t('privacy.lastUpdated')}</p>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
            {t('privacy.version')}
          </span>
        </div>

        <section className="space-y-8 text-gray-700 leading-relaxed">
          {/* Intro */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('privacy.intro.title')}</h3>
            <p className="mb-3">{t('privacy.intro.description')}</p>
            <p className="mb-3 font-semibold">{t('privacy.intro.features')}</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>{t('privacy.intro.feature1')}</li>
              <li>{t('privacy.intro.feature2')}</li>
              <li>{t('privacy.intro.feature3')}</li>
              <li>{t('privacy.intro.feature4')}</li>
              <li>{t('privacy.intro.feature5')}</li>
              <li>{t('privacy.intro.feature6')}</li>
            </ul>
          </div>

          {/* 1. About */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('privacy.about.title')}</h3>
            <p>{t('privacy.about.text')}</p>
          </div>

          {/* 2. Data Collected */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('privacy.dataCollected.title')}</h3>
            <p className="mb-4 font-semibold text-gray-900">{t('privacy.dataCollected.subtitle')}</p>
            <div className="space-y-3 ml-2">
              {(['email', 'properties', 'billing', 'usage', 'technical'] as const).map((key) => (
                <div key={key}>
                  <p className="font-semibold text-gray-900 mb-1">{t(`privacy.dataCollected.${key}`)}</p>
                  <p className="text-sm text-gray-600">{t(`privacy.dataCollected.${key}Desc`)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Usage */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('privacy.usage.title')}</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
              {(['service', 'notifications', 'support', 'security', 'improvements', 'legal'] as const).map((key) => (
                <li key={key}>{t(`privacy.usage.${key}`)}</li>
              ))}
            </ul>
          </div>

          {/* 4. Sharing */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('privacy.sharing.title')}</h3>
            <p className="mb-3">{t('privacy.sharing.subtitle')}</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
              {(['supabase', 'stripe', 'vercel', 'resend', 'authorities'] as const).map((key) => (
                <li key={key}>{t(`privacy.sharing.${key}`)}</li>
              ))}
            </ul>
            <p className="text-sm text-gray-600 mt-3 font-semibold">{t('privacy.sharing.noSell')}</p>
          </div>

          {/* 5. Security */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('privacy.security.title')}</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
              {(['https', 'aes', 'rls', 'auth', 'audit'] as const).map((key) => (
                <li key={key}>{t(`privacy.security.${key}`)}</li>
              ))}
            </ul>
          </div>

          {/* 6. Retention */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('privacy.retention.title')}</h3>
            <p className="mb-3">{t('privacy.retention.text')}</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>{t('privacy.retention.delete30')}</li>
              <li>{t('privacy.retention.backup90')}</li>
              <li>{t('privacy.retention.legal')}</li>
            </ul>
          </div>

          {/* 7. Rights */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('privacy.rights.title')}</h3>
            <p className="mb-3">{t('privacy.rights.subtitle')}</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              {(['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection', 'consent'] as const).map((key) => (
                <li key={key}>{t(`privacy.rights.${key}`)}</li>
              ))}
            </ul>
          </div>

          {/* 8. Regional */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('privacy.regional.title')}</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>{t('privacy.regional.controller')}</li>
              <li>{t('privacy.regional.basis')}</li>
              <li>{t('privacy.regional.dpo')}</li>
              {t('privacy.regional.authorityUrl') && (
                <li>
                  {t('privacy.regional.authority')}{' '}
                  {t('privacy.regional.authorityUrl') && (
                    <Link href={t('privacy.regional.authorityUrl')} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {t('privacy.regional.authorityUrl')}
                    </Link>
                  )}
                </li>
              )}
            </ul>
          </div>

          {/* 9. Cookies */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('privacy.cookies.title')}</h3>
            <p>{t('privacy.cookies.text')}</p>
          </div>

          {/* 10. Changes */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('privacy.changes.title')}</h3>
            <p>{t('privacy.changes.text')}</p>
          </div>

          {/* 11. Contact */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('privacy.contact.title')}</h3>
            <p className="mb-3">
              {t('privacy.contact.text')}{' '}
              <a href={`mailto:${contactEmail}`} className="text-blue-600 hover:underline font-semibold">
                {t('privacy.contact.email')}
              </a>
            </p>
            <p className="text-sm text-gray-600">{t('privacy.contact.complaint')}</p>
          </div>
        </section>
      </div>
    </main>
  )
}
