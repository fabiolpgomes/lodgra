'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useLocale } from '@/lib/i18n/routing'
import { useTranslations } from 'next-intl'

const CONSENT_KEY = 'cookie_consent'
const ANALYTICS_CONSENT_KEY = 'cookie_consent_analytics'

export type ConsentValue = 'accepted' | 'declined' | null

/**
 * Get overall consent status (legacy compatibility)
 */
export function getConsent(): ConsentValue {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(CONSENT_KEY) as ConsentValue
}

/**
 * Get analytics-specific consent
 */
export function getAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(ANALYTICS_CONSENT_KEY) === 'accepted'
}

/**
 * Register consent server-side via API
 */
async function registerConsent(consentType: string, consentValue: boolean): Promise<void> {
  try {
    await fetch('/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent_type: consentType, consent_value: consentValue }),
    })
  } catch {
    // Fail silently — localStorage is the primary store, API is for audit
  }
}

export function CookieBanner() {
  const locale = useLocale()
  let t: (key: string) => string
  try {
    const translations = useTranslations('consent')
    t = (key: string) => translations(`banner.${key}`)
  } catch {
    // Fallback if translations not available (e.g., outside locale context)
    const fallback: Record<string, string> = {
      title: 'Definições de Cookies',
      description: 'Utilizamos cookies para melhorar a sua experiência. Os cookies essenciais são sempre activos. Pode optar por activar ou desactivar os cookies analíticos.',
      essential: 'Essenciais',
      essentialDescription: 'Necessários para o funcionamento da plataforma. Sempre activos.',
      analytics: 'Analíticos',
      analyticsDescription: 'Google Analytics — ajudam-nos a compreender como a plataforma é utilizada.',
      acceptAll: 'Aceitar Todos',
      rejectAll: 'Rejeitar Opcionais',
      savePreferences: 'Guardar Preferências',
      privacyPolicy: 'Política de Privacidade',
      alwaysActive: 'Sempre activo',
    }
    t = (key: string) => fallback[key] || key
  }

  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setMounted(true)
    setVisible(!getConsent())
  }, [])

  const [analyticsEnabled, setAnalyticsEnabled] = useState<boolean>(false)

  const handleAcceptAll = useCallback(async () => {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'accepted')
    setVisible(false)
    window.dispatchEvent(new Event('cookie_consent_accepted'))

    // Register both consents server-side
    await Promise.all([
      registerConsent('essential', true),
      registerConsent('analytics', true),
    ])
  }, [])

  const handleRejectOptional = useCallback(async () => {
    localStorage.setItem(CONSENT_KEY, 'declined')
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'declined')
    setVisible(false)

    await Promise.all([
      registerConsent('essential', true),
      registerConsent('analytics', false),
    ])
  }, [])

  const handleSavePreferences = useCallback(async () => {
    const consentValue = analyticsEnabled ? 'accepted' : 'declined'
    localStorage.setItem(CONSENT_KEY, consentValue)
    localStorage.setItem(ANALYTICS_CONSENT_KEY, consentValue)
    setVisible(false)

    if (analyticsEnabled) {
      window.dispatchEvent(new Event('cookie_consent_accepted'))
    }

    await Promise.all([
      registerConsent('essential', true),
      registerConsent('analytics', analyticsEnabled),
    ])
  }, [analyticsEnabled])

  if (!mounted || !visible) return null

  const privacyPath = locale ? `/${locale}/politica-de-privacidade` : '/politica-de-privacidade'

  return (
    <div
      role="dialog"
      aria-label={t('title')}
      className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white px-4 py-5 sm:px-6"
    >
      <div className="max-w-3xl mx-auto">
        <h3 className="text-sm font-semibold mb-2">{t('title')}</h3>
        <p className="text-sm text-gray-300 leading-relaxed mb-4">
          {t('description')}{' '}
          <Link href={privacyPath} className="underline hover:text-white">
            {t('privacyPolicy')}
          </Link>
        </p>

        {/* Cookie categories */}
        <div className="space-y-3 mb-4">
          {/* Essential — always active */}
          <div className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium">{t('essential')}</p>
              <p className="text-xs text-gray-400">{t('essentialDescription')}</p>
            </div>
            <span className="text-xs text-green-400 font-medium whitespace-nowrap ml-4">
              {t('alwaysActive')}
            </span>
          </div>

          {/* Analytics — opt-in toggle */}
          <div className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium">{t('analytics')}</p>
              <p className="text-xs text-gray-400">{t('analyticsDescription')}</p>
            </div>
            <button
              onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
              role="switch"
              aria-checked={analyticsEnabled}
              className={`relative ml-4 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900 ${
                analyticsEnabled ? 'bg-blue-500' : 'bg-gray-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  analyticsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={handleRejectOptional}
            className="px-4 py-2 text-sm rounded border border-gray-500 hover:border-gray-300 transition-colors"
          >
            {t('rejectAll')}
          </button>
          <button
            onClick={handleSavePreferences}
            className="px-4 py-2 text-sm rounded border border-gray-500 hover:border-gray-300 transition-colors"
          >
            {t('savePreferences')}
          </button>
          <button
            onClick={handleAcceptAll}
            className="px-4 py-2 text-sm rounded bg-white text-gray-900 font-medium hover:bg-gray-100 transition-colors"
          >
            {t('acceptAll')}
          </button>
        </div>
      </div>
    </div>
  )
}
