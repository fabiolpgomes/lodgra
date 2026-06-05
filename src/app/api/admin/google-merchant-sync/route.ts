import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'
import { syncGoogleMerchantStatus } from '@/lib/workers/google-merchant-sync'

export async function POST() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      return Response.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Trigger sync with manual force flag
    const result = await syncGoogleMerchantStatus({
      organizationId: profile.organization_id,
      force: true,
    })

    return Response.json({
      jobId: result.jobId,
      status: result.status,
      propertiesCount: result.propertiesCount,
      propertiesSynced: result.propertiesSynced,
      propertiesFailed: result.propertiesFailed,
      totalDurationMs: result.durationMs,
      errorMessage: result.errorMessage,
    })
  } catch (error) {
    console.error('Error triggering merchant sync:', error)

    Sentry.captureException(error, {
      tags: { component: 'api-admin-google-merchant-sync' },
    })

    return Response.json(
      { error: 'Failed to trigger sync' },
      { status: 500 }
    )
  }
}
