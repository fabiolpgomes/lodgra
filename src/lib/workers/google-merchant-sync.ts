import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'
import { GoogleMerchantClient } from '@/lib/google/merchant-client'

interface SyncOptions {
  organizationId: string
  propertyIds?: string[] // If not provided, sync all properties
  force?: boolean
}

interface SyncJobResult {
  jobId: string
  status: 'success' | 'partial' | 'failed'
  propertiesCount: number
  propertiesSynced: number
  propertiesFailed: number
  durationMs: number
  errorMessage?: string
}

export async function syncGoogleMerchantStatus(options: SyncOptions): Promise<SyncJobResult> {
  const startTime = Date.now()
  const jobId = `sync-${Date.now()}-${Math.random().toString(36).substring(7)}`

  try {
    const supabase = await createClient()

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single()

    if (profileError || !profile) {
      throw new Error('User profile not found')
    }

    const orgId = profile.organization_id

    // Fetch properties to sync
    let properties: Array<{ id: string; slug: string }> = []

    if (options.propertyIds && options.propertyIds.length > 0) {
      const { data, error } = await supabase
        .from('properties')
        .select('id, slug')
        .eq('organization_id', orgId)
        .in('id', options.propertyIds)

      if (error) throw error
      properties = data || []
    } else {
      const { data, error } = await supabase
        .from('properties')
        .select('id, slug')
        .eq('organization_id', orgId)

      if (error) throw error
      properties = data || []
    }

    if (properties.length === 0) {
      throw new Error('No properties found to sync')
    }

    // Initialize Google client
    let googleClient: GoogleMerchantClient
    try {
      googleClient = new GoogleMerchantClient()
    } catch (error) {
      throw new Error(`Google client initialization failed: ${String(error)}`)
    }

    // Sync each property
    let propertiesSynced = 0
    let propertiesFailed = 0
    const results: Array<{
      propertyId: string
      status: string
      error?: string
    }> = []

    for (const property of properties) {
      try {
        const result = await googleClient.getProductStatus(property.id, 3, 1000)

        // Update sync status
        const { error: updateError } = await supabase
          .from('google_merchant_sync_status')
          .upsert(
            {
              organization_id: orgId,
              property_id: property.id,
              status: result.status,
              indexed_date: result.indexedDate ? new Date(result.indexedDate) : null,
              error_message: result.errorMessage || null,
              raw_data: result.rawData || null,
              last_fetched: new Date(),
            },
            { onConflict: 'organization_id,property_id' }
          )

        if (updateError) {
          throw new Error(`Failed to update sync status: ${updateError.message}`)
        }

        results.push({
          propertyId: property.id,
          status: result.status,
          error: result.errorMessage,
        })

        propertiesSynced++
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        results.push({
          propertyId: property.id,
          status: 'error',
          error: errorMsg,
        })
        propertiesFailed++

        Sentry.captureException(error, {
          tags: { component: 'sync-worker', propertyId: property.id },
          extra: { organizationId: orgId },
        })
      }
    }

    // Log sync result
    const durationMs = Date.now() - startTime
    const finalStatus = propertiesFailed === 0 ? 'success' : 'partial'

    const { error: logError } = await supabase.from('google_merchant_sync_logs').insert({
      organization_id: orgId,
      sync_job_id: jobId,
      action: options.force ? 'manual' : 'scheduled',
      status: finalStatus,
      properties_count: properties.length,
      properties_synced: propertiesSynced,
      properties_failed: propertiesFailed,
      duration_ms: durationMs,
      error_message:
        propertiesFailed > 0 ? `${propertiesFailed} properties failed to sync` : null,
      api_quota_used: properties.length,
    })

    if (logError) {
      Sentry.captureException(logError, {
        tags: { component: 'sync-worker', stage: 'logging' },
        extra: { jobId, organizationId: orgId },
      })
    }

    return {
      jobId,
      status: finalStatus,
      propertiesCount: properties.length,
      propertiesSynced,
      propertiesFailed,
      durationMs,
    }
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : String(error)

    Sentry.captureException(error, {
      tags: { component: 'sync-worker', stage: 'init' },
      extra: { jobId, organizationId: options.organizationId },
    })

    return {
      jobId,
      status: 'failed',
      propertiesCount: 0,
      propertiesSynced: 0,
      propertiesFailed: 0,
      durationMs,
      errorMessage: errorMsg,
    }
  }
}
