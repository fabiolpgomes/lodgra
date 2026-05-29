import { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

export type FeedLogStatus = 'success' | 'failed' | 'queued' | 'in_progress'
export type PropertyStatus = 'indexed' | 'pending' | 'error' | 'rejected'

export interface FeedLogEntry {
  id: string
  timestamp: string
  action: 'auto' | 'manual'
  status: FeedLogStatus
  duration_ms?: number | null
  error_message?: string | null
  properties_count?: number | null
}

export interface PropertyFeedStatus {
  propertyId: string
  propertyName: string
  propertySlug?: string | null
  organizationSlug?: string | null
  status: PropertyStatus
  submittedDate?: string
  lastUpdatedDate: string
  latestEntry?: FeedLogEntry
}

export interface AggregatedMetrics {
  totalIndexed: number
  pendingCount: number
  rejectedCount: number
  errorCount: number
  lastFeedGeneration?: string
  totalProperties: number
}

/**
 * Determines property status based on its latest feed log entry
 */
export function derivePropertyStatus(latestEntry: FeedLogEntry | null): PropertyStatus {
  if (!latestEntry) {
    return 'rejected' // Never attempted
  }

  const now = new Date()
  const entryDate = new Date(latestEntry.timestamp)
  const daysSinceUpdate = (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)

  switch (latestEntry.status) {
    case 'success':
      return 'indexed'
    case 'queued':
    case 'in_progress':
      return 'pending'
    case 'failed':
      // Rejected if failed > 30 days ago, error if recent
      return daysSinceUpdate > 30 ? 'rejected' : 'error'
    default:
      return 'rejected'
  }
}

/**
 * Computes aggregated metrics from feed logs
 */
export async function computeAggregatedMetrics(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<AggregatedMetrics> {
  try {
    // Get all latest feed log entries per property
    const { data: latestLogs, error } = await supabase
      .from('google_feed_logs')
      .select('id, property_id, timestamp, status, error_message')
      .eq('organization_id', organizationId)
      .order('property_id')
      .order('timestamp', { ascending: false })
      .limit(500) // Reasonable limit for pagination
      .returns<Array<{ id: string; property_id: string; timestamp: string; status: FeedLogStatus; error_message?: string | null }>>()

    if (error) {
      console.error('Error fetching feed logs:', error)
      return {
        totalIndexed: 0,
        pendingCount: 0,
        rejectedCount: 0,
        errorCount: 0,
        totalProperties: 0,
      }
    }

    if (!latestLogs || latestLogs.length === 0) {
      return {
        totalIndexed: 0,
        pendingCount: 0,
        rejectedCount: 0,
        errorCount: 0,
        totalProperties: 0,
      }
    }

    // Group by property_id, keep only latest entry per property
    const latestPerProperty = new Map<string, (typeof latestLogs)[0]>()
    for (const log of latestLogs) {
      if (!latestPerProperty.has(log.property_id)) {
        latestPerProperty.set(log.property_id, log)
      }
    }

    // Compute metrics
    let totalIndexed = 0
    let pendingCount = 0
    let rejectedCount = 0
    let errorCount = 0
    let lastFeedGeneration = ''

    for (const entry of latestPerProperty.values()) {
      const status = derivePropertyStatus({
        id: entry.id,
        timestamp: entry.timestamp,
        action: 'auto', // Not used for status derivation
        status: entry.status as FeedLogStatus,
        error_message: entry.error_message || undefined,
      })

      switch (status) {
        case 'indexed':
          totalIndexed++
          break
        case 'pending':
          pendingCount++
          break
        case 'rejected':
          rejectedCount++
          break
        case 'error':
          errorCount++
          break
      }

      // Track latest feed generation
      if (!lastFeedGeneration || entry.timestamp > lastFeedGeneration) {
        lastFeedGeneration = entry.timestamp
      }
    }

    return {
      totalIndexed,
      pendingCount,
      rejectedCount,
      errorCount,
      lastFeedGeneration,
      totalProperties: latestPerProperty.size,
    }
  } catch (err) {
    console.error('Exception computing metrics:', err)
    return {
      totalIndexed: 0,
      pendingCount: 0,
      rejectedCount: 0,
      errorCount: 0,
      totalProperties: 0,
    }
  }
}

/**
 * Fetches property feed status for dashboard display
 */
export async function getPropertyFeedStatuses(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  limit = 50,
  offset = 0
): Promise<PropertyFeedStatus[]> {
  try {
    const { data: organization } = await supabase
      .from('organizations')
      .select('slug')
      .eq('id', organizationId)
      .single()
    const organizationSlug = (organization as unknown as { slug?: string | null } | null)?.slug

    // Get properties with their names
    const { data: properties, error: propsError } = await supabase
      .from('properties')
      .select('id, name, slug')
      .eq('organization_id', organizationId)
      .order('name')
      .range(offset, offset + limit - 1)
      .returns<Array<{ id: string; name: string; slug?: string | null }>>()

    if (propsError) {
      console.error('Error fetching properties:', propsError)
      return []
    }

    if (!properties || properties.length === 0) {
      return []
    }

    const propertyIds = properties.map((p) => p.id)

    // Get latest log entry for each property
    const { data: latestLogs, error: logsError } = await supabase
      .from('google_feed_logs')
      .select('id, property_id, timestamp, status, action, duration_ms, error_message, properties_count')
      .in('property_id', propertyIds)
      .order('property_id')
      .order('timestamp', { ascending: false })
      .returns<
        Array<{
          id: string
          property_id: string
          timestamp: string
          status: FeedLogStatus
          action: 'auto' | 'manual'
          duration_ms?: number | null
          error_message?: string | null
          properties_count?: number | null
        }>
      >()

    if (logsError) {
      console.error('Error fetching logs:', logsError)
      return []
    }

    // Map latest log per property
    const latestLogPerProperty = new Map<string, (typeof latestLogs)[0]>()
    if (latestLogs) {
      for (const log of latestLogs) {
        if (!latestLogPerProperty.has(log.property_id)) {
          latestLogPerProperty.set(log.property_id, log)
        }
      }
    }

    // Build result
    return properties.map((prop) => {
      const latestLog = latestLogPerProperty.get(prop.id)
      const feedEntry: FeedLogEntry | null = latestLog
        ? {
            id: latestLog.id,
            timestamp: latestLog.timestamp,
            action: latestLog.action as 'auto' | 'manual',
            status: latestLog.status as FeedLogStatus,
            duration_ms: latestLog.duration_ms,
            error_message: latestLog.error_message,
            properties_count: latestLog.properties_count,
          }
        : null

      return {
        propertyId: prop.id,
        propertyName: prop.name,
        propertySlug: prop.slug,
        organizationSlug,
        status: derivePropertyStatus(feedEntry),
        submittedDate: latestLog?.timestamp,
        lastUpdatedDate: latestLog?.timestamp || new Date().toISOString(),
        latestEntry: feedEntry || undefined,
      }
    })
  } catch (err) {
    console.error('Exception fetching property statuses:', err)
    return []
  }
}

/**
 * Fetches latest feed generation logs for display
 */
export async function getLatestFeedLogs(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  limit = 20
): Promise<FeedLogEntry[]> {
  try {
    const { data: logs, error } = await supabase
      .from('google_feed_logs')
      .select('id, timestamp, action, status, duration_ms, error_message, properties_count')
      .eq('organization_id', organizationId)
      .order('timestamp', { ascending: false })
      .limit(limit)
      .returns<Array<{ id: string; timestamp: string; action: 'auto' | 'manual'; status: FeedLogStatus; duration_ms?: number | null; error_message?: string | null; properties_count?: number | null }>>()

    if (error) {
      console.error('Error fetching feed logs:', error)
      return []
    }

    return (logs || []).map((log) => ({
      id: log.id,
      timestamp: log.timestamp,
      action: log.action as 'auto' | 'manual',
      status: log.status as FeedLogStatus,
      duration_ms: log.duration_ms,
      error_message: log.error_message,
      properties_count: log.properties_count,
    }))
  } catch (err) {
    console.error('Exception fetching feed logs:', err)
    return []
  }
}
