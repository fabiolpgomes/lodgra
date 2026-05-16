import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

export async function POST(request: Request) {
  try {
    // Get the request body
    const body = (await request.json().catch(() => ({}))) as {
      propertyIds?: string[]
      force?: boolean
    }

    // Initialize Supabase client for server-side authentication
    const supabase = await createClient()

    // Check authentication
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', authData.user.id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Verify premium tier: at least one property must be premium
    const { data: premiumProps, error: tierError } = await supabase
      .from('properties')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('tier', 'premium')
      .limit(1)

    if (tierError || !premiumProps || premiumProps.length === 0) {
      return new Response(JSON.stringify({ error: 'Premium tier required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Determine which properties to refresh
    let propertyIds = body.propertyIds || []
    let allProperties = true

    if (propertyIds.length === 0) {
      // Refresh all premium properties in organization
      const { data: props, error: propsError } = await supabase
        .from('properties')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('tier', 'premium')

      if (propsError || !props) {
        return new Response(JSON.stringify({ error: 'Failed to fetch properties' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      propertyIds = props.map((p) => p.id)
    } else {
      allProperties = false
    }

    // Create feed generation log entry
    const jobId = randomUUID()
    const timestamp = new Date().toISOString()

    // Log this refresh attempt (insert one entry for organization-level refresh)
    const { error: logError } = await supabase.from('google_feed_logs').insert({
      id: jobId,
      organization_id: profile.organization_id,
      property_id: propertyIds[0] || '', // Use first property for the log (or could create per-property logs)
      timestamp,
      action: 'manual',
      status: 'queued',
      properties_count: propertyIds.length,
    })

    if (logError) {
      console.error('Error creating feed log:', logError)
      return new Response(JSON.stringify({ error: 'Failed to queue refresh job' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Return 202 Accepted with job info
    return new Response(
      JSON.stringify({
        jobId,
        status: 'queued',
        timestamp,
        propertiesCount: propertyIds.length,
        allProperties,
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Refresh endpoint error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
