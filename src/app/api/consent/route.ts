import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rateLimit'

/**
 * POST /api/consent — Register cookie consent (anonymous or authenticated)
 * Story 11.1: RGPD/LGPD compliant server-side consent registration
 * Tech debt fix: IP-based rate limiting (10 req/min) to prevent bot flooding
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit check (per IP)
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'

    if (!checkRateLimit('consent', clientIp, 10, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { consent_type, consent_value } = body

    // Validate input
    if (!consent_type || typeof consent_value !== 'boolean') {
      return NextResponse.json(
        { error: 'consent_type and consent_value (boolean) are required' },
        { status: 400 }
      )
    }

    const validTypes = ['analytics', 'marketing', 'essential', 'terms', 'privacy_policy']
    if (!validTypes.includes(consent_type)) {
      return NextResponse.json(
        { error: `consent_type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Try to get authenticated user (optional — anonymous consent is valid)
    let userId: string | null = null
    try {
      const supabase = await createClient()
      const { data: { session } } = await supabase.auth.getSession()
      userId = session?.user?.id || null
    } catch {
      // Anonymous user — proceed without user_id
    }

    // Extract IP and user agent
    const ip_address = clientIp !== 'unknown' ? clientIp : null
    const user_agent = request.headers.get('user-agent') || null

    // Insert using admin client to bypass RLS for anonymous users
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('consent_records')
      .insert({
        user_id: userId,
        consent_type,
        consent_value,
        ip_address,
        user_agent,
      })

    if (error) {
      console.error('Error recording consent:', error)
      return NextResponse.json(
        { error: 'Failed to record consent' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Consent API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/consent — Get current user's latest consent records
 * Requires authentication
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get the latest consent record for each type
    const { data: records, error } = await adminClient
      .from('consent_records')
      .select('consent_type, consent_value, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching consent:', error)
      return NextResponse.json(
        { error: 'Failed to fetch consent records' },
        { status: 500 }
      )
    }

    // Deduplicate: keep only the latest per type
    const latest: Record<string, { consent_value: boolean; created_at: string }> = {}
    for (const record of records || []) {
      if (!latest[record.consent_type]) {
        latest[record.consent_type] = {
          consent_value: record.consent_value,
          created_at: record.created_at,
        }
      }
    }

    return NextResponse.json({ consents: latest })
  } catch (error) {
    console.error('Consent GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
