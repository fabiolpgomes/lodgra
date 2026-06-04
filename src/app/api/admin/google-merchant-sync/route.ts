import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/google-merchant-sync
 * Secure server-side endpoint for triggering manual Google Merchant sync
 * The dashboard calls this endpoint instead of calling the cron endpoint directly
 */
export async function POST(_req: Request) {
  try {
    // Verify user is authenticated via Supabase session
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('Auth error:', authError)
      return Response.json({ error: 'Authentication failed', details: authError.message }, { status: 401 })
    }

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      return Response.json({ error: 'Failed to load user profile', details: profileError.message }, { status: 400 })
    }

    if (!profile) {
      return Response.json({ error: 'User profile not found' }, { status: 400 })
    }

    // Check user's organization has premium plan
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('subscription_plan, plan')
      .eq('id', profile.organization_id)
      .single()

    if (orgError) {
      console.error('Organization error:', orgError)
      return Response.json({ error: 'Failed to load organization', details: orgError.message }, { status: 400 })
    }

    if (!org) {
      return Response.json({ error: 'Organization not found' }, { status: 400 })
    }

    const plan = org.subscription_plan || org.plan
    const PREMIUM_PLAN_VALUES = new Set(['premium', 'professional', 'business', 'pro'])
    if (!plan || !PREMIUM_PLAN_VALUES.has(plan)) {
      return Response.json({ error: 'Premium plan required' }, { status: 403 })
    }

    // Call the cron endpoint server-side with the secret
    const cronSecret = process.env.VERCEL_CRON_SECRET
    if (!cronSecret) {
      throw new Error('VERCEL_CRON_SECRET not configured')
    }

    // Call the actual cron endpoint from server-side (no client exposure)
    const origin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
    const cronResponse = await fetch(`${origin}/api/cron/google-merchant-sync`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
      },
    })

    if (!cronResponse.ok) {
      const errorData = await cronResponse.json()
      return Response.json(
        {
          error: errorData.error || 'Failed to trigger sync',
        },
        { status: cronResponse.status }
      )
    }

    const result = await cronResponse.json()

    return Response.json(
      {
        status: 'completed',
        message: 'Google Merchant sync triggered successfully',
        propertiesSynced: result.propertiesSynced,
        totalDurationMs: result.totalDurationMs,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error triggering merchant sync:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Error details:', errorMessage)

    Sentry.captureException(error, {
      tags: { component: 'api-admin-google-merchant-sync' },
      extra: { errorMessage },
    })

    return Response.json(
      {
        error: 'Failed to trigger sync',
        message: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
