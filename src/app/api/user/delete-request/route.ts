import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rateLimit'

const COOLING_OFF_DAYS = 30

/**
 * POST /api/user/delete-request — Request account deletion
 * Story 11.4: RGPD Art.17 / LGPD Art.18 — Right to Erasure
 * Starts a 30-day cooling-off period before actual deletion
 */
export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
    if (!checkRateLimit('deletion', clientIp, 5, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const adminClient = createAdminClient()

    // Check for existing pending request
    const { data: existing } = await adminClient
      .from('deletion_requests')
      .select('id, scheduled_at')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'A deletion request is already pending', scheduled_at: existing[0].scheduled_at },
        { status: 409 }
      )
    }

    // Schedule deletion for 30 days from now
    const scheduledAt = new Date()
    scheduledAt.setDate(scheduledAt.getDate() + COOLING_OFF_DAYS)

    const { error: insertError } = await adminClient
      .from('deletion_requests')
      .insert({
        user_id: userId,
        scheduled_at: scheduledAt.toISOString(),
        status: 'pending',
      })

    if (insertError) {
      console.error('Error creating deletion request:', insertError)
      return NextResponse.json({ error: 'Failed to create deletion request' }, { status: 500 })
    }

    // Audit log
    await adminClient.from('audit_logs').insert({
      user_id: userId,
      action: 'deletion_requested',
      details: { scheduled_at: scheduledAt.toISOString(), cooling_off_days: COOLING_OFF_DAYS },
    })

    // Fetch user details for the email
    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single()

    // Enviar email de confirmação se profile existir (AC3 from Story 11.4)
    if (profile?.email) {
      // Usar dinamicamente a route atual para compor a url
      const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const { sendDeletionRequestConfirmation } = await import('@/lib/email/accountDeletion')
      
      // Enviamos a confirmação mas sem fazer a api esperar ou falhar o request caso dê erro
      sendDeletionRequestConfirmation({
        guestName: profile.full_name || 'Utilizador',
        guestEmail: profile.email,
        scheduledAt: scheduledAt.toISOString(),
        appUrl: origin,
      }).catch(err => console.error('Error triggering deletion email:', err))
    }

    return NextResponse.json({
      success: true,
      scheduled_at: scheduledAt.toISOString(),
      cooling_off_days: COOLING_OFF_DAYS,
    })
  } catch (error) {
    console.error('Delete request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/user/delete-request — Check deletion request status
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: request } = await adminClient
      .from('deletion_requests')
      .select('id, requested_at, scheduled_at, status, cancelled_at')
      .eq('user_id', session.user.id)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })
      .limit(1)

    return NextResponse.json({
      pending_request: request && request.length > 0 ? request[0] : null,
    })
  } catch (error) {
    console.error('Delete request GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
