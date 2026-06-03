import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'
import { syncGoogleMerchantStatus } from '@/lib/workers/google-merchant-sync'

export async function GET(_req: Request) {
  // Verify cron secret for security
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.VERCEL_CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const supabase = await createClient()

    // Get all organizations with premium plans that have properties
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id')
      .in('subscription_plan', ['premium', 'professional', 'business', 'pro'])

    if (orgsError || !orgs) {
      throw new Error(`Failed to fetch organizations: ${orgsError?.message}`)
    }

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
    Sentry.captureException(error, {
      tags: { component: 'cron-google-merchant-sync', stage: 'initialization' },
    })

    return Response.json(
      {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
