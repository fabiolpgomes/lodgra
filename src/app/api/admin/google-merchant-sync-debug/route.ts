import { createClient } from '@/lib/supabase/server'

/**
 * DEBUG endpoint - Testing each step of the sync process
 */
interface DebugStep {
  step: string
  status: string
  [key: string]: string | number | undefined
}

export async function POST(_req: Request) {
  const results: DebugStep[] = []

  try {
    results.push({ step: 'start', status: 'ok' })

    // Step 1: Get user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      results.push({ step: 'auth', status: 'error', error: authError.message })
      return Response.json({ results }, { status: 400 })
    }
    
    if (!user) {
      results.push({ step: 'auth', status: 'error', error: 'No user' })
      return Response.json({ results }, { status: 400 })
    }
    
    results.push({ step: 'auth', status: 'ok', userId: user.id })

    // Step 2: Get profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      results.push({ step: 'profile', status: 'error', error: profileError.message })
      return Response.json({ results }, { status: 400 })
    }

    if (!profile) {
      results.push({ step: 'profile', status: 'error', error: 'No profile' })
      return Response.json({ results }, { status: 400 })
    }

    results.push({ step: 'profile', status: 'ok', orgId: profile.organization_id })

    // Step 3: Get org
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('subscription_plan, plan')
      .eq('id', profile.organization_id)
      .single()

    if (orgError) {
      results.push({ step: 'org', status: 'error', error: orgError.message })
      return Response.json({ results }, { status: 400 })
    }

    if (!org) {
      results.push({ step: 'org', status: 'error', error: 'No org' })
      return Response.json({ results }, { status: 400 })
    }

    results.push({ step: 'org', status: 'ok', plan: org.subscription_plan || org.plan })

    // Step 4: Check cron secret
    const cronSecret = process.env.VERCEL_CRON_SECRET
    if (!cronSecret) {
      results.push({ step: 'cron_secret', status: 'error', error: 'Not configured' })
      return Response.json({ results }, { status: 400 })
    }

    results.push({ step: 'cron_secret', status: 'ok' })

    // Step 5: Call cron endpoint
    const origin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
    results.push({ step: 'cron_call', status: 'calling', origin })

    const cronResponse = await fetch(`${origin}/api/cron/google-merchant-sync`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${cronSecret}` },
    })

    results.push({ step: 'cron_response', status: 'received', statusCode: cronResponse.status })

    if (!cronResponse.ok) {
      const text = await cronResponse.text()
      results.push({ step: 'cron_error', status: 'error', response: text.substring(0, 200) })
      return Response.json({ results }, { status: 400 })
    }

    const data = await cronResponse.json()
    results.push({ step: 'cron_success', status: 'ok', propertiesSynced: data.propertiesSynced })

    return Response.json({ results, success: true }, { status: 200 })
  } catch (error) {
    results.push({
      step: 'exception',
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return Response.json({ results }, { status: 500 })
  }
}
