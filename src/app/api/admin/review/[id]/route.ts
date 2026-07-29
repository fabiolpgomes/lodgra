import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: reservation } = await supabase
      .from('reservations')
      .select('*, properties(name)')
      .eq('id', params.id)
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
