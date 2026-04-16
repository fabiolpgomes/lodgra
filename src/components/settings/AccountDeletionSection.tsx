'use client'

import { useState, useEffect } from 'react'
import { Trash2, AlertTriangle, XCircle } from 'lucide-react'
import { useTranslations } from 'use-intl'

interface DeletionRequest {
  id: string
  requested_at: string
  scheduled_at: string
  status: string
}

export function AccountDeletionSection() {
  const t = useTranslations('consent')
  const [pendingRequest, setPendingRequest] = useState<DeletionRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchStatus()
  }, [])

  async function fetchStatus() {
    try {
      const res = await fetch('/api/user/delete-request')
      if (res.ok) {
        const data = await res.json()
        setPendingRequest(data.pending_request)
      }
    } catch {
      // Fail silently
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestDeletion() {
    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/user/delete-request', { method: 'POST' })
      const data = await res.json()

      if (res.status === 409) {
        setError(t('deletion.errorPending'))
        return
      }

      if (!res.ok) {
        setError(data.error || t('deletion.errorGeneric'))
        return
      }

      setSuccess(t('deletion.successRequest'))
      setShowConfirm(false)
      await fetchStatus()
    } catch {
      setError(t('deletion.networkError'))
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCancelDeletion() {
    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/user/cancel-deletion', { method: 'POST' })

      if (!res.ok) {
        setError(t('deletion.errorCancel'))
        return
      }

      setSuccess(t('deletion.successCancel'))
      setPendingRequest(null)
    } catch {
      setError(t('deletion.networkError'))
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-full" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-red-100">
      <div className="flex items-center gap-2 mb-4">
        <Trash2 className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-semibold text-gray-900">{t('deletion.title')}</h2>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      {success && (
        <div role="status" aria-live="polite" className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 mb-4">
          {success}
        </div>
      )}

      {pendingRequest ? (
        // Pending request — show status and cancel option
        <div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {t('deletion.pendingTitle')}
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  {t('deletion.pendingDescription', {
                    date: new Date(pendingRequest.scheduled_at).toLocaleDateString()
                  })}
                </p>
                <p className="text-xs text-amber-600 mt-2">
                  {t('deletion.requestedAt', {
                    date: new Date(pendingRequest.requested_at).toLocaleString()
                  })}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleCancelDeletion}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <XCircle className="h-4 w-4" />
            {actionLoading ? t('deletion.cancelling') : t('deletion.cancelButton')}
          </button>
        </div>
      ) : showConfirm ? (
        // Confirmation modal inline
        <div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-red-800 mb-2">
              {t('deletion.confirmTitle')}
            </h3>
            <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
              <li>{t('deletion.confirmList.coolingOff')}</li>
              <li>{t('deletion.confirmList.cancelAnytime')}</li>
              <li>{t('deletion.confirmList.anonymization')}</li>
              <li>{t('deletion.confirmList.retention')}</li>
              <li>{t('deletion.confirmList.audit')}</li>
              <li><strong>{t('deletion.confirmList.recommendExport')}</strong></li>
            </ul>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowConfirm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('deletion.back')}
            </button>
            <button
              onClick={handleRequestDeletion}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {actionLoading ? t('deletion.requesting') : t('deletion.confirmButton')}
            </button>
          </div>
        </div>
      ) : (
        // Default state — show delete button
        <div>
          <p className="text-sm text-gray-600 mb-4">
            {t('deletion.description')}
          </p>
          <button
            onClick={() => setShowConfirm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            {t('deletion.title')}
          </button>
        </div>
      )}
    </div>
  )
}
