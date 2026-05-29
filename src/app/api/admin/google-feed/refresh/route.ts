import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'
import { generateGoogleVacationRentalsFeed, validateFeedStructure } from '@/lib/feeds/google-feed-generator'

const PREMIUM_PLAN_VALUES = new Set(['premium', 'professional', 'business', 'pro'])

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
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Verify premium plan on the organization
    const { data: organization, error: planError } = await supabase
      .from('organizations')
      .select('plan, subscription_plan')
      .eq('id', profile.organization_id)
      .single()

    const plan = organization?.subscription_plan || organization?.plan
    if (planError || !plan || !PREMIUM_PLAN_VALUES.has(plan)) {
      return new Response(JSON.stringify({ error: 'Premium tier required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Determine which properties to refresh
    let propertyIds = body.propertyIds || []
    let allProperties = true

    if (propertyIds.length > 0) {
      allProperties = false
    }

    const { data: props, error: propsError } = await supabase
      .from('properties')
      .select('id')
      .eq('organization_id', profile.organization_id)

    if (propsError || !props) {
      return new Response(JSON.stringify({ error: 'Failed to fetch properties' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const organizationPropertyIds = new Set(props.map((p) => p.id))
    propertyIds = propertyIds.length === 0
      ? Array.from(organizationPropertyIds)
      : propertyIds.filter((propertyId) => organizationPropertyIds.has(propertyId))

    if (propertyIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No properties found for refresh' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const timestamp = new Date().toISOString()
    const startTime = Date.now()

    try {
      const { xml, eTag, count } = await generateGoogleVacationRentalsFeed({
        organization_id: profile.organization_id,
        property_ids: propertyIds,
        limit: Math.max(propertyIds.length, 1),
      })

      const durationMs = Date.now() - startTime
      const isValid = validateFeedStructure(xml)
      const status = isValid ? 'success' : 'failed'
      const errorMessage = isValid ? null : 'Invalid Google Vacation Rentals XML feed structure'

      const logRows = propertyIds.map((propertyId) => ({
        organization_id: profile.organization_id,
        property_id: propertyId,
        timestamp,
        action: 'manual',
        status,
        duration_ms: durationMs,
        error_message: errorMessage,
        properties_count: count,
      }))

      const { error: logError } = await supabase.from('google_feed_logs').insert(logRows)

      if (logError) {
        console.error('Error creating feed logs:', logError)
        return new Response(JSON.stringify({ error: 'Failed to record refresh result' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(
        JSON.stringify({
          status,
          timestamp,
          propertiesCount: count,
          requestedPropertiesCount: propertyIds.length,
          allProperties,
          durationMs,
          eTag,
        }),
        {
          status: isValid ? 200 : 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    } catch (feedError) {
      const durationMs = Date.now() - startTime
      const message = feedError instanceof Error ? feedError.message : 'Feed generation failed'
      const logRows = propertyIds.map((propertyId) => ({
        organization_id: profile.organization_id,
        property_id: propertyId,
        timestamp,
        action: 'manual',
        status: 'failed',
        duration_ms: durationMs,
        error_message: message,
        properties_count: propertyIds.length,
      }))

      await supabase.from('google_feed_logs').insert(logRows)
      Sentry.captureException(feedError, {
        tags: { endpoint: 'google-feed-refresh', stage: 'feed-generation' },
        level: 'error',
      })

      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: 'google-feed-refresh' },
      level: 'error',
    })
    console.error('Refresh endpoint error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
