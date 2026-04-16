'use client'

import { useState, useEffect, useCallback } from 'react'
import { Shield } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { getAnalyticsConsent } from '@/components/ui/CookieBanner'

interface ConsentState {
  analytics: { consent_value: boolean; created_at: string } | null
}

export function ConsentManagement() {
  const t = useTranslations('consent')
  const [consents, setConsents] = useState<ConsentState>({ analytics: null })
  const [localAnalytics, setLocalAnalytics] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Fetch server-side consent records
  useEffect(() => {
    async function fetchConsents() {
      try {
        const res = await fetch('/api/consent')
        if (res.ok) {
          const data = await res.json()
          setConsents({
            analytics: data.consents?.analytics || null,
          })
        }
      } catch {
        // Fail silently
      }
      // Also check localStorage
      setLocalAnalytics(getAnalyticsConsent())
      setLoading(false)
    }
    fetchConsents()
  }, [])

  const toggleAnalyticsConsent = useCallback(async () => {
    const newValue = !localAnalytics
    setSaving(true)

    try {
      // Update localStorage
      localStorage.setItem('cookie_consent_analytics', newValue ? 'accepted' : 'declined')
      localStorage.setItem('cookie_consent', newValue ? 'accepted' : 'declined')
      setLocalAnalytics(newValue)

      // Register server-side
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent_type: 'analytics', consent_value: newValue }),
      })

      if (newValue) {
        window.dispatchEvent(new Event('cookie_consent_accepted'))
      } else {
        // Dispatch event instead of reload to allow graceful disabling
        window.dispatchEvent(new Event('cookie_consent_revoked'))
      }
    } catch {
      // Revert on error
      setLocalAnalytics(!newValue)
    } finally {
      setSaving(false)
    }
  }, [localAnalytics])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-full mb-2" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>
    )
  }

  const serverTimestamp = consents.analytics?.created_at
  const formattedDate = serverTimestamp
    ? new Date(serverTimestamp).toLocaleString()
    : null

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">{t('settings.title')}</h2>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        {t('settings.description')}
      </p>

      {/* Analytics consent */}
      <div className="flex items-center justify-between py-4 border-t border-gray-100">
        <div>
          <p className="text-sm font-medium text-gray-900">{t('settings.analytics')}</p>
          <p className="text-xs text-gray-500 mt-1">
            {t('banner.analyticsDescription')}
          </p>
          {formattedDate && (
            <p className="text-xs text-gray-400 mt-1">
              {t('settings.lastUpdated')}: {formattedDate}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 ml-4">
          <span className={`text-xs font-medium ${localAnalytics ? 'text-green-600' : 'text-red-500'}`}>
            {localAnalytics ? t('settings.accepted') : t('settings.declined')}
          </span>
          <button
            onClick={toggleAnalyticsConsent}
            disabled={saving}
            role="switch"
            aria-checked={localAnalytics || false}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
              localAnalytics ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                localAnalytics ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Essential cookies info */}
      <div className="flex items-center justify-between py-4 border-t border-gray-100">
        <div>
          <p className="text-sm font-medium text-gray-900">{t('settings.essential') || t('banner.essential')}</p>
          <p className="text-xs text-gray-500 mt-1">
            {t('settings.essentialDescription') || t('banner.essentialDescription')}
          </p>
        </div>
        <span className="text-xs text-green-600 font-medium ml-4">{t('settings.alwaysActive') || t('banner.alwaysActive')}</span>
      </div>
    </div>
  )
}
