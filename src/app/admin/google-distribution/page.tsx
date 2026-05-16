'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  computeAggregatedMetrics,
  getPropertyFeedStatuses,
  getLatestFeedLogs,
  type AggregatedMetrics,
  type PropertyFeedStatus,
  type FeedLogEntry,
} from '@/lib/google-distribution-dashboard'

export default function GoogleDistributionDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null)
  const [propertyStatuses, setPropertyStatuses] = useState<PropertyFeedStatus[]>([])
  const [feedLogs, setFeedLogs] = useState<FeedLogEntry[]>([])
  const [refreshing, setRefreshing] = useState(false)

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
          .eq('user_id', authData.user.id)
          .single()

        if (profileError || !profile) {
          setError('Could not load user profile')
          return
        }

        // Check premium tier on any property
        const { data: properties } = await supabase
          .from('properties')
          .select('tier')
          .eq('organization_id', profile.organization_id)
          .limit(1)

        if (!properties || !properties.some((p) => p.tier === 'premium')) {
          router.push('/pricing')
          return
        }

        // Load dashboard data
        const [metricsData, statusesData, logsData] = await Promise.all([
          computeAggregatedMetrics(supabase, profile.organization_id),
          getPropertyFeedStatuses(supabase, profile.organization_id, 50, 0),
          getLatestFeedLogs(supabase, profile.organization_id, 20),
        ])

        setMetrics(metricsData)
        setPropertyStatuses(statusesData)
        setFeedLogs(logsData)
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
        setError(errorData.message || 'Failed to refresh feed')
        return
      }

      await response.json()
      setError(null)
      // Optionally reload dashboard after refresh
      setTimeout(() => window.location.reload(), 2000)
    } catch (err) {
      console.error('Error refreshing feed:', err)
      setError('Failed to trigger feed refresh')
    } finally {
      setRefreshing(false)
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
        <h1 className="text-3xl font-bold mb-2">Google Distribution Dashboard</h1>
        <p className="text-gray-600">Monitor your Google Vacation Rentals indexing status</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Metrics Section */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            label="Total Indexed"
            value={metrics.totalIndexed}
            color="bg-green-50 border-green-200"
          />
          <MetricCard label="Pending" value={metrics.pendingCount} color="bg-blue-50 border-blue-200" />
          <MetricCard
            label="Rejected"
            value={metrics.rejectedCount}
            color="bg-yellow-50 border-yellow-200"
          />
          <MetricCard label="Error" value={metrics.errorCount} color="bg-red-50 border-red-200" />
        </div>
      )}

      {/* Action Button */}
      <div className="mb-6">
        <button
          onClick={handleRefreshFeed}
          disabled={refreshing}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded"
        >
          {refreshing ? 'Refreshing...' : 'Refresh Feed'}
        </button>
      </div>

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
                    <button className="text-blue-600 hover:text-blue-800 text-sm">View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feed Generation History */}
      <div>
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
                            : 'bg-blue-100 text-blue-800'
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
    pending: 'bg-blue-100 text-blue-800',
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
