'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  computeAggregatedMetrics,
  getPropertyFeedStatuses,
  getLatestFeedLogs,
  getPropertyMerchantStatuses,
  getLatestMerchantSyncLogs,
  type AggregatedMetrics,
  type PropertyFeedStatus,
  type FeedLogEntry,
} from '@/lib/google-distribution-dashboard'

const PREMIUM_PLAN_VALUES = new Set(['premium', 'professional', 'business', 'pro'])

export default function GoogleDistributionDashboard() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const dashboardHref = getDashboardHref(pathname)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null)
  const [propertyStatuses, setPropertyStatuses] = useState<PropertyFeedStatus[]>([])
  const [feedLogs, setFeedLogs] = useState<FeedLogEntry[]>([])
  const [merchantStatuses, setMerchantStatuses] = useState<PropertyFeedStatus[]>([])
  const [merchantSyncLogs, setMerchantSyncLogs] = useState<Array<{ timestamp: string; status: string; propertiesSynced: number; durationMs: number; error?: string }>>([])
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null)
  const [syncingMerchant, setSyncingMerchant] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<PropertyFeedStatus | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true)

        // Get current user
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError || !authData.user) {
          router.push('/login')
          return
        }

        // Get user's organization
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', authData.user.id)
          .single()

        if (profileError || !profile) {
          setError('Could not load user profile')
          return
        }

        // Check premium plan on the organization
        const { data: organization } = await supabase
          .from('organizations')
          .select('plan, subscription_plan')
          .eq('id', profile.organization_id)
          .single()

        const plan = organization?.subscription_plan || organization?.plan
        if (!plan || !PREMIUM_PLAN_VALUES.has(plan)) {
          router.push('/pricing')
          return
        }

        // Load dashboard data
        const [metricsData, statusesData, logsData, merchantStatusesData, merchantLogsData] = await Promise.all([
          computeAggregatedMetrics(supabase, profile.organization_id),
          getPropertyFeedStatuses(supabase, profile.organization_id, 50, 0),
          getLatestFeedLogs(supabase, profile.organization_id, 20),
          getPropertyMerchantStatuses(supabase, profile.organization_id, 50, 0),
          getLatestMerchantSyncLogs(supabase, profile.organization_id, 20),
        ])

        setOrganizationId(profile.organization_id)
        setMetrics(metricsData)
        setPropertyStatuses(statusesData)
        setFeedLogs(logsData)
        setMerchantStatuses(merchantStatusesData)
        setMerchantSyncLogs(merchantLogsData)
        setError(null)
      } catch (err) {
        console.error('Error loading dashboard:', err)
        setError('Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [supabase, router])

  const handleRefreshFeed = async () => {
    try {
      setRefreshing(true)
      const response = await fetch('/api/admin/google-feed/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || errorData.message || 'Failed to refresh feed')
        return
      }

      const result = await response.json()
      setError(null)
      setRefreshMessage(
        `Feed atualizado: ${result.propertiesCount ?? 0} propriedade(s) validada(s) em ${result.durationMs ?? 0}ms.`
      )
      setTimeout(() => window.location.reload(), 1000)
    } catch (err) {
      console.error('Error refreshing feed:', err)
      setError('Failed to trigger feed refresh')
    } finally {
      setRefreshing(false)
    }
  }

  const handleSyncMerchant = async () => {
    try {
      setSyncingMerchant(true)
      setSyncMessage(null)

      const response = await fetch('/api/cron/google-merchant-sync', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || errorData.message || 'Failed to sync merchant status')
        return
      }

      const result = await response.json()
      setSyncMessage(
        `Google Merchant sync concluído: ${result.propertiesSynced ?? 0}/${result.organizations ?? 0} orgs sincronizadas em ${result.totalDurationMs ?? 0}ms`
      )

      // Reload merchant data after sync
      if (organizationId) {
        const [merchantStatusesData, merchantLogsData] = await Promise.all([
          getPropertyMerchantStatuses(supabase, organizationId, 50, 0),
          getLatestMerchantSyncLogs(supabase, organizationId, 20),
        ])
        setMerchantStatuses(merchantStatusesData)
        setMerchantSyncLogs(merchantLogsData)
      }
    } catch (err) {
      console.error('Error syncing merchant status:', err)
      setError('Failed to trigger merchant sync')
    } finally {
      setSyncingMerchant(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Google Distribution Dashboard</h1>
            <p className="text-gray-600">Monitor your Google Vacation Rentals indexing status</p>
          </div>
          <button
            type="button"
            onClick={() => router.push(dashboardHref)}
            className="inline-flex items-center justify-center rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {refreshMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
          {refreshMessage}
        </div>
      )}

      {syncMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
          {syncMessage}
        </div>
      )}

      {/* Refresh Action Button - Always Visible */}
      <div className="mb-8 p-4 bg-brand-50 border border-brand-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-brand-900">Refresh Feed Status</h3>
            <p className="text-sm text-brand-700 mt-1">
              Manually trigger a feed refresh to check for updated property statuses on Google
            </p>
          </div>
          <button
            onClick={handleRefreshFeed}
            disabled={refreshing}
            className="whitespace-nowrap bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded"
            type="button"
          >
            {refreshing ? 'Refreshing...' : 'Refresh Feed'}
          </button>
        </div>
      </div>

      {/* Google Merchant Center Sync Button */}
      <div className="mb-8 p-4 bg-brand-50 border border-brand-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-brand-900">Sync Google Merchant Center Status</h3>
            <p className="text-sm text-brand-700 mt-1">
              Manually trigger a sync to fetch real-time property indexing status from Google Merchant Center
            </p>
          </div>
          <button
            onClick={handleSyncMerchant}
            disabled={syncingMerchant}
            className="whitespace-nowrap bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded"
            type="button"
          >
            {syncingMerchant ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Metrics Section */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            label="Total Indexed"
            value={metrics.totalIndexed}
            color="bg-green-50 border-green-200"
          />
          <MetricCard label="Pending" value={metrics.pendingCount} color="bg-brand-50 border-brand-200" />
          <MetricCard
            label="Rejected"
            value={metrics.rejectedCount}
            color="bg-yellow-50 border-yellow-200"
          />
          <MetricCard label="Error" value={metrics.errorCount} color="bg-red-50 border-red-200" />
        </div>
      )}

      {/* Property Status Table */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Property Status</h2>
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Property</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Submitted</th>
                <th className="px-4 py-2 text-left">Last Updated</th>
                <th className="px-4 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {propertyStatuses.map((prop) => (
                <tr key={prop.propertyId} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{prop.propertyName}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={prop.status} />
                  </td>
                  <td className="px-4 py-2">{prop.submittedDate ? formatDate(prop.submittedDate) : '—'}</td>
                  <td className="px-4 py-2">{formatDate(prop.lastUpdatedDate)}</td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => setSelectedProperty(prop)}
                      className="text-brand-600 hover:text-brand-800 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feed Generation History */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Feed Generation History</h2>
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Timestamp</th>
                <th className="px-4 py-2 text-left">Action</th>
                <th className="px-4 py-2 text-left">Result</th>
                <th className="px-4 py-2 text-left">Properties</th>
                <th className="px-4 py-2 text-left">Duration</th>
                <th className="px-4 py-2 text-left">Error</th>
              </tr>
            </thead>
            <tbody>
              {feedLogs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{formatDate(log.timestamp)}</td>
                  <td className="px-4 py-2 capitalize">{log.action}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        log.status === 'success'
                          ? 'bg-green-100 text-green-800'
                          : log.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-brand-100 text-brand-800'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">{log.properties_count || '—'}</td>
                  <td className="px-4 py-2">{log.duration_ms ? `${log.duration_ms}ms` : '—'}</td>
                  <td className="px-4 py-2 text-red-600 text-xs">{log.error_message || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Google Merchant Center Status */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Google Merchant Center Status</h2>
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Property</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Last Synced</th>
                <th className="px-4 py-2 text-left">Freshness</th>
                <th className="px-4 py-2 text-left">Error</th>
              </tr>
            </thead>
            <tbody>
              {merchantStatuses.map((prop) => (
                <tr key={prop.propertyId} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{prop.propertyName}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={prop.status} />
                  </td>
                  <td className="px-4 py-2">{formatDate(prop.lastUpdatedDate)}</td>
                  <td className="px-4 py-2">
                    <FreshnessIndicator timestamp={prop.lastUpdatedDate} />
                  </td>
                  <td className="px-4 py-2 text-red-600 text-xs">
                    {prop.latestEntry?.error_message || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {merchantStatuses.length === 0 && (
          <p className="text-gray-600 mt-4">No merchant status data available yet. Click &quot;Sync Now&quot; to fetch status from Google.</p>
        )}
      </div>

      {/* Google Merchant Sync History */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Merchant Sync History</h2>
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Timestamp</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Properties Synced</th>
                <th className="px-4 py-2 text-left">Duration</th>
                <th className="px-4 py-2 text-left">Error</th>
              </tr>
            </thead>
            <tbody>
              {merchantSyncLogs.map((log, idx) => (
                <tr key={`${log.timestamp}-${idx}`} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{formatDate(log.timestamp)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        log.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : log.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-brand-100 text-brand-800'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">{log.propertiesSynced || '—'}</td>
                  <td className="px-4 py-2">{log.durationMs ? `${log.durationMs}ms` : '—'}</td>
                  <td className="px-4 py-2 text-red-600 text-xs">{log.error || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {merchantSyncLogs.length === 0 && (
          <p className="text-gray-600 mt-4">No sync history available yet.</p>
        )}
      </div>

      {selectedProperty && (
        <PropertyDetailsModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  )
}

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`border rounded-lg p-4 ${color}`}>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    indexed: 'bg-green-100 text-green-800',
    pending: 'bg-brand-100 text-brand-800',
    error: 'bg-red-100 text-red-800',
    rejected: 'bg-yellow-100 text-yellow-800',
  }
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[status] || 'bg-gray-100'}`}>
      {status}
    </span>
  )
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

function PropertyDetailsModal({
  property,
  onClose,
}: {
  property: PropertyFeedStatus
  onClose: () => void
}) {
  const publicUrl = getTenantPropertyUrl(property)
  const latestEntry = property.latestEntry

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-feed-property-details-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 id="google-feed-property-details-title" className="text-xl font-bold">
              Google feed details
            </h3>
            <p className="mt-1 text-sm text-gray-600">{property.propertyName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-100"
            aria-label="Close details"
          >
            X
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailItem label="Status">
            <StatusBadge status={property.status} />
          </DetailItem>
          <DetailItem label="Property ID">{property.propertyId}</DetailItem>
          <DetailItem label="Submitted">
            {property.submittedDate ? formatDate(property.submittedDate) : 'Not submitted yet'}
          </DetailItem>
          <DetailItem label="Last updated">{formatDate(property.lastUpdatedDate)}</DetailItem>
          <DetailItem label="Last action">{latestEntry?.action || 'No feed log'}</DetailItem>
          <DetailItem label="Last result">{latestEntry?.status || 'No feed log'}</DetailItem>
          <DetailItem label="Duration">
            {latestEntry?.duration_ms ? `${latestEntry.duration_ms}ms` : '—'}
          </DetailItem>
          <DetailItem label="Properties in feed">
            {latestEntry?.properties_count ?? '—'}
          </DetailItem>
        </div>

        <div className="mt-4 rounded border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase text-gray-600">Error detail</p>
          <p className="mt-1 text-sm text-gray-700">
            {latestEntry?.error_message || 'No error was reported in the latest feed generation.'}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Open public page
            </a>
          )}
          <a
            href="/api/feeds/google-vacation-rentals"
            target="_blank"
            rel="noreferrer"
            className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Open feed XML
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded border border-gray-200 p-3">
      <p className="text-xs font-semibold uppercase text-gray-600">{label}</p>
      <div className="mt-1 break-words text-sm text-gray-900">{children}</div>
    </div>
  )
}

function getTenantPropertyUrl(property: PropertyFeedStatus): string | null {
  if (!property.propertySlug) return null

  if (typeof window === 'undefined' || !property.organizationSlug) {
    return `/p/${property.propertySlug}`
  }

  const url = new URL(window.location.origin)
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return `/p/${property.propertySlug}`
  }

  const rootHost = url.hostname.replace(/^www\./, '')
  url.hostname = `${property.organizationSlug}.${rootHost}`
  url.pathname = `/p/${property.propertySlug}`
  url.search = ''
  url.hash = ''

  return url.toString()
}

function getDashboardHref(pathname: string | null): string {
  const localeMatch = pathname?.match(/^\/(pt-BR|en-US|es)(\/|$)/)
  return localeMatch ? `/${localeMatch[1]}/dashboard` : '/dashboard'
}

function FreshnessIndicator({ timestamp }: { timestamp: string }) {
  const now = new Date()
  const syncDate = new Date(timestamp)
  const hoursOld = (now.getTime() - syncDate.getTime()) / (1000 * 60 * 60)

  let color = 'bg-green-100 text-green-800'
  let label = 'Fresh'

  if (hoursOld >= 12) {
    color = 'bg-red-100 text-red-800'
    label = 'Stale'
  } else if (hoursOld >= 1) {
    color = 'bg-yellow-100 text-yellow-800'
    label = 'Aging'
  }

  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>
      {label} ({Math.round(hoursOld)}h)
    </span>
  )
}
