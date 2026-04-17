'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { useTranslations } from 'use-intl'

export function DataExportSection() {
  const t = useTranslations('consent')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleExport() {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/user/data-export', { method: 'POST' })

      if (res.status === 429) {
        setError(t('export.limitError'))
        return
      }

      if (!res.ok) {
        setError(t('export.genericError'))
        return
      }

      // Download the JSON file
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lodgra-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      setSuccess(true)
    } catch {
      setError(t('export.networkError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <Download className="h-5 w-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">{t('export.title')}</h2>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        {t('export.description')}
      </p>
      <p className="text-xs text-gray-400 mb-4">
        {t('export.limit')}
      </p>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      {success && (
        <div role="status" aria-live="polite" className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 mb-4">
          {t('export.success')}
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Download className="h-4 w-4" />
        {loading ? t('export.loading') : t('export.button')}
      </button>
    </div>
  )
}
