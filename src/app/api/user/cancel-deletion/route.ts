import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rateLimit'

/**
 * POST /api/user/cancel-deletion — Cancel a pending deletion request
 * Story 11.4: Allows users to cancel within the 30-day cooling-off period
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

    // Find pending request
    const { data: pending } = await adminClient
      .from('deletion_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .limit(1)

    if (!pending || pending.length === 0) {
      return NextResponse.json(
        { error: 'No pending deletion request found' },
        { status: 404 }
      )
    }

    // Cancel the request
    const { error: updateError } = await adminClient
      .from('deletion_requests')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', pending[0].id)

    if (updateError) {
      console.error('Error cancelling deletion:', updateError)
      return NextResponse.json({ error: 'Failed to cancel deletion' }, { status: 500 })
    }

    // Audit log
    await adminClient.from('audit_logs').insert({
      user_id: userId,
      action: 'deletion_cancelled',
      details: { request_id: pending[0].id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cancel deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
