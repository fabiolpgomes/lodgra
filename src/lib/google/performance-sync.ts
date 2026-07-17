import { createClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'
import { GoogleMerchantClient } from './merchant-client'

interface PerformanceMetrics {
  date: string
  impressions: number
  clicks: number
  conversions: number
}

interface OrganizationMetrics {
  organizationId: string
  propertyId: string
  metrics: PerformanceMetrics[]
}

class GooglePerformanceSyncJob {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  async execute(): Promise<{ success: boolean; synced: number; failed: number }> {
    const startTime = Date.now()
    let synced = 0
    let failed = 0

    try {
      // Get all organizations with Google merchant enabled
      const { data: organizations, error: orgError } = await this.supabase
        .from('organizations')
        .select('id, google_merchant_center_id')
        .not('google_merchant_center_id', 'is', null)

      if (orgError) throw orgError
      if (!organizations || organizations.length === 0) {
        console.log('[Google Sync] No organizations with Google Merchant enabled')
        return { success: true, synced: 0, failed: 0 }
      }

      // Process each organization
      for (const org of organizations) {
        try {
          await this.syncOrganizationMetrics(org.id)
          synced++
        } catch (error) {
          console.error(`[Google Sync] Failed for organization ${org.id}:`, error)
          Sentry.captureException(error, {
            tags: { component: 'GooglePerformanceSync', organizationId: org.id },
          })
          failed++
        }
      }

      const duration = Date.now() - startTime
      console.log(
        `[Google Sync] Completed: ${synced} synced, ${failed} failed (${duration}ms)`
      )

      return { success: true, synced, failed }
    } catch (error) {
      console.error('[Google Sync] Job failed:', error)
      Sentry.captureException(error, { tags: { component: 'GooglePerformanceSyncJob' } })
      return { success: false, synced, failed }
    }
  }

  private async syncOrganizationMetrics(organizationId: string): Promise<void> {
    try {
      // Get all properties for this organization
      const { data: properties, error: propsError } = await this.supabase
        .from('properties')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('is_active', true)

      if (propsError) throw propsError
      if (!properties || properties.length === 0) return

      // Initialize Google client
      const googleClient = new GoogleMerchantClient()

      // Fetch metrics for each property (last 30 days)
      const metricsToInsert: Array<{
        organization_id: string
        property_id: string
        date: string
        impressions: number
        clicks: number
        conversions: number
      }> = []

      for (const property of properties) {
        try {
          // Simulate fetching metrics from Google (actual implementation would call Google API)
          const metrics = await this.fetchPropertyMetrics(googleClient, property.id)

          // Add to batch insert
          metrics.forEach((metric) => {
            metricsToInsert.push({
              organization_id: organizationId,
              property_id: property.id,
              date: metric.date,
              impressions: metric.impressions,
              clicks: metric.clicks,
              conversions: metric.conversions,
            })
          })
        } catch (error) {
          console.error(
            `[Google Sync] Failed to fetch metrics for property ${property.id}:`,
            error
          )
        }
      }

      // Batch insert/upsert metrics
      if (metricsToInsert.length > 0) {
        const { error: insertError } = await this.supabase
          .from('google_performance_metrics')
          .upsert(metricsToInsert, { onConflict: 'organization_id,property_id,date' })

        if (insertError) throw insertError

        // Recalculate daily summaries
        await this.recalculateDailySummaries(organizationId)
      }
    } catch (error) {
      console.error(`[Google Sync] Organization sync failed for ${organizationId}:`, error)
      throw error
    }
  }

  private async fetchPropertyMetrics(
    googleClient: GoogleMerchantClient,
    propertyId: string
  ): Promise<PerformanceMetrics[]> {
    // This would fetch from Google Merchant Center API
    // For now, return empty array (actual implementation would query Google)
    // TODO: Implement actual Google API calls with retry logic

    // Placeholder - in production, this would:
    // 1. Call Google Merchant Center API with propertyId filter
    // 2. Fetch impressions, clicks, conversions for last 30 days
    // 3. Return structured metrics

    return []
  }

  private async recalculateDailySummaries(organizationId: string): Promise<void> {
    // Query all metrics for this org and recalculate daily summaries
    const { data: metrics, error } = await this.supabase
      .from('google_performance_metrics')
      .select('date, impressions, clicks, conversions')
      .eq('organization_id', organizationId)
      .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

    if (error) throw error
    if (!metrics || metrics.length === 0) return

    // Group by date and calculate summaries
    const summariesByDate = new Map<string, { impressions: number; clicks: number; conversions: number; count: number }>()

    for (const metric of metrics) {
      const key = metric.date
      const existing = summariesByDate.get(key) || {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        count: 0,
      }

      summariesByDate.set(key, {
        impressions: existing.impressions + (metric.impressions || 0),
        clicks: existing.clicks + (metric.clicks || 0),
        conversions: existing.conversions + (metric.conversions || 0),
        count: existing.count + 1,
      })
    }

    // Upsert daily summaries
    const summaries = Array.from(summariesByDate.entries()).map(([date, data]) => ({
      organization_id: organizationId,
      date,
      total_impressions: data.impressions,
      total_clicks: data.clicks,
      total_conversions: data.conversions,
      properties_with_data: data.count,
    }))

    if (summaries.length > 0) {
      const { error: upsertError } = await this.supabase
        .from('google_performance_daily_summary')
        .upsert(summaries, { onConflict: 'organization_id,date' })

      if (upsertError) throw upsertError
    }
  }
}

// Export singleton
export const googlePerformanceSyncJob = new GooglePerformanceSyncJob()

// Scheduled trigger (call from API route or cron job)
export async function triggerPerformanceSync() {
  return googlePerformanceSyncJob.execute()
}
