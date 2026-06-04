import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'
import { syncGoogleMerchantStatus } from '@/lib/workers/google-merchant-sync'

export async function GET(req: Request) {
  console.log('🔄 [CRON] Google Merchant Sync started')

  // Verify cron secret for security
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.VERCEL_CRON_SECRET

  console.log('🔑 [CRON] Verifying authorization...')
  if (!cronSecret) {
    console.error('❌ [CRON] VERCEL_CRON_SECRET not configured')
    return Response.json({ status: 'failed', error: 'VERCEL_CRON_SECRET not configured' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('❌ [CRON] Invalid authorization token')
    return Response.json({ status: 'failed', error: 'Unauthorized' }, { status: 401 })
  }

  console.log('✅ [CRON] Authorization verified')

  try {
    console.log('📊 [CRON] Creating Supabase client...')
    const supabase = await createClient()
    console.log('✅ [CRON] Supabase client created')

    // Get all organizations with premium plans that have properties
    console.log('📦 [CRON] Fetching organizations with premium plans...')
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id')
      .in('subscription_plan', ['premium', 'professional', 'business', 'pro'])

    if (orgsError) {
      const errorMsg = `Failed to fetch organizations: ${orgsError.message}`
      console.error('❌ [CRON]', errorMsg)
      throw new Error(errorMsg)
    }

    if (!orgs) {
      const errorMsg = 'No organizations found'
      console.error('❌ [CRON]', errorMsg)
      throw new Error(errorMsg)
    }

    console.log(`✅ [CRON] Found ${orgs.length} premium organizations`)

    const results: Array<{
      organizationId: string
      jobId: string
      status: string
      propertiesSynced: number
      durationMs: number
      error?: string
    }> = []

    // Sync each organization's properties
    for (const org of orgs) {
      try {
        // Create authenticated context for this organization
        const supabaseForOrg = await createClient()

        // Get first user of the organization to set auth context
        const { data: user, error: userError } = await supabaseForOrg
          .from('user_profiles')
          .select('id')
          .eq('organization_id', org.id)
          .single()

        if (userError || !user) {
          console.warn(`No user found for organization ${org.id}, skipping`)
          continue
        }

        // Run sync for organization
        const result = await syncGoogleMerchantStatus({
          organizationId: org.id,
          force: false,
        })

        results.push({
          organizationId: org.id,
          jobId: result.jobId,
          status: result.status,
          propertiesSynced: result.propertiesSynced,
          durationMs: result.durationMs,
          error: result.errorMessage,
        })

        console.log(`Synced organization ${org.id}: ${result.propertiesSynced}/${result.propertiesCount} properties`)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        results.push({
          organizationId: org.id,
          jobId: `failed-${Date.now()}`,
          status: 'failed',
          propertiesSynced: 0,
          durationMs: 0,
          error: errorMsg,
        })

        Sentry.captureException(error, {
          tags: { component: 'cron-google-merchant-sync', organizationId: org.id },
        })
      }
    }

    // Log cron execution summary
    const totalOrgs = orgs.length
    const successfulOrgs = results.filter((r) => r.status !== 'failed').length
    const totalPropertiesSynced = results.reduce((sum, r) => sum + r.propertiesSynced, 0)
    const totalDurationMs = results.reduce((sum, r) => sum + r.durationMs, 0)

    console.log(
      `[CRON] Google Merchant Sync: ${successfulOrgs}/${totalOrgs} orgs, ${totalPropertiesSynced} properties synced, ${totalDurationMs}ms total`
    )

    return Response.json(
      {
        status: 'completed',
        organizations: totalOrgs,
        successful: successfulOrgs,
        propertiesSynced: totalPropertiesSynced,
        totalDurationMs,
        results,
      },
      { status: 200 }
    )
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('❌ [CRON] Exception caught:', errorMsg)
    console.error('❌ [CRON] Stack:', error instanceof Error ? error.stack : 'N/A')

    Sentry.captureException(error, {
      tags: { component: 'cron-google-merchant-sync', stage: 'initialization' },
      extra: { errorMessage: errorMsg },
    })

    return Response.json(
      {
        status: 'failed',
        error: errorMsg,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
