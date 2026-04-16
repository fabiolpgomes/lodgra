'use client'

import { useState, useEffect } from 'react'
import { Download, CheckCircle, XCircle, Clock, FileText, Trash2, Shield } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ConsentStats {
  [type: string]: { accepted: number; declined: number }
}

interface DeletionStats {
  pending: number
  completed: number
  cancelled: number
}

interface ConsentRecord {
  consent_type: string
  consent_value: boolean
  user_id: string | null
  created_at: string
}

interface DeletionRequest {
  id: string
  user_id: string
  requested_at: string
  scheduled_at: string
  status: string
  cancelled_at: string | null
  completed_at: string | null
}

interface ComplianceData {
  consent: {
    stats: ConsentStats
    total: number
    recent: ConsentRecord[]
  }
  deletions: {
    stats: DeletionStats
    requests: DeletionRequest[]
  }
  exports: {
    last_30_days: number
  }
}

export function ComplianceDashboard() {
  const t = useTranslations('consent')
  const [data, setData] = useState<ComplianceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/admin/compliance')
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        setData(json)
      } catch {
        setError(t('dashboard.errorLoading'))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  async function handleCsvExport() {
    try {
      const res = await fetch('/api/admin/compliance/csv')
      if (!res.ok) return
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch {
      // Silent fail
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return <div className="bg-red-50 text-red-700 rounded-lg p-4">{error}</div>
  }

  const consentTypes = Object.keys(data.consent.stats)

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Consent totals */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Shield className="h-4 w-4" />
            {t('dashboard.summary.consent')}
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.consent.total}</p>
          <p className="text-xs text-gray-400 mt-1">{t('dashboard.summary.consentSmall')}</p>
        </div>

        {/* Deletions pending */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Trash2 className="h-4 w-4" />
            {t('dashboard.summary.deletions')}
          </div>
          <p className="text-2xl font-bold text-amber-600">{data.deletions.stats.pending}</p>
          <p className="text-xs text-gray-400 mt-1">
            {t('dashboard.summary.deletionsSmall', {
              completed: data.deletions.stats.completed,
              cancelled: data.deletions.stats.cancelled
            })}
          </p>
        </div>

        {/* Exports */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <FileText className="h-4 w-4" />
            {t('dashboard.summary.exports')}
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.exports.last_30_days}</p>
          <p className="text-xs text-gray-400 mt-1">{t('dashboard.summary.exportsSmall')}</p>
        </div>

        {/* CSV Export */}
        <div className="bg-white rounded-lg shadow p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <Download className="h-4 w-4" />
            {t('dashboard.summary.report')}
          </div>
          <button
            onClick={handleCsvExport}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            {t('dashboard.summary.exportCsv')}
          </button>
        </div>
      </div>

      {/* Consent breakdown by type */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.byType')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {consentTypes.map(type => (
            <div key={type} className="border rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 capitalize mb-2">{type}</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700">{data.consent.stats[type].accepted}</span>
                </div>
                <div className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <span className="text-sm font-medium text-red-600">{data.consent.stats[type].declined}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent consent records */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.recentConsents')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-4">{t('dashboard.table.user')}</th>
                <th className="pb-2 pr-4">{t('dashboard.table.type')}</th>
                <th className="pb-2 pr-4">{t('dashboard.table.value')}</th>
                <th className="pb-2">{t('dashboard.table.date')}</th>
              </tr>
            </thead>
            <tbody>
              {data.consent.recent.map((record, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2 pr-4 text-gray-600 font-mono text-xs">
                    {record.user_id ? record.user_id.slice(0, 8) + '...' : t('dashboard.table.anonymous')}
                  </td>
                  <td className="py-2 pr-4 capitalize">{record.consent_type}</td>
                  <td className="py-2 pr-4">
                    {record.consent_value ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-3 w-3" /> {t('dashboard.table.accepted')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-500">
                        <XCircle className="h-3 w-3" /> {t('dashboard.table.declined')}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-gray-400 text-xs">
                    {new Date(record.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {data.consent.recent.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-400">{t('dashboard.table.noRecords')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deletion requests */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.deletions.title')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-4">{t('dashboard.table.user')}</th>
                <th className="pb-2 pr-4">{t('dashboard.deletions.status')}</th>
                <th className="pb-2 pr-4">{t('dashboard.deletions.requested')}</th>
                <th className="pb-2 pr-4">{t('dashboard.deletions.scheduled')}</th>
                <th className="pb-2">{t('dashboard.deletions.completed')}</th>
              </tr>
            </thead>
            <tbody>
              {data.deletions.requests.map(req => (
                <tr key={req.id} className="border-b border-gray-50">
                  <td className="py-2 pr-4 text-gray-600 font-mono text-xs">
                    {req.user_id.slice(0, 8)}...
                  </td>
                  <td className="py-2 pr-4">
                    {req.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 text-amber-600">
                        <Clock className="h-3 w-3" /> {t('dashboard.deletions.pending')}
                      </span>
                    )}
                    {req.status === 'completed' && (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-3 w-3" /> {t('dashboard.deletions.completed')}
                      </span>
                    )}
                    {req.status === 'cancelled' && (
                      <span className="inline-flex items-center gap-1 text-gray-400">
                        <XCircle className="h-3 w-3" /> {t('dashboard.deletions.cancelled')}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-gray-400 text-xs">
                    {new Date(req.requested_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-4 text-gray-400 text-xs">
                    {new Date(req.scheduled_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 text-gray-400 text-xs">
                    {req.completed_at ? new Date(req.completed_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
              {data.deletions.requests.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-400">{t('dashboard.deletions.noRequests')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
