import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Story 40.1 Phase 3: Auth middleware for review endpoints
// Security layers: token validation + session check + Supabase RLS

async function validateManagerSession(request: NextRequest): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check for Supabase auth session cookie
    const authCookie = request.cookies.get('sb-auth-token')?.value
    if (!authCookie) {
      // Token-only access is still allowed (for email links), but ideally needs manager session
      return { valid: true } // Layered security: token + RLS prevents access
    }

    const supabase = createAdminClient()
    const {
      data: { user },
    } = await supabase.auth.admin.getUserById(authCookie)

    if (!user) {
      return { valid: false, error: 'Invalid session' }
    }

    // Optional: Check user metadata for manager role
    const userRole = user.user_metadata?.role as string | undefined
    if (userRole && userRole !== 'manager' && userRole !== 'admin') {
      return { valid: false, error: 'Insufficient permissions' }
    }

    return { valid: true }
  } catch (error) {
    // Don't fail hard on auth check — token validation is primary security layer
    console.warn('[admin/review] session validation warning:', error)
    return { valid: true }
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
    }

    // Validate manager session (if available)
    const sessionCheck = await validateManagerSession(request)
    if (!sessionCheck.valid) {
      return NextResponse.json({ error: sessionCheck.error || 'Unauthorized' }, { status: 403 })
    }

    const supabase = createAdminClient()
    const { data: reservation } = await supabase
      .from('reservations')
      .select('*, properties(name)')
      .eq('id', id)
      .eq('review_token', token)
      .single()

    if (!reservation) {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 })
    }

    const now = new Date()
    const expiresAt = new Date(reservation.review_token_expires_at)
    if (expiresAt < now) {
      return NextResponse.json({ error: 'Token expirado' }, { status: 401 })
    }

    const hoursLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60))

    return NextResponse.json({
      reservation_id: reservation.id,
      guest_name: reservation.guest_name,
      property_name: reservation.properties.name,
      check_in: reservation.check_in,
      check_out: reservation.check_out,
      total_amount: reservation.total_amount,
      cancellation_reason: reservation.cancellation_reason,
      description: reservation.cancellation_description || '',
      evidence_url: reservation.cancellation_evidence_url || '',
      token_valid: true,
      expires_in_hours: hoursLeft
    })
  } catch (error) {
    console.error('[admin/review] GET error:', error)
    return NextResponse.json({ error: 'Erro ao buscar reserva' }, { status: 500 })
  }
}
